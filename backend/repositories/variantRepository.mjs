import db from "../db/db.mjs";

/**
 * Get all variants belonging to a specific batch
 */
export function getVariantsByBatchId(batchId) {
  const stmt = db.prepare(`
    SELECT 
      bv.*,
      pb.batch_number,
      pb.batch_uid,
      p.name as product_name,
      p.product_code
    FROM batch_variants bv
    JOIN product_batches pb ON bv.batch_id = pb.id
    JOIN products p ON bv.product_id = p.id
    WHERE bv.batch_id = ?
    ORDER BY bv.id ASC
  `);
  return stmt.all(batchId);
}

/**
 * Get all variants belonging to a specific product (across all batches) with optional search filter.
 * Search matches against article_no, dim1_value (color), dim2_value (size), barcode, sku, batch_number.
 */
export function getVariantsByProductId(productId, search = "") {
  let query = `
    SELECT 
      bv.*,
      pb.batch_number,
      pb.batch_uid,
      p.name as product_name,
      p.product_code
    FROM batch_variants bv
    JOIN product_batches pb ON bv.batch_id = pb.id
    JOIN products p ON bv.product_id = p.id
    WHERE bv.product_id = ?
  `;
  const params = [productId];

  if (search && search.trim() !== "") {
    const term = `%${search.trim()}%`;
    query += `
      AND (
        bv.article_no LIKE ? OR
        bv.dim1_value LIKE ? OR
        bv.dim2_value LIKE ? OR
        bv.barcode LIKE ? OR
        bv.sku LIKE ? OR
        pb.batch_number LIKE ?
      )
    `;
    params.push(term, term, term, term, term, term);
  }

  query += ` ORDER BY pb.id DESC, bv.id ASC`;

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

/**
 * Get all variants globally with pagination and search
 */
export function getAllVariants(search = "", limit = 50, offset = 0) {
  let countQuery = `
    SELECT COUNT(*) as total 
    FROM batch_variants bv
    JOIN product_batches pb ON bv.batch_id = pb.id
    JOIN products p ON bv.product_id = p.id
  `;
  let dataQuery = `
    SELECT 
      bv.*,
      pb.batch_number,
      pb.batch_uid,
      p.name as product_name,
      p.product_code
    FROM batch_variants bv
    JOIN product_batches pb ON bv.batch_id = pb.id
    JOIN products p ON bv.product_id = p.id
  `;
  const params = [];

  if (search && search.trim() !== "") {
    const term = `%${search.trim()}%`;
    const filter = `
      WHERE (
        bv.article_no LIKE ? OR
        bv.dim1_value LIKE ? OR
        bv.dim2_value LIKE ? OR
        bv.barcode LIKE ? OR
        bv.sku LIKE ? OR
        p.name LIKE ? OR
        pb.batch_number LIKE ?
      )
    `;
    countQuery += filter;
    dataQuery += filter;
    params.push(term, term, term, term, term, term, term);
  }

  const countStmt = db.prepare(countQuery);
  const total = countStmt.get(...params)?.total || 0;

  dataQuery += ` ORDER BY bv.id DESC LIMIT ? OFFSET ?`;
  const dataStmt = db.prepare(dataQuery);
  const rows = dataStmt.all(...params, limit, offset);

  return { rows, total };
}

/**
 * Get a single variant by ID
 */
export function getVariantById(id) {
  const stmt = db.prepare(`
    SELECT 
      bv.*,
      pb.batch_number,
      pb.batch_uid,
      p.name as product_name,
      p.product_code
    FROM batch_variants bv
    JOIN product_batches pb ON bv.batch_id = pb.id
    JOIN products p ON bv.product_id = p.id
    WHERE bv.id = ?
  `);
  return stmt.get(id);
}

/**
 * Get multiple variants by IDs (useful for bulk label printing)
 */
export function getVariantsByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const stmt = db.prepare(`
    SELECT 
      bv.*,
      pb.batch_number,
      pb.batch_uid,
      p.name as product_name,
      p.product_code
    FROM batch_variants bv
    JOIN product_batches pb ON bv.batch_id = pb.id
    JOIN products p ON bv.product_id = p.id
    WHERE bv.id IN (${placeholders})
  `);
  return stmt.all(...ids);
}

/**
 * Update variant details
 */
export function updateVariant(id, updates) {
  const fields = [];
  const params = [];

  if (updates.quantity !== undefined) { fields.push("quantity = ?"); params.push(updates.quantity); }
  if (updates.mrp !== undefined) { fields.push("mrp = ?"); params.push(updates.mrp); }
  if (updates.mop !== undefined) { fields.push("mop = ?"); params.push(updates.mop); }
  if (updates.cost_price !== undefined) { fields.push("cost_price = ?"); params.push(updates.cost_price); }
  if (updates.barcode !== undefined) { fields.push("barcode = ?"); params.push(updates.barcode); }
  if (updates.sku !== undefined) { fields.push("sku = ?"); params.push(updates.sku); }
  if (updates.article_no !== undefined) { fields.push("article_no = ?"); params.push(updates.article_no); }
  if (updates.dim1_value !== undefined) { fields.push("dim1_value = ?"); params.push(updates.dim1_value); }
  if (updates.dim2_value !== undefined) { fields.push("dim2_value = ?"); params.push(updates.dim2_value); }

  if (fields.length === 0) return getVariantById(id);

  params.push(id);
  const sql = `UPDATE batch_variants SET ${fields.join(", ")} WHERE id = ?`;
  db.prepare(sql).run(...params);

  return getVariantById(id);
}
