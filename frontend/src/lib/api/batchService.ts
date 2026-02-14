import { api } from "./api";

// --- Types ---

export interface BatchItem {
  id: number;
  batch_number: string;
  expiry_date?: string;
  mfg_date?: string;
  quantity: number;
  mrp?: number;
  mop?: number;
  mfw_price?: number;
  location?: string;
  batch_uid?: string;
  created_at?: string;
  barcode?: string;
}

export interface SerialItem {
  id: number;
  serial_number: string;
  batch_number?: string;
  status: string;
  mrp?: number;
  mop?: number;
  mfw_price?: number;
  batch_uid?: string;
  batch_id?: number;
  created_at?: string;
}

export interface AssignStockPayload {
  productId: number;
  quantity: number;
  batchNumber: string;
  location?: string;
  expiryDate?: string;
  mfgDate?: string;
  mrp?: number;
  mop?: number;
  mfwPrice?: number;
  serials?: string[];
}

export interface PrintLabelPayload {
  barcode: string;
  label: string;
  price?: number;
  copies: number;
}

export interface ScanResult {
  type: "product" | "batch" | "serial";
  product: any;
  batch?: BatchItem;
  serial?: SerialItem;
}

export interface BatchAnalytics {
  priceTrend: {
    date: string;
    purchase_price: number;
    batch_number: string;
  }[];
  ageDistribution: { age_group: string; count: number }[];
  supplierPerformance: {
    supplier_name: string;
    batch_count: number;
    avg_purchase_price: number;
  }[];
  lowStockCount: number;
  salesVelocity: { batch_number: string; sold_qty: number }[];
  avgMrp: number;
}

// --- API Methods ---

export async function getProductBatches(
  productId: number,
  trackingType: "batch" | "serial",
) {
  try {
    const response = await api.get(
      `/api/batches/product/${productId}?trackingType=${trackingType}`,
    );
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch batches:", error);
    return [];
  }
}

export async function assignStockToBatch(payload: AssignStockPayload) {
  try {
    const response = await api.post("/api/batches/assign-stock", payload);
    if (response.data.status === "success") {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to assign stock");
  } catch (error: any) {
    console.error("Failed to assign stock:", error);
    throw error.response?.data?.error || error.message;
  }
}

export const getBatchPrintData = async (payload: {
  scope: "product" | "batch" | "serial";
  productId: number;
  batchId?: number;
  serialIds?: number[] | string[];
  copies: number;
}): Promise<PrintLabelPayload[]> => {
  try {
    const response = await api.post("/api/batches/print-data", payload);
    if (response.data.status === "success") {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to generate labels");
  } catch (error: any) {
    console.error("Error fetching print data:", error);
    throw error.response?.data?.error || error.message;
  }
};

/**
 * Scan a barcode (Product, Batch UID, or Serial Composite).
 * Used by POS Search.
 */
export const scanBarcodeItem = async (code: string) => {
  try {
    const response = await api.get(
      `/api/batches/scan/${encodeURIComponent(code)}`,
    );
    console.log(response.data.data);
    if (response.data.status === "success") {
      return response.data.data;
    }
    throw new Error("Item not found");
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error("Item not found");
    }
    throw error.response?.data?.error || "Scan failed";
  }
};

export const getBatchAnalytics = async (
  productId: number,
): Promise<BatchAnalytics | null> => {
  try {
    const response = await api.get(`/api/batches/analytics/${productId}`);
    if (response.data.status === "success") {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch batch analytics:", error);
    return null;
  }
};

// --- New Barcode Methods ---

export const generateBarcode = async (): Promise<string> => {
  try {
    const res = await api.get(`/api/batches/generate-barcode`);
    if (res.data.status === "success") {
      return res.data.barcode;
    }
    throw new Error(res.data.error || "Failed to generate barcode");
  } catch (error) {
    console.error("Barcode generation failed:", error);
    // Fallback to safe timestamp-based string if API fails
    return Date.now().toString().slice(-10);
  }
};

export const checkBarcodeExists = async (code: string): Promise<boolean> => {
  if (!code) return false;
  try {
    const res = await api.get(`/api/batches/check-barcode/${code}`);
    return res.data.exists;
  } catch (error) {
    console.error("Barcode check failed:", error);
    return false;
  }
};
