import * as ExpenseService from "../services/expenseService.mjs";

export function createExpense(req, res) {
  try {
    const expense = ExpenseService.addExpenseService(req.body);
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export function updateExpense(req, res) {
  try {
    const { id } = req.params;
    const success = ExpenseService.updateExpenseService(id, req.body);
    if (success) {
      res.status(200).json({ success: true, message: "Expense updated" });
    } else {
      res.status(404).json({ success: false, message: "Expense not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export function deleteExpense(req, res) {
  try {
    const { id } = req.params;
    const success = ExpenseService.deleteExpenseService(id);
    if (success) {
      res.status(200).json({ success: true, message: "Expense deleted" });
    } else {
      res.status(404).json({ success: false, message: "Expense not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export function getExpenses(req, res) {
  try {
    const { from, to } = req.query; // Expects dd/mm/yyyy
    const data = ExpenseService.getExpensesService(from, to);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export function getExpenseStats(req, res) {
  try {
    const { from, to } = req.query;
    const stats = ExpenseService.getExpenseStatsService(from, to);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
