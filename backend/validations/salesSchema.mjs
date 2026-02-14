import { z } from "zod";

// Enums for consistency
const saleStatusEnum = z.enum([
  "pending",
  "paid",
  "partial_payment",
  "refunded",
  "returned",
  "cancelled",
  "draft",
]);

const paymentModeEnum = z.enum([
  "cash",
  "card",
  "upi",
  "bank_transfer",
  "credit",
  "cheque",
  "voucher",
  "mixed",
]);

// Schema for individual sale item
export const saleItemSchema = z.object({
  id: z.string().optional(),
  sale_id: z.string().optional(),
  sr_no: z.string().optional(), // Made optional as it might be generated or just a UI index
  product_id: z.number().int().min(1, "Product is required"),
  rate: z.number().nonnegative("Rate cannot be negative"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  gst_rate: z.number().nonnegative().default(0).optional(),
  discount: z.number().nonnegative().default(0).optional(),
  price: z.number().nonnegative("Price cannot be negative"),

  // Tracking Fields (Optional - only if product is tracked)
  batch_id: z.number().int().optional().nullable(),
  serial_id: z.number().int().optional().nullable(),

  //unit
  unit: z.string().optional().nullable(),
});

// Schema for full sale
export const saleSchema = z.object({
  id: z.string().optional(),
  customer_id: z.number().int().optional(),
  employee_id: z.number().int().optional().nullable(),
  reference_no: z.string().optional().nullable(),
  payment_mode: paymentModeEnum,
  note: z.string().optional().nullable(), // Allow null/undefined
  paid_amount: z.number().nonnegative("Paid amount cannot be negative"),
  total_amount: z.number().nonnegative("Total amount cannot be negative"),
  status: saleStatusEnum,
  items: z.array(saleItemSchema).min(1, "At least one sale item is required"),
  createdAt: z.string().optional(),
  discount: z.number().optional(),

  is_quote: z.coerce.boolean().optional().default(false),
  is_ecommerce_sale: z.coerce.boolean().optional().default(false),
  is_reverse_charge: z.coerce.boolean().optional().default(false),
});
