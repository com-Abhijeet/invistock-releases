import { api } from "./api";
import type {
  PurchaseSummary,
  TopSupplierStat,
  CategorySpend,
  PurchaseKPI,
  MonthlyStat,
} from "../types/purchaseStatsTypes";
import toast from "react-hot-toast";

const BASE_URL = "/api/purchases/stats";

export async function fetchPurchaseSummary(params?: {
  filter?: string;
  year?: string;
  start_date?: string;
  end_date?: string;
}): Promise<PurchaseSummary | null> {
  try {
    const res = await api.get(`${BASE_URL}/summary`, { params });
    return res.data.data;
  } catch (err: any) {
    console.error("Error fetching summary:", err);
    toast.error("Failed to load purchase summary");
    return null;
  }
}

export async function fetchTopSuppliers(params?: {
  filter?: string;
  year?: string;
  start_date?: string;
  end_date?: string;
}): Promise<{
  topByAmount: TopSupplierStat[];
  topByQuantity: TopSupplierStat[];
} | null> {
  try {
    const res = await api.get(`${BASE_URL}/top-suppliers`, { params });
    return res.data.data;
  } catch (err) {
    console.error("Error fetching top suppliers:", err);
    toast.error("Failed to load top supplier data");
    return null;
  }
}

export async function fetchCategorySpend(params?: {
  filter?: string;
  year?: string;
  start_date?: string;
  end_date?: string;
}): Promise<CategorySpend[] | null> {
  try {
    const res = await api.get(`${BASE_URL}/category-spend`, { params });
    return res.data.data;
  } catch (err) {
    console.error("Error fetching category spend:", err);
    toast.error("Failed to load category-wise spend");
    return null;
  }
}

export async function fetchPurchaseTrend(params?: {
  filter?: string;
  year?: string;
  start_date?: string;
  end_date?: string;
}): Promise<MonthlyStat[] | null> {
  try {
    const res = await api.get(`${BASE_URL}/daily-vs-monthly`, { params });
    return res.data.data.monthly;
  } catch (err) {
    console.error("Error fetching purchase trend:", err);
    toast.error("Failed to load trend data");
    return null;
  }
}

export async function fetchPurchaseStats(): Promise<PurchaseKPI | null> {
  try {
    const res = await api.get(`${BASE_URL}/stats`);
    return res.data.data;
  } catch (err) {
    console.error("Error fetching KPI stats:", err);
    toast.error("Failed to load purchase KPIs");
    return null;
  }
}
