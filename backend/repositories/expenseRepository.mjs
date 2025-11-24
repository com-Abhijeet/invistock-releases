import db from "../db/db.mjs";

/**
 * Creates a new expense record.
 */
export function createExpense(expense) {
  const stmt = db.prepare(`
    INSERT INTO expenses (date, category, amount, payment_mode, description)
    VALUES (@date, @category, @amount, @payment_mode, @description)
  `);
  const info = stmt.run(expense);
  return { id: info.lastInsertRowid, ...expense };
}

/**
 * Updates an existing expense.
 */
export function updateExpense(id, expense) {
  const stmt = db.prepare(`
    UPDATE expenses 
    SET date = @date, category = @category, amount = @amount, 
        payment_mode = @payment_mode, description = @description
    WHERE id = @id
  `);
  const info = stmt.run({ ...expense, id });
  return info.changes > 0;
}

/**
 * Deletes an expense.
 */
export function deleteExpense(id) {
  const stmt = db.prepare("DELETE FROM expenses WHERE id = ?");
  return stmt.run(id).changes > 0;
}

/**
 * Fetches expenses with optional date filtering.
 * @param {string} startDate YYYY-MM-DD
 * @param {string} endDate YYYY-MM-DD
 */
export function getExpenses(startDate, endDate) {
  let query = "SELECT * FROM expenses";
  const params = [];

  if (startDate && endDate) {
    query += " WHERE date BETWEEN ? AND ?";
    params.push(startDate, endDate);
  }

  query += " ORDER BY date DESC";
  return db.prepare(query).all(...params);
}

/**
 * Calculates expense statistics grouped by category.
 */
export function getExpenseStats(startDate, endDate) {
  const query = `
    SELECT category, SUM(amount) as total
    FROM expenses
    WHERE date BETWEEN ? AND ?
    GROUP BY category
    ORDER BY total DESC
  `;
  return db.prepare(query).all(startDate, endDate);
}

/**
 * Calculates total expenses for a period.
 */
export function getTotalExpenses(startDate, endDate) {
  const query = `
    SELECT SUM(amount) as total
    FROM expenses
    WHERE date BETWEEN ? AND ?
  `;
  const result = db.prepare(query).get(startDate, endDate);
  return result.total || 0;
}
