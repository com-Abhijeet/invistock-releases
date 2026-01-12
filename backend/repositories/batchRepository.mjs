import db from "../db/db.mjs";

// ... existing create/update functions ...

/**
 * Creates a new batch record in the database.
 * @param {object} batchData
 * @returns {number|bigint} The ID of the created batch.
 */
export function createBatch(batchData) {
  const stmt = db.prepare(`
    INSERT INTO product_batches (
      product_id, purchase_id, batch_uid, batch_number, 
      expiry_date, mfg_date, mrp, mop, mfw_price, 
      quantity, location
    ) VALUES (
      @product_id, @purchase_id, @batch_uid, @batch_number, 
      @expiry_date, @mfg_date, @mrp, @mop, @mfw_price, 
      @quantity, @location
    )
  `);
  const info = stmt.run(batchData);
  return info.lastInsertRowid;
}

/**
 * Creates a new serial number record linked to a batch.
 * @param {object} serialData
 */
export function createSerial(serialData) {
  const stmt = db.prepare(`
    INSERT INTO product_serials (
      product_id, batch_id, serial_number, status
    ) VALUES (
      @product_id, @batch_id, @serial_number, 'available'
    )
  `);
  stmt.run(serialData);
}

/**
 * Updates the quantity of a specific batch.
 * @param {number} batchId
 * @param {number} quantityChange - Can be positive (add) or negative (deduct).
 */
export function updateBatchQuantity(batchId, quantityChange) {
  const stmt = db.prepare(`
    UPDATE product_batches 
    SET quantity = quantity + ? 
    WHERE id = ?
  `);
  stmt.run(quantityChange, batchId);
}

/**
 * Updates the status of a specific serial number.
 * @param {number} serialId
 * @param {string} status - 'sold', 'available', 'returned', 'defective'
 */
export function updateSerialStatus(serialId, status) {
  const stmt = db.prepare(`
    UPDATE product_serials 
    SET status = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);
  stmt.run(status, serialId);
}

/**
 * Fetches all active batches for a specific product.
 * Useful for the Sales screen to show available stock.
 * @param {number} productId
 */
export function getActiveBatchesByProductId(productId) {
  return db
    .prepare(
      `
    SELECT * FROM product_batches 
    WHERE product_id = ? AND is_active = 1 AND quantity > 0
    ORDER BY expiry_date ASC
  `
    )
    .all(productId);
}

/**
 * Fetches all available serial numbers for a specific product.
 * @param {number} productId
 */
export function getAvailableSerialsByProductId(productId) {
  return db
    .prepare(
      `
    SELECT s.id, s.serial_number, s.batch_id, b.batch_number, b.batch_uid, b.expiry_date, b.mrp
    FROM product_serials s
    JOIN product_batches b ON s.batch_id = b.id
    WHERE s.product_id = ? AND s.status = 'available'
  `
    )
    .all(productId);
}

export function findSerialHistory(serialNumber) {
  // 1. Find the Serial and Batch info (Purchase/Supplier side)
  const serialInfo = db
    .prepare(
      `
    SELECT 
      ps.id as serial_id, ps.serial_number, ps.status, ps.created_at as entry_date,
      pb.id as batch_id, pb.batch_number, pb.expiry_date, pb.mrp,
      p.name as product_name, p.product_code, p.id as product_id,
      pur.id as purchase_id, pur.reference_no as purchase_ref, pur.date as purchase_date,
      sup.id as supplier_id, sup.name as supplier_name, sup.phone as supplier_phone
    FROM product_serials ps
    JOIN product_batches pb ON ps.batch_id = pb.id
    JOIN products p ON ps.product_id = p.id
    LEFT JOIN purchases pur ON pb.purchase_id = pur.id
    LEFT JOIN suppliers sup ON pur.supplier_id = sup.id
    WHERE ps.serial_number = ?
  `
    )
    .get(serialNumber);

  if (!serialInfo) return null;

  // 2. Find if it was sold (Sales/Customer side)
  const saleInfo = db
    .prepare(
      `
    SELECT 
      s.id as sale_id, s.reference_no as sale_ref, s.created_at as sale_date,
      c.id as customer_id, c.name as customer_name, c.phone as customer_phone,
      si.rate as sold_rate
    FROM sales_items si
    JOIN sales s ON si.sale_id = s.id
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE si.serial_id = ?
  `
    )
    .get(serialInfo.serial_id);

  return { ...serialInfo, sale: saleInfo || null };
}

export function findBatchDetails(batchNumber) {
  // 1. Get Batch Header Info, Product & Supplier
  const batch = db
    .prepare(
      `
    SELECT 
      pb.id as batch_id, pb.batch_number, pb.expiry_date, pb.quantity as current_stock, pb.mrp,
      p.id as product_id, p.name as product_name, p.tracking_type, p.product_code,
      pur.id as purchase_id, pur.reference_no as purchase_ref, pur.date as purchase_date,
      sup.id as supplier_id, sup.name as supplier_name, sup.phone as supplier_phone
    FROM product_batches pb
    JOIN products p ON pb.product_id = p.id
    LEFT JOIN purchases pur ON pb.purchase_id = pur.id
    LEFT JOIN suppliers sup ON pur.supplier_id = sup.id
    WHERE pb.batch_number = ?
  `
    )
    .get(batchNumber);

  if (!batch) return null;

  const serials = db
    .prepare(
      `SELECT serial_number, status FROM product_serials WHERE batch_id = ?`
    )
    .all(batch.batch_id);

  return { ...batch, serials };
}

// --- NEW METHODS FOR PRINTING & SCANNING ---

export function getProductById(productId) {
  return db.prepare("SELECT * FROM products WHERE id = ?").get(productId);
}

export function getBatchById(batchId) {
  return db.prepare("SELECT * FROM product_batches WHERE id = ?").get(batchId);
}

export function getSerialsByIds(serialIds) {
  if (!serialIds || serialIds.length === 0) return [];
  const placeholders = serialIds.map(() => "?").join(",");
  return db
    .prepare(`SELECT * FROM product_serials WHERE id IN (${placeholders})`)
    .all(...serialIds);
}

export function getAllSerialsInBatch(batchId) {
  return db
    .prepare("SELECT * FROM product_serials WHERE batch_id = ?")
    .all(batchId);
}

// Scanning Methods

export function findProductByBarcode(code) {
  return db
    .prepare(
      "SELECT * FROM products WHERE barcode = ? OR product_code = ? OR id = ?"
    )
    .get(code, code, code);
}

export function findBatchByUid(batchUid) {
  return db
    .prepare("SELECT * FROM product_batches WHERE batch_uid = ?")
    .get(batchUid);
}

export function findSerialByExactMatch(serialNumber) {
  return db
    .prepare(
      `
        SELECT ps.*, pb.batch_uid, pb.batch_number 
        FROM product_serials ps
        JOIN product_batches pb ON ps.batch_id = pb.id
        WHERE ps.serial_number = ?
    `
    )
    .get(serialNumber);
}

export function findSerialByCompositeKey(productId, batchUid, serialNumber) {
  return db
    .prepare(
      `
    SELECT ps.*, pb.batch_uid, pb.batch_number 
    FROM product_serials ps
    JOIN product_batches pb ON ps.batch_id = pb.id
    WHERE ps.product_id = ? AND pb.batch_uid = ? AND ps.serial_number = ?
  `
    )
    .get(productId, batchUid, serialNumber);
}

