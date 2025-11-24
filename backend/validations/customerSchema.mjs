import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),

  phone: z.string().min(10, "Phone number must be at least 10 digits"),

  // ✅ Updated for structured address
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z
    .string()
    .regex(/^\d{6}$/, "Pincode must be 6 digits")
    .optional()
    .nullable()
    .or(z.literal("")),

  gst_no: z
    .string()
    .length(15, "GSTIN must be 15 characters")
    .regex(/^[0-9A-Z]+$/, "Invalid GSTIN format")
    .optional()
    .nullable()
    .or(z.literal("")),

  // ✅ Using z.coerce to safely convert the string from the form to a number
  credit_limit: z.coerce
    .number()
    .nonnegative("Credit limit cannot be negative")
    .default(0),

  additional_info: z.string().optional().nullable(),
});

export const updateCustomerSchema = customerSchema.partial();
