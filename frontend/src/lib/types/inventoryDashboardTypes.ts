// types/inventoryDashboardTypes.ts

export interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

export interface CategorySales {
  category: string;
  category_sales: number;
  subcategories: {
    subcategory: string;
    subcategory_sales: number;
  }[];
}


export interface MovingProduct {
  id? : number;
  name: string;
  qty_sold: number;
  revenue: number;
  movement_type: "fast" | "slow";
}

export interface InventoryDashboardResponse<T> {
  status: "success" | "error";
  message: string;
  data: T;
}

export type DashboardFilterType = "today" | "month" | "year" | "custom";

export interface DashboardFilter {
  from?: string;      // ISO date
  to?: string;        // ISO date
  limit?: number;     // Optional result limit
  query?: string;
  filter?: DashboardFilterType; // ✅ Add the new property
}

// The parameter object expected BY the API service functions.
export interface ApiFilterParams {
  filter: DashboardFilterType;
  startDate?: string;
  endDate?: string;
  query?: string;
  page?: number;
  limit?: number;
  all? : boolean;
}

// 🔹 Overall stock summary
export interface StockOverall {
  total_quantity: number;
  total_value: number;
}

// 🔹 Stock aggregated by category
export interface StockByCategory {
  category: string | null; // in case category is missing
  total_quantity: number;
  total_value: number;
}

// 🔹 Stock aggregated by subcategory
export interface StockBySubcategory {
  subcategory: string | null;
  total_quantity: number;
  total_value: number;
}

// 🔹 Final API response structure
export interface TotalStockSummaryResponse {
  overall: StockOverall;
  byCategory: StockByCategory[];
  bySubcategory: StockBySubcategory[];
}
