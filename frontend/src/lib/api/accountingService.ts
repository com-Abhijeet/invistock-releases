import { api } from "./api";

export interface PnLData {
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  expenses: { category: string; total: number }[];
  totalExpenses: number;
  netProfit: number;
}

export interface LedgerTransaction {
  date: string;
  record_type: string;
  reference_no: string;
  debit?: number;
  credit?: number;
  inflow?: number;
  outflow?: number;
  balance: number;
  note: string;
  payment_mode?: string;
}

export interface LedgerData {
  openingBalance: number;
  closingBalance: number;
  transactions: LedgerTransaction[];
}

export interface StockSummaryRecord {
  product_id: number;
  product_name: string;
  opening_qty: number;
  purchased_qty: number;
  sold_qty: number;
  adjusted_qty: number;
  net_change: number;
  closing_qty: number;
}

export interface StockSummaryData {
  period: { start: string; end: string };
  records: StockSummaryRecord[];
}

export const getPnLStatement = async (
  startDate: string,
  endDate: string,
): Promise<PnLData> => {
  const response = await api.get("/api/accounting/pnl", {
    params: { startDate, endDate },
  });
  return response.data.data;
};

export const getStockValuation = async () => {
  const response = await api.get("/api/accounting/stock-valuation");
  return response.data.data;
};

export const getStockSummaryReport = async (
  startDate: string,
  endDate: string,
): Promise<StockSummaryData> => {
  const response = await api.get("/api/accounting/stock-summary", {
    params: { startDate, endDate },
  });
  return response.data.data;
};

export const getCustomerLedger = async (
  id: number,
  startDate: string,
  endDate: string,
): Promise<LedgerData> => {
  const response = await api.get(`/api/accounting/ledger/customer/${id}`, {
    params: { startDate, endDate },
  });
  return response.data.data;
};

export const getSupplierLedger = async (
  id: number,
  startDate: string,
  endDate: string,
): Promise<LedgerData> => {
  const response = await api.get(`/api/accounting/ledger/supplier/${id}`, {
    params: { startDate, endDate },
  });
  return response.data.data;
};

export const getCashBankBook = async (
  modeType: "cash" | "bank",
  startDate: string,
  endDate: string,
): Promise<LedgerData> => {
  const response = await api.get(`/api/accounting/book/${modeType}`, {
    params: { startDate, endDate },
  });
  return response.data.data;
};
