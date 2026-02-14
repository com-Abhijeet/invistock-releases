import { api } from "./api";
import { toast } from "react-hot-toast";
import type { PurchaseItem, PurchasePayload } from "../types/purchaseTypes";
import type { ApiFilterParams } from "../types/inventoryDashboardTypes";

const BASE_URL = "/api/purchases";

// interface GetPurchasesBySupplierParams {
//   page?: number;
//   limit?: number;
//   query?: string;
//   filter?: 'today' | 'month' | 'year' | 'custom';
//   year?: string;
//   startDate?: string;
//   endDate?: string;
//   all?: boolean;
// }

export async function createPurchase(purchase: PurchasePayload) {
  try {
    const response = await api.post(BASE_URL, purchase);
    toast.success("Purchase created successfully");
    return response.data;
  } catch (error: any) {
    const message =
      error?.response?.data?.message || "Failed to create purchase";
    toast.error(message);
    throw error;
  }
}

export async function updatePurchase(id: string, purchase: PurchasePayload) {
  try {
    const response = await api.put(`${BASE_URL}/${id}`, purchase);
    toast.success("Purchase updated successfully");
    return response.data;
  } catch (error: any) {
    const message =
      error?.response?.data?.message || "Failed to update purchase";
    toast.error(message);
    throw error;
  }
}

export async function deletePurchase(id: string) {
  try {
    await api.delete(`${BASE_URL}/${id}`);
    toast.success("Purchase deleted");
  } catch (error: any) {
    const message =
      error?.response?.data?.message || "Failed to delete purchase";
    toast.error(message);
    throw error;
  }
}

export async function getPurchaseById(id: string) {
  try {
    const response = await api.get(`${BASE_URL}/${id}`);
    return response.data;
  } catch (error: any) {
    const message =
      error?.response?.data?.message || "Failed to fetch purchase";
    toast.error(message);
    throw error;
  }
}

export async function getAllPurchases(params?: any) {
  try {
    const response = await api.get(BASE_URL, { params });

    return response.data;
  } catch (error: any) {
    const message =
      error?.response?.data?.message || "Failed to fetch purchases";
    toast.error(message);
    throw error;
  }
}

export async function getPurchaseSummary(params?: Record<string, any>) {
  try {
    const response = await api.get(`${BASE_URL}/summary`, { params });
    return response.data;
  } catch (error: any) {
    const message = error?.response?.data?.message || "Failed to fetch summary";
    toast.error(message);
    throw error;
  }
}

/**
 * @description Fetches a paginated list of purchases for a specific supplier.
 * @param {number} supplierId - The ID of the supplier.
 * @param {GetPurchasesBySupplierParams} params - The query parameters for filtering and pagination.
 * @returns {Promise<PaginatedPurchaseResponse>} A paginated list of purchase records.
 */
export async function getPurchasesBySupplierId(
  supplierId: number,
  params: ApiFilterParams,
) {
  try {
    const response = await api.get(`${BASE_URL}/supplier/${supplierId}`, {
      params,
    });
    return response.data.data;
  } catch (error) {
    console.error(
      `Failed to fetch purchases for supplier ${supplierId}:`,
      error,
    );
    throw new Error("Failed to fetch supplier purchases.");
  }
}

export interface LabelItem extends PurchaseItem {
  id?: number;
  name: string;
  product_code: string;
  barcode: string;
  mrp: number;
  mop: number;
  mfw_price: string;
  purchase_quantity: number;
  purchase_unit: string;
  batch_uid?: string;
  batch_number?: string;
  serial_numbers?: string;
  tracking_type?: "none" | "batch" | "serial";
  expiry_date?: string;
}

export const fetchPurchaseItemsForLabels = async (
  purchaseId: number,
): Promise<LabelItem[]> => {
  try {
    const response = await api.get(`/api/purchases/${purchaseId}/labels`);
    return response.data.data;
  } catch (error: any) {
    console.error("Error fetching items for labels:", error);
    throw new Error(
      error.response?.data?.error || "Failed to fetch label items",
    );
  }
};
