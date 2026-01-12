import { api } from "./api";
import type { NonGstSalePayload } from "../types/nonGstSalesTypes";
import { ReactNode } from "react";

/**
 * Creates a new Non-GST Sale.
 * Calls POST /api/sales-non-gst
 */
export async function createNonGstSale(
  sale: NonGstSalePayload
): Promise<{ status: string; data?: any; error?: string }> {
  try {
    const response = await api.post("/api/sales-non-gst", sale);
    return response.data;
  } catch (error: any) {
    return {
      status: "error",
      error: error.response?.data?.error || "An unknown error occurred.",
    };
  }
}

// Define the shape of the data for a single row in the table
export interface NonGstSaleRow {
  id: number;
  reference: string;
  customer: string; // The backend aliases customer_name as customer
  total: number;
  paid_amount: number;
  payment_mode: string;
  status: string;
  created_at: string;
}

// Define the paginated response structure
interface PaginatedNonGstSales {
  records: NonGstSaleRow[];
  totalRecords: number;
}

// Define the filter options
interface GetSalesOptions {
  page: number;
  limit: number;
  query: string;
}

/**
 * Fetches a paginated and searchable list of all non-GST sales.
 * Calls GET /api/sales-non-gst
 */
export async function getNonGstSales(
  options: GetSalesOptions
): Promise<PaginatedNonGstSales> {
  const params = new URLSearchParams({
    page: String(options.page),
    limit: String(options.limit),
    query: options.query,
  });

  const response = await api.get(`/api/sales-non-gst?${params.toString()}`);
  return response.data;
}

export interface FullNonGstSale extends NonGstSalePayload {
  customer_address: ReactNode;
  customer_city: ReactNode;
  customer_state: ReactNode;
  customer_pincode: ReactNode;
  // The payload types now directly include customer_name/phone
  // so we don't need extra fields here unless backend adds audit info
}

/**
 * Fetches a single non-GST sale by its ID.
 * Calls GET /api/sales-non-gst/:id
 */
export async function getNonGstSaleById(id: number): Promise<FullNonGstSale> {
  const response = await api.get(`/api/sales-non-gst/${id}`);
  return response.data.data;
}

/**
 * Fetches a list of unique product names for autocomplete suggestions.
 * Calls GET /api/sales-non-gst/unique-products
 */
export async function getUniqueProductNames(): Promise<string[]> {
  const response = await api.get("/api/sales-non-gst/unique-products");
  return response.data.data;
}
