import db from "../db/db.mjs";

/**
 * Profit & Loss Statement (Income Statement)
 * CA STRICT LOGIC:
 * - Revenue = Net Taxable Sales (Net of Returns, EXCLUDING GST)
 * - COGS = Purchase Cost of items actually kept by customers (Net of Returns)
 * - Stock Gain/Loss = Only extraordinary adjustments (excludes Returns to prevent double-counting)
 * - Expenses = All operating outflows
 */
export function getPnLData(startDate, endDate) {
  // 1. Calculate Net Taxable Revenue (Sales minus Returns, excluding GST)
  const revenueRow = db
    .prepare(
      `
    SELECT 
      SUM(
        ( (si.rate * (si.quantity - COALESCE(si.return_quantity, 0)) * (1 - si.discount/100.0)) ) / 
        (1 + (COALESCE(si.gst_rate, p.gst_rate, 0)/100.0))
      ) as taxable_revenue
    FROM sales_items si
    JOIN sales s ON si.sale_id = s.id
    LEFT JOIN products p ON si.product_id = p.id
    WHERE s.status != 'cancelled' 
      AND s.is_quote = 0 
      AND date(s.created_at) BETWEEN date(?) AND date(?)
  `,
    )
    .get(startDate, endDate);

  const netTaxableRevenue = revenueRow.taxable_revenue || 0;

  // 2. Calculate COGS (Net of Returns)
  const cogsRow = db
    .prepare(
      `
    SELECT 
      SUM((si.quantity - COALESCE(si.return_quantity, 0)) * COALESCE(p.average_purchase_price, p.mop, 0)) as total_cogs
    FROM sales_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    WHERE s.status != 'cancelled' 
      AND s.is_quote = 0
      AND date(s.created_at) BETWEEN date(?) AND date(?)
  `,
    )
    .get(startDate, endDate);

  const totalCogs = cogsRow.total_cogs || 0;

  // 3. Inventory Gains/Losses (From stock adjustments, strictly excluding Returns)
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
      AND sa.category NOT IN ('Sales Return', 'Purchase Return')
  `,
    )
    .get(startDate, endDate);

  const stockGain = adjustmentsRow.total_gain || 0;
  const stockLoss = adjustmentsRow.total_loss || 0;

  // 4. Operating Expenses
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
    totalRevenue: parseFloat(netTaxableRevenue.toFixed(2)),
    totalCogs: parseFloat(totalCogs.toFixed(2)),
    grossProfit: parseFloat((netTaxableRevenue - totalCogs).toFixed(2)),
    stockGain: parseFloat(stockGain.toFixed(2)),
    stockLoss: parseFloat(stockLoss.toFixed(2)),
    expenses,
    totalExpenses: parseFloat(totalExpenses.toFixed(2)),
    netProfit: parseFloat(
      (
        netTaxableRevenue -
        totalCogs +
        stockGain -
        totalExpenses -
        stockLoss
      ).toFixed(2),
    ),
  };
}

/**
 * Customer Ledger (Accounts Receivable)
 * Strict Reconciliation:
 * - Sales/Refunds = DEBIT (Increases what they owe)
 * - Payments/Returns = CREDIT (Decreases what they owe)
 */
export function getCustomerLedger(customerId, startDate, endDate) {
  const obRow = db
    .prepare(
      `
    SELECT
      (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE customer_id = ? AND date(created_at) < date(?) AND status != 'cancelled')
      +
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE entity_id = ? AND entity_type = 'customer' AND type = 'payment_out' AND date(transaction_date) < date(?) AND status != 'deleted')
      -
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE entity_id = ? AND entity_type = 'customer' AND type IN ('payment_in', 'credit_note') AND date(transaction_date) < date(?) AND status != 'deleted')
      as balance
  `,
    )
    .get(customerId, startDate, customerId, startDate, customerId, startDate);

  const openingBalance = obRow.balance || 0;

  const ledger = db
    .prepare(
      `
    -- DEBIT: Sales Invoices
    SELECT 
      'Sale Invoice' as record_type, s.id, s.reference_no, date(s.created_at) as date, 
      s.total_amount as debit, 0 as credit, s.note
    FROM sales s
    WHERE s.customer_id = ? AND date(s.created_at) BETWEEN date(?) AND date(?) AND s.status != 'cancelled'
    
    UNION ALL

    -- DEBIT: Cash Refunds to Customer (Increases Balance)
    SELECT 
      'Cash Refund' as record_type, t.id, t.reference_no, date(t.transaction_date) as date,
      t.amount as debit, 0 as credit, t.note
    FROM transactions t
    WHERE t.entity_id = ? AND t.entity_type = 'customer' AND t.type = 'payment_out'
      AND date(t.transaction_date) BETWEEN date(?) AND date(?) AND t.status != 'deleted'

    UNION ALL
    
    -- CREDIT: Payments Received or Sales Returns
    SELECT 
      CASE WHEN t.type = 'payment_in' THEN 'Payment Received' ELSE 'Sales Return (CN)' END as record_type, 
      t.id, t.reference_no, date(t.transaction_date) as date, 
      0 as debit, t.amount as credit, t.note
    FROM transactions t
    WHERE t.entity_id = ? AND t.entity_type = 'customer' AND t.type IN ('payment_in', 'credit_note')
      AND date(t.transaction_date) BETWEEN date(?) AND date(?) AND t.status != 'deleted'
    
    ORDER BY date ASC, id ASC
  `,
    )
    .all(
      customerId,
      startDate,
      endDate,
      customerId,
      startDate,
      endDate,
      customerId,
      startDate,
      endDate,
    );

  return { openingBalance, ledger };
}

/**
 * Supplier Ledger (Accounts Payable)
 * Strict Reconciliation:
 * - Purchases/Debit Notes = CREDIT (Increases what we owe)
 * - Payments Out/Returns = DEBIT (Decreases what we owe)
 */
export function getSupplierLedger(supplierId, startDate, endDate) {
  const obRow = db
    .prepare(
      `
    SELECT
      (SELECT COALESCE(SUM(total_amount), 0) FROM purchases WHERE supplier_id = ? AND date(date) < date(?) AND status != 'cancelled')
      +
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE entity_id = ? AND entity_type = 'supplier' AND type = 'payment_in' AND date(transaction_date) < date(?) AND status != 'deleted')
      -
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE entity_id = ? AND entity_type = 'supplier' AND type IN ('payment_out', 'debit_note') AND date(transaction_date) < date(?) AND status != 'deleted')
      as balance
  `,
    )
    .get(supplierId, startDate, supplierId, startDate, supplierId, startDate);

  const openingBalance = obRow.balance || 0;

  const ledger = db
    .prepare(
      `
    -- CREDIT: Purchase Bills
    SELECT 
      'Purchase Bill' as record_type, p.id, p.reference_no, date(p.date) as date, 
      0 as debit, p.total_amount as credit, p.note
    FROM purchases p
    WHERE p.supplier_id = ? AND date(p.date) BETWEEN date(?) AND date(?) AND p.status != 'cancelled'
    
    UNION ALL

    -- CREDIT: Cash Refund received from Supplier
    SELECT 
      'Refund Received' as record_type, t.id, t.reference_no, date(t.transaction_date) as date, 
      0 as debit, t.amount as credit, t.note
    FROM transactions t
    WHERE t.entity_id = ? AND t.entity_type = 'supplier' AND t.type = 'payment_in'
      AND date(t.transaction_date) BETWEEN date(?) AND date(?) AND t.status != 'deleted'

    UNION ALL
    
    -- DEBIT: Payments or Purchase Returns
    SELECT 
      CASE WHEN t.type = 'payment_out' THEN 'Payment Sent' ELSE 'Purchase Return (DN)' END as record_type, 
      t.id, t.reference_no, date(t.transaction_date) as date, 
      t.amount as debit, 0 as credit, t.note
    FROM transactions t
    WHERE t.entity_id = ? AND t.entity_type = 'supplier' AND t.type IN ('payment_out', 'debit_note')
      AND date(t.transaction_date) BETWEEN date(?) AND date(?) AND t.status != 'deleted'
    
    ORDER BY date ASC, id ASC
  `,
    )
    .all(
      supplierId,
      startDate,
      endDate,
      supplierId,
      startDate,
      endDate,
      supplierId,
      startDate,
      endDate,
    );

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
               SUM(CASE WHEN date(s.created_at) BETWEEN date(@start) AND date(@end) THEN (si.quantity - COALESCE(si.return_quantity, 0)) ELSE 0 END) as period_qty,
               SUM(CASE WHEN date(s.created_at) >= date(@start) THEN (si.quantity - COALESCE(si.return_quantity, 0)) ELSE 0 END) as since_start_qty
        FROM sales_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.status != 'cancelled'
        GROUP BY si.product_id
    ),
    AdjAgg AS (
        SELECT product_id,
               SUM(CASE WHEN date(created_at) BETWEEN date(@start) AND date(@end) AND category NOT IN ('Sales Return', 'Purchase Return') THEN (new_quantity - old_quantity) ELSE 0 END) as period_qty,
               SUM(CASE WHEN date(created_at) >= date(@start) AND category NOT IN ('Sales Return', 'Purchase Return') THEN (new_quantity - old_quantity) ELSE 0 END) as since_start_qty
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
