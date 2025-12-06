import { api } from "./api";

export interface RestockItem {
  id: number;
  name: string;
  product_code: string;
  current_stock: number;
  unit_cost: number;
  sold_last_x_days: number;
  dailyVelocity: number;
  daysRemaining: number;
  suggestedOrder: number;
  estimatedCost: number;
  status: "critical" | "warning" | "healthy";
}

export async function getPredictiveRestock(): Promise<RestockItem[]> {
  const res = await api.get("/api/analytics/restock-prediction");
  return res.data.data;
}

export interface DeadStockItem {
  id: number;
  name: string;
  product_code: string;
  current_stock: number;
  unit_cost: number;
  mrp: number;
  category_name: string;
  capital_stuck: number;
  last_sold_date: string | null;
}

export interface DeadStockResponse {
  report: DeadStockItem[];
  summary: {
    totalCapitalStuck: number;
    totalItems: number;
  };
}

export async function getDeadStockReport(
  days: number
): Promise<DeadStockResponse> {
  const res = await api.get("/api/analytics/dead-stock", { params: { days } });
  return res.data.data;
}

export interface CustomerInsight {
  id: number;
  name: string;
  phone: string;
  order_count: number;
  total_revenue: number; // CLV
  last_purchase_date: string;
  days_inactive: number;
  aov: number;
  segment: "VIP" | "Regular" | "New" | "Dormant";
}

export interface CustomerInsightsResponse {
  all: CustomerInsight[];
  stats: {
    totalCustomers: number;
    activeCount: number;
    dormantCount: number;
    avgCLV: number;
  };
}

export async function getCustomerInsights(
  dormantDays: number = 90
): Promise<CustomerInsightsResponse> {
  const res = await api.get("/api/analytics/customer-insights", {
    params: { days: dormantDays },
  });
  return res.data.data;
}

export interface ABCProduct {
  id: number;
  name: string;
  product_code: string;
  current_stock: number;
  total_revenue: number;
  classification: "A" | "B" | "C";
  share: string; // Percentage share string
}

export interface ABCStats {
  A: { count: number; revenue: number };
  B: { count: number; revenue: number };
  C: { count: number; revenue: number };
}

export interface ABCResponse {
  report: ABCProduct[];
  stats: ABCStats;
}

export async function getABCAnalysis(days: number = 365): Promise<ABCResponse> {
  const res = await api.get("/api/analytics/abc-analysis", {
    params: { days },
  });
  return res.data.data;
}
