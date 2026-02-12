import { z } from "zod";

// Purchase Item Schema (Updated with Batch/Serial Fields)
const purchaseItemSchema = z.object({
  product_id: z.number(),
  quantity: z.number().min(1),
  rate: z.number().min(0),
  gst_rate: z.number().min(0),
  discount: z.number().min(0).optional().default(0),
  price: z.number().min(0).default(0),

  // New Tracking Fields
  tracking_type: z.enum(["none", "batch", "serial"]).optional(),
  batch_number: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  mfg_date: z.string().optional().nullable(),
  mrp: z.number().optional(),
  mop: z.number().optional(),
  mfw_price: z.string().optional(),

  // Serial numbers can be an array of strings (from frontend) or null
  serial_numbers: z.array(z.string()).optional().nullable(),

  unit: z.string().optional().nullable(),
});

// Enum definitions for reuse
const purchaseStatusEnum = z.enum([
  "draft",
  "pending",
  "partial_payment",
  "paid",
  "received",
  "cancelled",
  "ordered", // Added 'ordered' based on your UI dropdown
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

// Create/Update Purchase Schema
export const purchaseSchema = z.object({
  supplier_id: z.number(),
  reference_no: z.string().max(20),
  date: z.string(), // ISO format
  note: z.string().optional().nullable(),
  status: purchaseStatusEnum,
  total_amount: z.number(),
  paid_amount: z.number(),
  payment_mode: paymentModeEnum,
  is_reverse_charge: z.coerce.boolean().optional().default(false),
  items: z.array(purchaseItemSchema).min(1),
});

// Route params schema
export const idParamSchema = z.object({
  id: z.string(),
});

// Filters and pagination
export const getPurchasesQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: purchaseStatusEnum.optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export const summaryQuerySchema = z.object({
  year: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});
