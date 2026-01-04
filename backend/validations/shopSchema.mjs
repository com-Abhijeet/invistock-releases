import { z } from "zod";
import { tr } from "zod/v4/locales";

export const shopSchema = z.object({
  shop_name: z.string(),
  owner_name: z.string(),
  contact_number: z.string(),
  email: z.string(),
  shop_alias: z.string().optional().nullable(),
  use_alias_on_bills: z.boolean().optional().nullable().default(false),

  // Address
  address_line1: z.string(),
  address_line2: z.string(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  country: z.string(),

  // GST
  gstin: z.string(),
  gst_registration_type: z.enum(["regular", "composition", "unregistered"]),
  pan_number: z.string().optional(),

  // Other details
  website_url: z.string().optional(),
  logo_url: z.string().nullable().optional(),
  invoice_prefix: z.string().default("INV-"),
  invoice_start_number: z.number().default(1),
  financial_year_start: z.string().default("01-04"),

  // Tax preferences
  gst_enabled: z.boolean().default(true),
  inclusive_tax_pricing: z.boolean().default(true),
  default_gst_rate: z.number().default(18),
  hsn_required: z.boolean().default(true),
  gst_invoice_format: z.string(),
  show_gst_breakup: z.boolean().default(true),

  // Currency and formatting
  currency_symbol: z.string(),
  currency_position: z.enum(["before", "after"]),
  date_format: z.string(),
  time_format: z.enum(["12h", "24h"]),
  default_payment_mode: z.string(),
  allow_negative_stock: z.boolean().default(false),
  low_stock_threshold: z.number().default(5),

  // Print & application preferences
  label_printer_name: z.string().optional().nullable(),
  invoice_printer_name: z.string().optional().nullable(),
  invoice_printer_width_mm: z.string().optional().default(80).nullable(),
  silent_printing: z.boolean().default(true).optional().nullable(),
  print_after_save: z.boolean().default(false),
  default_printer: z.string().optional(),
  label_printer_width_mm: z.number().default(50),
  label_template_default: z.string().optional(),
  theme: z.enum(["light", "dark"]).default("light"),
  language: z.string().default("en"),
  round_off_total: z.boolean().default(true),
  show_discount_column: z.boolean().default(true),
  barcode_prefix: z.string(),
  enable_auto_backup: z.boolean().default(false),
  backup_path: z.string().optional(),

  // Banking details
  bank_account_no: z.number().optional(),
  bank_account_ifsc_code: z.string().optional(),
  bank_account_holder_name: z.string().optional(),
  bank_account_type: z.enum(["savings", "current"]).optional(),
  bank_account_branch: z.string().optional(),
  bank_name: z.string().optional(),

  //UPI Details
  upi_id: z.string().optional(),
  upi_banking_name: z.string().optional(),

  invoice_template_id: z.string().optional(),
  label_template_id: z.string().default("1").optional(),
});

export const createShopSchema = z.object({
  shop: shopSchema,
});
