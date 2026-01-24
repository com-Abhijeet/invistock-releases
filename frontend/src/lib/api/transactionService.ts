import { api } from "./api";
import type {
  Transaction,
  TransactionType,
  TransactionStatus,
  PaginatedTransactionsResponse,
} from "../types/transactionTypes";
import type {
  ApiFilterParams,
  DashboardFilter,
} from "../types/inventoryDashboardTypes";

const BASE_URL = "/api/transactions";

interface GetTransactionsParams {
  page?: number;
  limit?: number;
  query?: string;
  type?: TransactionType | "all";
  status?: TransactionStatus;
  filter?: "today" | "month" | "year" | "custom";
  year?: string;
  startDate?: string;
  endDate?: string;
  all?: boolean;
}

/**
 * @description Fetches a list of all transactions with optional filters and pagination.
 */
export async function getAllTransactions(params: GetTransactionsParams) {
  try {
    const response = await api.get(BASE_URL, { params });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch transactions:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch transactions.",
    );
  }
}

/**
 * @description Fetches a single transaction by its ID.
 */
export async function getTransactionById(id: number): Promise<Transaction> {
  try {
    const response = await api.get(`${BASE_URL}/${id}`);
    return response.data.data;
  } catch (error: any) {
    console.error(`Failed to fetch transaction with ID ${id}:`, error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch transaction.",
    );
  }
}

/**
 * @description Creates a new transaction record.
 */
export async function createTransaction(
  transactionData: Partial<Transaction>,
): Promise<Transaction> {
  try {
    console.log(transactionData);
    const response = await api.post(BASE_URL, transactionData);
    return response.data.data;
  } catch (error: any) {
    console.error("Failed to create transaction:", error);
    // 💡 Propagate the specific backend error message (e.g. Overpayment)
    throw new Error(
      error.response?.data?.message || "Failed to create transaction.",
    );
  }
}

/**
 * @description Updates an existing transaction record.
 */
export async function updateTransaction(
  id: number,
  updatedData: Partial<Transaction>,
): Promise<Transaction> {
  try {
    const response = await api.put(`${BASE_URL}/${id}`, updatedData);
    return response.data.data;
  } catch (error: any) {
    console.error(`Failed to update transaction with ID ${id}:`, error);
    throw new Error(
      error.response?.data?.message || "Failed to update transaction.",
    );
  }
}

/**
 * @description Soft-deletes a transaction by its ID.
 */
export async function deleteTransaction(id: number): Promise<void> {
  try {
    await api.delete(`${BASE_URL}/${id}`);
  } catch (error: any) {
    console.error(`Failed to delete transaction with ID ${id}:`, error);
    throw new Error(
      error.response?.data?.message || "Failed to delete transaction.",
    );
  }
}

/**
 * @description Fetches all transactions related to a specific original transaction.
 */
export async function getRelatedTransactions(
  relatedId: number,
  entityType: "customer" | "supplier",
): Promise<Transaction[]> {
  try {
    const response = await api.get(`${BASE_URL}/related/${relatedId}`, {
      params: { entityType },
    });
    return response.data.data;
  } catch (error: any) {
    console.error(
      `Failed to fetch related transactions for ID ${relatedId}:`,
      error,
    );
    throw new Error(
      error.response?.data?.message || "Failed to fetch related transactions.",
    );
  }
}

/**
 * @description Fetches a customer's account summary.
 */
export async function getCustomerAccountSummary(
  customerId: number,
  filters: DashboardFilter = {},
) {
  try {
    const response = await api.get(
      `${BASE_URL}/customers/${customerId}/summary`,
      { params: filters },
    );
    return response.data.data;
  } catch (error: any) {
    console.error("Failed to fetch customer summary:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch customer summary.",
    );
  }
}

/**
 * @description Fetches a supplier's account summary.
 */
export async function getSupplierAccountSummary(
  supplierId: number,
  filters: DashboardFilter = {},
) {
  try {
    const response = await api.get(
      `${BASE_URL}/suppliers/${supplierId}/summary`,
      { params: filters },
    );
    return response.data.data;
  } catch (error: any) {
    console.error("Failed to fetch supplier summary:", error);
    throw new Error(
      error.response?.data?.message || "Failed to fetch supplier summary.",
    );
  }
}

/**
 * @description Fetches a paginated list of transactions for a specific entity.
 */
export async function getEntityTransactions(
  entityId: number,
  entityType: "customer" | "supplier",
  params: ApiFilterParams,
): Promise<PaginatedTransactionsResponse> {
  try {
    const response = await api.get(`${BASE_URL}/entity/${entityId}`, {
      params: { ...params, entityType },
    });

    return response.data.data;
  } catch (error: any) {
    console.error(
      `Failed to fetch transactions for ${entityType} with ID ${entityId}:`,
      error,
    );
    throw new Error(
      error.response?.data?.message ||
        `Failed to fetch ${entityType} transactions.`,
    );
  }
}
