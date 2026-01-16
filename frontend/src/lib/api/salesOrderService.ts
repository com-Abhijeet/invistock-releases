import { api } from "./api";

// Matches SalesItemPayload mostly but adapted for Order
export interface SalesOrderItem {
  id?: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  rate: number;
  price: number;
  gst_rate?: number;
  discount?: number;
  // Tracking
  tracking_type?: "none" | "batch" | "serial";
  batch_id?: number;
  serial_id?: number;
  batch_number?: string;
  serial_number?: string;
}

export interface SalesOrderPayload {
  id?: number;
  customer_id: number | null;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_gstin?: string;

  reference_no?: string;
  created_by?: string;
  status: "pending" | "completed" | "cancelled";
  total_amount: number;
  note?: string;
  items: SalesOrderItem[];
  created_at?: string;
  fulfilled_invoice_id?: number | null;
}

export async function getAllSalesOrders(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  const response = await api.get("/api/sales-orders", { params });
  return response.data;
}

export async function getSalesOrderById(id: number) {
  const response = await api.get(`/api/sales-orders/${id}`);
  return response.data;
}

export async function createSalesOrder(data: SalesOrderPayload) {
  const response = await api.post("/api/sales-orders/push", data);
  return response.data;
}

export async function updateSalesOrder(id: number, data: SalesOrderPayload) {
  const response = await api.put(`/api/sales-orders/${id}`, data);
  return response.data;
}

export async function deleteSalesOrder(id: number) {
  const response = await api.delete(`/api/sales-orders/${id}`);
  return response.data;
}
