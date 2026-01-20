import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  product_code: z.string().min(1, "Product code is required"),
  hsn: z.string().optional(),
  gst_rate: z.number().min(0, "GST rate must be non-negative"),
  mrp: z.number().min(0, "MRP must be non-negative"),
  mop: z.number().min(0, "MOP must be non-negative").optional(),
  category: z.number().optional(),
  subcategory: z.number().optional(),
  storage_location: z.string().optional(),
  quantity: z.number().int().min(0, "Quantity must be non-negative"),
  description: z.string().optional(),
  brand: z.string().optional(),
  barcode: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  is_active: z.number().int().optional(),
  average_purchase_price: z.number().optional(),
  mfw_price: z.string().optional().nullable(),
  low_stock_threshold: z.number().optional().nullable(),
  size: z.string().optional().nullable(),
  weight: z.string().optional().nullable(),
  // ✅ NEW FIELD: Validates that tracking_type is one of the allowed values
  tracking_type: z.enum(["none", "batch", "serial"]).optional().default("none"),
});
