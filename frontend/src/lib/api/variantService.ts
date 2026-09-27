import { api } from "./api";
import { BatchVariant, VariantFilterParams, VariantPrintLabelItem } from "../../types/variant";

export const getVariantsByBatchId = async (batchId: number): Promise<BatchVariant[]> => {
  const res = await api.get(`/api/variants/batch/${batchId}`);
  if (res.data.success) {
    return res.data.data;
  }
  throw new Error(res.data.message || "Failed to fetch batch variants");
};

export const getVariantsByProductId = async (
  productId: number,
  search?: string
): Promise<BatchVariant[]> => {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  const queryStr = params.toString();
  const res = await api.get(`/api/variants/product/${productId}${queryStr ? `?${queryStr}` : ""}`);
  if (res.data.success) {
    return res.data.data;
  }
  throw new Error(res.data.message || "Failed to fetch product variants");
};

export const getAllVariants = async (
  params?: VariantFilterParams
): Promise<{ rows: BatchVariant[]; total: number }> => {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.append("search", params.search);
  if (params?.page) searchParams.append("page", String(params.page));
  if (params?.limit) searchParams.append("limit", String(params.limit));

  const queryStr = searchParams.toString();
  const res = await api.get(`/api/variants${queryStr ? `?${queryStr}` : ""}`);
  if (res.data.success) {
    return { rows: res.data.rows, total: res.data.total };
  }
  throw new Error(res.data.message || "Failed to fetch variants");
};

export const updateVariant = async (
  id: number,
  data: Partial<BatchVariant>
): Promise<BatchVariant> => {
  const res = await api.put(`/api/variants/${id}`, data);
  if (res.data.success) {
    return res.data.data;
  }
  throw new Error(res.data.message || "Failed to update variant");
};

export const getVariantPrintPayload = async (options: {
  variantIds?: number[];
  variantItems?: { id: number; copies?: number }[];
  copies?: number;
  useStockQuantity?: boolean;
}): Promise<VariantPrintLabelItem[]> => {
  const res = await api.post("/api/variants/print-labels", options);
  if (res.data.success) {
    return res.data.labels;
  }
  throw new Error(res.data.message || "Failed to generate variant label print payload");
};
