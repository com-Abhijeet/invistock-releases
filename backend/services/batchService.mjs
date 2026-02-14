import * as BatchRepo from "../repositories/batchRepository.mjs";
import { generateBatchUid } from "../utils/batchUtils.mjs";
import db from "../db/db.mjs";

// ... existing createNewBatch, processSaleItemStockDeduction ...

export function createNewBatch({
  productId,
  purchaseId,
  batchNumber,
  expiryDate,
  mfgDate,
  mrp,
  costPrice,
  quantity,
  serialNumbers,
  location,
  barcode,
  margin,
}) {
  const createTransaction = db.transaction(() => {
    const countStmt = db.prepare(
      "SELECT COUNT(*) as count FROM product_batches WHERE product_id = ?",
    );
    const result = countStmt.get(productId);
    const nextSequence = (result ? result.count : 0) + 1;

    const batchUid = generateBatchUid(productId, nextSequence);

    const insertBatch = db.prepare(`
      INSERT INTO product_batches (
        product_id,
        purchase_id,
        batch_uid,
        batch_number,
        barcode,
        expiry_date,
        mfg_date,
        mrp,
        margin,
        mop,
        mfw_price,
        quantity,
        location,
        is_active
      ) VALUES (
        @productId,
        @purchaseId,
        @batchUid,
        @batchNumber,
        @barcode,
        @expiryDate,
        @mfgDate,
        @mrp,
        @margin,
        @mop,
        @mfwPrice,
        @quantity,
        @location,
        1
      )
    `);

    const info = insertBatch.run({
      productId,
      purchaseId,
      batchUid,
      batchNumber: batchNumber || "DEFAULT",
      barcode: barcode || null,
      expiryDate: expiryDate || null,
      mfgDate: mfgDate || null,
      mrp: mrp || 0,
      margin: margin || 0,
      mop: costPrice || 0,
      mfwPrice: mrp || 0,
      quantity: quantity || 0,
      location: location || "Store",
    });

    const batchId = info.lastInsertRowid;

    if (serialNumbers) {
      let serialList = [];

      if (Array.isArray(serialNumbers)) {
        serialList = serialNumbers;
      } else if (typeof serialNumbers === "string") {
        serialList = serialNumbers
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter((s) => s !== "");
      }

      if (serialList.length > 0) {
        const insertSerial = db.prepare(`
          INSERT INTO product_serials (
            product_id,
            batch_id,
            serial_number,
            status
          ) VALUES (
            @productId,
            @batchId,
            @serialNumber,
            'available'
          )
        `);

        for (const sn of serialList) {
          insertSerial.run({
            productId,
            batchId,
            serialNumber: sn,
          });
        }
      }
    }

    return { batchId, batchUid };
  });

  return createTransaction();
}

/**
 * Reverts (deducts) stock from a specific batch associated with a purchase.
 * Used when updating/editing a purchase to rollback old items.
 */
export function revertPurchaseBatchStock({
  purchaseId,
  productId,
  quantity,
  serialNumbers,
}) {
  const transaction = db.transaction(() => {
    // 1. Find the batch created by this purchase for this product
    // Note: If multiple batches were created for same product in same purchase,
    // this logic assumes 1 batch per product per purchase, or simply deducts from any found.
    // Ideally we should use batch_uid if available from the old purchase item row.
    // For now, we look up by purchase_id.
    const batch = db
      .prepare(
        `
      SELECT id, quantity FROM product_batches 
      WHERE purchase_id = ? AND product_id = ?
    `,
      )
      .get(purchaseId, productId);

    if (batch) {
      const newQty = batch.quantity - quantity;
      // We allow negative quantity during rollback if items were already sold,
      // but ideally this shouldn't happen often in a healthy flow.
      db.prepare(`UPDATE product_batches SET quantity = ? WHERE id = ?`).run(
        newQty,
        batch.id,
      );

      // 2. Handle Serials removal
      // If serials were added, we should try to remove them if they are still 'available'.
      if (serialNumbers && serialNumbers.length > 0) {
        const deleteSerial = db.prepare(`
          DELETE FROM product_serials 
          WHERE batch_id = ? AND serial_number = ? AND status = 'available'
        `);
        for (const sn of serialNumbers) {
          deleteSerial.run(batch.id, sn);
        }
      }
    }
  });
  return transaction();
}

/**
 * Adds stock to a batch for a purchase, updating existing if match found or creating new.
 */
export function addOrUpdatePurchaseBatch(params) {
  const { purchaseId, productId, batchNumber, quantity } = params;

  const transaction = db.transaction(() => {
    // Check if a batch already exists for this purchase and product (and batch number)
    // This allows updating the SAME batch record during an edit, keeping history cleaner.
    const existing = db
      .prepare(
        `
      SELECT id, quantity FROM product_batches 
      WHERE purchase_id = ? AND product_id = ? AND batch_number = ?
    `,
      )
      .get(purchaseId, productId, batchNumber || "DEFAULT");

    if (existing) {
      // Update existing
      db.prepare(
        `
        UPDATE product_batches 
        SET quantity = quantity + ?, 
            mrp = ?, 
            expiry_date = ?, 
            mfg_date = ? 
        WHERE id = ?
      `,
      ).run(
        quantity,
        params.mrp || 0,
        params.expiryDate || null,
        params.mfgDate || null,
        existing.id,
      );

      // Add new serials if any
      if (params.serialNumbers && params.serialNumbers.length > 0) {
        const insertSerial = db.prepare(`
          INSERT OR IGNORE INTO product_serials (product_id, batch_id, serial_number, status) 
          VALUES (?, ?, ?, 'available')
        `);
        // We use INSERT OR IGNORE to avoid errors if serial exists (though unlikely if we reverted correctly)
        for (const sn of params.serialNumbers) {
          insertSerial.run(productId, existing.id, sn);
        }
      }
      return { batchId: existing.id };
    } else {
      // Create new
      return createNewBatch(params);
    }
  });
  return transaction();
}

export function assignUntrackedStock({
  productId,
  batchNumber,
  barcode,
  expiryDate,
  mfgDate,
  mrp,
  mop,
  mfwPrice,
  location,
  quantity,
  serials,
}) {
  const assignTransaction = db.transaction(() => {
    const countStmt = db.prepare(
      "SELECT COUNT(*) as count FROM product_batches WHERE product_id = ?",
    );
    const result = countStmt.get(productId);
    const nextSequence = (result ? result.count : 0) + 1;
    const batchUid = generateBatchUid(productId, nextSequence);

    const insertBatch = db.prepare(`
      INSERT INTO product_batches (
        product_id,
        purchase_id,
        batch_uid,
        batch_number,
        barcode,
        expiry_date,
        mfg_date,
        mrp,
        mop,
        mfw_price,
        quantity,
        location,
        is_active,
        created_at
      ) VALUES (
        @productId,
        NULL, 
        @batchUid,
        @batchNumber,
        @barcode,
        @expiryDate,
        @mfgDate,
        @mrp,
        @mop,
        @mfwPrice,
        @quantity,
        @location,
        1,
        datetime('now')
      )
    `);

    const info = insertBatch.run({
      productId,
      batchUid,
      batchNumber: batchNumber || "ASSIGNED",
      barcode: barcode || null,
      expiryDate: expiryDate || null,
      mfgDate: mfgDate || null,
      mrp: mrp || 0,
      mop: mop || 0,
      mfwPrice: mfwPrice || 0,
      location: location || null,
      quantity: quantity,
    });

    const newBatchId = info.lastInsertRowid;

    if (serials && serials.length > 0) {
      const insertSerial = db.prepare(`
        INSERT INTO product_serials (
          product_id, 
          batch_id, 
          serial_number, 
          status, 
          created_at
        ) VALUES (
          @productId, 
          @batchId, 
          @serialNumber, 
          'available', 
          datetime('now')
        )
      `);

      for (const sn of serials) {
        insertSerial.run({
          productId,
          batchId: newBatchId,
          serialNumber: sn,
        });
      }
    }

    return { batchId: newBatchId, message: "Stock assigned successfully" };
  });

  return assignTransaction();
}

export function processSaleItemStockDeduction({ batchId, serialId, quantity }) {
  if (serialId) {
    BatchRepo.updateSerialStatus(serialId, "sold");
    if (batchId) {
      BatchRepo.updateBatchQuantity(batchId, -1);
    }
  } else if (batchId) {
    BatchRepo.updateBatchQuantity(batchId, -Math.abs(quantity));
  }
}

export function processSaleReturnStockAddition({
  batchId,
  serialId,
  quantity,
}) {
  if (serialId) {
    BatchRepo.updateSerialStatus(serialId, "available");
    if (batchId) BatchRepo.updateBatchQuantity(batchId, 1);
  } else if (batchId) {
    BatchRepo.updateBatchQuantity(batchId, Math.abs(quantity));
  }
}

export function getBatchesForProduct(productId) {
  return BatchRepo.getActiveBatchesByProductId(productId);
}

export function getSerialsForProduct(productId) {
  return BatchRepo.getAvailableSerialsByProductId(productId);
}

export function traceSerial(serialNumber) {
  return BatchRepo.findSerialHistory(serialNumber);
}

// --- BARCODE UTILITIES ---

export function checkBarcodeExistence(code) {
  if (!code) return false;
  const productCheck = db
    .prepare("SELECT 1 FROM products WHERE barcode = ? OR product_code = ?")
    .get(code, code);
  if (productCheck) return true;
  const batchCheck = db
    .prepare("SELECT 1 FROM product_batches WHERE barcode = ?")
    .get(code);
  if (batchCheck) return true;
  const serialCheck = db
    .prepare("SELECT 1 FROM product_serials WHERE serial_number = ?")
    .get(code);
  if (serialCheck) return true;
  return false;
}

export function generateUniqueBarcode() {
  let unique = false;
  let barcode = "";
  let attempts = 0;
  while (!unique && attempts < 5) {
    barcode = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    if (!checkBarcodeExistence(barcode)) {
      unique = true;
    }
    attempts++;
  }
  if (!unique) {
    throw new Error("Failed to generate unique barcode after 5 attempts");
  }
  return barcode;
}

// --- NEW FEATURES ---

export async function generatePrintPayload({
  scope,
  productId,
  batchId,
  serialIds,
  copies,
}) {
  const product = BatchRepo.getProductById(productId);
  if (!product) throw new Error("Product not found");

  const labels = [];
  const qty = Number(copies) || 1;

  if (scope === "product") {
    const code = product.barcode || product.product_code || String(product.id);
    labels.push({
      barcode: code,
      label: product.name,
      price: product.mrp,
      copies: qty,
    });
  } else if (scope === "batch") {
    const batch = BatchRepo.getBatchById(batchId);
    if (!batch) throw new Error("Batch not found");
    const code = batch.barcode || batch.batch_uid || `BAT-${batch.id}`;
    labels.push({
      barcode: code,
      label: `${product.name} (Batch: ${batch.batch_number})`,
      price: batch.mrp,
      copies: qty,
    });
  } else if (scope === "serial") {
    const batch = BatchRepo.getBatchById(batchId);
    if (!batch) throw new Error("Batch not found for serials");
    let serials = [];
    if (serialIds && serialIds.includes("all")) {
      serials = BatchRepo.getAllSerialsInBatch(batchId);
    } else {
      serials = BatchRepo.getSerialsByIds(serialIds);
    }
    for (const item of serials) {
      const code = item.serial_number;
      labels.push({
        barcode: code,
        label: `${product.name} (SN: ${item.serial_number})`,
        price: batch.mrp,
        copies: qty,
      });
    }
  }
  return labels;
}

/**
 * Scans a barcode and resolves it to a Product, Batch, or Serial.
 * Priority: Serial > Batch > Product (Exact) > Product (Name fallback)
 */
export async function scanBarcode(code) {
  if (!code) throw new Error("No code provided");

  const trimmedCode = code.trim();

  // 1. Check Serial Numbers (Exact Match)
  // We fetch full product separately to ensure all fields (unit, hsn, tax) are present
  const serialCheck = db
    .prepare(
      `
    SELECT ps.*, pb.batch_number, pb.mrp as batch_mrp, pb.expiry_date, pb.mop as batch_mop, pb.mfw_price as batch_mfw
    FROM product_serials ps
    JOIN product_batches pb ON ps.batch_id = pb.id
    WHERE ps.serial_number = ?
  `,
    )
    .get(trimmedCode);

  if (serialCheck) {
    const product = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(serialCheck.product_id);
    return {
      type: "serial",
      product: product, // Full product details
      batch: {
        id: serialCheck.batch_id,
        batch_number: serialCheck.batch_number,
        mrp: serialCheck.batch_mrp,
        mop: serialCheck.batch_mop,
        mfw_price: serialCheck.batch_mfw,
        expiry_date: serialCheck.expiry_date,
      },
      serial: serialCheck,
    };
  }

  // 2. Check Batches (Exact Match on 'barcode')
  const batchCheck = db
    .prepare(
      `
    SELECT pb.*
    FROM product_batches pb
    WHERE pb.barcode = ? OR pb.batch_uid = ?
  `,
    )
    .get(trimmedCode, trimmedCode);

  if (batchCheck) {
    const product = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(batchCheck.product_id);
    return {
      type: "batch",
      product: product, // Full product details
      batch: batchCheck,
    };
  }

  // 3. Check Products (Exact Match on 'barcode' or 'product_code')
  const productCheck = db
    .prepare(
      `
    SELECT * FROM products WHERE barcode = ? OR product_code = ?
  `,
    )
    .get(trimmedCode, trimmedCode);

  if (productCheck) {
    return {
      type: "product",
      product: productCheck,
    };
  }

  // 4. Fallback: Exact Name Match
  // This handles cases where user types a known product name in scan field
  const nameCheck = db
    .prepare("SELECT * FROM products WHERE name = ? COLLATE NOCASE")
    .get(trimmedCode);

  if (nameCheck) {
    return {
      type: "product",
      product: nameCheck,
    };
  }

  throw new Error("Item not found");
}

export function getBatchAnalyticsForProduct(productId) {
  const priceTrend = db
    .prepare(
      `
    SELECT 
      batch_number, 
      mop as purchase_price, 
      created_at as date
    FROM product_batches
    WHERE product_id = ? AND quantity > 0
    ORDER BY created_at ASC
  `,
    )
    .all(productId);

  const ageDistribution = db
    .prepare(
      `
    SELECT 
      CASE 
        WHEN julianday('now') - julianday(created_at) < 30 THEN '< 30 Days'
        WHEN julianday('now') - julianday(created_at) BETWEEN 30 AND 90 THEN '30-90 Days'
        ELSE '> 90 Days'
      END as age_group,
      COUNT(*) as count
    FROM product_batches
    WHERE product_id = ? AND quantity > 0
    GROUP BY age_group
  `,
    )
    .all(productId);

  const supplierPerformance = db
    .prepare(
      `
    SELECT 
      s.name as supplier_name,
      COUNT(pb.id) as batch_count,
      AVG(pb.mop) as avg_purchase_price
    FROM product_batches pb
    JOIN purchases p ON pb.purchase_id = p.id
    JOIN suppliers s ON p.supplier_id = s.id
    WHERE pb.product_id = ?
    GROUP BY s.name
    ORDER BY batch_count DESC
    LIMIT 5
  `,
    )
    .all(productId);

  const lowStockCount = db
    .prepare(
      `
    SELECT COUNT(*) as count 
    FROM product_batches 
    WHERE product_id = ? AND quantity < 5 AND quantity > 0
  `,
    )
    .get(productId).count;

  const salesVelocity = db
    .prepare(
      `
    SELECT 
      pb.batch_number,
      SUM(si.quantity) as sold_qty
    FROM sales_items si
    JOIN product_batches pb ON si.batch_id = pb.id
    JOIN sales s ON si.sale_id = s.id
    WHERE si.product_id = ? 
      AND s.created_at >= datetime('now', '-30 days')
    GROUP BY pb.batch_number
    ORDER BY sold_qty DESC
    LIMIT 5
  `,
    )
    .all(productId);

  return {
    priceTrend,
    ageDistribution,
    supplierPerformance,
    lowStockCount,
    salesVelocity,
  };
}
