import db from "../db/db.mjs";
import {
  createNonGstSale,
  createNonGstSaleItem,
  getNonGstSaleWithItemsById,
} from "../repositories/nonGstSalesRepository.mjs";
import { generateReferenceService as generateReference } from "./referenceService.mjs";

/**
 * Creates a new non-GST sale.
 * COMPLETELY DECOUPLED: No stock updates, no transaction/accounting entries.
 */
export function createNonGstSaleWithItems(saleData) {
  const { items, ...saleDetails } = saleData;

  if (!items || items.length === 0) {
    throw new Error("At least one item is required.");
  }

  const transaction = db.transaction(() => {
    const newReferenceNo = generateReference("NGS");

    // Prepare sale record
    const saleRecord = {
      ...saleDetails,
      reference_no: newReferenceNo,
      created_at: new Date().toISOString().slice(0, 19).replace("T", " "),
    };

    // Insert Sale
    const saleId = createNonGstSale(saleRecord);
    if (!saleId) throw new Error("Failed to create non-GST sale record.");

    // Insert Items
    items.forEach((item) => {
      createNonGstSaleItem({
        sale_id: saleId,
        ...item, // Expected to contain product_name, rate, quantity, etc. directly
      });
      // No stock update logic here anymore
    });

    // No transaction/payment ledger logic here anymore

    return saleId;
  });

  try {
    const newSaleId = transaction();
    return getNonGstSaleWithItemsById(newSaleId);
  } catch (err) {
    console.error("Non-GST sale creation failed:", err.message);
    throw new Error("Non-GST sale creation failed: " + err.message);
  }
}
