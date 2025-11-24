// types/purchaseTypes.ts
export type PurchaseItem = {
  sr_no: number;
  product_id: number;
  quantity: number;
  rate: number;
  gst_rate: number;
  discount: number;
  price: number;
};

export type PurchasePayload = {
  reference_no: string; // UUID or ≤8 digit string
  internal_ref_no? : string;
  date: string; // "YYYY-MM-DD"
  supplier_id: number;
  note: string;
  items: PurchaseItem[];
  total_amount: number;
  discount: number;
  paid_amount: number;
  payment_mode: "cash"| "card"| "upi"| "bank_transfer"| "credit"| "cheque"| "voucher"| "mixed";
status: "pending" | "paid" | "partial_payment"| "refunded" | "returned" | "cancelled" | "draft";
  is_reverse_charge ?: boolean;
};
