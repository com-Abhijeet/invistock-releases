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

    // UPDATED: Insert statement now includes Batch & Serial Columns and Pricing
    const insertItemStmt = db.prepare(
      `INSERT INTO purchase_items (
         purchase_id, product_id, quantity, rate, gst_rate, discount, price,
         batch_uid, batch_number, serial_numbers, expiry_date, mfg_date,
         mrp, mop, mfw_price
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const item of items) {
      const {
        product_id,
        quantity,
        rate,
        gst_rate,
        discount,
        price,
        // Destructure new fields from item
        batch_uid,
        batch_number,
        serial_numbers,
        expiry_date,
        mfg_date,
        mrp,
        mop,
        mfw_price,
      } = item;

      const product = getProductById(product_id);
      if (!product) {
        throw new Error(`Product with id ${product_id} not found`);
      }

      // Convert serial array to JSON string for storage in purchase_items
      const serialsString = Array.isArray(serial_numbers)
        ? JSON.stringify(serial_numbers)
        : serial_numbers || null;

      insertItemStmt.run(
        purchase_id,
        product_id,
        quantity,
        rate,
        gst_rate,
        discount,
        price,
        batch_uid || null,
        batch_number || null,
        serialsString,
        expiry_date || null,
        mfg_date || null,
        mrp || null,
        mop || null,
        mfw_price || null
      );

      // Recalculate Average Cost (Weighted Average)
      const { newAverageCost, newTotalQuantity } = calculateAveragePurchaseCost(
        item.product_id,
        item.quantity,
        item.rate
      );

      updateProductAveragePurchasePrice(item.product_id, newAverageCost);
      // NOTE: Total quantity update handles the aggregate stock.
      // Batch specific stock is handled in the Service via BatchService.
      updateProductQuantity(item.product_id, newTotalQuantity);
    }

    return purchase_id;
  } catch (err) {
    // If using transaction in service, this might throw to service to rollback
    console.error("Repo Transaction failed:", err.message);
    throw err;
  }
}

/**
 * @description Retrieves a single purchase record with its items and a real-time financial summary.
 */
export function getPurchaseById(id) {
  try {
    const purchaseStmt = db.prepare(`
      SELECT 
        p.id, p.reference_no, p.date, p.supplier_id, s.name AS supplier_name,
        p.note, p.total_amount, p.paid_amount, p.status
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `);
    const purchase = purchaseStmt.get(id);

    if (!purchase) return null;

    // UPDATED: Fetch batch details along with basic item details
    const itemsStmt = db.prepare(`
      SELECT 
        pi.id, pi.product_id, pr.name AS product_name, pr.hsn AS hsn_code,
        pi.rate, pi.quantity, pi.gst_rate, pi.discount, pi.price,
        pi.batch_number, pi.expiry_date, pi.mfg_date, pi.serial_numbers,
        pi.mrp, pi.mop, pi.mfw_price
      FROM purchase_items pi
      JOIN products pr ON pi.product_id = pr.id
      WHERE pi.purchase_id = ?
      ORDER BY pi.id ASC
    `);
    const items = itemsStmt.all(id);

    // Parse serial numbers back to array if they exist
    const itemsWithSerials = items.map((item) => ({
      ...item,
      serial_numbers: item.serial_numbers
        ? JSON.parse(item.serial_numbers)
        : [],
    }));

    const summaryStmt = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN t.type IN ('payment_out', 'purchase') THEN t.amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN t.type = 'debit_note' THEN t.amount ELSE 0 END), 0) AS total_debit_notes
      FROM transactions t
      WHERE t.bill_id = ? AND t.bill_type = 'purchase' AND t.status != 'deleted'
    `);
    const summary = summaryStmt.get(id);

    const totalPaid = summary.total_paid || 0;
    const debitNotes = summary.total_debit_notes || 0;
    const adjustedTotal = (purchase.total_amount || 0) + debitNotes;
    const balance = adjustedTotal - totalPaid;

    let paymentStatus = "pending";
    if (balance <= 0.9) paymentStatus = "paid";
    else if (totalPaid > 0) paymentStatus = "partial";

    return {
      ...purchase,
      items: itemsWithSerials,
      payment_summary: {
        total_paid: totalPaid,
        total_debit_notes: debitNotes,
        adjusted_total: adjustedTotal,
        balance: balance > 0 ? balance : 0,
        status: paymentStatus,
      },
      paid_amount: totalPaid,
      status: paymentStatus,
      adjusted_total_amount: adjustedTotal,
      net_paid_amount: totalPaid,
    };
  } catch (error) {
    console.error("Error in getPurchaseById:", error.message);
    throw new Error(
      "Failed to fetch purchase with financial summary: " + error.message
    );
  }
}

export function getPurchaseItemsForLabels(purchaseId) {
  return db
    .prepare(
      `
    SELECT 
      p.id, p.name, p.product_code, p.barcode, p.mrp, p.mop, p.mfw_price, p.size, p.weight,
      p.tracking_type,
      pi.quantity as purchase_quantity,
      pi.batch_uid,
      pi.batch_number,
      pi.serial_numbers
    FROM purchase_items pi
    JOIN products p ON pi.product_id = p.id
    WHERE pi.purchase_id = ?
  `
    )
    .all(purchaseId);
}

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
    // TODO: Also delete batch stock if implementing full reverse logic
  }
  await db.run(`DELETE FROM purchase_items WHERE purchase_id = ?`, [id]);
  await db.run(`DELETE FROM purchases WHERE id = ?`, [id]);
  await db.run("COMMIT");
  return true;
}

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
      `INSERT INTO purchase_items (purchase_id, product_id, quantity, rate, gst_rate, discount) VALUES (?, ?, ?, ?, ?, ?)`,
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
    `UPDATE purchases SET supplier_id = ?, reference_no = ?, date = ?, status = ?, note = ?, total_amount = ?, paid_amount = ? WHERE id = ?`,
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
      from,
      to,
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
        p.id, p.internal_ref_no, p.reference_no, p.date, p.status, s.name AS supplier_name,
        p.total_amount AS original_total, p.paid_amount AS original_paid,
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

export function getPurchasesBySupplierId(supplierId, filters = {}) {
  const { page = 1, limit = 10, filter, startDate, endDate, all } = filters;
  const offset = (page - 1) * limit;
  const { where: dateWhere, params: dateParams } = getDateFilter({
    from: startDate,
    to: endDate,
    filter: filter,
    alias: "p",
  });
  const whereClauses = ["p.supplier_id = ?"];
  const queryParams = [supplierId];

  if (!all && dateWhere !== "1=1") {
    whereClauses.push(dateWhere);
    queryParams.push(...dateParams);
  }
  const finalWhereClause = whereClauses.join(" AND ");

  const countQuery = `SELECT COUNT(p.id) as totalRecords FROM purchases p WHERE ${finalWhereClause}`;
  const { totalRecords } = db.prepare(countQuery).get(...queryParams);

  const dataQuery = `
      SELECT
        p.id, p.reference_no, p.date, p.status, p.total_amount AS original_total_amount,
        COALESCE(SUM(CASE WHEN t.type IN ('debit_note') THEN t.amount ELSE 0 END), 0) AS total_adjustments,
        COALESCE(SUM(CASE WHEN t.type = 'payment_out' THEN t.amount ELSE 0 END), 0) AS total_paid_amount,
        p.total_amount + COALESCE(SUM(CASE WHEN t.type = 'debit_note' THEN t.amount ELSE 0 END), 0) AS adjusted_total_amount
      FROM purchases p
      LEFT JOIN transactions t ON t.bill_id = p.id AND t.bill_type = 'purchase'
      WHERE ${finalWhereClause}
      GROUP BY p.id
      ORDER BY p.date DESC
      LIMIT ? OFFSET ?
    `;
  const records = db.prepare(dataQuery).all(...queryParams, limit, offset);
  return {
    records: records.map((p) => ({
      ...p,
      outstanding_amount: p.adjusted_total_amount - p.total_paid_amount,
    })),
    totalRecords,
  };
}

export function getPurchaseSummary({ filter, start_date, end_date }) {
  const { where, params } = getDateFilter({
    filter,
    from: start_date,
    to: end_date,
    alias: "p",
  });
  const totalStmt = db.prepare(
    `SELECT SUM(total_amount) AS total_amount, SUM(paid_amount) AS paid_amount FROM purchases p WHERE ${where}`
  );
  const monthlyStmt = db.prepare(
    `SELECT ${
      filter === "month" ? "date(p.date)" : "strftime('%Y-%m', p.date)"
    } AS period, SUM(total_amount) AS total FROM purchases p WHERE ${where} GROUP BY period ORDER BY period`
  );
  const totals = totalStmt.get(...params);
  const monthly = monthlyStmt.all(...params);
  return {
    ...totals,
    unpaid_amount: (totals.total_amount || 0) - (totals.paid_amount || 0),
    monthly,
  };
}

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
      `SELECT s.name AS supplier_name, SUM(p.total_amount) AS total FROM purchases p JOIN suppliers s ON p.supplier_id = s.id WHERE ${where} GROUP BY s.id ORDER BY total DESC LIMIT 5`
    )
    .all(...params);
  const byQuantity = db
    .prepare(
      `SELECT s.name AS supplier_name, SUM(pi.quantity) AS total_qty FROM purchases p JOIN suppliers s ON p.supplier_id = s.id JOIN purchase_items pi ON pi.purchase_id = p.id WHERE ${where} GROUP BY s.id ORDER BY total_qty DESC LIMIT 5`
    )
    .all(...params);
  return { topByAmount: byAmount, topByQuantity: byQuantity };
}

export function getCategoryWiseSpend({ filter, start_date, end_date, year }) {
  const { where, params } = getDateFilter({
    filter,
    from: start_date,
    to: end_date,
    year,
    alias: "p",
  });
  return db
    .prepare(
      `SELECT c.name AS category_name, SUM(pi.quantity * pi.rate) AS total_spend FROM purchases p JOIN purchase_items pi ON pi.purchase_id = p.id JOIN products pr ON pi.product_id = pr.id JOIN categories c ON pr.category = c.id WHERE ${where} GROUP BY c.id ORDER BY total_spend DESC`
    )
    .all(...params);
}

export function getPurchaseStats() {
  const total = db
    .prepare(`SELECT COUNT(*) AS total_purchases FROM purchases`)
    .get();
  const avg = db
    .prepare(`SELECT AVG(total_amount) AS avg_purchase_value FROM purchases`)
    .get();
  const max = db
    .prepare(`SELECT MAX(total_amount) AS max_purchase FROM purchases`)
    .get();
  const topSupplier = db
    .prepare(
      `SELECT s.name AS supplier_name, COUNT(*) AS count FROM purchases p JOIN suppliers s ON p.supplier_id = s.id GROUP BY s.id ORDER BY count DESC LIMIT 1`
    )
    .get();
  const recent = db
    .prepare(
      `SELECT reference_no, date FROM purchases ORDER BY date DESC LIMIT 5`
    )
    .all();
  return { ...total, ...avg, ...max, top_supplier: topSupplier, recent };
}
