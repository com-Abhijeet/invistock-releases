export interface Product {
  id?: number; // Optional when creating
  name: string;
  product_code: string;
  hsn: string;
  gst_rate: number; // ✅ New GST rate field
  mrp: number;
  mop: number; // Optional MOP

  // Updated to allow string for new categories created on the fly
  category?: number | string | null;
  subcategory?: number | string | null;

  storage_location: string;
  quantity: number;
  description: string;
  brand: string;
  barcode?: string | null;
  image_url?: string | null;
  average_purchase_price?: number | 0;
  is_active: boolean | 0 | 1;

  low_stock_threshold?: number;
  mfw_price?: string;
  size?: string;
  weight?: string; // Changed String to string for TS primitive best practice

  // Added to support Batch/Serial logic
  tracking_type?: "none" | "batch" | "serial";

  created_at?: string;
  updated_at?: string;
}

export type ProductOverviewType = {
  id: number;
  name: string;
  product_code: string;
  description?: string | null;
  brand?: string | null;
  barcode?: string | null;
  hsn?: string | null;
  gst_rate: number;
  mrp?: number | null;
  mop?: number | null;
  quantity?: number | null;
  storage_location?: string | null;

  low_stock_threshold?: number;
  mfw_price?: string;
  size?: string;
  weight?: string;

  // These are fields that would be joined or calculated in your backend query
  category_name?: string | null;
  average_purchase_price?: string;
  latest_purchase_price?: number | null;

  // Kept for future use, can be null if not implemented
  image_url?: string | null;
};

export type productDetails = {
  id?: number; // Optional when creating
  name: string;
  product_code: string;
  hsn: string;
  gst_rate: number;
  mrp: number;
  mop: number; // Optional MOP
  category?: number | null;
  category_name?: string | null;
  subcategory?: number | null;
  subcategory_name?: string | null;
  storage_location: string;
  quantity: number;
  description: string;
  brand: string;
  barcode?: string | null;
  image_url?: string | null;
  average_purchase_price?: number | 0;
  is_active: boolean | 0 | 1;

  low_stock_threshold?: number;
  mfw_price?: string;
  size?: string;
  weight?: string;

  tracking_type?: "none" | "batch" | "serial";

  created_at?: string;
  updated_at?: string;
};
