import * as EmployeeSalesRepo from "../repositories/employeeSalesRepository.mjs";
import * as EmployeeRepo from "../repositories/employeeRepository.mjs"; // Needed if we calculate commission here

/**
 * Records a new sale commission.
 * @param {Object} data - { employee_id, sale_id, sale_amount, commission_amount }
 */
export function createEmployeeSale(data) {
  return EmployeeSalesRepo.createEmployeeSale(data);
}

/**
 * Helper: Calculates commission based on employee rate and records the sale.
 * Useful when calling from Sales Service.
 */
export function recordCommission(saleId, employeeId, saleAmount) {
  const employee = EmployeeRepo.getEmployeeById(employeeId);
  if (!employee) {
    throw new Error(`Employee with ID ${employeeId} not found`);
  }

  const commissionRate = employee.commission_rate || 0;
  const commissionAmount = (saleAmount * commissionRate) / 100;

  return EmployeeSalesRepo.createEmployeeSale({
    employee_id: employeeId,
    sale_id: saleId,
    sale_amount: saleAmount,
    commission_amount: commissionAmount,
  });
}

/**
 * Retrieves all employee sales records.
 */
export function getAllEmployeeSales() {
  return EmployeeSalesRepo.getAllEmployeeSales();
}

/**
 * Retrieves a single employee sale record by ID.
 * @param {number} id
 */
export function getEmployeeSaleById(id) {
  return EmployeeSalesRepo.getEmployeeSaleById(id);
}

/**
 * Retrieves all sales for a specific employee.
 * @param {number} employeeId
 */
export function getEmployeeSalesByEmployeeId(employeeId, startDate, endDate) {
  return EmployeeSalesRepo.getEmployeeSalesByEmployeeId(
    employeeId,
    startDate,
    endDate,
  );
}

/**
 * Updates an employee sale record.
 * @param {number} id
 * @param {Object} data
 */
export function updateEmployeeSale(id, data) {
  return EmployeeSalesRepo.updateEmployeeSale(id, data);
}

/**
 * Deletes an employee sale record.
 * @param {number} id
 */
export function deleteEmployeeSale(id) {
  return EmployeeSalesRepo.deleteEmployeeSale(id);
}
