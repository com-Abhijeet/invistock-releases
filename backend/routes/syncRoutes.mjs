import express from "express";
import db from "../db/db.mjs";

const router = express.Router();
const safeStr = (val) => (val === null || val === undefined ? "" : String(val));

router.get("/pull", (req, res) => {
  try {
    const rawLastPulledAt =
      req.query.last_pulled_at || req.headers["x-last-pulled-at"];
    const { active_only, sales_since } = req.query;

    const lastPulledAt =
      rawLastPulledAt && rawLastPulledAt !== "null"
        ? parseInt(rawLastPulledAt)
        : 0;

    const rawHistoricalCursor = req.query.historical_cursor;
    const historicalCursor = rawHistoricalCursor
      ? parseInt(rawHistoricalCursor)
      : null;

    // Helper to convert SQLite datetime strings to Unix timestamp for WatermelonDB
    const toUnix = (sqliteDate) => {
      if (!sqliteDate) return Date.now();
      if (typeof sqliteDate === "number") return sqliteDate;
      const date = new Date(sqliteDate);
      return isNaN(date.getTime()) ? Date.now() : date.getTime();
    };

    // Helper to convert Unix timestamp to SQLite localtime string
    const toSqlDate = (unixMs) => {
      if (!unixMs) return "1970-01-01 00:00:00";
      const date = new Date(unixMs);
      const pad = (n) => n.toString().padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    const salesSince = sales_since ? parseInt(sales_since) : 0;
    const isActiveFilter = active_only === "true" && lastPulledAt === 0;

    const sqlLastPulledAt = toSqlDate(lastPulledAt);

    let sqlSalesSince = toSqlDate(salesSince);

    // Default reverse batching window for initial or historical sync
    let batchEndMs = Date.now();
    let batchStartMs = 0;
    let nextHistoricalCursor = null;

    if (historicalCursor) {
      batchEndMs = historicalCursor;
      batchStartMs = batchEndMs - 30 * 24 * 60 * 60 * 1000; // 30 days before cursor
      nextHistoricalCursor = batchStartMs;
    } else if (lastPulledAt === 0 && salesSince === 0) {
      batchEndMs = Date.now();
      batchStartMs = batchEndMs - 30 * 24 * 60 * 60 * 1000;
      nextHistoricalCursor = batchStartMs;
    }

    const sqlBatchStart = toSqlDate(batchStartMs);
    const sqlBatchEnd = toSqlDate(batchEndMs);

    const changes = {
      products: { created: [], updated: [], deleted: [] },
      product_batches: { created: [], updated: [], deleted: [] },
      product_serials: { created: [], updated: [], deleted: [] },
      customers: { created: [], updated: [], deleted: [] },
      categories: { created: [], updated: [], deleted: [] },
      subcategories: { created: [], updated: [], deleted: [] },
      suppliers: { created: [], updated: [], deleted: [] },
      sales: { created: [], updated: [], deleted: [] },
      sales_items: { created: [], updated: [], deleted: [] },
      purchases: { created: [], updated: [], deleted: [] },
      purchase_items: { created: [], updated: [], deleted: [] },
      transactions: { created: [], updated: [], deleted: [] },
      expenses: { created: [], updated: [], deleted: [] },
    };

    const categorize = (tableName, obj, createdAtMs) => {
      // Since sendCreatedAsUpdated: true is used on the WatermelonDB client,
      // the server MUST NOT send any records in the 'created' array.
      // All records (both new and updated) must be placed in the 'updated' array.
      changes[tableName].updated.push(obj);
    };

    // 1. Products
    let productQuery = `SELECT * FROM products WHERE updated_at > ?`;
    if (isActiveFilter) productQuery += ` AND is_active = 1`;
    db.prepare(productQuery)
      .all(sqlLastPulledAt)
      .forEach((p) => {
        const obj = {
          id: safeStr(p.id),
          server_id: p.id,
          name: p.name,
          product_code: p.product_code,
          barcode: safeStr(p.barcode),
          description: safeStr(p.description),
          mrp: p.mrp || 0,
          mop: p.mop || 0,
          mfw_price: safeStr(p.mfw_price || "0"),
          gst_rate: p.gst_rate || 0,
          hsn: safeStr(p.hsn),
          quantity: p.quantity || 0,
          tracking_type: p.tracking_type,
          low_stock_threshold: p.low_stock_threshold,
          is_active: p.is_active === 1,
          image_url: safeStr(p.image_url),
          category_id: p.category || null,
          created_at: toUnix(p.created_at),
          updated_at: toUnix(p.updated_at),
        };
        categorize("products", obj, obj.created_at);
      });

    // 2. Batches
    let batchQuery = `SELECT * FROM product_batches WHERE updated_at > ?`;
    if (isActiveFilter) batchQuery += ` AND is_active = 1 AND quantity > 0`;
    db.prepare(batchQuery)
      .all(sqlLastPulledAt)
      .forEach((b) => {
        const obj = {
          id: safeStr(b.id),
          server_id: b.id,
          product_id: safeStr(b.product_id),
          batch_number: b.batch_number,
          expiry_date: safeStr(b.expiry_date),
          mrp: b.mrp || 0,
          mop: b.mop || 0,
          mfw_price: safeStr(b.mfw_price || "0"),
          quantity: b.quantity || 0,
          is_active: b.is_active === 1,
          created_at: toUnix(b.created_at),
          updated_at: toUnix(b.updated_at),
        };
        categorize("product_batches", obj, obj.created_at);
      });

    // 3. Serials
    let serialQuery = `SELECT * FROM product_serials WHERE updated_at > ?`;
    if (isActiveFilter) serialQuery += ` AND status = 'available'`;
    db.prepare(serialQuery)
      .all(sqlLastPulledAt)
      .forEach((s) => {
        const obj = {
          id: safeStr(s.id),
          server_id: s.id,
          product_id: safeStr(s.product_id),
          batch_id: safeStr(s.batch_id),
          serial_number: s.serial_number,
          status: s.status,
          created_at: toUnix(s.created_at),
          updated_at: toUnix(s.updated_at),
        };
        categorize("product_serials", obj, obj.created_at);
      });

    // Categories and Subcategories don't have updated_at in the current schema
    // We handle them below by fetching all

    // 6. Customers
    db.prepare(`SELECT * FROM customers WHERE updated_at > ?`)
      .all(sqlLastPulledAt)
      .forEach((c) => {
        const obj = {
          id: safeStr(c.id),
          server_id: c.id,
          name: c.name,
          phone: safeStr(c.phone),
          address: safeStr(c.address),
          gstin: safeStr(c.gst_no),
          created_at: toUnix(c.created_at),
          updated_at: toUnix(c.updated_at),
        };
        categorize("customers", obj, obj.created_at);
      });

    // 4b. Suppliers
    db.prepare(`SELECT * FROM suppliers WHERE updated_at > ?`)
      .all(sqlLastPulledAt)
      .forEach((s) => {
        const obj = {
          id: safeStr(s.id),
          server_id: s.id,
          name: s.name,
          phone: safeStr(s.phone),
          address: safeStr(s.address),
          gstin: safeStr(s.gst_no),
          created_at: toUnix(s.created_at),
          updated_at: toUnix(s.updated_at),
        };
        categorize("suppliers", obj, obj.created_at);
      });

    // 5. Categories
    // Since categories don't have updated_at, we just sync all of them every time
    // WatermelonDB will gracefully upsert them.
    db.prepare(`SELECT * FROM categories`)
      .all()
      .forEach((c) => {
        const obj = {
          id: safeStr(c.id),
          server_id: c.id,
          name: safeStr(c.name),
          code: safeStr(c.code),
          created_at: Date.now(), // Fallback if missing
          updated_at: Date.now(),
        };
        categorize("categories", obj, obj.created_at);
      });

    // 6. Subcategories
    db.prepare(`SELECT * FROM subcategories`)
      .all()
      .forEach((s) => {
        const obj = {
          id: safeStr(s.id),
          server_id: s.id,
          category_id: safeStr(s.category_id),
          name: safeStr(s.name),
          code: safeStr(s.code),
          created_at: Date.now(),
          updated_at: Date.now(),
        };
        categorize("subcategories", obj, obj.created_at);
      });

    // 7. Sales & Sales Items
    let salesQuery = "";
    let salesParam = [];
    if (lastPulledAt === 0) {
      salesQuery = `SELECT * FROM sales WHERE created_at >= ? AND created_at <= ?`;
      salesParam = [sqlBatchStart, sqlBatchEnd];
    } else if (historicalCursor) {
      salesQuery = `SELECT * FROM sales WHERE updated_at > ? OR (created_at >= ? AND created_at <= ?)`;
      salesParam = [sqlLastPulledAt, sqlBatchStart, sqlBatchEnd];
    } else {
      salesQuery = `SELECT * FROM sales WHERE updated_at > ?`;
      salesParam = [sqlLastPulledAt];
    }

    const validSaleIds = new Set();

    db.prepare(salesQuery)
      .all(...salesParam)
      .forEach((s) => {
        validSaleIds.add(s.id);
        const obj = {
          id: safeStr(s.id),
          server_id: s.id,
          reference_no: safeStr(s.reference_no),
          customer_id: safeStr(s.customer_id),
          customer_name: safeStr(s.customer_name),
          total_amount: s.total_amount || 0,
          paid_amount: s.paid_amount || 0,
          payment_mode: safeStr(s.payment_mode),
          status: safeStr(s.status),
          discount: s.discount || 0,
          round_off: s.round_off || 0,
          note: safeStr(s.note),
          is_reverse_charge: s.is_reverse_charge === 1,
          created_at: toUnix(s.created_at),
          updated_at: toUnix(s.updated_at),
        };
        categorize("sales", obj, obj.created_at);
      });

    if (validSaleIds.size > 0) {
      const placeholders = Array.from(validSaleIds)
        .map(() => "?")
        .join(",");
      const itemsQuery = `SELECT * FROM sales_items WHERE sale_id IN (${placeholders})`;
      db.prepare(itemsQuery)
        .all(...Array.from(validSaleIds))
        .forEach((si) => {
          const obj = {
            id: safeStr(si.id),
            server_id: si.id,
            sale_id: safeStr(si.sale_id),
            product_id: safeStr(si.product_id),
            batch_id: safeStr(si.batch_id),
            serial_id: safeStr(si.serial_id),
            quantity: si.quantity || 0,
            rate: si.rate || 0,
            price: si.price || 0,
            gst_rate: si.gst_rate || 0,
            discount: si.discount || 0,
          };
          categorize("sales_items", obj, obj.created_at);
        });
    }

    // 8. Purchases & Purchase Items
    // purchases table does not have updated_at, so we rely on created_at
    let purchasesQuery = "";
    let purchasesParam = [];
    if (lastPulledAt === 0) {
      purchasesQuery = `SELECT * FROM purchases WHERE created_at >= ? AND created_at <= ?`;
      purchasesParam = [sqlBatchStart, sqlBatchEnd];
    } else if (historicalCursor) {
      purchasesQuery = `SELECT * FROM purchases WHERE created_at > ? OR (created_at >= ? AND created_at <= ?)`;
      purchasesParam = [sqlLastPulledAt, sqlBatchStart, sqlBatchEnd];
    } else {
      purchasesQuery = `SELECT * FROM purchases WHERE created_at > ?`;
      purchasesParam = [sqlLastPulledAt];
    }

    const validPurchaseIds = new Set();

    db.prepare(purchasesQuery)
      .all(...purchasesParam)
      .forEach((p) => {
        validPurchaseIds.add(p.id);
        const obj = {
          id: safeStr(p.id),
          server_id: p.id,
          reference_no: safeStr(p.reference_no),
          internal_ref_no: safeStr(p.internal_ref_no),
          supplier_id: safeStr(p.supplier_id),
          total_amount: p.total_amount || 0,
          paid_amount: p.paid_amount || 0,
          payment_mode: safeStr(p.payment_mode),
          status: safeStr(p.status),
          date: safeStr(p.date || p.created_at),
          note: safeStr(p.note),
          is_reverse_charge: p.is_reverse_charge === 1,
          created_at: toUnix(p.created_at),
        };
        categorize("purchases", obj, obj.created_at);
      });

    if (validPurchaseIds.size > 0) {
      const placeholders = Array.from(validPurchaseIds)
        .map(() => "?")
        .join(",");
      const purItemsQuery = `SELECT rowid, * FROM purchase_items WHERE purchase_id IN (${placeholders})`;
      db.prepare(purItemsQuery)
        .all(...Array.from(validPurchaseIds))
        .forEach((pi) => {
          const obj = {
            id: safeStr(pi.id || `pi_${pi.rowid}`),
            server_id: pi.id,
            purchase_id: safeStr(pi.purchase_id),
            product_id: safeStr(pi.product_id),
            batch_id: safeStr(pi.batch_uid),
            serial_id: safeStr(pi.serial_numbers),
            quantity: pi.quantity || 0,
            rate: pi.rate || 0,
            price: pi.price || 0,
            gst_rate: pi.gst_rate || 0,
            discount: pi.discount || 0,
          };
          categorize("purchase_items", obj, obj.created_at);
        });
    }
    // 9. Transactions
    // transactions table does not have updated_at
    let txQuery = "";
    let txParam = [];
    if (lastPulledAt === 0) {
      txQuery = `SELECT * FROM transactions WHERE created_at >= ? AND created_at <= ?`;
      txParam = [sqlBatchStart, sqlBatchEnd];
    } else if (historicalCursor) {
      txQuery = `SELECT * FROM transactions WHERE created_at > ? OR (created_at >= ? AND created_at <= ?)`;
      txParam = [sqlLastPulledAt, sqlBatchStart, sqlBatchEnd];
    } else {
      txQuery = `SELECT * FROM transactions WHERE created_at > ?`;
      txParam = [sqlLastPulledAt];
    }

    db.prepare(txQuery)
      .all(...txParam)
      .forEach((tx) => {
        const obj = {
          id: safeStr(tx.id),
          server_id: tx.id,
          reference_no: safeStr(tx.reference_no),
          type: safeStr(tx.type),
          bill_id: safeStr(tx.bill_id),
          bill_type: safeStr(tx.bill_type),
          entity_id: safeStr(tx.entity_id),
          entity_type: safeStr(tx.entity_type),
          amount: tx.amount || 0,
          payment_mode: safeStr(tx.payment_mode),
          category: safeStr(tx.category),
          status: safeStr(tx.status),
          note: safeStr(tx.note),
          gst_amount: tx.gst_amount || 0,
          discount: tx.discount || 0,
          date: safeStr(tx.transaction_date || tx.created_at),
          created_at: toUnix(tx.created_at),
          updated_at: toUnix(tx.updated_at),
        };
        categorize("transactions", obj, obj.created_at);
      });

    // 10. Expenses
    let expQuery = "";
    let expParam = [];
    if (lastPulledAt === 0) {
      expQuery = `SELECT * FROM expenses WHERE created_at >= ? AND created_at <= ?`;
      expParam = [sqlBatchStart, sqlBatchEnd];
    } else if (historicalCursor) {
      expQuery = `SELECT * FROM expenses WHERE created_at > ? OR (created_at >= ? AND created_at <= ?)`;
      expParam = [sqlLastPulledAt, sqlBatchStart, sqlBatchEnd];
    } else {
      expQuery = `SELECT * FROM expenses WHERE created_at > ?`;
      expParam = [sqlLastPulledAt];
    }

    db.prepare(expQuery)
      .all(...expParam)
      .forEach((exp) => {
        const obj = {
          id: safeStr(exp.id),
          server_id: exp.id,
          reference_no: safeStr(`EXP-${exp.id}`),
          amount: exp.amount || 0,
          payment_mode: safeStr(exp.payment_mode),
          category: safeStr(exp.category),
          description: safeStr(exp.description),
          date: safeStr(exp.date || exp.created_at),
          created_at: toUnix(exp.created_at || exp.date),
          updated_at: exp.updated_at
            ? toUnix(exp.updated_at)
            : toUnix(exp.created_at || exp.date),
        };
        categorize("expenses", obj, obj.created_at);
      });

    console.log(`[SYNC PULL] Expenses matched: ${changes.expenses.updated.length}`);
    console.log(`[SYNC PULL] Batch start: ${sqlBatchStart}, Batch end: ${sqlBatchEnd}, Last pulled: ${sqlLastPulledAt}`);

    let has_more_historical = false;
    if (historicalCursor || lastPulledAt === 0) {
      const olderSale = db
        .prepare(`SELECT 1 FROM sales WHERE created_at < ? LIMIT 1`)
        .get(sqlBatchStart);
      const olderPurchase = db
        .prepare(`SELECT 1 FROM purchases WHERE created_at < ? LIMIT 1`)
        .get(sqlBatchStart);
      const olderExpense = db
        .prepare(`SELECT 1 FROM expenses WHERE created_at < ? LIMIT 1`)
        .get(sqlBatchStart);

      if (olderSale || olderPurchase || olderExpense) {
        has_more_historical = true;
      }
    }

    const timestamp = Date.now();
    res.json({
      changes,
      timestamp,
      has_more_historical,
      next_historical_cursor: nextHistoricalCursor,
    });
  } catch (error) {
    console.error("[SYNC PULL ERROR]", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/push", (req, res) => {
  const { changes } = req.body;

  try {
    db.transaction(() => {
      // 1. Sales Orders
      if (changes.sales_orders?.created) {
        const insertOrder = db.prepare(`
          INSERT INTO sales_orders (
            reference_no, customer_id, created_by, status, total_amount, note, created_at, updated_at
          ) VALUES (@reference_no, @customer_id, 'Mobile User', 'pending', @total_amount, @note, @created_at, @updated_at)
        `);
        const insertItem = db.prepare(`
          INSERT INTO sales_order_items (
            sales_order_id, product_id, quantity, rate, price, gst_rate, batch_id, serial_id
          ) VALUES (@sales_order_id, @product_id, @quantity, @rate, @price, @gst_rate, @batch_id, @serial_id)
        `);

        changes.sales_orders.created.forEach((order) => {
          let backendCustomerId = null;
          if (!isNaN(order.customer_id)) backendCustomerId = order.customer_id;

          const info = insertOrder.run({
            reference_no: order.reference_no,
            customer_id: backendCustomerId,
            total_amount: order.total_amount,
            note: order.note || "Created via Mobile",
            created_at: order.created_at,
            updated_at: Date.now(),
          });

          // Note: Items must be handled if sent separately or we rely on them being in changes.sales_order_items
        });
      }

      // 2. Categories (Created on Mobile)
      if (changes.categories?.created) {
        const insertCat = db.prepare(
          `INSERT INTO categories (name, code) VALUES (?, ?)`,
        );
        changes.categories.created.forEach((cat) => {
          insertCat.run(cat.name, cat.code);
        });
      }

      // 3. Subcategories
      if (changes.subcategories?.created) {
        // Note: Mapping category_id from mobile UUID to Backend ID is tricky here without a lookup map.
        // For now, this assumes mobile users mostly VIEW categories.
        // If creation is required, we'd need to lookup the backend Category ID by name or code.
        const getCatId = db.prepare(`SELECT id FROM categories WHERE name = ?`); // naive lookup
        const insertSub = db.prepare(
          `INSERT INTO subcategories (category_id, name, code) VALUES (?, ?, ?)`,
        );

        changes.subcategories.created.forEach((sub) => {
          // We can't use sub.category_id directly if it's a UUID.
          // We'd need the Category object to be sent or resolved.
          // Skipping implementation for safety unless mobile sends resolved parent.
        });
      }
      // 4. Expenses
      if (changes.expenses?.created) {
        const insertExp = db.prepare(`
          INSERT INTO expenses (date, category, amount, payment_mode, description, created_by)
          VALUES (@date, @category, @amount, @payment_mode, @description, 'Mobile User')
        `);
        changes.expenses.created.forEach((exp) => {
          insertExp.run({
            date: new Date(exp.created_at).toISOString(),
            category: exp.category,
            amount: exp.amount,
            payment_mode: exp.payment_mode || 'Cash',
            description: exp.description || ''
          });
        });
      }
      if (changes.expenses?.updated) {
        const updateExp = db.prepare(`
          UPDATE expenses 
          SET category = @category, amount = @amount, payment_mode = @payment_mode, description = @description
          WHERE id = @id
        `);
        changes.expenses.updated.forEach((exp) => {
          if (exp.server_id) {
            updateExp.run({
              id: exp.server_id,
              category: exp.category,
              amount: exp.amount,
              payment_mode: exp.payment_mode || 'Cash',
              description: exp.description || ''
            });
          }
        });
      }
    })();

    res.json({ status: "ok" });
  } catch (error) {
    console.error("[SYNC PUSH ERROR]", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
