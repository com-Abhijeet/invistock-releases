import { api } from "./api";

export interface DayBookEntry {
  id: number;
  created_at: string;
  party_name: string;
  payment_mode: string;
  ref_no: string;
  description: string;
  credit: number; // In
  debit: number; // Out
  balance: number;
  source: "transaction" | "expense";
}

export interface DayBookResponse {
  openingBalance: number;
  closingBalance: number;
  totalIn: number;
  totalOut: number;
  netChange: number;
  transactions: DayBookEntry[];
}

export async function getDayBook(date: string): Promise<DayBookResponse> {
  const res = await api.get("/api/reports/daybook", { params: { date } });
  return res.data.data;
}
