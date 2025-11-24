import { api } from "./api"; // ✅ Import your central api instance
import type { SupplierType } from "../types/supplierTypes";

const BASE_URL = "/api/suppliers";
const CACHE_KEY = "suppliers";

// --- Low-level API Calls (always hit backend) ---

export async function fetchSuppliersFromAPI(): Promise<SupplierType[]> {
  try {
    const res = await api.get(BASE_URL);
    return res.data.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch suppliers"
    );
  }
}

export async function createSupplier(
  data: SupplierType
): Promise<SupplierType> {
  try {
    // ✅ Use api.post. No headers or stringify needed.
    const res = await api.post(BASE_URL, data);
    clearSuppliersCache(); // Clear cache on successful creation
    return res.data.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to create supplier"
    );
  }
}

export async function updateSupplier(
  id: number,
  data: SupplierType
): Promise<SupplierType> {
  try {
    // ✅ Use api.put.
    const res = await api.put(`${BASE_URL}/${id}`, data);
    clearSuppliersCache(); // Clear cache on successful update
    return res.data.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to update supplier"
    );
  }
}

export async function getSupplierById(id: number): Promise<SupplierType> {
  try {
    // ✅ Use api.get
    const res = await api.get(`${BASE_URL}/${id}`);
    return res.data.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Error in fetching supplier"
    );
  }
}

export async function deleteSupplier(id: number): Promise<{ message: string }> {
  try {
    // ✅ Use api.delete
    const res = await api.delete(`${BASE_URL}/${id}`);
    clearSuppliersCache(); // Clear cache on successful delete
    return res.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to delete supplier"
    );
  }
}

// --- Cached SupplierType Fetch (Smart logic) ---

export async function getSuppliers(): Promise<SupplierType[]> {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.warn("Failed to parse suppliers cache, refetching.");
      localStorage.removeItem(CACHE_KEY);
    }
  }

  // This function will now use the updated, axios-based version
  const suppliers = await fetchSuppliersFromAPI();
  localStorage.setItem(CACHE_KEY, JSON.stringify(suppliers));
  return suppliers;
}

export function clearSuppliersCache() {
  localStorage.removeItem(CACHE_KEY);
}
