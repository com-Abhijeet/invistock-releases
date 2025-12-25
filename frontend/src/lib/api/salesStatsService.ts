import toast from "react-hot-toast";
import { api } from "./api"; // ✅ Import your central api instance
import type {
  SalesFilter,
  FinancialMetrics,
  OrderMetrics,
  TopCustomer,
  TopProduct,
  PaymentModeBreakdown,
  BestSalesDay,
  SalesTableResponse,
} from "../types/salesStatsTypes";

// ❌ The BASE_URL and buildQueryParams are no longer needed.
const BASE_URL = "/api/sales"; // ✅ Axios will prepend this to its requests

export async function fetchSalesTrend(filters: SalesFilter) {
  try {
    // ✅ Use api.get with the 'params' option
    const res = await api.get(`${BASE_URL}/trend`, { params: filters });
    return res.data?.data ?? [];
  } catch (error: any) {
    console.error("❌ Error fetching sales trend:", error);
    toast.error(error.response?.data?.message || "Failed to fetch sales trend");
    return [];
  }
}

export async function fetchFinancialMetrics(
  filters: SalesFilter
): Promise<FinancialMetrics> {
  try {
    const res = await api.get(`${BASE_URL}/financial-metrics`, {
      params: filters,
    });
    return (
      res.data.data ?? {
        totalSales: 0,
        totalPaid: 0,
        outstanding: 0,
        avgSale: 0,
      }
    );
  } catch (error: any) {
    console.error("❌ Error fetching financial metrics:", error);
    toast.error(
      error.response?.data?.message || "Failed to fetch financial metrics"
    );
    return { totalSales: 0, totalPaid: 0, outstanding: 0, avgSale: 0 };
  }
}

export async function fetchOrderMetrics(
  filters: SalesFilter
): Promise<OrderMetrics> {
  try {
    const res = await api.get(`${BASE_URL}/order-metrics`, { params: filters });
    return (
      res.data.data ?? {
        salesCount: 0,
        pendingCount: 0,
        paidPercentage: 0,
        repeatCustomers: 0,
      }
    );
  } catch (error: any) {
    console.error("❌ Error fetching order metrics:", error);
    toast.error(
      error.response?.data?.message || "Failed to fetch order metrics"
    );
    return {
      salesCount: 0,
      pendingCount: 0,
      paidPercentage: 0,
      repeatCustomers: 0,
    };
  }
}

export async function fetchTopCustomers(
  filters: SalesFilter
): Promise<TopCustomer[]> {
  try {
    const res = await api.get(`${BASE_URL}/top-customers`, { params: filters });
    return res.data?.data?.customers ?? [];
  } catch (error: any) {
    console.error("❌ Error fetching top customers:", error);
    toast.error(
      error.response?.data?.message || "Failed to fetch top customers"
    );
    return [];
  }
}

export async function fetchTopProducts(
  filters: SalesFilter
): Promise<TopProduct[]> {
  try {
    const res = await api.get(`${BASE_URL}/top-products`, { params: filters });
    return res.data?.data ?? [];
  } catch (error: any) {
    console.error("❌ Error fetching top products:", error);
    toast.error(
      error.response?.data?.message || "Failed to fetch top products"
    );
    return [];
  }
}

export async function fetchCategoryRevenue(filters: SalesFilter) {
  try {
    const res = await api.get(`${BASE_URL}/category-revenue`, {
      params: filters,
    });
    return res.data?.data ?? [];
  } catch (error: any) {
    console.error("❌ Error fetching category revenue:", error);
    toast.error(
      error.response?.data?.message || "Failed to fetch category revenue"
    );
    return [];
  }
}

export async function fetchPaymentModeBreakdown(
  filters: SalesFilter
): Promise<PaymentModeBreakdown[]> {
  try {
    const res = await api.get(`${BASE_URL}/payment-mode-breakdown`, {
      params: filters,
    });
    return res.data?.data ?? [];
  } catch (error: any) {
    console.error("❌ Error fetching payment mode breakdown:", error);
    toast.error(
      error.response?.data?.message || "Failed to fetch payment mode breakdown"
    );
    return [];
  }
}

export async function fetchCreditSales(filters: SalesFilter): Promise<number> {
  try {
    const res = await api.get(`${BASE_URL}/credit-sales`, { params: filters });
    return res.data?.data ?? 0;
  } catch (error: any) {
    console.error("❌ Error fetching credit sales:", error);
    toast.error(
      error.response?.data?.message || "Failed to fetch credit sales"
    );
    return 0;
  }
}

export async function fetchBestSalesDay(
  filters: SalesFilter
): Promise<BestSalesDay | null> {
  try {
    const res = await api.get(`${BASE_URL}/best-sales-day`, {
      params: filters,
    });
    return res.data?.data ?? null;
  } catch (error: any) {
    console.error("❌ Error fetching best sales day:", error);
    toast.error(
      error.response?.data?.message || "Failed to fetch best sales day"
    );
    return null;
  }
}

export async function fetchSalesTable(
  filters: SalesFilter
): Promise<SalesTableResponse> {
  try {
    const res = await api.get(`${BASE_URL}/table`, { params: filters });
    return {
      records: res.data?.records ?? [],
      totalRecords: res.data?.totalRecords ?? 0,
    };
  } catch (error: any) {
    console.error("❌ Error fetching sales table:", error);
    toast.error(error.response?.data?.message || "Failed to fetch sales table");
    return { records: [], totalRecords: 0 };
  }
}

export async function fetchCustomerSalesMetrics(customerId: number) {
  try {
    // ✅ Updated to use api.get
    const res = await api.get(`${BASE_URL}/customerMetrics/${customerId}`);
    return res.data.data;
  } catch (error: any) {
    console.error("❌ Error fetching customer sales data", error);
    toast.error(
      error.response?.data?.message || "Failed to fetch customer sales data"
    );
    return { records: [], totalRecords: 0 };
  }
}
