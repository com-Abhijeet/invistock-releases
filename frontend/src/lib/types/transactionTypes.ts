// src/lib/types/transactionTypes.ts

export type TransactionType =
  | "payment_in"
  | "payment_out"
  | "credit_note"
  | "debit_note";
export type TransactionStatus =
  | "paid"
  | "pending"
  | "cancelled"
  | "refunded"
  | "issued";
export type BillType = "sale" | "purchase";
export type EntityType = "customer" | "supplier";

export interface Transaction {
  id: number;
  reference_no: string;
  type: TransactionType;

  bill_id?: number | null;
  bill_type?: BillType | null;

  bill_ref_no?: string;

  entity_id: number;
  entity_type: EntityType;
  transaction_date: string;
  amount: number;
  payment_mode?: string | null;
  status: TransactionStatus;
  note?: string | null;
  gst_amount?: number;
  discount?: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedTransactionsResponse {
  records: Transaction[];
  totalRecords: number;
}

export interface GetEntityTransactionsParams {
  page?: number;
  limit?: number;
  query?: string;
  type?: string;
  status?: string;
  filter?: "today" | "month" | "year" | "custom";
  year?: string;
  startDate?: string;
  endDate?: string;
  all?: boolean;
}
