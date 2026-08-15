import { api } from "./api";

export interface SalesBillingSettings {
  id: number;
  use_queue: boolean;
  queue_type: "fefo" | "fifo";
  use_default_customer: boolean;
  auto_print_after_save: boolean;
  send_whatsapp_invoice: boolean;
  payment_marking_timing: "pre_save" | "post_save";
  enable_split_payments: boolean;
  updated_at?: string;
}

export async function getSalesBillingSettings(): Promise<SalesBillingSettings> {
  const response = await api.get("/api/settings/sales-billing");
  if (response.data.status === "success") {
    return response.data.data;
  }
  throw new Error(response.data.error || "Failed to fetch sales billing settings");
}

export async function updateSalesBillingSettings(
  payload: Partial<SalesBillingSettings>
): Promise<SalesBillingSettings> {
  const response = await api.put("/api/settings/sales-billing", payload);
  if (response.data.status === "success") {
    return response.data.data;
  }
  throw new Error(response.data.error || "Failed to update sales billing settings");
}
