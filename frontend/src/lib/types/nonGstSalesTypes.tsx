/**
 * Defines the structure for a single item in a Non-GST sale.
 * Note: It does not include 'gst_rate'.
 */
export interface NonGstSaleItem {
  id?: number;
  sale_id?: number; // Set by the backend
  sr_no: string;
  product_id: number;
  rate: number;
  quantity: number;
  discount?: number;
  price: number;

  // These are for display/joins and may not be part of the payload
  product_name?: string;
}

/**
 * Defines the complete payload for creating a new Non-GST sale.
 * Note: It does not include GST flags (is_reverse_charge, etc.).
 */
export interface NonGstSalePayload {
  id?: number;
  customer_id: number | null;
  reference_no: string;
  payment_mode: string;
  paid_amount: number;
  total_amount: number;
  note?: string;
  status?: string;
  discount?: number | string;
  created_at?: string;

  // The array of items for this sale
  items: NonGstSaleItem[];
}
