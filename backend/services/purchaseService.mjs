import * as purchaseRepository from "../repositories/purchaseRepository.mjs";
import { generateReference } from "../repositories/referenceRepository.mjs";
import { createTransaction } from "../repositories/transactionRepository.mjs";
import db from "../db/db.mjs";
/**
 * @description Creates a new purchase, its items, and an optional payment transaction within a single database transaction.
 * @param {object} purchaseData - The complete purchase data from the controller.
 * @returns {Promise<object>} An object containing the new purchase ID and transaction data.
 * @throws {Error} If any part of the process fails, the entire transaction is rolled back.
 */
export async function createPurchase(purchaseData) {
  const transaction = db.transaction(() => {
    const {
      supplier_id,
      reference_no, // This is the supplier's manual reference number
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

    // Your existing logic is placed inside the transaction
    const internal_ref_no = generateReference("P");

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
        note: `Payment for Purchase reference no : #${reference_no},internal reference number : ${internal_ref_no} `,
        discount: totalDiscountAmount,
        gst_amount: totalGstAmount,
      });
    }

    // The transaction block returns the final result
    return { purchase_id, transactionData: transactionDataResponse };
  });

  try {
    // Execute the transaction
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

  return {
    ...purchase,
  };
}

/* -------------------- DELETE PURCHASE   --------------------------*/
export async function deletePurchase(id) {
  const items = await purchaseRepository.getPurchaseItemsByPurchaseId(id);
  if (!items || items.length === 0)
    throw { status: 404, message: "Purchase not found" };

  for (const item of items) {
    await purchaseRepository.decreaseProductStock(item.product_id, item.qty);
  }

  await purchaseRepository.deletePurchaseItems(id);
  await purchaseRepository.deletePurchase(id);

  return { status: 200, message: "Purchase deleted" };
}

/* -------------------- UPDATE PURCHASE  --------------------------*/
export async function updatePurchase(id, purchaseData) {
  const oldItems = await purchaseRepository.getPurchaseItemsByPurchaseId(id);
  for (const item of oldItems) {
    await purchaseRepository.decreaseProductStock(item.product_id, item.qty);
  }

  const {
    supplier_id,
    reference_no,
    date,
    status,
    note,
    total_amount,
    paid_amount,
    items,
  } = purchaseData;

  await purchaseRepository.updatePurchase(id, {
    supplier_id,
    reference_no,
    date,
    status,
    note,
    total_amount,
    paid_amount,
  });

  await purchaseRepository.deletePurchaseItems(id);

  for (const item of items) {
    await purchaseRepository.insertPurchaseItem(id, item);
    await purchaseRepository.increaseProductStock(item.product_id, item.qty);
  }

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

  return {
    data,
    currentPage: parseInt(page),
    totalPages,
  };
}

/**
 * @description Retrieves a paginated list of purchases for a specific supplier.
 * @param {number} supplierId - The ID of the supplier.
 * @param {object} [filters={}] - Optional filters.
 * @returns {Promise<object>} A promise that resolves to an object containing paginated records and total count.
 * @throws {Error} If supplier ID is invalid or fetching fails.
 */
export async function getPurchasesBySupplierIdService(
  supplierId,
  filters = {}
) {
  try {
    if (isNaN(supplierId) || supplierId <= 0) {
      throw new Error("Invalid supplier ID.");
    }
    return await purchaseRepository.getPurchasesBySupplierId(
      supplierId,
      filters
    );
  } catch (error) {
    console.error("Error in getPurchasesBySupplierIdService:", error.message);
    throw new Error("Failed to fetch purchases for supplier.");
  }
}

/* -------------------- GET PURCHASE SUMMARY  --------------------------*/
export async function getPurchaseSummaryService(query) {
  const { filter, from, to } = query;
  const response = await purchaseRepository.getPurchaseSummary({
    filter,
    start_date: from,
    end_date: to,
  });
  return response;
}

/* -------------------- GET TOP SUPPPLIERS  --------------------------*/
export async function getTopSuppliersService(query) {
  const { filter = "month", start_date, end_date, year } = query;
  const response = await purchaseRepository.getTopSuppliers({
    filter,
    start_date,
    end_date,
    year,
  });
  return response;
}

/* --------------------GET CATEGORY WISE PURCHASE SPENDINGS   --------------------------*/
export function getCategorySpendService(query) {
  const { filter = "month", start_date, end_date, year } = query;
  const response = purchaseRepository.getCategoryWiseSpend({
    filter,
    start_date,
    end_date,
    year,
  });
  return response;
}

/* -------------------- GET PURCHASE STATS SERVICE   --------------------------*/
export function getPurchaseStatsService() {
  const response = purchaseRepository.getPurchaseStats();
  return response;
}
