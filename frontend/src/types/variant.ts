export interface BatchVariant {
  id: number;
  batch_id: number;
  product_id: number;
  article_no?: string | null;
  dim1_value?: string | null;
  dim2_value?: string | null;
  quantity: number;
  initial_quantity?: number;
  mrp: number;
  mop: number;
  cost_price?: number;
  barcode: string;
  sku?: string | null;
  batch_number?: string;
  batch_uid?: string;
  product_name?: string;
  product_code?: string;
}

export interface VariantFilterParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface VariantPrintLabelItem {
  variant_id: number;
  product_id: number;
  batch_id: number;
  barcode: string;
  label: string;
  product_name: string;
  article_no: string;
  batch_number: string;
  display_code?: string;
  size?: string;
  color?: string;
  dim1_value: string;
  dim2_value: string;
  price: number;
  mrp: number;
  mop: number;
  copies: number;
}
