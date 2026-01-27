import db from "../db/db.mjs";

export function getAllEmployees() {
  return db.prepare("SELECT * FROM employees ORDER BY name ASC").all();
}

export function getActiveEmployees() {
  return db
    .prepare("SELECT * FROM employees WHERE is_active = 1 ORDER BY name ASC")
    .all();
}

export function createEmployee(employee) {
  const stmt = db.prepare(`
    INSERT INTO employees (name, phone, role, commission_rate, is_active)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    employee.name,
    employee.phone,
    employee.role || "staff",
    employee.commission_rate || 0,
    employee.is_active ?? 1,
  );
  return { id: info.lastInsertRowid, ...employee };
}

export function updateEmployee(id, employee) {
  const stmt = db.prepare(`
    UPDATE employees 
    SET name = ?, phone = ?, role = ?, commission_rate = ?, is_active = ?
    WHERE id = ?
  `);
  stmt.run(
    employee.name,
    employee.phone,
    employee.role,
    employee.commission_rate,
    employee.is_active,
    id,
  );
  return { id, ...employee };
}

export function deleteEmployee(id) {
  return db.prepare("UPDATE employees SET is_active = 0 WHERE id = ?").run(id);
}

// Record a sale commission
export function addEmployeeSale(saleId, employeeId, totalAmount) {
  // 1. Get employee rate
  const emp = db
    .prepare("SELECT commission_rate FROM employees WHERE id = ?")
    .get(employeeId);
  if (!emp) return null;

  const commission = (totalAmount * emp.commission_rate) / 100;

  // 2. Insert record
  const stmt = db.prepare(`
    INSERT INTO employee_sales (employee_id, sale_id, sale_amount, commission_amount)
    VALUES (?, ?, ?, ?)
  `);

  return stmt.run(employeeId, saleId, totalAmount, commission);
}

// Get stats
export function getEmployeeStats(startDate, endDate) {
  const query = `
    SELECT 
      e.id, 
      e.name, 
      e.commission_rate,
      COUNT(es.id) as total_bills,
      COALESCE(SUM(es.sale_amount), 0) as total_sales,
      COALESCE(SUM(es.commission_amount), 0) as total_commission
    FROM employees e
    LEFT JOIN employee_sales es ON e.id = es.employee_id 
    AND es.created_at BETWEEN ? AND ?
    WHERE e.is_active = 1
    GROUP BY e.id
  `;
  // Ensure dates cover the full range if just YYYY-MM-DD passed
  const start = startDate ? `${startDate} 00:00:00` : "1970-01-01";
  const end = endDate ? `${endDate} 23:59:59` : "9999-12-31";

  return db.prepare(query).all(start, end);
}

/**
 * Retrieves a single employee by ID.
 */
export function getEmployeeById(id) {
  // ✅ FIX: Use .get() instead of .run() to fetch data
  return db.prepare("SELECT * FROM employees WHERE id = ?").get(id);
}
