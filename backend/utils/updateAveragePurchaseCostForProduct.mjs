import { getProductById } from "../repositories/productRepository.mjs";

/**
 * @description Recalculates and updates the weighted-average cost of a product after a new purchase.
 * @param {number} productId The ID of the product.
 * @param {number} newPurchaseQty The quantity of the product in the new purchase.
 * @param {number} newPurchaseRate The per-unit cost in the new purchase.
 */
export function calculateAveragePurchaseCost(
  productId,
  newPurchaseQty,
  newPurchaseRate
) {
  console.log("--- Debugging calculateAveragePurchaseCost ---");
  console.log(
    `[Input] productId: ${productId}, newPurchaseQty: ${newPurchaseQty}, newPurchaseRate: ${newPurchaseRate}`
  );

  // 1. Get the product's current state from the database
  const product = getProductById(productId);
  // console.log("[DB] Fetched Product:", product);

  if (!product) {
    throw new Error(
      `Product with ID ${productId} not found during cost calculation.`
    );
  }

  // ✅ FIX: Provide a default value of 0 if quantity or average_purchase_price is null or undefined.
  const oldQty = product.quantity ?? 0;
  const oldAvgCost = product.average_purchase_price ?? 0;

  // console.log(
  //   `[Pre-Calculation] Old Quantity: ${oldQty}, Old Avg Cost: ${oldAvgCost}`
  // );

  // 2. Calculate the total values
  const oldValue = oldQty * oldAvgCost;
  const newValue = newPurchaseQty * newPurchaseRate;

  // console.log(
  //   `[Calculation] Old Stock Value: ${oldValue}, New Stock Value: ${newValue}`
  // );

  const newTotalQuantity = oldQty + newPurchaseQty;
  const totalValue = oldValue + newValue;

  // console.log(
  //   `[Calculation] New Total Quantity: ${newTotalQuantity}, New Total Value: ${totalValue}`
  // );

  // 3. Calculate the new average cost
  if (newTotalQuantity === 0) {
    // console.log("[Result] Total quantity is zero, returning zero values.");
    return { newAverageCost: 0, newTotalQuantity: 0 };
  }

  const newAverageCost = totalValue / newTotalQuantity;

  // console.log(`[Result] New Average Cost: ${newAverageCost.toFixed(2)}`);
  // console.log("-------------------------------------------\n");

  // 4. Return the result as an object
  return {
    newAverageCost,
    newTotalQuantity,
  };
}
