import express from "express";
import db from "../db/db.mjs"; // Ensure this import path is correct based on your file structure

const router = express.Router();
// Use the getDb helper to get the database instance

/**
 * PULL CHANGES: Mobile asks "What's new?"
 */
router.get("/pull", (req, res) => {
  try {
    const { last_pulled_at, active_only, schema_version, migration } =
      req.query;

    // WatermelonDB sends last_pulled_at as a timestamp (Active only logic)
    const lastPulledAt =
      last_pulled_at && last_pulled_at !== "null"
        ? parseInt(last_pulled_at)
        : 0;

    // Logic: If lastPulledAt is 0 (First Sync), we might filter by 'active_only' to keep payload small
    const isActiveFilter = active_only === "true" && lastPulledAt === 0;

    const changes = {
      products: { created: [], updated: [], deleted: [] },
      product_batches: { created: [], updated: [], deleted: [] },
      product_serials: { created: [], updated: [], deleted: [] },
    };

    // --- 1. Fetch Products ---
    let productQuery = `SELECT * FROM products WHERE updated_at > ?`;
    if (isActiveFilter) productQuery += ` AND is_active = 1`;

    const products = db.prepare(productQuery).all(lastPulledAt);

    products.forEach((p) => {
      // Map Backend ID to 'server_id' for Mobile
      // Ideally, mobile uses UUIDs, but we map integer ID -> server_id
      changes.products.updated.push({
        id: p.id.toString(), // WatermelonDB needs String IDs
        server_id: p.id,
        name: p.name,
        product_code: p.product_code,
        barcode: p.barcode,
        description: p.description,
        mrp: p.mrp || 0,
        mop: p.mop || 0,
        mfw_price: p.mfw_price || "0", // Included mfw_price
        gst_rate: p.gst_rate || 0,
        hsn: p.hsn,
        quantity: p.quantity || 0,
        tracking_type: p.tracking_type,
        low_stock_threshold: p.low_stock_threshold,
        is_active: p.is_active === 1,
        image_url: p.image_url,
        created_at: p.created_at,
        updated_at: p.updated_at,
      });
    });

    // --- 2. Fetch Batches ---
    let batchQuery = `SELECT * FROM product_batches WHERE updated_at > ?`;
    if (isActiveFilter) batchQuery += ` AND is_active = 1 AND quantity > 0`;

    const batches = db.prepare(batchQuery).all(lastPulledAt);

    batches.forEach((b) => {
      changes.product_batches.updated.push({
        id: b.id.toString(),
        server_id: b.id,
        product_id: b.product_id.toString(),
        batch_number: b.batch_number,
        expiry_date: b.expiry_date,
        mrp: b.mrp,
        mop: b.mop,
        mfw_price: b.mfw_price || "0", // Included mfw_price
        quantity: b.quantity,
        is_active: b.is_active === 1,
        created_at: b.created_at,
        updated_at: b.updated_at,
      });
    });

    // --- 3. Fetch Serials ---
    let serialQuery = `SELECT * FROM product_serials WHERE updated_at > ?`;
    if (isActiveFilter) serialQuery += ` AND status = 'available'`;

    const serials = db.prepare(serialQuery).all(lastPulledAt);

    serials.forEach((s) => {
      changes.product_serials.updated.push({
        id: s.id.toString(),
        server_id: s.id,
        product_id: s.product_id.toString(),
        batch_id: s.batch_id.toString(),
        serial_number: s.serial_number,
        status: s.status,
        created_at: s.created_at,
        updated_at: s.updated_at,
      });
    });

    // Current Server Time
    const timestamp = Date.now();

    res.json({ changes, timestamp });
  } catch (error) {
    console.error("[SYNC ERROR]", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUSH CHANGES: Mobile sends offline sales
 */
router.post("/push", (req, res) => {
  const { changes, last_pulled_at } = req.body;

  try {
    db.transaction(() => {
      // Handle New Sales
      if (changes.sales && changes.sales.created) {
        const stmtSale = db.prepare(`
          INSERT INTO sales (reference_no, customer_name, total_amount, payment_mode, status, created_at, updated_at)
          VALUES (@reference_no, @customer_name, @total_amount, @payment_mode, 'synced', @created_at, @updated_at)
        `);

        // We need to map Mobile IDs (UUIDs) to Backend IDs (Integers)
        // This is tricky. For now, we just insert.
        // In a real app, you'd return the mapping.

        changes.sales.created.forEach((sale) => {
          stmtSale.run({
            reference_no: sale.reference_no,
            customer_name: sale.customer_name,
            total_amount: sale.total_amount,
            payment_mode: sale.payment_mode,
            created_at: sale.created_at,
            updated_at: Date.now(),
          });

          // Warning: We aren't linking items here yet because we need the new Sale ID.
          // For MVP, we assume the reference_no is unique and use that to link items later.
        });
      }
    })();

    res.json({ status: "ok" });
  } catch (error) {
    console.error("[PUSH ERROR]", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
