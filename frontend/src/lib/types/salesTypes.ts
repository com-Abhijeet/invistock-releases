export interface SaleItemPayload {
  hsn: string;
  product_name?: string;
  id?: number;
  sale_id?: string;
  sr_no: string;
  product_id: number;
  rate: number;
  quantity: number;
  gst_rate?: number;
  discount?: number;
  price: number;
  unit?: string; // ✅ Added unit field
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
  customer_id?: number;
  reference_no: string;
  employee_id?: number | null;

  payment_mode:
    | "cash"
    | "card"
    | "upi"
    | "bank_transfer"
    | "credit"
    | "cheque"
    | "voucher"
    | "mixed";
  note?: string;
  paid_amount: number;
  total_amount: number;
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
  discount?: string;

  is_quote?: boolean;
  is_ecommerce_sale?: boolean;
  is_reverse_charge?: boolean;
}

export interface SaleItem {
  sr_no: string;
  product_name: string;
  hsn?: string;
  quantity: number;
  rate: number;
  price: number;
  unit?: string; // ✅ Added unit field
}

export interface SaleData {
  id: number;
  created_at: string;
  reference_no: string;
  customer_id?: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_gst_no?: string;
  items: SaleItem[];
  total_amount: number;
  paid_amount: number;
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
  note?: string;

  is_quote?: boolean;
  is_ecommerce_sale?: boolean;
  is_reverse_charge?: boolean;

  employee_id?: number | null;
}
