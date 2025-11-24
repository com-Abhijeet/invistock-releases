export type MonthlyStat = {
  period: string; // e.g. "2025-07" or "2025-07-21"
  total: number;
};

export type PurchaseSummary = {
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  monthly: MonthlyStat[];
};

export type TopSupplierStat = {
  supplier_name: string;
  total: number;
};

export type CategorySpend = {
  category_name: string;
  total_spend: number;
};

export type PurchaseKPI = {
  total_purchases: number;
  avg_purchase_value: number;
  max_purchase:number;
  top_supplier: {
    id: number;
    supplier_name: string;
    count: number;
  };
  recent: {
    id: number;
    reference_no: string;
    date: string;
    total_amount: number;
  }[];
};
