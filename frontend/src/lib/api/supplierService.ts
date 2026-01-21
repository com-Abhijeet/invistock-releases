import { api } from "./api";
import type { SupplierType } from "../types/supplierTypes";

const BASE_URL = "/api/suppliers";

// --- Supplier API Services ---

/**
 * @description Fetches all suppliers directly from the API.
 */
export async function getSuppliers(): Promise<SupplierType[]> {
  try {
    const res = await api.get(BASE_URL);
    return res.data.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch suppliers",
    );
  }
}

// Alias for backward compatibility if used directly elsewhere
export const fetchSuppliersFromAPI = getSuppliers;

export async function createSupplier(
  data: SupplierType,
): Promise<SupplierType> {
  try {
    const res = await api.post(BASE_URL, data);
    return res.data.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to create supplier",
    );
  }
}

export async function updateSupplier(
  id: number,
  data: SupplierType,
): Promise<SupplierType> {
  try {
    const res = await api.put(`${BASE_URL}/${id}`, data);
    return res.data.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to update supplier",
    );
  }
}

export async function getSupplierById(id: number): Promise<SupplierType> {
  try {
    const res = await api.get(`${BASE_URL}/${id}`);
    return res.data.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Error in fetching supplier",
    );
  }
}

export async function deleteSupplier(id: number): Promise<{ message: string }> {
  try {
    const res = await api.delete(`${BASE_URL}/${id}`);
    return res.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to delete supplier",
    );
  }
}

export const getSupplierLedger = async (
  supplierId: number,
  filters: { startDate: string; endDate: string },
) => {
  const response = await api.get(`${BASE_URL}/${supplierId}/ledger`, {
    params: filters,
  });
  return response.data;
};
