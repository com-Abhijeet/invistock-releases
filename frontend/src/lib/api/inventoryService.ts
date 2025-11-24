import { api } from "./api";

export interface AdjustStockPayload {
  productId: number;
  adjustment: number; // Positive or negative integer
  category: string; // 'Damaged', 'Theft', etc.
  reason?: string; // Optional note
}

export const STOCK_ADJUSTMENT_CATEGORIES = [
  "Stocktaking Correction",
  "Damaged Goods",
  "Theft / Loss",
  "Found / Extra Stock",
  "Internal Use",
  "Expired",
  "Other",
];

export interface StockAdjustmentRow {
  id: number;
  product_name: string;
  product_code: string;
  category: string; // 'Damaged', 'Theft', etc.
  old_quantity: number;
  new_quantity: number;
  adjustment: number;
  reason: string;
  adjusted_by: string;
  created_at: string;
}

export interface AdjustmentStats {
  totalQty: number;
  breakdown: { category: string; count: number; quantity_change: number }[];
}

/**
 * Fetches the list of stock adjustments filtered by date.
 */
export async function getStockAdjustments(
  from?: string,
  to?: string
): Promise<StockAdjustmentRow[]> {
  const res = await api.get("/api/inventory/list", { params: { from, to } });
  return res.data.data;
}

/**
 * Fetches aggregated statistics for stock adjustments.
 */
export async function getStockAdjustmentStats(
  from?: string,
  to?: string
): Promise<AdjustmentStats> {
  const res = await api.get("/api/inventory/stats", { params: { from, to } });
  return res.data.data;
}

/**
 * Sends a stock adjustment request to the backend.
 * Calls POST /api/inventory/adjust
 */
export async function adjustStock(payload: AdjustStockPayload) {
  const response = await api.post("/api/inventory/adjust", payload);
  return response.data;
}
