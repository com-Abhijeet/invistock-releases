export interface Expense {
  id?: number;
  date: string; // Display format: DD/MM/YYYY
  category: string;
  amount: number;
  payment_mode: string;
  description?: string;
  created_at?: string;
}

export interface ExpenseStats {
  total: number;
  breakdown: { category: string; total: number }[];
  period: { from: string; to: string };
}

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Salary",
  "Electricity Bill",
  "Water Bill",
  "Internet/Wi-Fi",
  "Transportation",
  "Tea & Refreshments",
  "Maintenance",
  "Stationery",
  "Marketing",
  "Other",
];

export const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card"];
