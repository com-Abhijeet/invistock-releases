import * as purchaseRepository from "../repositories/purchaseRepository.mjs";
import { generateReference } from "../repositories/referenceRepository.mjs";
import { createTransaction } from "../repositories/transactionRepository.mjs";
import * as batchService from "../services/batchService.mjs";
import db from "../db/db.mjs";

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
      items
    );

    // 2. Create Batches / Serials for relevant items
    for (const item of items) {
      if (item.tracking_type === "batch" || item.tracking_type === "serial") {
        const { batchId, batchUid } = batchService.createNewBatch({
          productId: item.product_id,
          purchaseId: purchase_id,
          batchNumber: item.batch_number, // From Frontend
          expiryDate: item.expiry_date,
          mfgDate: item.mfg_date,
          mrp: item.mrp || 0,
          costPrice: item.rate || 0, // Cost is the purchase rate
          quantity: item.quantity,
          serialNumbers: item.serial_numbers, // Array of strings from frontend
          location: "Store",
        });

        // NOTE: We rely on the BatchService to create the 'product_batches' row
        // and 'product_serials' rows.
        // We already stored the snapshot of this in 'purchase_items' in the repo step above.
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
  // Update logic is complex with batches. For now, we reuse the repo update.
  // In a real-world scenario, modifying a purchase with batches requires
  // validating if those batches have already been sold.
  await purchaseRepository.updatePurchase(id, purchaseData, purchaseData.items);
  return { status: 200, message: "Purchase updated" };
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
  filters = {}
) {
  try {
    if (isNaN(supplierId) || supplierId <= 0)
      throw new Error("Invalid supplier ID.");
    return await purchaseRepository.getPurchasesBySupplierId(
      supplierId,
      filters
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
