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
 * Calculates and records employee commissions for a sale (item-wise or header fallback).
 * Automatically handles multiple employees per voucher if items belong to different SIDs.
 */
export function recordSaleCommissions(
  saleId,
  items = [],
  headerEmployeeId = null,
  totalSaleAmount = 0,
) {
  // Clear any existing commission records for this sale
  EmployeeSalesRepo.deleteEmployeeSalesBySaleId(saleId);

  const employeeTotals = new Map();

  if (Array.isArray(items) && items.length > 0) {
    for (const item of items) {
      const empId = item.employee_id || headerEmployeeId;
      if (empId) {
        const itemPrice = parseFloat(item.price || 0);
        const currentTotal = employeeTotals.get(empId) || 0;
        employeeTotals.set(empId, currentTotal + itemPrice);
      }
    }
  }

  // Fallback to header employee if items were empty or produced no employee totals
  if (employeeTotals.size === 0 && headerEmployeeId && totalSaleAmount > 0) {
    employeeTotals.set(headerEmployeeId, parseFloat(totalSaleAmount));
  }

  const results = [];
  for (const [empId, saleAmount] of employeeTotals.entries()) {
    const employee = EmployeeRepo.getEmployeeById(empId);
    if (employee) {
      const commissionRate = parseFloat(employee.commission_rate || 0);
      const commissionAmount = (saleAmount * commissionRate) / 100;

      const created = EmployeeSalesRepo.createEmployeeSale({
        employee_id: empId,
        sale_id: saleId,
        sale_amount: saleAmount,
        commission_amount: commissionAmount,
      });
      results.push(created);
    }
  }

  return results;
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
