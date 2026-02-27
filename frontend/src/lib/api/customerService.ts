import { api } from "./api";
import type { CustomerType } from "../types/customerTypes";

const BASE_URL = "/api/customers";

interface ImportPayload {
  filePath: string;
  mappings: Record<string, string>;
}

export async function fetchCustomersFromAPI(): Promise<CustomerType[]> {
  const res = await api.get(BASE_URL);
  return res.data.data;
}

export async function fetchCustomerById(id: number) {
  const res = await api.get(`${BASE_URL}/${id}`);
  return res.data.data;
}

export async function fetchCustomerByPhone(
  phoneNumber: string
): Promise<CustomerType> {
  // This route looks like it might conflict with fetchCustomerById if the phone is a number.
  // If it's a dedicated route, you might want '/phone/:phoneNumber'
  const res = await api.get(`${BASE_URL}/${phoneNumber}`);
  return res.data.data;
}

export async function createCustomer(
  data: CustomerType
): Promise<CustomerType> {
  const res = await api.post(BASE_URL, data);
  return res.data.data;
}

export async function updateCustomer(
  id: number,
  data: CustomerType
): Promise<CustomerType> {
  const res = await api.put(`${BASE_URL}/${id}`, data);
  return res.data.data;
}

export async function deleteCustomer(id: number): Promise<{ message: string }> {
  const res = await api.delete(`${BASE_URL}/${id}`);
  return res.data;
}

interface GetCustomersParams {
  page?: number;
  limit?: number;
  query?: string;
  all?: boolean;
}

/**
 * @description Fetches customer data from the API based on provided parameters.
 * @param {GetCustomersParams} params - The query parameters for fetching customers.
 * @returns {Promise<any>} A promise that resolves to an object with customer records and total count.
 * @throws {Error} If the API call fails.
 */
export async function getCustomers(params: GetCustomersParams): Promise<any> {
  // Axios handles query string serialization automatically.
  // We rename 'query' to 'q' to match your previous URL builder.
  const apiParams = {
    page: params.page,
    limit: params.limit,
    q: params.query,
    all: params.all,
  };

  const res = await api.get(BASE_URL, { params: apiParams });
  
  // Axios nests the response data, so we return it in the expected format.
  return { records: res.data.data, totalRecords: res.data.totalRecords };
}

/**
 * Sends the file path and column mappings to the backend for processing.
 */
export async function importCustomers(payload: ImportPayload) {
  // This function already uses the 'api' instance and is correct.
  const response = await api.post(`${BASE_URL}/import`, payload);
  return response.data;
}

export interface OverdueCustomer {
  id: number;
  name: string;
  phone: string;
  overdue_bills_count: number;
  total_due: number;
  oldest_bill_age: number;
}

export interface OverdueBucket {
  range: string;
  customers: OverdueCustomer[];
}

export interface OverdueSummary {
  totalOverdueCustomers: number;
  buckets: OverdueBucket[];
}

export async function fetchCustomerOverdueSummary(): Promise<OverdueSummary> {
  const response = await api.get(`${BASE_URL}/overdue-summary`);
  return response.data.data;
}

export const getCustomerLedger = async (
  customerId: number,
  filters: { startDate: string; endDate: string }
) => {
  const response = await api.get(`${BASE_URL}/${customerId}/ledger`, {
    params: filters,
  });
  return response.data;
};
