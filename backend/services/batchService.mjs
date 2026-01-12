import * as BatchRepo from "../repositories/batchRepository.mjs";
import { generateBatchUid } from "../utils/batchUtils.mjs";
import db from "../db/db.mjs"; // Assuming access to transaction

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
}) {
  // Use a transaction to ensure the Sequence Count and Insertion happen atomically
  const createTransaction = db.transaction(() => {
    // 1. Get the current count of batches for this product to determine the next sequence number
    const countStmt = db.prepare(
      "SELECT COUNT(*) as count FROM product_batches WHERE product_id = ?"
    );
    const result = countStmt.get(productId);
    const nextSequence = (result ? result.count : 0) + 1;

    // 2. Generate the unique internal Batch UID (BAT-<pid>-<seq>)
    const batchUid = generateBatchUid(productId, nextSequence);

    // 3. Prepare Insert Statement
    const insertBatch = db.prepare(`
      INSERT INTO product_batches (
        product_id,
        purchase_id,
        batch_uid,
        batch_number,
        expiry_date,
        mfg_date,
        mrp,
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
        @expiryDate,
        @mfgDate,
        @mrp,
        @mop,
        @mfwPrice,
        @quantity,
        @location,
        1
      )
    `);

    // 4. Run Insert
    const info = insertBatch.run({
      productId,
      purchaseId,
      batchUid,
      batchNumber: batchNumber || "DEFAULT",
      expiryDate: expiryDate || null,
      mfgDate: mfgDate || null,
      mrp: mrp || 0,
      mop: costPrice || 0,
      mfwPrice: mrp || 0,
      quantity: quantity || 0,
      location: location || "Store",
    });

    const batchId = info.lastInsertRowid;

    // 5. Handle Serial Numbers (if any)
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

// --- NEW FEATURES ---

/**
 * Generates print payloads for labels.
 */
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

  // 1. Product Scope
  if (scope === "product") {
    const code = product.barcode || product.product_code || String(product.id);
    labels.push({
      barcode: code,
      label: product.name,
      price: product.mrp,
      copies: qty,
    });
  }

  // 2. Batch Scope
  else if (scope === "batch") {
    const batch = BatchRepo.getBatchById(batchId);
    if (!batch) throw new Error("Batch not found");

    // Barcode: Batch UID (Priority) -> "BAT-{id}" (Fallback)
    const code = batch.batch_uid || `BAT-${batch.id}`;

    labels.push({
      barcode: code,
      label: `${product.name} (Batch: ${batch.batch_number})`,
      price: batch.mrp,
      copies: qty,
    });
  }

  // 3. Serial Scope
  else if (scope === "serial") {
    const batch = BatchRepo.getBatchById(batchId);
    if (!batch) throw new Error("Batch not found for serials");

    let serials = [];
    if (serialIds && serialIds.includes("all")) {
      serials = BatchRepo.getAllSerialsInBatch(batchId);
    } else {
      serials = BatchRepo.getSerialsByIds(serialIds);
    }

    for (const item of serials) {
      // Barcode Format: <PID>-<BatchUID>-<SerialNum>
      // Fallback for batchUID if old data
      const bUid = batch.batch_uid || `BAT-${batch.id}`;
      const code = `${product.id}-${bUid}-${item.serial_number}`;

      labels.push({
        barcode: code,
        label: `${product.name} (SN: ${item.serial_number})`,
        price: batch.mrp,
        copies: qty, // Copies per serial
      });
    }
  }

  return labels;
}

/**
 * Scans a barcode and resolves it to a Product, Batch, or Serial.
 * Logic:
 * 1. Try Serial Composite format (PID-BATUID-SN)
 * 2. Try Batch UID format (BAT-...)
 * 3. Try Product Barcode/Code
 */
export async function scanBarcode(code) {
  if (!code) throw new Error("No code provided");

  // A. Check for Serial Composite (e.g., 101-BAT-101-0001-SN123)
  // Simple check: does it contain "BAT-" in the middle?
  if (code.includes("-BAT-")) {
    const parts = code.split("-BAT-");
    if (parts.length >= 2) {
      const pid = parts[0];
      const rest = "BAT-" + parts[1]; // Restore BAT- prefix
      // rest might be "BAT-101-0001-SN123" -> Split into UID and SN
      // Assuming Batch UID is fixed length or we split by last hyphen
      // Actually, safest is to parse strictly if we know the format generated above:
      // Gen Format: `${product.id}-${bUid}-${item.serial_number}`

      // Let's rely on finding the serial by exact string match or composite logic in Repo
      // But splitting is risky if SN contains hyphens.
      // Strategy: Try to find a serial containing this exact string or parse carefully.

      const lastHyphen = code.lastIndexOf("-");
      const serialNum = code.substring(lastHyphen + 1);
      const batchUid = code.substring(code.indexOf("-") + 1, lastHyphen); // Middle part

      const serial = BatchRepo.findSerialByCompositeKey(
        pid,
        batchUid,
        serialNum
      );
      if (serial) {
        const product = BatchRepo.getProductById(serial.product_id);
        const batch = BatchRepo.getBatchById(serial.batch_id);
        return { type: "serial", product, batch, serial };
      }
    }
  }

  // B. Check for Batch UID
  if (code.startsWith("BAT-")) {
    const batch = BatchRepo.findBatchByUid(code);
    if (batch) {
      const product = BatchRepo.getProductById(batch.product_id);
      return { type: "batch", product, batch };
    }
  }

  // C. Check for Product Barcode / Code / ID
  const product = BatchRepo.findProductByBarcode(code);
  if (product) {
    return { type: "product", product };
  }

  // D. Fallback: Check if scanning just the Serial Number (Legacy support)
  const serialOnly = BatchRepo.findSerialByExactMatch(code);
  if (serialOnly) {
    const product = BatchRepo.getProductById(serialOnly.product_id);
    const batch = BatchRepo.getBatchById(serialOnly.batch_id);
    return { type: "serial", product, batch, serial: serialOnly };
  }

  throw new Error("Item not found");
}

/**
 * Aggregates analytics for batches of a specific product.
 * @param {number} productId
 */
export function getBatchAnalyticsForProduct(productId) {
  // 1. Price Trend (Purchase Price over time)
  // We assume 'mop' (Market Operating Price/Cost) reflects the purchase cost.
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
  `
    )
    .all(productId);

  // 2. Stock Age Distribution
  // Buckets: <30 days, 30-90 days, >90 days
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
  `
    )
    .all(productId);

  // 3. Supplier Performance (Frequency of batches from suppliers)
  // Links batches -> purchases -> suppliers
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
  `
    )
    .all(productId);

  // 4. Low Stock Batches Count
  const lowStockCount = db
    .prepare(
      `
    SELECT COUNT(*) as count 
    FROM product_batches 
    WHERE product_id = ? AND quantity < 5 AND quantity > 0
  `
    )
    .get(productId).count;

  // 5. Sales Velocity (Approximate - Batches sold in last 30 days)
  // This requires joining sales_items to product_batches.
  // Assuming sales_items has batch_id
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
  `
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
