import { api } from "./api";
import type { Expense, ExpenseStats } from "../types/expenseTypes";

const BASE_URL = "/api/expenses";

export async function getExpenses(
  from?: string,
  to?: string
): Promise<Expense[]> {
  const params = { from, to };
  const res = await api.get(BASE_URL, { params });
  return res.data.data;
}

export async function getExpenseStats(
  from?: string,
  to?: string
): Promise<ExpenseStats> {
  const params = { from, to };
  const res = await api.get(`${BASE_URL}/stats`, { params });
  return res.data.data;
}

export async function createExpense(data: Expense): Promise<Expense> {
  const res = await api.post(BASE_URL, data);
  return res.data.data;
}

export async function updateExpense(
  id: number,
  data: Expense
): Promise<Expense> {
  const res = await api.put(`${BASE_URL}/${id}`, data);
  return res.data.data;
}

export async function deleteExpense(id: number): Promise<boolean> {
  await api.delete(`${BASE_URL}/${id}`);
  return true;
}
