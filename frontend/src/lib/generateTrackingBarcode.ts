import { Product } from "./types/product";

/**
 * Generates the specific barcode string based on tracking type.
 * Logic:
 * - Standard: Product Barcode
 * - Batch: ProductID + BatchUID
 * - Serial: ProductID + BatchUID + SerialNumber
 */
export const generateTrackingBarcode = (
  product: Product,
  batch?: any,
  serial?: any
): string => {
  if (!product) return "";

  // 1. Serial Logic
  if (product.tracking_type === "serial" && batch && serial) {
    // Logic: productId + Batch uid + serial number Id
    return `${product.id}-${batch.batch_uid}-${serial.serial_number}`;
  }

  // 2. Batch Logic
  if (product.tracking_type === "batch" && batch) {
    // Logic: productId + Batch uid
    return `${product.id}-${batch.batch_uid}`;
  }

  // 3. Fallback / Standard
  return product.barcode || product.product_code || "0000";
};
