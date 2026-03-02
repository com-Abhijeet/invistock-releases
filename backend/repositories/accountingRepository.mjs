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

  const adjustmentsRow = db
    .prepare(
      `
    SELECT 
      SUM(CASE WHEN (sa.new_quantity - sa.old_quantity) > 0 
               THEN (sa.new_quantity - sa.old_quantity) * COALESCE(p.average_purchase_price, p.mop, 0) 
               ELSE 0 END) as total_gain,
      SUM(CASE WHEN (sa.new_quantity - sa.old_quantity) < 0 
               THEN ABS(sa.new_quantity - sa.old_quantity) * COALESCE(p.average_purchase_price, p.mop, 0) 
               ELSE 0 END) as total_loss
    FROM stock_adjustments sa
    JOIN products p ON sa.product_id = p.id
    WHERE date(sa.created_at) BETWEEN date(?) AND date(?)
  `,
    )
    .get(startDate, endDate);

  const stockGain = adjustmentsRow.total_gain || 0;
  const stockLoss = adjustmentsRow.total_loss || 0;

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
    stockGain,
    stockLoss,
    expenses,
    totalExpenses,
    netProfit: totalRevenue - totalCogs + stockGain - totalExpenses - stockLoss,
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
    const openingQty =
      row.current_quantity -
      row.purchases_since_start +
      row.sales_since_start -
      row.adjustments_since_start;

    const netChange = row.purchased_qty - row.sold_qty + row.adjusted_qty;

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

// ---------------------------------------------------------------------------
// FIXED: AGING & OUTSTANDING REPORTS (A/R & A/P)
// ---------------------------------------------------------------------------

/**
 * 1. Accounts Receivable (A/R) Aging Summary
 * Added robust LOWER() checks and included 'sale' in type array
 */
export function getReceivablesAging() {
  const query = `
    WITH SalePayments AS (
        SELECT bill_id, SUM(amount) as paid_amount
        FROM transactions
        WHERE LOWER(bill_type) = 'sale' 
          AND LOWER(type) IN ('payment_in', 'credit_note', 'sale') 
          AND LOWER(status) != 'deleted'
        GROUP BY bill_id
    ),
    UnpaidSales AS (
        SELECT 
            s.id as sale_id,
            s.customer_id,
            (s.total_amount - COALESCE(sp.paid_amount, 0)) as pending_amount,
            CAST(julianday('now', 'localtime') - julianday(s.created_at, 'localtime') AS INTEGER) as age_days
        FROM sales s
        LEFT JOIN SalePayments sp ON s.id = sp.bill_id
        WHERE s.status != 'cancelled' AND (s.total_amount - COALESCE(sp.paid_amount, 0)) > 0.5
    )
    SELECT 
        c.id as customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        SUM(u.pending_amount) as total_outstanding,
        SUM(CASE WHEN u.age_days <= 30 THEN u.pending_amount ELSE 0 END) as days_0_30,
        SUM(CASE WHEN u.age_days > 30 AND u.age_days <= 60 THEN u.pending_amount ELSE 0 END) as days_31_60,
        SUM(CASE WHEN u.age_days > 60 AND u.age_days <= 90 THEN u.pending_amount ELSE 0 END) as days_61_90,
        SUM(CASE WHEN u.age_days > 90 THEN u.pending_amount ELSE 0 END) as days_90_plus
    FROM UnpaidSales u
    JOIN customers c ON u.customer_id = c.id
    GROUP BY c.id
    ORDER BY total_outstanding DESC
  `;
  return db.prepare(query).all();
}

/**
 * 2. Customer Bill-by-Bill Outstanding (A/R Breakdown)
 */
export function getCustomerBillByBill(customerId) {
  const query = `
    WITH SalePayments AS (
        SELECT bill_id, SUM(amount) as paid_amount
        FROM transactions
        WHERE LOWER(bill_type) = 'sale' 
          AND LOWER(type) IN ('payment_in', 'credit_note', 'sale') 
          AND LOWER(status) != 'deleted'
        GROUP BY bill_id
    )
    SELECT 
        s.id as sale_id,
        s.reference_no,
        date(s.created_at) as date,
        s.total_amount as invoice_amount,
        COALESCE(sp.paid_amount, 0) as paid_amount,
        (s.total_amount - COALESCE(sp.paid_amount, 0)) as pending_amount,
        CAST(julianday('now', 'localtime') - julianday(s.created_at, 'localtime') AS INTEGER) as age_days
    FROM sales s
    LEFT JOIN SalePayments sp ON s.id = sp.bill_id
    WHERE s.customer_id = ? AND s.status != 'cancelled' AND (s.total_amount - COALESCE(sp.paid_amount, 0)) > 0.5
    ORDER BY s.created_at ASC
  `;
  return db.prepare(query).all(customerId);
}

/**
 * 3. Accounts Payable (A/P) Aging Summary
 * Added robust LOWER() checks and included 'purchase' in type array
 */
export function getPayablesAging() {
  const query = `
    WITH PurchasePayments AS (
        SELECT bill_id, SUM(amount) as paid_amount
        FROM transactions
        WHERE LOWER(bill_type) = 'purchase' 
          AND LOWER(type) IN ('payment_out', 'debit_note', 'purchase') 
          AND LOWER(status) != 'deleted'
        GROUP BY bill_id
    ),
    UnpaidPurchases AS (
        SELECT 
            p.id as purchase_id,
            p.supplier_id,
            (p.total_amount - COALESCE(pp.paid_amount, 0)) as pending_amount,
            CAST(julianday('now', 'localtime') - julianday(p.date, 'localtime') AS INTEGER) as age_days
        FROM purchases p
        LEFT JOIN PurchasePayments pp ON p.id = pp.bill_id
        WHERE p.status != 'cancelled' AND (p.total_amount - COALESCE(pp.paid_amount, 0)) > 0.5
    )
    SELECT 
        s.id as supplier_id,
        s.name as supplier_name,
        s.phone as supplier_phone,
        SUM(u.pending_amount) as total_outstanding,
        SUM(CASE WHEN u.age_days <= 30 THEN u.pending_amount ELSE 0 END) as days_0_30,
        SUM(CASE WHEN u.age_days > 30 AND u.age_days <= 60 THEN u.pending_amount ELSE 0 END) as days_31_60,
        SUM(CASE WHEN u.age_days > 60 AND u.age_days <= 90 THEN u.pending_amount ELSE 0 END) as days_61_90,
        SUM(CASE WHEN u.age_days > 90 THEN u.pending_amount ELSE 0 END) as days_90_plus
    FROM UnpaidPurchases u
    JOIN suppliers s ON u.supplier_id = s.id
    GROUP BY s.id
    ORDER BY total_outstanding DESC
  `;
  return db.prepare(query).all();
}

/**
 * 4. Supplier Bill-by-Bill Outstanding (A/P Breakdown)
 */
export function getSupplierBillByBill(supplierId) {
  const query = `
    WITH PurchasePayments AS (
        SELECT bill_id, SUM(amount) as paid_amount
        FROM transactions
        WHERE LOWER(bill_type) = 'purchase' 
          AND LOWER(type) IN ('payment_out', 'debit_note', 'purchase') 
          AND LOWER(status) != 'deleted'
        GROUP BY bill_id
    )
    SELECT 
        p.id as purchase_id,
        p.reference_no as internal_ref_no,
        date(p.date) as date,
        p.total_amount as invoice_amount,
        COALESCE(pp.paid_amount, 0) as paid_amount,
        (p.total_amount - COALESCE(pp.paid_amount, 0)) as pending_amount,
        CAST(julianday('now', 'localtime') - julianday(p.date, 'localtime') AS INTEGER) as age_days
    FROM purchases p
    LEFT JOIN PurchasePayments pp ON p.id = pp.bill_id
    WHERE p.supplier_id = ? AND p.status != 'cancelled' AND (p.total_amount - COALESCE(pp.paid_amount, 0)) > 0.5
    ORDER BY p.date ASC
  `;
  return db.prepare(query).all(supplierId);
}
