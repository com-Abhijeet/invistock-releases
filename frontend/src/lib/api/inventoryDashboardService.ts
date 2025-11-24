// lib/api/inventoryDashboardService.ts

import { api } from "./api";
import type {
  TopProduct,
  CategorySales,
  MovingProduct,
  InventoryDashboardResponse,
} from "../types/inventoryDashboardTypes";

// Base API path
const BASE = "/api/inventory-dashboard";

export async function getTopProducts(params?: Record<string, any>) {
  const res = await api.get<InventoryDashboardResponse<TopProduct[]>>(
    `${BASE}/top-products`,
    {
      params,
    }
  );

  return res.data.data;
}

export async function getCategorySales(params?: Record<string, any>) {
  const res = await api.get<InventoryDashboardResponse<CategorySales[]>>(
    `${BASE}/category-sales`,
    {
      params,
    }
  );
  return res.data.data;
}

export async function getFastMovingProducts(params?: Record<string, any>) {
  const res = await api.get<InventoryDashboardResponse<MovingProduct[]>>(
    `${BASE}/fast-moving`,
    {
      params,
    }
  );

  return res.data.data;
}

export async function getSlowMovingProducts(params?: Record<string, any>) {
  const res = await api.get<InventoryDashboardResponse<MovingProduct[]>>(
    `${BASE}/slow-moving`,
    {
      params,
    }
  );
  return res.data.data;
}

export async function getTotalStockSummary() {
  const res = await api.get(`${BASE}/total-stock`);

  if (res.data.status !== "success") {
    throw new Error("Failed to fetch stock summary");
  }

  return res.data.data;
}
