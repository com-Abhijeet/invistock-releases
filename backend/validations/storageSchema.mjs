import { z } from "zod";

export const storageLocationSchema = z.object({
  name: z.string().min(1),
});
