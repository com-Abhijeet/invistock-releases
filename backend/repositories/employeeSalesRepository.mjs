import db from "../db/db.mjs";

/**
 * Records a new sale commission for an employee.
 * @param {Object} data - { employee_id, sale_id, sale_amount, commission_amount }
 */
export function createEmployeeSale(data) {
  const stmt = db.prepare(`
    INSERT INTO employee_sales (employee_id, sale_id, sale_amount, commission_amount)
    VALUES (@employee_id, @sale_id, @sale_amount, @commission_amount)
  `);

  const info = stmt.run({
    employee_id: data.employee_id,
    sale_id: data.sale_id,
    sale_amount: data.sale_amount,
    commission_amount: data.commission_amount,
  });

  return { id: info.lastInsertRowid, ...data };
}

/**
 * Retrieves all employee sales records.
 */
export function getAllEmployeeSales() {
  return db
    .prepare("SELECT * FROM employee_sales ORDER BY created_at DESC")
    .all();
}

/**
 * Retrieves a single employee sale record by its ID.
 */
export function getEmployeeSaleById(id) {
  return db.prepare("SELECT * FROM employee_sales WHERE id = ?").get(id);
}

/**
 * Retrieves all sales records associated with a specific employee.
 * Joins with the sales table to get the reference number.
 * Supports optional date range filtering.
 */
export function getEmployeeSalesByEmployeeId(employeeId, startDate, endDate) {
  let query = `
    SELECT 
      es.*,
      s.reference_no as sales_reference_no
    FROM employee_sales es
    LEFT JOIN sales s ON es.sale_id = s.id
    WHERE es.employee_id = ?
  `;

  const params = [employeeId];

  if (startDate && endDate) {
    query += ` AND es.created_at BETWEEN ? AND ?`;
    // Append time to cover the full day range
    params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
  }

  query += ` ORDER BY es.created_at DESC`;

  return db.prepare(query).all(...params);
}

/**
 * Updates an employee sale record.
 */
export function updateEmployeeSale(id, data) {
  const stmt = db.prepare(`
    UPDATE employee_sales
    SET employee_id = @employee_id,
        sale_id = @sale_id,
        sale_amount = @sale_amount,
        commission_amount = @commission_amount
    WHERE id = @id
  `);

  const result = stmt.run({
    id,
    employee_id: data.employee_id,
    sale_id: data.sale_id,
    sale_amount: data.sale_amount,
    commission_amount: data.commission_amount,
  });

  return result.changes > 0 ? getEmployeeSaleById(id) : null;
}

/**
 * Deletes an employee sale record.
 */
export function deleteEmployeeSale(id) {
  const stmt = db.prepare("DELETE FROM employee_sales WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}
