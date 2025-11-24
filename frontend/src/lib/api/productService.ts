import { api } from "./api";
import { toast } from "react-hot-toast";
import type { Product, productDetails } from "../types/product";

const API_BASE = "/api/products";

// Define the types for the data returned by the API
interface HistoryEntry {
  date: string;
  type: "Purchase" | "Sale";
  quantity: string;
}

interface ProductHistorySummary {
  totalPurchased: number;
  totalSold: number;
  expectedQuantity: number;
  currentQuantity: number;
  unmarkedAdded: number;
  unmarkedRemoved: number;
}

interface ProductHistoryPayload {
  productDetails: productDetails; // Replace 'any' with your full Product type if available
  history: HistoryEntry[];
  summary: ProductHistorySummary;
}

/**
 * @description Fetches a list of products with server-side pagination and filtering.
 * @param {object} [params={}] - The query parameters for the request.
 * @param {number} [params.page] - The page number to fetch.
 * @param {number} [params.limit] - The number of records per page.
 * @param {string} [params.query] - The search term.
 * @param {boolean} [params.isActive] - Filter by active status (true for active, false for inactive).
 * @param {boolean} [params.all] - If true, fetches all records without pagination.
 * @returns {Promise<{records: Product[], totalRecords: number}>} An object containing the product records and the total count.
 */
export async function getAllProducts(
  params:
    | {
        page: number;
        limit: number;
        query: string;
        isActive: number | undefined;
        all: boolean;
      }
    | undefined
) {
  try {
    const apiParams = { ...params };

    // Convert the boolean `isActive` to a 1/0 integer for the backend API
    if (typeof apiParams.isActive === "boolean") {
      apiParams.isActive = apiParams.isActive ? 1 : 0;
    }

    // The API call now includes all filter and pagination parameters
    const res = await api.get(API_BASE, {
      params: apiParams,
    });

    // The backend should return an object with a `data` property
    // that contains the records and total count.
    console.log(res.data.data);
    return res.data.data;
  } catch (err) {
    toast.error("Failed to fetch products.");
    // Return a default empty state for a paginated response
    return { records: [], totalRecords: 0 };
  }
}

export async function getProduct(id: string) {
  try {
    const res = await api.get(`${API_BASE}/${id}`);
    return res.data.data; // ✅ Extract product
  } catch (err: any) {
    toast.error("Product not found.");
    return null;
  }
}

export async function createProduct(product: Product): Promise<Product | null> {
  try {
    const res = await api.post(API_BASE, product);
    toast.success("Product created successfully.");

    return res.data.data; // ✅ Extract new product
  } catch (err: any) {
    toast.error(err?.response?.data?.message || "Failed to create product.");
    return null;
  }
}

/**
 * Fetches the complete details and transaction history for a single product.
 * @param id The ID of the product.
 * @returns {Promise<ProductHistoryPayload>} The product's history data.
 */
export async function fetchProductHistory(
  id: number
): Promise<ProductHistoryPayload> {
  try {
    const response = await api.get(`${API_BASE}/${id}/history`);
    return response.data.data;
  } catch (err: any) {
    toast.error(
      err?.response?.data?.message || "Failed to get product history."
    );
    return err;
  }
}

export async function updateProduct(
  id: number,
  product: Partial<Product>
): Promise<Product> {
  try {
    const response = await api.put(`${API_BASE}/update/${id}`, product);
    toast.success("Product updated successfully.");
    return response.data.data;
  } catch (err: any) {
    toast.error(err?.response?.data?.message || "Failed to update product.");
    return err;
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    await api.delete(`${API_BASE}/${id}`);
    toast.success("Product deleted successfully.");
    return true;
  } catch (err: any) {
    toast.error(err?.response?.data?.message || "Failed to delete product.");
    return false;
  }
}

/**
 * @description Sends mapped product data to the backend for bulk import.
 */
export async function importProducts(payload: {
  filePath: string;
  mappings: Record<string, string>;
}) {
  try {
    const res = await api.post(`${API_BASE}/import`, payload);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Import failed.");
  }
}

// fetchNextBarcode remains unchanged
export async function fetchNextBarcode(): Promise<string> {
  const response = await api.get(`${API_BASE}/products/next-barcode`);
  return response.data.barcode;
}

// This function is now updated to accept codes
export async function fetchNextProductCode(
  categoryCode: string,
  subcategoryCode: string
): Promise<string> {
  const response = await api.get(
    `${API_BASE}/next-code?categoryCode=${categoryCode}&subcategoryCode=${subcategoryCode}`
  );
  return response.data.code;
}

export interface LowStockProduct {
  id: number;
  name: string;
  product_code: string;
  quantity: number;
  low_stock_threshold: number;
  image_url: string;
}

export async function fetchLowStockCount(): Promise<{ count: number }> {
  const response = await api.get("/api/products/low-stock/count");
  return response.data.data;
}

export async function fetchLowStockList(): Promise<LowStockProduct[]> {
  const response = await api.get("/api/products/low-stock/list");
  return response.data.data;
}

// ✅ Define the options for the new mobile endpoint
interface GetMobileProductsParams {
  page: number;
  limit: number;
  query: string;
  category: number | null;
  subcategory: number | null;
  isActive: number;
}

interface PaginatedProducts {
  records: Product[];
  totalRecords: number;
}

/**
 * Fetches a paginated list of products for the mobile view,
 * with category and subcategory filtering.
 */
export async function getProductsForMobile(
  options: GetMobileProductsParams
): Promise<PaginatedProducts> {
  // Axios will handle converting the 'params' object to a query string
  const response = await api.get("api/products/mobile-view", {
    params: options,
  });
  return response.data;
}
