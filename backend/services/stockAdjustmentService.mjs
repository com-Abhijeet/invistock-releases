import db from "../db/db.mjs";
import * as AdjustmentRepo from "../repositories/stockAdjustmentRepository.mjs";
import * as ProductRepo from "../repositories/productRepository.mjs";
import * as BatchRepo from "../repositories/batchRepository.mjs";

/**
 * Adjusts stock level for a product and logs the reason.
 * Now supports batch and serial tracking updates.
 *
 * @param {object} payload
 * @param {number} payload.productId
 * @param {number} payload.adjustment - The change amount (e.g. -2)
 * @param {string} payload.category - e.g. 'Damaged'
 * @param {string} payload.reason - Optional note
 * @param {number} [payload.batchId] - If provided, deduct/add from this batch
 * @param {number} [payload.serialId] - If provided, update this serial status
 */
export function adjustStockService({
  productId,
  adjustment,
  category,
  reason,
  batchId,
  serialId,
}) {
  const transaction = db.transaction(() => {
    // 1. Get current stock
    const product = ProductRepo.getProductById(productId);
    if (!product) throw new Error("Product not found");

    const oldQuantity = product.quantity;
    const newQuantity = oldQuantity + adjustment;

    // 2. Update Product Quantity in master table (Always happens)
    ProductRepo.updateProductQuantity(productId, newQuantity);

    // 3. Handle Tracked Inventory Updates
    // A. Negative Adjustment (Loss/Damage)
    if (adjustment < 0) {
      if (serialId) {
        // Mark serial as lost/adjusted out
        // We use a specific status or just 'sold'/'defective'?
        // The schema allows 'defective' or 'returned'. Let's use 'adjusted_out' if schema supported,
        // but schema has check constraint: 'available', 'sold', 'returned', 'defective', 'in_repair', 'adjusted_out'
        // 'adjusted_out' was added in the DB migration just now.
        BatchRepo.updateSerialStatus(serialId, "adjusted_out");

        // Decrement the batch linked to this serial
        // We need to find the batch_id if not provided, but usually serialId implies a batch.
        // We can look up the serial to get its batch_id.
        // For efficiency, we assume if serialId is provided, we might not need explicit batchId passed, but let's be safe.
        // BatchRepo.updateBatchQuantity will handle the decrement.
        // However, we need the batch_id.
        // Let's verify if we need to fetch the serial to get batch_id.
        const serialIdsList = [serialId];
        const serials = BatchRepo.getSerialsByIds(serialIdsList);
        if (serials.length > 0) {
          BatchRepo.updateBatchQuantity(serials[0].batch_id, adjustment); // adjustment is -1 usually for serial
        }
      } else if (batchId) {
        // Just batch tracked
        BatchRepo.updateBatchQuantity(batchId, adjustment);
      }
      // If neither is provided ("Unknown Batch"), we do nothing here.
      // The master inventory reduces, creating a "Untracked" discrepancy, which is the intended behavior.
    }
    // B. Positive Adjustment (Gain/Found)
    else if (adjustment > 0) {
      if (batchId) {
        // Adding to existing batch
        BatchRepo.updateBatchQuantity(batchId, adjustment);
      }
      // Note: We don't support "creating" new serials or batches here.
      // That should be done via "Assign Batch".
      // If batchId is null, it increases master stock, adding to "Untracked".
    }

    // 4. Log Adjustment in history table
    AdjustmentRepo.createAdjustmentLog({
      product_id: productId,
      category: category || "Manual Adjustment",
      old_quantity: oldQuantity,
      new_quantity: newQuantity,
      adjustment,
      reason: reason || "",
      adjusted_by: "Admin",
      batch_id: batchId || null,
      serial_id: serialId || null,
    });

    return { newQuantity };
  });

  return transaction();
}

/**
 * Gets aggregated stats for the dashboard/reports.
 */
export function getAdjustmentStatsService(from, to) {
  // Filters are passed directly to repo which handles date logic
  return AdjustmentRepo.getAdjustmentStats({ from, to });
}
