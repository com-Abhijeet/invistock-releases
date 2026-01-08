/**
 * Defines the structure for a single item in a Non-GST sale.
 * Decoupled: Uses product_name instead of product_id.
 */
export interface NonGstSaleItem {
  id?: number;
  sale_id?: number;
  sr_no: string;

  // Primary identifier for the item in Non-GST mode
  product_name: string;

  rate: number;
  quantity: number;
  discount?: number;
  price: number;
}

/**
 * Defines the complete payload for creating a new Non-GST sale.
 * Decoupled: Uses customer_name/phone instead of customer_id.
 */
export interface NonGstSalePayload {
  id?: number;

  // Decoupled customer info
  customer_name: string;
  customer_phone: string;

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
