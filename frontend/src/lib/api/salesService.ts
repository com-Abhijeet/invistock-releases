import { api } from "./api";
import toast from "react-hot-toast";
import type { SalePayload } from "../types/salesTypes";
import type { ApiFilterParams } from "../types/inventoryDashboardTypes";

const BASE_URL = "/api/sales"; // Adjust base if needed

//  Create a new sale bill with items
export async function createSale(payload: SalePayload) {
  try {
    const response = await api.post(`${BASE_URL}`, payload);
    toast.success("Sale bill created successfully!");
    return response.data;
  } catch (error: any) {
    const message =
      error?.response?.data?.message || "Failed to create sale bill.";
    toast.error(message);
    throw new Error(message);
  }
}

//  Get paginated list of all sales (optional filters can be added later)
export async function getSales(page = 1, limit = 10) {
  try {
    const response = await api.get(`${BASE_URL}?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error: any) {
    toast.error("Failed to fetch sales.");
    throw error;
  }
}

//  Get a single sale with items
export async function getSaleById(saleId: number) {
  try {
    const response = await api.get(`${BASE_URL}/${saleId}`);
    return response.data;
  } catch (error: any) {
    toast.error("Failed to fetch sale details.");
    throw error;
  }
}

//  Delete a sale (and its items)
export async function deleteSale(saleId: number) {
  try {
    await api.delete(`${BASE_URL}/${saleId}`);
    toast.success("Sale deleted successfully.");
  } catch (error: any) {
    const message = error?.response?.data?.message || "Failed to delete sale.";
    toast.error(message);
    throw new Error(message);
  }
}

export async function updateSaleStatus(saleId: number, status: string) {
  try {
    await api.put(`${BASE_URL}/update/${saleId}`, { status });
    toast.success("Sale status updated successfully.");
  } catch (error) {
    toast.error("Failed to update Status ");
    throw error;
  }
}

export async function fetchCustomerSales(
  customerId: number,
  filters: ApiFilterParams,
) {
  try {
    const response = await api.get(`${BASE_URL}/customer/${customerId}`, {
      params: filters,
    });

    return response.data.data;
  } catch (error) {
    toast.error("Failed to fetch customer sales");
    throw error;
  }
}
