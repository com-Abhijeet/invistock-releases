import * as ExpenseRepo from "../repositories/expenseRepository.mjs";

// Helper to ensure date is YYYY-MM-DD for SQLite
const normalizeToDbDate = (dateStr) => {
  if (!dateStr) return null;
  // If it's already YYYY-MM-DD, return it
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;

  // If it's DD/MM/YYYY, convert it
  if (dateStr.includes("/")) {
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month}-${day}`;
  }
  return dateStr;
};

export function addExpenseService(data) {
  const expense = {
    ...data,
    // Ensure we save as YYYY-MM-DD
    date: normalizeToDbDate(data.date),
  };
  return ExpenseRepo.createExpense(expense);
}

export function updateExpenseService(id, data) {
  const expense = {
    ...data,
    date: normalizeToDbDate(data.date),
  };
  return ExpenseRepo.updateExpense(id, expense);
}

export function getExpensesService(from, to) {
  // Ensure filters are YYYY-MM-DD
  const dbFrom = normalizeToDbDate(from);
  const dbTo = normalizeToDbDate(to);

  const expenses = ExpenseRepo.getExpenses(dbFrom, dbTo);

  // Optional: Convert back to DD/MM/YYYY for frontend display if needed
  // Or just return as is and let frontend format it
  return expenses;
}

export function getExpenseStatsService(from, to) {
  const dbFrom = normalizeToDbDate(from);
  const dbTo = normalizeToDbDate(to);

  const breakdown = ExpenseRepo.getExpenseStats(dbFrom, dbTo);
  const total = ExpenseRepo.getTotalExpenses(dbFrom, dbTo);

  return {
    total,
    breakdown,
    period: { from: dbFrom, to: dbTo },
  };
}

export const deleteExpenseService = ExpenseRepo.deleteExpense;
