import type { DashboardFilterType as FilterType } from "./inventoryDashboardTypes";

export interface SalesFilter {
  filter: FilterType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  limitTop?: number; // for top-customers/products
}

// Responses
export interface TrendPoint {
  period: string; // e.g., "2025-07" or "2025-07-31"
  total: number;
}

export interface TrendData {
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  monthly: TrendPoint[];
}

export interface FinancialMetrics {
  totalSales: number;
  totalPaid: number;
  outstanding: number;
  avgSale: number;
}

export interface OrderMetrics {
  salesCount: number;
  pendingCount: number;
  paidPercentage: number;
  repeatCustomers: number;
}

export interface TopCustomer {
  name: string;
  sales: number;
}

export interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

export interface CategoryRevenue {
  name: string;
  revenue: number;
}

export interface PaymentModeBreakdown {
  mode: string;
  amount: number;
  percentage: number;
}

export interface BestSalesDay {
  date: string;
  revenue: number;
}

export interface SalesTable {
  id: number;
  customer_id?: number;
  customer: string;
  total: number;
  paid_amount: number;
  payment_mode: string;
  status: string;
  created_at: string;
}

// New type for API response
export interface SalesTableResponse {
  records: SalesTable[];
  totalRecords: number;
}
