import db from "../db/db.mjs";
import { getDateFilter } from "../utils/dateFilter.mjs";
import {
  getProductById,
  updateProductAveragePurchasePrice,
  updateProductQuantity,
} from "./productRepository.mjs";
import { normalizeBooleans } from "../utils/normalizeBooleans.mjs";
import { calculateAveragePurchaseCost } from "../utils/updateAveragePurchaseCostForProduct.mjs";

export function createPurchase(purchaseData, items) {
  try {
    const insertPurchaseStmt = db.prepare(
      `INSERT INTO purchases (supplier_id, reference_no, internal_ref_no, date, status, note, total_amount, paid_amount, payment_mode, is_reverse_charge)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const purchase = normalizeBooleans(purchaseData);
    const insertPurchaseStmtResponse = insertPurchaseStmt.run(
      purchase.supplier_id,
      purchase.reference_no,
      purchase.internal_ref_no,
      purchase.date,
      purchase.status,
      purchase.note || "",
      purchase.total_amount,
      purchase.paid_amount,
      purchase.payment_mode,
      purchase.is_reverse_charge
    );

    const purchase_id = insertPurchaseStmtResponse.lastInsertRowid;

    const insertItemStmt = db.prepare(
      `INSERT INTO purchase_items (purchase_id, product_id, quantity, rate, gst_rate, discount, price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    for (const item of items) {
      const { product_id, quantity, rate, gst_rate, discount, price } = item;
      const product = getProductById(product_id);
      if (!product) {
        throw new Error(`Product with id ${product_id} not found`);
      }
      insertItemStmt.run(
        purchase_id,
        product_id,
        quantity,
        rate,
        gst_rate,
        discount,
        price
      );

      const { newAverageCost, newTotalQuantity } = calculateAveragePurchaseCost(
        item.product_id,
        item.quantity,
        item.rate
      );

      console.log("newAg price", newAverageCost);
      console.log("new quant", newTotalQuantity);

      updateProductAveragePurchasePrice(item.product_id, newAverageCost);
      updateProductQuantity(item.product_id, newTotalQuantity);
    }

    return purchase_id;
  } catch (err) {
    db.exec("ROLLBACK");
    console.error("Transaction failed:", err.message);
    throw err;
  }
}

/**
 * @description Retrieves a single purchase record with its items and a real-time financial summary.
 * @param {number} id - The ID of the purchase to retrieve.
 * @returns {object|null} The purchase object with a nested array of items and an accurate financial summary, or null if not found.
 * @throws {Error} If fetching the purchase fails.
 */
export function getPurchaseById(id) {
  try {
    const purchaseStmt = db.prepare(`
      SELECT 
        p.id,
        p.reference_no,
        p.date,
        p.supplier_id,
        s.name AS supplier_name,
        p.note,
        p.total_amount,
        p.paid_amount,
        p.status
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `);
    const purchase = purchaseStmt.get(id);

    if (!purchase) {
      return null;
    }

    const itemsStmt = db.prepare(`
      SELECT 
        pi.id,
        pi.product_id,
        pr.name AS product_name,
        pr.hsn AS hsn_code,
        pi.rate,
        pi.quantity,
        pi.gst_rate,
        pi.discount,
        pi.price
      FROM purchase_items pi
      JOIN products pr ON pi.product_id = pr.id
      WHERE pi.purchase_id = ?
      ORDER BY pi.id ASC
    `);
    const items = itemsStmt.all(id);

    // Get real-time financial summary from transactions table
    const summaryStmt = db.prepare(`
      SELECT
        SUM(CASE WHEN t.type = 'purchase' THEN t.amount ELSE 0 END) +
        SUM(CASE WHEN t.type = 'debit_note' THEN t.amount ELSE 0 END) AS adjusted_total_amount,
        SUM(CASE WHEN t.type = 'payment_out' THEN t.amount ELSE 0 END) AS net_paid_amount
      FROM transactions t
      WHERE t.bill_id = ? AND t.bill_type = 'purchase'
    `);
    const summary = summaryStmt.get(id);

    return {
      ...purchase,
      items,
      adjusted_total_amount: summary.adjusted_total_amount || 0,
      net_paid_amount: summary.net_paid_amount || 0,
    };
  } catch (error) {
    console.error("Error in getPurchaseById:", error.message);
    throw new Error(
      "Failed to fetch purchase with financial summary: " + error.message
    );
  }
}

/**
 * Fetches product details for all items in a purchase, for label printing.
 */
export function getPurchaseItemsForLabels(purchaseId) {
  return db
    .prepare(
      `
    SELECT 
      p.id,
      p.name,
      p.product_code,
      p.barcode,
      p.mrp,
      p.mop,
      p.mfw_price,
      p.size,
      p.weight,
      pi.quantity as purchase_quantity
    FROM purchase_items pi
    JOIN products p ON pi.product_id = p.id
    WHERE pi.purchase_id = ?
  `
    )
    .all(purchaseId);
}

// -----------------------DELTE PURCHASE BY ID---------------------------
export async function deletePurchase(id) {
  await db.run("BEGIN");

  const items = await db.all(
    `SELECT product_id, quantity FROM purchase_items WHERE purchase_id = ?`,
    [id]
  );

  for (const item of items) {
    await db.run(`UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?`, [
      item.quantity,
      item.product_id,
    ]);
  }

  await db.run(`DELETE FROM purchase_items WHERE purchase_id = ?`, [id]);
  await db.run(`DELETE FROM purchases WHERE id = ?`, [id]);

  await db.run("COMMIT");

  return true;
}

// -----------------------UPDATE PURCHASE BY ID---------------------------
export async function updatePurchase(id, data, newItems) {
  await db.run("BEGIN");

  const oldItems = await db.all(
    `SELECT product_id, quantity FROM purchase_items WHERE purchase_id = ?`,
    [id]
  );

  for (const item of oldItems) {
    await db.run(`UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?`, [
      item.quantity,
      item.product_id,
    ]);
  }

  await db.run(`DELETE FROM purchase_items WHERE purchase_id = ?`, [id]);

  for (const item of newItems) {
    await db.run(
      `INSERT INTO purchase_items (purchase_id, product_id, quantity, rate, gst_rate, discount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        item.product_id,
        item.quantity,
        item.rate,
        item.gst_rate,
        item.discount || 0,
      ]
    );

    await db.run(`UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?`, [
      item.quantity,
      item.product_id,
    ]);
  }

  await db.run(
    `UPDATE purchases
     SET supplier_id = ?, reference_no = ?, date = ?, status = ?, note = ?, total_amount = ?, paid_amount = ?
     WHERE id = ?`,
    [
      data.supplier_id,
      data.reference_no,
      data.date,
      data.status,
      data.note || "",
      data.total_amount,
      data.paid_amount,
      id,
    ]
  );

  await db.run("COMMIT");
}

/**
 * @description Retrieves all purchases with optional filters and pagination, using transaction data for accurate totals.
 * @param {object} options - Pagination and filter options.
 * @returns {object} An object containing paginated purchase data and the total count.
 * @throws {Error} If fetching purchases fails.
 */
export function getAllPurchases({
  page = 1,
  limit = 10,
  search = "",
  filter,
  from,
  to,
  status,
}) {
  try {
    const offset = (page - 1) * limit;
    const { where: dateWhere, params: dateParams } = getDateFilter({
      filter,
      from: from,
      to: to,
      alias: "p",
    });

    let baseQuery = `
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN transactions t ON t.bill_id = p.id AND t.bill_type = 'purchase'
      WHERE ${dateWhere} AND p.status NOT IN ('cancelled')
    `;

    const conditions = [];
    const params = [...dateParams];

    if (search) {
      conditions.push(`(p.reference_no LIKE ? OR s.name LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      conditions.push(`p.status = ?`);
      params.push(status);
    }

    if (conditions.length > 0) {
      baseQuery += " AND " + conditions.join(" AND ");
    }

    const finalQuery = `
      SELECT
        p.id,
        p.internal_ref_no,
        p.reference_no,
        p.date,
        p.status,
        s.name AS supplier_name,
        p.total_amount AS original_total,
        p.paid_amount AS original_paid,
        COALESCE(SUM(CASE WHEN t.type IN ('debit_note') THEN t.amount ELSE 0 END), 0) AS total_adjustments,
        COALESCE(SUM(CASE WHEN t.type = 'payment_out' THEN t.amount ELSE 0 END), 0) AS net_paid_amount
      ${baseQuery}
      GROUP BY p.id
      ORDER BY p.date DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(p.id) as count
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE ${dateWhere} AND p.status NOT IN ('cancelled')
      ${search ? " AND (p.reference_no LIKE ? OR s.name LIKE ?)" : ""}
      ${status ? " AND p.status = ?" : ""}
    `;

    const countParams = [...dateParams];
    if (search) countParams.push(`%${search}%`, `%${search}%`);
    if (status) countParams.push(status);

    const dataStmt = db.prepare(finalQuery);
    const countStmt = db.prepare(countQuery);

    const data = dataStmt.all(...params, limit, offset);
    const { count } = countStmt.get(...countParams);

    return {
      data,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    };
  } catch (error) {
    console.error("Error in getAllPurchases:", error.message);
    throw new Error("Failed to fetch all purchases.");
  }
}

/**
 * @description Retrieves a paginated list of purchases for a specific supplier, along with real-time financial summaries.
 * @param {number} supplierId - The ID of the supplier.
 * @param {object} [filters={}] - Optional filters, including pagination ({ page: number, limit: number }).
 * @returns {Promise<{records: Array<object>, totalRecords: number}>} An object containing the paginated records and the total record count.
 * @throws {Error} If fetching purchases fails.
 */
export function getPurchasesBySupplierId(supplierId, filters) {
  try {
    // 1. Extract pagination parameters from filters, providing defaults.
    const { page, limit, ...otherFilters } = filters;
    const offset = (page - 1) * limit;

    const { where: dateWhere, params: dateParams } = getDateFilter({
      from: filters.startDate,
      to: filters.endDate,
      filter: filters.filter,
      alias: "p",
    });

    // 2. Create and run a query to get the total count of matching records.
    const countQuery = `
      SELECT COUNT(p.id) as totalRecords
      FROM purchases p
      WHERE p.supplier_id = ? AND ${dateWhere}
    `;
    const countStmt = db.prepare(countQuery);
    const { totalRecords } = countStmt.get(supplierId, ...dateParams);

    // 3. Modify the main query to include LIMIT and OFFSET for pagination.
    const dataQuery = `
      SELECT
        p.id,
        p.reference_no,
        p.date,
        p.status,
        p.total_amount AS original_total_amount,
        COALESCE(SUM(CASE WHEN t.type IN ('debit_note') THEN t.amount ELSE 0 END), 0) AS total_adjustments,
        COALESCE(SUM(CASE WHEN t.type = 'payment_out' THEN t.amount ELSE 0 END), 0) AS total_paid_amount,
        p.total_amount + COALESCE(SUM(CASE WHEN t.type = 'debit_note' THEN t.amount ELSE 0 END), 0) AS adjusted_total_amount
      FROM purchases p
      LEFT JOIN transactions t ON t.bill_id = p.id AND t.bill_type = 'purchase'
      WHERE p.supplier_id = ? AND ${dateWhere}
      GROUP BY p.id
      ORDER BY p.date DESC
      LIMIT ? OFFSET ?
    `;
    const dataStmt = db.prepare(dataQuery);

    // 4. Execute the main query with all parameters, including new pagination ones.
    const records = dataStmt.all(supplierId, ...dateParams, limit, offset);

    const processedRecords = records.map((p) => ({
      ...p,
      outstanding_amount: p.adjusted_total_amount - p.total_paid_amount,
    }));

    // 5. Return the paginated data and the total count.
    return {
      records: processedRecords,
      totalRecords,
    };
  } catch (error) {
    console.error("Error in getPurchasesBySupplierId:", error.message);
    throw new Error("Failed to fetch purchases for supplier.");
  }
}

/* PURCHASE STATS REPO FUNCTIONs */

/* ------------------------PURCHASE SUMMARY------------------------------ 
Summary of all purchases return the data
{ total_amount, paid_amount, unpaid_amount, monthly: [{ period: "2025-07", total: 100000 }, ...] }*/
export function getPurchaseSummary({ filter, start_date, end_date }) {
  const { where, params } = getDateFilter({
    filter,
    from: start_date,
    to: end_date,
    alias: "p",
  });

  const totalStmt = db.prepare(`
    SELECT 
      SUM(total_amount) AS total_amount,
      SUM(paid_amount) AS paid_amount
    FROM purchases p
    WHERE ${where}
  `);

  const monthlyStmt = db.prepare(`
    SELECT 
      ${
        filter === "month" ? "date(p.date)" : "strftime('%Y-%m', p.date)"
      } AS period,
      SUM(total_amount) AS total
    FROM purchases p
    WHERE ${where}
    GROUP BY period
    ORDER BY period
  `);

  const totals = totalStmt.get(...params);
  const monthly = monthlyStmt.all(...params);

  return {
    ...totals,
    unpaid_amount: (totals.total_amount || 0) - (totals.paid_amount || 0),
    monthly,
  };
}

/* --------------------------PURCHASE TOP SUPPLIERS -------------------------
return top supplier { topByAmount: [{supplier_name, total}], topByQuantity: [{supplier_name, total_qty}] }*/
export function getTopSuppliers({ filter, start_date, end_date, year }) {
  const { where, params } = getDateFilter({
    filter,
    from: start_date,
    to: end_date,
    year,
    alias: "p",
  });

  const byAmount = db
    .prepare(
      `
    SELECT s.name AS supplier_name, SUM(p.total_amount) AS total
    FROM purchases p
    JOIN suppliers s ON p.supplier_id = s.id
    WHERE ${where}
    GROUP BY s.id
    ORDER BY total DESC
    LIMIT 5
  `
    )
    .all(...params);

  const byQuantity = db
    .prepare(
      `
    SELECT s.name AS supplier_name, SUM(pi.quantity) AS total_qty
    FROM purchases p
    JOIN suppliers s ON p.supplier_id = s.id
    JOIN purchase_items pi ON pi.purchase_id = p.id
    WHERE ${where}
    GROUP BY s.id
    ORDER BY total_qty DESC
    LIMIT 5
  `
    )
    .all(...params);

  return { topByAmount: byAmount, topByQuantity: byQuantity };
}

/* --------------------------PURCHASE CATEGORY SEPNDS -------------------------
return Category Wise Spends 
[{ category_name, total_spend }]*/
export function getCategoryWiseSpend({ filter, start_date, end_date, year }) {
  const { where, params } = getDateFilter({
    filter,
    from: start_date,
    to: end_date,
    year,
    alias: "p",
  });

  const stmt = db.prepare(`
    SELECT c.name AS category_name, SUM(pi.quantity * pi.rate) AS total_spend
    FROM purchases p
    JOIN purchase_items pi ON pi.purchase_id = p.id
    JOIN products pr ON pi.product_id = pr.id
    JOIN categories c ON pr.category = c.id
    WHERE ${where}
    GROUP BY c.id
    ORDER BY total_spend DESC
  `);

  return stmt.all(...params);
}

/* --------------------------PURCHASE STATS -------------------------
return purchase stats
{ total_purchases, avg_purchase_value, max_purchase, top_supplier, recent: [...] }
*/
export function getPurchaseStats() {
  const total = db
    .prepare(`SELECT COUNT(*) AS total_purchases FROM purchases`)
    .get();

  const avg = db
    .prepare(
      `
    SELECT AVG(total_amount) AS avg_purchase_value 
    FROM purchases
  `
    )
    .get();

  const max = db
    .prepare(
      `
    SELECT MAX(total_amount) AS max_purchase 
    FROM purchases
  `
    )
    .get();

  const topSupplier = db
    .prepare(
      `
    SELECT s.name AS supplier_name, COUNT(*) AS count
    FROM purchases p
    JOIN suppliers s ON p.supplier_id = s.id
    GROUP BY s.id
    ORDER BY count DESC
    LIMIT 1
  `
    )
    .get();

  const recent = db
    .prepare(
      `
    SELECT reference_no, date
    FROM purchases
    ORDER BY date DESC
    LIMIT 5
  `
    )
    .all();

  return {
    ...total,
    ...avg,
    ...max,
    top_supplier: topSupplier,
    recent,
  };
}
