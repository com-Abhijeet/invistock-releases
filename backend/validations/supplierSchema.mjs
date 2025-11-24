import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().min(2, "Supplier name must be at least 2 characters"),

  contact_person: z.string().optional().nullable(),

  phone: z
    .string()
    .regex(/^\d{10,15}$/, "Phone number must be 10-15 digits")
    .optional()
    .nullable()
    .or(z.literal("")),

  email: z.string().email().optional().nullable().or(z.literal("")),

  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z
    .string()
    .regex(/^\d{6}$/, "Pincode must be 6 digits")
    .optional()
    .nullable()
    .or(z.literal("")),

  gst_number: z
    .string()
    .length(15, "GSTIN must be 15 characters")
    .regex(/^[0-9A-Z]+$/, "Invalid GSTIN format")
    .optional()
    .nullable()
    .or(z.literal("")),

  supplier_type: z
    .enum(["local", "wholeseller", "manufacturer", "distributor"])
    .optional()
    .nullable(),

  bank_account: z.string().optional().nullable(),
  ifsc_code: z.string().optional().nullable(),
  upi_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ✅ Use .partial() to make all fields optional for update operations
export const updateSupplierSchema = createSupplierSchema.partial();
