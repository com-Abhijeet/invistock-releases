export interface SaleItemPayload {
  id?: number;
  sale_id?: string;
  sr_no: string;
  product_id: number;
  product_name: string;
  description?: string | null;
  barcode?: string | null;
  hsn?: string | null;
  rate: number;
  quantity: number;
  gst_rate?: number;
  discount?: number;
  price: number;
  unit?: string | null;
  batch_id?: number | null;
  serial_id?: number | null;
}

/**
 * pending → Sale created but payment not completed.
 * paid → Sale completed and fully settled.
 * partial → Sale completed but payment is only partially received.
 * refunded → Sale refunded in full.
 * returned → Items returned (partial or full), linked to a return transaction & items received.
 * cancelled → Sale cancelled before payment or billing finalization.
 * draft → to support saving invoices before finalizing.
 */

export interface SalePayload {
  id?: number;
  customer_id?: number | null;
  customer_name?: string | null;
  bill_address?: string | null;
  state?: string | null;
  pincode?: string | null;
  reference_no: string;
  employee_id?: number | null;
  gstin: string | null;

  payment_mode:
    | "cash"
    | "card"
    | "upi"
    | "bank_transfer"
    | "credit"
    | "cheque"
    | "voucher"
    | "mixed";
  note?: string | null;
  paid_amount: number;
  total_amount: number;
  round_off?: number;
  discount?: number;
  status:
    | "pending"
    | "paid"
    | "partial_payment"
    | "refunded"
    | "returned"
    | "cancelled"
    | "draft";
  items: SaleItemPayload[];
  createdAt?: string;

  is_quote?: boolean;
  is_ecommerce_sale?: boolean;
  is_reverse_charge?: boolean;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  sr_no: string;
  product_id: number;
  product_name: string;
  description?: string | null;
  barcode?: string | null;
  hsn?: string | null;
  quantity: number;
  rate: number;
  gst_rate?: number;
  discount?: number;
  price: number;
  unit?: string | null;
  batch_id?: number | null;
  serial_id?: number | null;

  // Joined fields from repository
  base_unit?: string | null;
  batch_number?: string | null;
  serial_number?: string | null;
}

export interface SaleData {
  id: number;
  created_at: string;
  updated_at?: string;
  reference_no: string;

  // Snapshot / Direct fields
  customer_id?: number | null;
  customer_name?: string | null;
  bill_address?: string | null;
  state?: string | null;
  pincode?: string | null;

  // Joined fields from customer table
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_city?: string | null;
  customer_state?: string | null;
  customer_pincode?: string | null;
  customer_gst_no?: string | null;

  items: SaleItem[];
  total_amount: number;
  paid_amount: number;
  discount?: number;
  round_off?: number;
  payment_mode:
    | "cash"
    | "card"
    | "upi"
    | "bank_transfer"
    | "credit"
    | "cheque"
    | "voucher"
    | "mixed";
  status:
    | "pending"
    | "paid"
    | "partial_payment"
    | "refunded"
    | "returned"
    | "cancelled"
    | "draft";
  note?: string | null;

  is_quote?: boolean;
  is_ecommerce_sale?: boolean;
  is_reverse_charge?: boolean;

  employee_id?: number | null;

  // Reconciliation tracking
  payment_summary?: {
    total_paid: number;
    total_credit_notes: number;
    net_payable: number;
    balance: number;
    status: string;
  };
}
