import * as purchaseRepository from "../repositories/purchaseRepository.mjs";
import { generateReference } from "../repositories/referenceRepository.mjs";
import { createTransaction } from "../repositories/transactionRepository.mjs";
import * as batchService from "../services/batchService.mjs";
import db from "../db/db.mjs";
import { convertToStockQuantity } from "../services/unitService.mjs";
import {
  getProductById,
  updateProductQuantity,
} from "../repositories/productRepository.mjs";

/**
 * Creates a new purchase, its items, and batches within a single transaction.
 */
export async function createPurchase(purchaseData) {
  const transaction = db.transaction(() => {
    const {
      supplier_id,
      reference_no,
      date,
      status,
      note,
      total_amount,
      paid_amount,
      payment_mode,
      items,
      discount,
      is_reverse_charge,
    } = purchaseData;

    const internal_ref_no = generateReference("P");

    // 1. Create Purchase Header & Items (Repo handles stock aggregation)
    const purchase_id = purchaseRepository.createPurchase(
      {
        supplier_id,
        reference_no,
        internal_ref_no,
        date,
        status,
        note,
        total_amount,
        paid_amount,
        discount,
        is_reverse_charge,
      },
      items,
    );

    // 2. Create Batches / Serials for relevant items
    for (const item of items) {
      if (item.tracking_type === "batch" || item.tracking_type === "serial") {
        const product = getProductById(item.product_id);
        const baseQty = convertToStockQuantity(
          item.quantity,
          item.unit,
          product,
        );

        batchService.createNewBatch({
          productId: item.product_id,
          purchaseId: purchase_id,
          batchNumber: item.batch_number,
          barcode: item.barcode,
          expiryDate: item.expiry_date,
          mfgDate: item.mfg_date,
          mrp: item.mrp || 0,
          margin: item.margin || 0,
          costPrice: item.rate || 0,
          quantity: baseQty,
          serialNumbers: item.serial_numbers,
          location: "Store",
        });
      }
    }

    // 3. Handle Payment Transaction
    let totalGstAmount = 0;
    let totalDiscountAmount = 0;
    items.forEach((item) => {
      const baseValue = item.rate * item.quantity;
      const discountAmount = (baseValue * (item.discount || 0)) / 100;
      const taxableValue = baseValue - discountAmount;
      const itemGst = (taxableValue * (item.gst_rate || 0)) / 100;
      totalGstAmount += itemGst;
      totalDiscountAmount += discountAmount;
    });

    let transactionDataResponse = null;
    if (paid_amount > 0) {
      transactionDataResponse = createTransaction({
        type: "payment_out",
        bill_id: purchase_id,
        bill_type: "purchase",
        entity_id: supplier_id,
        entity_type: "supplier",
        transaction_date: new Date().toISOString().slice(0, 10),
        amount: paid_amount,
        payment_mode: payment_mode,
        status: "paid",
        note: `Payment for Purchase #${reference_no}`,
        discount: totalDiscountAmount,
        gst_amount: totalGstAmount,
      });
    }

    return { purchase_id, transactionData: transactionDataResponse };
  });

  try {
    const result = transaction();
    return result;
  } catch (err) {
    console.error("Purchase creation failed:", err.message);
    throw new Error("Purchase creation failed: " + err.message);
  }
}

/* -------------------- GET PURCHASE BY ID  --------------------------*/
export async function getPurchaseById(id) {
  const purchase = await purchaseRepository.getPurchaseById(id);
  console.log("get Purchase by id");
  if (!purchase) throw { status: 404, message: "Purchase not found" };
  return { ...purchase };
}

/* -------------------- DELETE PURCHASE   --------------------------*/
export async function deletePurchase(id) {
  // TODO: Add batch stock reversal logic here if needed
  await purchaseRepository.deletePurchase(id);
  return { status: 200, message: "Purchase deleted" };
}

/* -------------------- UPDATE PURCHASE  --------------------------*/
export async function updatePurchase(id, purchaseData) {
  const oldPurchase = purchaseRepository.getPurchaseById(id);
  if (!oldPurchase) throw new Error("Purchase not found");

  const transaction = db.transaction(() => {
    // 1. REVERT OLD STOCK (Master + Batch)
    // We iterate over the *existing* items in the DB
    for (const item of oldPurchase.items) {
      const product = getProductById(item.product_id);

      // Calculate quantity in Base Unit to revert
      const revertQty = convertToStockQuantity(
        item.quantity,
        item.unit,
        product,
      );

      // A. Revert Master Stock (Decrease, because purchase added it)
      updateProductQuantity(item.product_id, product.quantity - revertQty);

      // B. Revert Batch/Serial Stock
      // If the item had batch tracking, we reduce the batch quantity
      if (
        product.tracking_type === "batch" ||
        product.tracking_type === "serial"
      ) {
        batchService.revertPurchaseBatchStock({
          purchaseId: id,
          productId: item.product_id,
          quantity: revertQty,
          serialNumbers: item.serial_numbers, // Pass serials to attempt removal
        });
      }
    }

    // 2. APPLY NEW STOCK (Master + Batch)
    // Iterate over the *new* items coming from frontend
    for (const item of purchaseData.items) {
      const product = getProductById(item.product_id);

      // Calculate quantity in Base Unit to add
      const addQty = convertToStockQuantity(item.quantity, item.unit, product);

      // A. Add Master Stock (Increase)
      // Note: We fetched product *before* this loop, but since updateProductQuantity writes to DB
      // immediately (synchronous in better-sqlite3), next iteration might see old qty object?
      // Actually `getProductById` fetches fresh. But inside loop we used `product` var.
      // Better to re-fetch product or just blindly add delta. `updateProductQuantity` sets absolute.
      // Safe approach: Fetch fresh product quantity or assume cumulative delta.
      // Since `updateProductQuantity` logic is `SET quantity = ?`, we need current.
      const freshProduct = getProductById(item.product_id);
      updateProductQuantity(item.product_id, freshProduct.quantity + addQty);

      // B. Add/Update Batch Stock
      if (
        product.tracking_type === "batch" ||
        product.tracking_type === "serial"
      ) {
        batchService.addOrUpdatePurchaseBatch({
          purchaseId: id,
          productId: item.product_id,
          batchNumber: item.batch_number,
          quantity: addQty,
          mrp: item.mrp,
          expiryDate: item.expiry_date,
          mfgDate: item.mfg_date,
          serialNumbers: item.serial_numbers,
        });
      }
    }

    // 3. HANDLE FINANCIAL DELTA
    // Calculate difference in paid amounts to record a new transaction if needed
    const oldPaid = oldPurchase.paid_amount || 0;
    const newPaid = purchaseData.paid_amount || 0;
    const delta = newPaid - oldPaid;

    if (delta !== 0) {
      createTransaction({
        type: delta > 0 ? "payment_out" : "payment_in", // Paying more = Out, Getting refund = In (technically refund)
        // Wait, for Purchase: Payment Out is normal.
        // If I pay MORE (delta > 0), it is another Payment Out.
        // If I pay LESS (delta < 0), it implies I got money back? Or just corrected entry?
        // Usually edits correct mistakes. If I reduce paid amount, I expect cash back (Payment In).
        bill_id: id,
        bill_type: "purchase",
        entity_id: purchaseData.supplier_id,
        entity_type: "supplier",
        transaction_date: new Date().toISOString().slice(0, 10),
        amount: Math.abs(delta),
        payment_mode: purchaseData.payment_mode,
        status: "paid",
        note: `Adjustment for Purchase #${purchaseData.reference_no}`,
      });
    }

    // 4. UPDATE RECORDS (Header & Items)
    // This cleans up purchase_items table and updates header fields
    purchaseRepository.updatePurchase(id, purchaseData, purchaseData.items);
  });

  try {
    transaction();
    return { status: 200, message: "Purchase updated successfully" };
  } catch (err) {
    console.error("Purchase update failed:", err.message);
    throw new Error("Purchase update failed: " + err.message);
  }
}

/* -------------------- GET ALL PURCHASES   --------------------------*/
export async function getAllPurchases(query) {
  const {
    page = 1,
    limit = 10,
    search = "",
    filter,
    start_date,
    end_date,
    status,
  } = query;
  const { data, total } = await purchaseRepository.getAllPurchases({
    page: parseInt(page),
    limit: parseInt(limit),
    search,
    filter,
    startDate: start_date,
    endDate: end_date,
    status,
  });
  const totalPages = Math.ceil(total / limit);
  return { data, currentPage: parseInt(page), totalPages };
}

export async function getPurchasesBySupplierIdService(
  supplierId,
  filters = {},
) {
  try {
    if (isNaN(supplierId) || supplierId <= 0)
      throw new Error("Invalid supplier ID.");
    return await purchaseRepository.getPurchasesBySupplierId(
      supplierId,
      filters,
    );
  } catch (error) {
    console.error("Error in getPurchasesBySupplierIdService:", error.message);
    throw new Error("Failed to fetch purchases for supplier.");
  }
}

export async function getPurchaseSummaryService(query) {
  const { filter, from, to } = query;
  return await purchaseRepository.getPurchaseSummary({
    filter,
    start_date: from,
    end_date: to,
  });
}

export async function getTopSuppliersService(query) {
  const { filter = "month", start_date, end_date, year } = query;
  return await purchaseRepository.getTopSuppliers({
    filter,
    start_date,
    end_date,
    year,
  });
}

export function getCategorySpendService(query) {
  const { filter = "month", start_date, end_date, year } = query;
  return purchaseRepository.getCategoryWiseSpend({
    filter,
    start_date,
    end_date,
    year,
  });
}

export function getPurchaseStatsService() {
  return purchaseRepository.getPurchaseStats();
}
