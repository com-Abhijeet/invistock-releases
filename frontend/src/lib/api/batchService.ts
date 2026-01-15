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
  // Added for barcode compatibility
  batch_uid?: string;
  created_at?: string;
}

export interface SerialItem {
  id: number;
  serial_number: string;
  batch_number?: string; // Joined from batch table
  status: string;
  // Join fields if needed for display
  mrp?: number;
  mop?: number;
  mfw_price?: number;
  // Added for barcode compatibility
  batch_uid?: string;
  batch_id?: number;
  created_at?: string;
}

// Payload structure for assigning untracked stock to a batch
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
  product: any; // Replace with Product type if available
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

/**
 * Fetches active batches or available serials for a product.
 */
export async function getProductBatches(
  productId: number,
  trackingType: "batch" | "serial"
) {
  try {
    const response = await api.get(
      `/api/batches/product/${productId}?trackingType=${trackingType}`
    );
    // console.log(response.data.data);
    return response.data.data; // Assumes backend returns { status: 'success', data: [...] }
  } catch (error) {
    console.error("Failed to fetch batches:", error);
    return [];
  }
}

/**
 * Assigns existing untracked stock to a new batch.
 */
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

/**
 * Fetch formatted label data for printing from Backend.
 * Used by LabelPrintModal.
 */
export const getBatchPrintData = async (payload: {
  scope: "product" | "batch" | "serial";
  productId: number;
  batchId?: number;
  serialIds?: number[] | string[]; // IDs or "all"
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
export const scanBarcodeItem = async (code: string): Promise<ScanResult> => {
  try {
    // Encode code to handle special chars safely
    const response = await api.get(
      `/api/batches/scan/${encodeURIComponent(code)}`
    );
    if (response.data.status === "success") {
      return response.data.data;
    }
    throw new Error("Item not found");
  } catch (error: any) {
    // Allow UI to handle 404 specifically
    if (error.response?.status === 404) {
      throw new Error("Item not found");
    }
    throw error.response?.data?.error || "Scan failed";
  }
};

/**
 * Get analytics for product batches.
 */
export const getBatchAnalytics = async (
  productId: number
): Promise<BatchAnalytics | null> => {
  try {
    const response = await api.get(`/api/batches/analytics/${productId}`);
    // console.log(response.data);
    if (response.data.status === "success") {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch batch analytics:", error);
    return null;
  }
};
