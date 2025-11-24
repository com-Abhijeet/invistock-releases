import db from "../db/db.mjs";
import {
  createNonGstSale,
  createNonGstSaleItem,
  getNonGstSaleWithItemsById,
} from "../repositories/nonGstSalesRepository.mjs";
import {
  getProductById,
  updateProductQuantity,
} from "../repositories/productRepository.mjs";
import { generateReferenceService as generateReference } from "./referenceService.mjs";

// Add this import at the top of your salesService.mjs file
import { createTransaction } from "../repositories/transactionRepository.mjs";

/**
 * Creates a new non-GST sale, updates stock, and creates a payment transaction.
 */
export function createNonGstSaleWithItems(saleData) {
  const { items, ...saleDetails } = saleData;

  if (!items || items.length === 0) {
    throw new Error("At least one item is required.");
  }

  const transaction = db.transaction(() => {
    const newReferenceNo = generateReference("NGS");

    const saleRecord = {
      ...saleDetails,
      reference_no: newReferenceNo,
      created_at: new Date().toISOString().slice(0, 19).replace("T", " "),
    };

    const saleId = createNonGstSale(saleRecord);
    if (!saleId) throw new Error("Failed to create non-GST sale record.");

    items.forEach((item) => {
      createNonGstSaleItem({
        sale_id: saleId,
        ...item,
      });

      // Stock is shared, so we still update the main products table
      const product = getProductById(item.product_id);
      if (!product)
        throw new Error(`Product not found (ID: ${item.product_id})`);
      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for '${product.name}'`);
      }

      updateProductQuantity(item.product_id, product.quantity - item.quantity);
    });

    // ✅ ADDED: Create a corresponding payment transaction
    const { paid_amount, customer_id, payment_mode } = saleDetails;

    if (paid_amount > 0) {
      createTransaction({
        type: "payment_in",
        bill_id: saleId,
        // Use a unique type to keep it separate from GST sales in reports
        bill_type: "sale_non_gst",
        entity_id: customer_id,
        entity_type: "customer",
        transaction_date: new Date().toISOString().slice(0, 10),
        amount: paid_amount,
        payment_mode: payment_mode,
        status: "completed",
        note: `Payment for Cash Sale #${newReferenceNo}`,
        gst_amount: 0, // No GST on this transaction
      });
    }

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
