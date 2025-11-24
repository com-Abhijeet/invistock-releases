import db from "../db/db.mjs";
import * as AdjustmentRepo from "../repositories/stockAdjustmentRepository.mjs";
import * as ProductRepo from "../repositories/productRepository.mjs";

/**
 * Adjusts stock level for a product and logs the reason.
 * @param {object} payload
 * @param {number} payload.productId
 * @param {number} payload.adjustment - The change amount (e.g. -2)
 * @param {string} payload.category - e.g. 'Damaged'
 * @param {string} payload.reason - Optional note
 */
export function adjustStockService({
  productId,
  adjustment,
  category,
  reason,
}) {
  const transaction = db.transaction(() => {
    // 1. Get current stock
    const product = ProductRepo.getProductById(productId);
    if (!product) throw new Error("Product not found");

    const oldQuantity = product.quantity;
    const newQuantity = oldQuantity + adjustment;

    // 2. Update Product Quantity in main table
    ProductRepo.updateProductQuantity(productId, newQuantity);

    // 3. Log Adjustment in history table
    AdjustmentRepo.createAdjustmentLog({
      product_id: productId,
      category: category || "Manual Adjustment",
      old_quantity: oldQuantity,
      new_quantity: newQuantity,
      adjustment,
      reason: reason || "",
      adjusted_by: "Admin", // You can pass user info here later
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
