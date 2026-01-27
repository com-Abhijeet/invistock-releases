import * as EmployeeSalesService from "../services/employeeSalesService.mjs";

export function createEmployeeSale(req, res) {
  try {
    const result = EmployeeSalesService.createEmployeeSale(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export function getAllEmployeeSales(req, res) {
  try {
    const data = EmployeeSalesService.getAllEmployeeSales();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export function getEmployeeSaleById(req, res) {
  try {
    const data = EmployeeSalesService.getEmployeeSaleById(req.params.id);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export function getEmployeeSalesByEmployeeId(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const data = EmployeeSalesService.getEmployeeSalesByEmployeeId(
      req.params.employeeId,
      startDate,
      endDate,
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export function updateEmployeeSale(req, res) {
  try {
    const result = EmployeeSalesService.updateEmployeeSale(
      req.params.id,
      req.body,
    );
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export function deleteEmployeeSale(req, res) {
  try {
    const result = EmployeeSalesService.deleteEmployeeSale(req.params.id);
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }
    res.json({ success: true, message: "Record deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
