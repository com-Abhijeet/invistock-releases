import * as EmployeeService from "../services/employeeService.mjs";

export function getEmployees(req, res) {
  try {
    const { activeOnly } = req.query;
    const data =
      activeOnly === "true"
        ? EmployeeService.getActiveEmployees()
        : EmployeeService.getAllEmployees();
    res.json({ success: true, data });
  } catch (error) {
    console.log("[Backend] - Error in employee controller", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export function getEmployeeById(req, res) {
  try {
    const data = EmployeeService.getEmployeeById(req.params.id);
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    res.json({ success: true, data });
  } catch (error) {
    console.log("[Backend] - Error in employee controller", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export function createEmployee(req, res) {
  try {
    const result = EmployeeService.createEmployee(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.log("[Backend] - Error in employee controller", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export function updateEmployee(req, res) {
  try {
    const result = EmployeeService.updateEmployee(req.params.id, req.body);
    if (!result)
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    res.json({ success: true, data: result });
  } catch (error) {
    console.log("[Backend] - Error in employee controller", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export function deleteEmployee(req, res) {
  try {
    const result = EmployeeService.deleteEmployee(req.params.id);
    if (!result)
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    res.json({ success: true, message: "Employee deactivated successfully" });
  } catch (error) {
    console.log("[Backend] - Error in employee controller", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export function getEmployeeStats(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const stats = EmployeeService.getEmployeeStats(startDate, endDate);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.log("[Backend] - Error in employee controller", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
