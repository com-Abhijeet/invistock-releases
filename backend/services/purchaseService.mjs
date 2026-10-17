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
 * Normalizes batch barcodes in incoming purchase items:
 * - Preserves custom/FMCG manufacturer barcodes if unique.
 * - Detects blanks, internal collisions, and duplicate barcodes within the same bill.
 * - Auto-generates unique sequential 2_000<productId>_<seq> barcodes for any duplicates/blanks.
 */
export function normalizeAndDeduplicatePurchaseBatches(
  items,
  currentPurchaseId = null,
) {
  if (!Array.isArray(items)) return items;

  // 1. Count frequencies of each barcode in the payload to catch duplicates in the same bill
  const barcodeCounts = {};
  for (const item of items) {
    const raw = item.barcode ? String(item.barcode).trim() : "";
    if (raw) {
      barcodeCounts[raw] = (barcodeCounts[raw] || 0) + 1;
    }
  }

  const usedBarcodesInPayload = new Set();

  for (const item of items) {
    const prodId = Number(item.product_id);
    const prod = getProductById(prodId);
    const trackingType = item.tracking_type || prod?.tracking_type || "none";

    if (
      trackingType === "batch" ||
      trackingType === "serial" ||
      item.batch_number
    ) {
      item.tracking_type = trackingType;
      let rawBarcode = item.barcode ? String(item.barcode).trim() : "";

      // Check if code collides with a different product or existing batch in DB
      let isColliding = false;
      if (rawBarcode) {
        // 1. Check products table
        const prodMatch = db
          .prepare(
            "SELECT id FROM products WHERE (barcode = ? OR product_code = ?) AND id != ?",
          )
          .get(rawBarcode, rawBarcode, prodId);
        if (prodMatch) isColliding = true;

        // 2. Check product_batches table
        if (!isColliding) {
          let batchQuery = "SELECT id, purchase_id FROM product_batches WHERE barcode = ?";
          const batchMatches = db.prepare(batchQuery).all(rawBarcode);
          for (const bm of batchMatches) {
            if (currentPurchaseId && bm.purchase_id !== currentPurchaseId) {
              if (!prod?.barcode || prod.barcode !== rawBarcode) {
                isColliding = true;
                break;
              }
            }
          }
        }
      }

      const isBlank = !rawBarcode;
      // If the barcode is shared by multiple items in this payload (due to the bug), ALL duplicates must be re-minted!
      const isDuplicateInPayload =
        (rawBarcode && barcodeCounts[rawBarcode] > 1) ||
        usedBarcodesInPayload.has(rawBarcode);

      if (isBlank || isDuplicateInPayload || isColliding) {
        // Mint next sequential 2_000<productId>_<seq> barcode
        const newBarcode = batchService.generate8DigitBarcode({
          type: "batch",
          productId: prodId,
          exclude: Array.from(usedBarcodesInPayload),
        });
        item.barcode = newBarcode;
        usedBarcodesInPayload.add(newBarcode);
      } else {
        usedBarcodesInPayload.add(rawBarcode);
      }
    }
  }

  return items;
}

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

    // Deduplicate & normalize batch barcodes before persisting
    normalizeAndDeduplicatePurchaseBatches(items);

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

        const created = batchService.createNewBatch({
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
          variants: item.variants,
        });

        // Sync batch_uid back to purchase_items
        if (created?.batchUid) {
          db.prepare(
            `UPDATE purchase_items SET batch_uid = ? WHERE purchase_id = ? AND product_id = ? AND (batch_number IS ? OR batch_number = ?) AND (barcode IS ? OR barcode = ?)`,
          ).run(
            created.batchUid,
            purchase_id,
            item.product_id,
            item.batch_number || null,
            item.batch_number || "DEFAULT",
            item.barcode || null,
            item.barcode || "",
          );
        }
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
  return purchaseRepository.deletePurchase(id);
}

/* -------------------- UPDATE PURCHASE  --------------------------*/
export async function updatePurchase(id, purchaseData) {
  const oldPurchase = purchaseRepository.getPurchaseById(id);
  if (!oldPurchase) throw new Error("Purchase not found");

  // Deduplicate & normalize batch barcodes before persisting (heals duplicates on edit)
  normalizeAndDeduplicatePurchaseBatches(purchaseData.items, id);

  const transaction = db.transaction(() => {
    // 1. Fetch all existing product_batches tied to this purchase
    const existingBatches = db
      .prepare(
        "SELECT * FROM product_batches WHERE purchase_id = ? ORDER BY id ASC",
      )
      .all(id);

    // 2. Adjust Master Product Quantities
    const oldProductTotals = {};
    for (const item of oldPurchase.items) {
      const product = getProductById(item.product_id);
      const qty = convertToStockQuantity(item.quantity, item.unit, product);
      oldProductTotals[item.product_id] =
        (oldProductTotals[item.product_id] || 0) + qty;
    }

    const newProductTotals = {};
    for (const item of purchaseData.items) {
      const product = getProductById(item.product_id);
      const qty = convertToStockQuantity(item.quantity, item.unit, product);
      newProductTotals[item.product_id] =
        (newProductTotals[item.product_id] || 0) + qty;
    }

    const allProductIds = new Set([
      ...Object.keys(oldProductTotals),
      ...Object.keys(newProductTotals),
    ]);
    for (const prodIdStr of allProductIds) {
      const prodId = Number(prodIdStr);
      const oldQty = oldProductTotals[prodId] || 0;
      const newQty = newProductTotals[prodId] || 0;
      const netDelta = newQty - oldQty;
      if (netDelta !== 0) {
        const prod = getProductById(prodId);
        updateProductQuantity(prodId, prod.quantity + netDelta);
      }
    }

    // 3. Update / Create Batches directly in product_batches
    const usedBatchIds = new Set();

    for (const item of purchaseData.items) {
      const product = getProductById(item.product_id);
      const isBatchTracked =
        product.tracking_type === "batch" ||
        product.tracking_type === "serial" ||
        item.batch_number;

      if (!isBatchTracked) continue;

      const baseQty = convertToStockQuantity(item.quantity, item.unit, product);

      // Find matching existing batch for this purchase
      // Priority 1: batch_uid
      let matchedBatch = existingBatches.find(
        (b) =>
          !usedBatchIds.has(b.id) &&
          b.product_id === item.product_id &&
          item.batch_uid &&
          b.batch_uid === item.batch_uid,
      );

      // Priority 2: batch_number (if not DEFAULT and not blank)
      if (!matchedBatch && item.batch_number) {
        matchedBatch = existingBatches.find(
          (b) =>
            !usedBatchIds.has(b.id) &&
            b.product_id === item.product_id &&
            b.batch_number &&
            b.batch_number !== "DEFAULT" &&
            b.batch_number.trim().toLowerCase() ===
              item.batch_number.trim().toLowerCase(),
        );
      }

      // Priority 3: barcode
      if (!matchedBatch && item.barcode) {
        matchedBatch = existingBatches.find(
          (b) =>
            !usedBatchIds.has(b.id) &&
            b.product_id === item.product_id &&
            b.barcode === item.barcode,
        );
      }

      // Priority 4: first unused batch for the same product in this purchase
      if (!matchedBatch) {
        matchedBatch = existingBatches.find(
          (b) => !usedBatchIds.has(b.id) && b.product_id === item.product_id,
        );
      }

      if (matchedBatch) {
        usedBatchIds.add(matchedBatch.id);
        item.batch_uid = matchedBatch.batch_uid;

        // Check if sales were made from this batch
        let salesCount = 0;
        try {
          const soldRes = db
            .prepare(
              "SELECT COALESCE(SUM(quantity), 0) as sold FROM sales_items WHERE batch_id = ?",
            )
            .get(matchedBatch.id);
          salesCount = soldRes?.sold || 0;
        } catch (e) {
          salesCount = 0;
        }

        const effectiveBatchQty = Math.max(0, baseQty - salesCount);

        // DIRECTLY UPDATE product_batches: barcode, batch_number, mrp, mop, margin, mfw_price, quantity, dates
        db.prepare(
          `
          UPDATE product_batches 
          SET barcode = ?,
              batch_number = COALESCE(?, batch_number),
              mrp = ?,
              mop = ?,
              margin = ?,
              mfw_price = ?,
              expiry_date = ?,
              mfg_date = ?,
              quantity = ?,
              updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `,
        ).run(
          item.barcode || matchedBatch.barcode,
          item.batch_number || null,
          item.mrp || 0,
          item.mop || 0,
          item.margin || 0,
          item.mfw_price || null,
          item.expiry_date || null,
          item.mfg_date || null,
          effectiveBatchQty,
          matchedBatch.id,
        );

        // Update variants if applicable
        if (Array.isArray(item.variants) && item.variants.length > 0) {
          for (let i = 0; i < item.variants.length; i++) {
            const v = item.variants[i];
            if (v.quantity <= 0) continue;
            const existingVar = db
              .prepare(
                `SELECT id FROM batch_variants WHERE batch_id = ? AND article_no IS ? AND dim1_value IS ? AND dim2_value IS ?`,
              )
              .get(
                matchedBatch.id,
                v.article_no || null,
                v.dim1_value || null,
                v.dim2_value || null,
              );
            if (existingVar) {
              db.prepare(
                `UPDATE batch_variants SET quantity = ?, mrp = ?, mop = ? WHERE id = ?`,
              ).run(
                v.quantity || 0,
                v.mrp ?? item.mrp ?? 0,
                v.mop ?? item.mop ?? 0,
                existingVar.id,
              );
            } else {
              const generatedBarcode =
                v.barcode ||
                batchService.generate8DigitBarcode({
                  type: "variant",
                  productId: item.product_id,
                  batchId: matchedBatch.id,
                  variantIndex: i + 1,
                });
              db.prepare(
                `INSERT INTO batch_variants (batch_id, product_id, article_no, dim1_value, dim2_value, quantity, initial_quantity, mrp, mop, cost_price, barcode, sku)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              ).run(
                matchedBatch.id,
                item.product_id,
                v.article_no || null,
                v.dim1_value || null,
                v.dim2_value || null,
                v.quantity || 0,
                v.quantity || 0,
                v.mrp ?? item.mrp ?? 0,
                v.mop ?? item.mop ?? 0,
                item.rate || 0,
                generatedBarcode,
                v.sku || null,
              );
            }
          }
        }
      } else {
        // Create new batch for newly added item
        const created = batchService.createNewBatch({
          productId: item.product_id,
          purchaseId: id,
          batchNumber: item.batch_number,
          barcode: item.barcode,
          expiryDate: item.expiry_date,
          mfgDate: item.mfg_date,
          mrp: item.mrp || 0,
          margin: item.margin || 0,
          mop: item.mop || 0,
          costPrice: item.rate || 0,
          quantity: baseQty,
          serialNumbers: item.serial_numbers,
          location: "Store",
          variants: item.variants,
        });
        if (created?.batchUid) {
          item.batch_uid = created.batchUid;
        }
      }
    }

    // 4. Clean up any orphaned batches from this purchase that were removed or unused
    for (const b of existingBatches) {
      if (!usedBatchIds.has(b.id)) {
        let salesCount = 0;
        try {
          const soldRes = db
            .prepare(
              "SELECT COALESCE(SUM(quantity), 0) as sold FROM sales_items WHERE batch_id = ?",
            )
            .get(b.id);
          salesCount = soldRes?.sold || 0;
        } catch (e) {
          salesCount = 0;
        }

        if (salesCount === 0) {
          db.prepare("DELETE FROM product_serials WHERE batch_id = ?").run(b.id);
          db.prepare("DELETE FROM batch_variants WHERE batch_id = ?").run(b.id);
          db.prepare("DELETE FROM product_batches WHERE id = ?").run(b.id);
        } else {
          db.prepare(
            "UPDATE product_batches SET quantity = 0, is_active = 0, updated_at = datetime('now', 'localtime') WHERE id = ?",
          ).run(b.id);
        }
      }
    }

    // 5. Handle Financial Delta
    const oldPaid = oldPurchase.paid_amount || 0;
    const newPaid = purchaseData.paid_amount || 0;
    const delta = newPaid - oldPaid;

    if (delta !== 0) {
      createTransaction({
        type: delta > 0 ? "payment_out" : "payment_in",
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

    // 6. Update Records (Header & Items)
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
    from: start_date,
    to: end_date,
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

export function getPurchaseOrderMetricsService(query) {
  const { filter = "month", start_date, end_date, year } = query;
  return purchaseRepository.getPurchaseOrderMetrics({
    filter,
    start_date,
    end_date,
    year,
  });
}

export function getTopPurchasedProductsService(query) {
  const { filter = "month", start_date, end_date, year, limit } = query;
  return purchaseRepository.getTopPurchasedProducts({
    filter,
    start_date,
    end_date,
    year,
    limit,
  });
}

export function getPurchasePaymentModeBreakdownService(query) {
  const { filter = "month", start_date, end_date, year } = query;
  return purchaseRepository.getPurchasePaymentModeBreakdown({
    filter,
    start_date,
    end_date,
    year,
  });
}

export function processPurchaseReturnService(payload) {
  if (
    !payload.purchaseId ||
    !payload.returnItems ||
    !Array.isArray(payload.returnItems) ||
    payload.returnItems.length === 0
  ) {
    throw new Error("Invalid purchase return data: Purchase ID and items are required.");
  }
  return purchaseRepository.processPurchaseReturn(payload);
}
