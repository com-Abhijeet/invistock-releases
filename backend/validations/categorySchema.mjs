import { z } from "zod";

export const subcategorySchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
});

export const categorySchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  default_preset_id: z.number().nullable().optional(),
  subcategories: z.array(subcategorySchema).optional().default([]),
});

