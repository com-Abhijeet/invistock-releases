import db from "../db/db.mjs";

/**
 * Calculates the cash balance up to (but not including) the target date.
 * Formula: (Total In - Total Out) BEFORE 00:00:00 of target date.
 */
export function getOpeningBalance(dateStr) {
  // 1. Sum of all Transactions
  // payment_in, debit_note -> Money In (Credit)
  // payment_out, credit_note -> Money Out (Debit)
  const trans = db
    .prepare(
      `
    SELECT 
      SUM(CASE 
        WHEN type IN ('payment_in', 'debit_note') THEN amount 
        ELSE 0 
      END) as money_in,
      SUM(CASE 
        WHEN type IN ('payment_out', 'credit_note') THEN amount 
        ELSE 0 
      END) as money_out
    FROM transactions
    WHERE date(transaction_date) < date(?)
  `
    )
    .get(dateStr);

  // 2. Sum of all Expenses (Always Money Out)
  const exps = db
    .prepare(
      `
    SELECT SUM(amount) as total 
    FROM expenses 
    WHERE date(date) < date(?)
  `
    )
    .get(dateStr);

  const totalIn = trans.money_in || 0;
  const totalOut = (trans.money_out || 0) + (exps.total || 0);

  return totalIn - totalOut;
}

/**
 * Fetches all financial activity for a specific date.
 * Combines Transactions (including Credit/Debit Notes) and Expenses.
 */
export function getDayBookTransactions(dateStr) {
  const query = `
    SELECT 
      t.id,
      t.created_at,
      t.transaction_date as date,
      COALESCE(c.name, s.name, 'General') as party_name,
      t.payment_mode,
      t.reference_no as ref_no,
      t.note as description,
      
      -- Money In: Payments Received + Debit Notes (Refunds from suppliers / Charges to customers)
      CASE 
        WHEN t.type IN ('payment_in', 'debit_note') THEN t.amount 
        ELSE 0 
      END as credit,

      -- Money Out: Payments Made + Credit Notes (Refunds to customers / Returns to suppliers)
      CASE 
        WHEN t.type IN ('payment_out', 'credit_note') THEN t.amount 
        ELSE 0 
      END as debit,
      
      t.type as type_label, -- 'payment_in', 'credit_note', etc.
      'transaction' as source
    FROM transactions t
    LEFT JOIN customers c ON t.entity_type = 'customer' AND t.entity_id = c.id
    LEFT JOIN suppliers s ON t.entity_type = 'supplier' AND t.entity_id = s.id
    WHERE date(t.transaction_date) = date(?)

    UNION ALL

    SELECT 
      e.id,
      e.created_at,
      e.date,
      e.category as party_name, -- Expense Category as Party Name
      e.payment_mode,
      'EXP-' || e.id as ref_no,
      e.description,
      0 as credit,
      e.amount as debit,
      'Expense' as type_label,
      'expense' as source
    FROM expenses e
    WHERE date(e.date) = date(?)

    ORDER BY created_at ASC
  `;

  return db.prepare(query).all(dateStr, dateStr);
}
