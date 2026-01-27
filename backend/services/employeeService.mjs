import * as EmployeeRepo from "../repositories/employeeRepository.mjs";
import * as EmployeeSalesRepo from "../repositories/employeeSalesRepository.mjs";

/**
 * Creates a new employee.
 * @param {Object} data - { name, phone, role, commission_rate, is_active }
 */
export function createEmployee(data) {
  // Add validation logic here if needed
  return EmployeeRepo.createEmployee(data);
}

/**
 * Retrieves all employees.
 */
export function getAllEmployees() {
  return EmployeeRepo.getAllEmployees();
}

/**
 * Retrieves active employees.
 */
export function getActiveEmployees() {
  return EmployeeRepo.getActiveEmployees();
}

/**
 * Retrieves an employee by ID.
 * @param {number} id
 */
export function getEmployeeById(id) {
  return EmployeeRepo.getEmployeeById(id);
}

/**
 * Updates an employee.
 * @param {number} id
 * @param {Object} data
 */
export function updateEmployee(id, data) {
  return EmployeeRepo.updateEmployee(id, data);
}

/**
 * Deletes an employee (soft delete).
 * @param {number} id
 */
export function deleteEmployee(id) {
  return EmployeeRepo.deleteEmployee(id);
}

/**
 * Get employee statistics for a given date range.
 * If no range is provided, it defaults to the current month.
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 */
export async function getEmployeeStats(startDate, endDate) {
  // If dates are not provided, default to current month
  let start = startDate;
  let end = endDate;

  if (!start || !end) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Format to YYYY-MM-DD
    const formatDate = (d) => d.toISOString().split("T")[0];

    if (!start) start = formatDate(firstDay);
    if (!end) end = formatDate(lastDay);
  }

  // Fetch all employees to list them even if they have 0 sales
  const employees = await EmployeeRepo.getActiveEmployees();

  // We need to fetch sales for the period.
  // Since we don't have a direct "getStats" query in repo yet, let's fetch all sales
  // and aggregate in memory OR we can update the repo to support range queries.
  // For better performance, let's assume we can fetch all sales and filter.
  // However, the requested employeeSalesRepository has `getAllEmployeeSales`.

  const allSales = await EmployeeSalesRepo.getAllEmployeeSales();

  // Filter sales by date range
  // Assuming 'created_at' in DB is 'YYYY-MM-DD HH:MM:SS' or ISO string
  const filteredSales = allSales.filter((sale) => {
    const saleDate = sale.created_at.split(" ")[0]; // Extract YYYY-MM-DD
    return saleDate >= start && saleDate <= end;
  });

  // Aggregate stats per employee
  const stats = employees.map((emp) => {
    const empSales = filteredSales.filter((s) => s.employee_id === emp.id);
    const totalSales = empSales.reduce((sum, s) => sum + s.sale_amount, 0);
    const totalCommission = empSales.reduce(
      (sum, s) => sum + s.commission_amount,
      0,
    );
    const totalBills = empSales.length;

    return {
      ...emp,
      total_sales: totalSales,
      total_commission: totalCommission,
      total_bills: totalBills,
    };
  });

  return stats;
}
