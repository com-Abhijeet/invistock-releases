import db from "../db/db.mjs";

/**
 * Profit & Loss Statement Data
 */
export function getPnLData(startDate, endDate) {
  const revenueRow = db
    .prepare(
      `
    SELECT SUM(total_amount) as total_revenue
    FROM sales
    WHERE status != 'cancelled' AND date(created_at) BETWEEN date(?) AND date(?)
  `,
    )
    .get(startDate, endDate);
  const totalRevenue = revenueRow.total_revenue || 0;

  const cogsRow = db
    .prepare(
      `
    SELECT SUM(si.quantity * COALESCE(p.average_purchase_price, p.mop, 0)) as total_cogs
    FROM sales_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    WHERE s.status != 'cancelled' AND date(s.created_at) BETWEEN date(?) AND date(?)
  `,
    )
    .get(startDate, endDate);
  const totalCogs = cogsRow.total_cogs || 0;

  const expenses = db
    .prepare(
      `
    SELECT category, SUM(amount) as total
    FROM expenses
    WHERE date(date) BETWEEN date(?) AND date(?)
    GROUP BY category
  `,
    )
    .all(startDate, endDate);

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.total, 0);

  return {
    totalRevenue,
    totalCogs,
    grossProfit: totalRevenue - totalCogs,
    expenses,
    totalExpenses,
    netProfit: totalRevenue - totalCogs - totalExpenses,
  };
}

export function getCustomerLedger(customerId, startDate, endDate) {
  const obRow = db
    .prepare(
      `
    SELECT
      (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE customer_id = ? AND date(created_at) < date(?))
      -
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE entity_type = 'customer' AND entity_id = ? AND type IN ('payment_in', 'credit_note') AND date(transaction_date) < date(?))
      as balance
  `,
    )
    .get(customerId, startDate, customerId, startDate);
  const openingBalance = obRow.balance || 0;

  const ledger = db
    .prepare(
      `
    SELECT 
      'Sale Invoice' as record_type, 
      s.id, 
      s.reference_no, 
      date(s.created_at) as date, 
      s.total_amount as debit, 
      COALESCE((
        SELECT SUM(amount) 
        FROM transactions t 
        WHERE t.bill_id = s.id 
          AND t.bill_type = 'sale' 
          AND t.type = 'payment_in' 
          AND date(t.transaction_date) = date(s.created_at) 
          AND t.status != 'deleted'
      ), 0) as credit, 
      s.note
    FROM sales s
    WHERE s.customer_id = ? AND date(s.created_at) BETWEEN date(?) AND date(?) AND s.status != 'cancelled'
    
    UNION ALL
    
    SELECT 
      CASE WHEN t.type = 'payment_in' THEN 'Payment Received' ELSE 'Credit Note' END as record_type, 
      t.id, 
      t.reference_no, 
      date(t.transaction_date) as date, 
      0 as debit, 
      t.amount as credit, 
      t.note
    FROM transactions t
    LEFT JOIN sales s ON t.bill_id = s.id AND t.bill_type = 'sale'
    WHERE t.entity_type = 'customer' 
      AND t.entity_id = ? 
      AND t.type IN ('payment_in', 'credit_note') 
      AND date(t.transaction_date) BETWEEN date(?) AND date(?) 
      AND t.status != 'deleted'
      AND NOT (t.type = 'payment_in' AND t.bill_type = 'sale' AND s.id IS NOT NULL AND date(t.transaction_date) = date(s.created_at))
    
    ORDER BY date ASC
  `,
    )
    .all(customerId, startDate, endDate, customerId, startDate, endDate);

  return { openingBalance, ledger };
}

export function getSupplierLedger(supplierId, startDate, endDate) {
  const obRow = db
    .prepare(
      `
    SELECT
      (SELECT COALESCE(SUM(total_amount), 0) FROM purchases WHERE supplier_id = ? AND date(date) < date(?))
      -
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE entity_type = 'supplier' AND entity_id = ? AND type IN ('payment_out', 'debit_note') AND date(transaction_date) < date(?))
      as balance
  `,
    )
    .get(supplierId, startDate, supplierId, startDate);
  const openingBalance = obRow.balance || 0;

  const ledger = db
    .prepare(
      `
    SELECT 
      'Purchase Bill' as record_type, 
      p.id, 
      p.reference_no, 
      date(p.date) as date, 
      COALESCE((
        SELECT SUM(amount) 
        FROM transactions t 
        WHERE t.bill_id = p.id 
          AND t.bill_type = 'purchase' 
          AND t.type = 'payment_out' 
          AND date(t.transaction_date) = date(p.date) 
          AND t.status != 'deleted'
      ), 0) as debit, 
      p.total_amount as credit, 
      p.note
    FROM purchases p
    WHERE p.supplier_id = ? AND date(p.date) BETWEEN date(?) AND date(?) AND p.status != 'cancelled'
    
    UNION ALL
    
    SELECT 
      CASE WHEN t.type = 'payment_out' THEN 'Payment Sent' ELSE 'Debit Note' END as record_type, 
      t.id, 
      t.reference_no, 
      date(t.transaction_date) as date, 
      t.amount as debit, 
      0 as credit, 
      t.note
    FROM transactions t
    LEFT JOIN purchases p ON t.bill_id = p.id AND t.bill_type = 'purchase'
    WHERE t.entity_type = 'supplier' 
      AND t.entity_id = ? 
      AND t.type IN ('payment_out', 'debit_note') 
      AND date(t.transaction_date) BETWEEN date(?) AND date(?) 
      AND t.status != 'deleted'
      AND NOT (t.type = 'payment_out' AND t.bill_type = 'purchase' AND p.id IS NOT NULL AND date(t.transaction_date) = date(p.date))
    
    ORDER BY date ASC
  `,
    )
    .all(supplierId, startDate, endDate, supplierId, startDate, endDate);

  return { openingBalance, ledger };
}

export function getCashBankBook(modeType, startDate, endDate) {
  const modeCondition =
    modeType === "cash"
      ? "LOWER(payment_mode) = 'cash'"
      : "LOWER(payment_mode) IN ('upi', 'card', 'bank_transfer', 'bank')";

  const obRow = db
    .prepare(
      `
    SELECT
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'payment_in' AND ${modeCondition} AND date(transaction_date) < date(?) AND status != 'deleted')
      -
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'payment_out' AND ${modeCondition} AND date(transaction_date) < date(?) AND status != 'deleted')
      -
      (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE ${modeCondition} AND date(date) < date(?))
      as balance
  `,
    )
    .get(startDate, startDate, startDate);
  const openingBalance = obRow.balance || 0;

  const ledger = db
    .prepare(
      `
    SELECT 'Incoming Payment' as record_type, id, reference_no, date(transaction_date) as date, amount as inflow, 0 as outflow, note, payment_mode
    FROM transactions 
    WHERE type = 'payment_in' AND ${modeCondition} AND date(transaction_date) BETWEEN date(?) AND date(?) AND status != 'deleted'
    
    UNION ALL
    
    SELECT 'Outgoing Payment' as record_type, id, reference_no, date(transaction_date) as date, 0 as inflow, amount as outflow, note, payment_mode
    FROM transactions 
    WHERE type = 'payment_out' AND ${modeCondition} AND date(transaction_date) BETWEEN date(?) AND date(?) AND status != 'deleted'
    
    UNION ALL
    
    SELECT 'Expense' as record_type, id, 'EXP-' || id as reference_no, date(date) as date, 0 as inflow, amount as outflow, description as note, payment_mode
    FROM expenses 
    WHERE ${modeCondition} AND date(date) BETWEEN date(?) AND date(?)
    
    ORDER BY date ASC
  `,
    )
    .all(startDate, endDate, startDate, endDate, startDate, endDate);

  return { openingBalance, ledger };
}

export function getStockValuation() {
  const masterValuation =
    db
      .prepare(
        `
    SELECT SUM(quantity * COALESCE(average_purchase_price, mop, 0)) as total_value
    FROM products 
    WHERE quantity > 0 AND is_active = 1
  `,
      )
      .get().total_value || 0;

  const batchValuation =
    db
      .prepare(
        `
    SELECT SUM(quantity * COALESCE(mop, 0)) as total_value
    FROM product_batches 
    WHERE quantity > 0 AND is_active = 1
  `,
      )
      .get().total_value || 0;

  return { masterValuation, batchValuation };
}

/**
 * Stock Summary Report
 * UPDATED: Uses EXACT schema for stock_adjustments (new_quantity - old_quantity)
 */
export function getStockSummaryReport(startDate, endDate) {
  const query = `
    WITH PurchaseAgg AS (
        SELECT pi.product_id,
               SUM(CASE WHEN date(pur.date) BETWEEN date(@start) AND date(@end) THEN pi.quantity ELSE 0 END) as period_qty,
               SUM(CASE WHEN date(pur.date) >= date(@start) THEN pi.quantity ELSE 0 END) as since_start_qty
        FROM purchase_items pi
        JOIN purchases pur ON pi.purchase_id = pur.id
        WHERE pur.status != 'cancelled'
        GROUP BY pi.product_id
    ),
    SaleAgg AS (
        SELECT si.product_id,
               SUM(CASE WHEN date(s.created_at) BETWEEN date(@start) AND date(@end) THEN si.quantity ELSE 0 END) as period_qty,
               SUM(CASE WHEN date(s.created_at) >= date(@start) THEN si.quantity ELSE 0 END) as since_start_qty
        FROM sales_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.status != 'cancelled'
        GROUP BY si.product_id
    ),
    AdjAgg AS (
        SELECT product_id,
               -- Bulletproof logic: (new_quantity - old_quantity) gives the exact mathematical effect
               SUM(CASE WHEN date(created_at) BETWEEN date(@start) AND date(@end) THEN (new_quantity - old_quantity) ELSE 0 END) as period_qty,
               SUM(CASE WHEN date(created_at) >= date(@start) THEN (new_quantity - old_quantity) ELSE 0 END) as since_start_qty
        FROM stock_adjustments
        GROUP BY product_id
    )
    SELECT 
        p.id as product_id,
        p.name as product_name,
        p.quantity as current_quantity,
        COALESCE(pa.period_qty, 0) as purchased_qty,
        COALESCE(sa.period_qty, 0) as sold_qty,
        COALESCE(aa.period_qty, 0) as adjusted_qty,
        COALESCE(pa.since_start_qty, 0) as purchases_since_start,
        COALESCE(sa.since_start_qty, 0) as sales_since_start,
        COALESCE(aa.since_start_qty, 0) as adjustments_since_start
    FROM products p
    LEFT JOIN PurchaseAgg pa ON p.id = pa.product_id
    LEFT JOIN SaleAgg sa ON p.id = sa.product_id
    LEFT JOIN AdjAgg aa ON p.id = aa.product_id
    WHERE p.is_active = 1
  `;

  const records = db.prepare(query).all({ start: startDate, end: endDate });

  return records.map((row) => {
    // 1. Calculate Opening Quantity by rolling backward from today
    const openingQty =
      row.current_quantity -
      row.purchases_since_start +
      row.sales_since_start -
      row.adjustments_since_start;

    // 2. Net change for the selected period
    const netChange = row.purchased_qty - row.sold_qty + row.adjusted_qty;

    // 3. Closing Quantity
    const closingQty = openingQty + netChange;

    return {
      product_id: row.product_id,
      product_name: row.product_name,
      opening_qty: openingQty,
      purchased_qty: row.purchased_qty,
      sold_qty: row.sold_qty,
      adjusted_qty: row.adjusted_qty,
      net_change: netChange,
      closing_qty: closingQty,
    };
  });
}
