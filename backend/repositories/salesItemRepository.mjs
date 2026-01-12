import db from "../db/db.mjs";

/**
 * Create a new item linked to a sale
 */
export function createSaleItem({
  sale_id,
  sr_no,
  product_id,
  quantity,
  rate,
  price,
  gst_rate,
  discount,
  batch_id, // New
  serial_id, // New
}) {
  try {
    const stmt = db.prepare(`
    INSERT INTO sales_items (
      sale_id,
      sr_no,
      product_id,      
      rate,
      quantity,
      gst_rate,
      discount,
      price,
      batch_id,
      serial_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    stmt.run([
      sale_id,
      sr_no,
      product_id,
      rate,
      quantity,
      gst_rate,
      discount,
      price,
      batch_id || null, // Allow null for non-tracked items
      serial_id || null, // Allow null
    ]);
  } catch (error) {
    console.error("error in sales item repo", error);
    throw new Error("Sale Item creation failed: " + error.message);
  }
}

/**
 * Get all items for a specific sale
 */
export function getItemsBySaleId(sale_id) {
  const stmt = db.prepare(`
    SELECT * FROM sales_items WHERE sale_id = ? ORDER BY sr_no ASC
  `);

  return new Promise((resolve, reject) => {
    stmt.all(sale_id, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// 🔹 Delete Sale Items
export async function deleteItemsBySaleId(saleId) {
  const stmt = db.prepare(`DELETE FROM sales_items WHERE sale_id = ?`);
  return stmt.run(saleId);
}


