import db from "../db/db.mjs";
import { getDateFilter } from "../utils/dateFilter.mjs";
import {
  getProductById,
  updateProductAveragePurchasePrice,
  updateProductQuantity,
} from "./productRepository.mjs";
import { normalizeBooleans } from "../utils/normalizeBooleans.mjs";
import { calculateAveragePurchaseCost } from "../utils/updateAveragePurchaseCostForProduct.mjs";
import { convertToStockQuantity } from "../services/unitService.mjs";
import { generateReference } from "./referenceRepository.mjs";
import * as AdjustmentRepo from "./stockAdjustmentRepository.mjs";

function normalizeItemUnit(unit, fallback = "pcs") {
  const normalized = unit ? unit.toString().trim() : "";
  return normalized || fallback;
}

export function createPurchase(purchaseData, items) {
  try {
    const insertPurchaseStmt = db.prepare(
      `INSERT INTO purchases (supplier_id, reference_no, internal_ref_no, date, status, note, total_amount, paid_amount, payment_mode, is_reverse_charge)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      purchase.is_reverse_charge,
    );

    const purchase_id = insertPurchaseStmtResponse.lastInsertRowid;

    // UPDATED: Included 'barcode' and 'margin' in columns
    const insertItemStmt = db.prepare(
      `INSERT INTO purchase_items (
         purchase_id, product_id, quantity, rate, gst_rate, discount, price, unit,
         batch_uid, batch_number, barcode, serial_numbers, expiry_date, mfg_date,
         mrp, margin, mop, mfw_price
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const item of items) {
      const {
        product_id,
        quantity,
        rate,
        gst_rate,
        discount,
        price,
        unit, // Extract unit
        batch_uid,
        batch_number,
        barcode,
        serial_numbers,
        expiry_date,
        mfg_date,
        mrp,
        margin,
        mop,
        mfw_price,
      } = item;

      const product = getProductById(product_id);
      if (!product) {
        throw new Error(`Product with id ${product_id} not found`);
      }
      const itemUnit = normalizeItemUnit(unit, product.base_unit || "pcs");

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
        itemUnit,
        batch_uid || null,
        batch_number || null,
        barcode || null,
        serialsString,
        expiry_date || null,
        mfg_date || null,
        mrp || null,
        margin || 0,
        mop || null,
        mfw_price || null,
      );

      // --- UNIT CONVERSION LOGIC ---
      const stockQty = convertToStockQuantity(quantity, itemUnit, product);
      let effectiveRate = rate;
      if (stockQty !== quantity && stockQty > 0) {
        effectiveRate = (quantity * rate) / stockQty;
      }

      const { newAverageCost, newTotalQuantity } = calculateAveragePurchaseCost(
        item.product_id,
        stockQty,
        effectiveRate,
      );

      updateProductAveragePurchasePrice(item.product_id, newAverageCost);
      updateProductQuantity(item.product_id, newTotalQuantity);
    }

    return purchase_id;
  } catch (err) {
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

    const itemsStmt = db.prepare(`
      SELECT 
        pi.id, pi.product_id, pr.name AS product_name, pr.hsn AS hsn_code,
        pi.rate, pi.quantity, COALESCE(pi.return_quantity, 0) AS return_quantity, pi.unit, pi.gst_rate, pi.discount, pi.price,
        pi.batch_number, pi.barcode, pi.expiry_date, pi.mfg_date, pi.serial_numbers,
        pi.mrp, pi.margin, pi.mop, pi.mfw_price
      FROM purchase_items pi
      JOIN products pr ON pi.product_id = pr.id
      WHERE pi.purchase_id = ?
      ORDER BY pi.id ASC
    `);
    const items = itemsStmt.all(id);

    const itemsWithSerials = items.map((item) => {
      const returnQty = item.return_quantity || 0;
      const netQty = Math.max(0, item.quantity - returnQty);
      const unitPrice = item.quantity > 0 ? item.price / item.quantity : item.rate;
      const netPrice = parseFloat((unitPrice * netQty).toFixed(2));
      return {
        ...item,
        return_quantity: returnQty,
        net_quantity: netQty,
        net_price: netPrice,
        serial_numbers: item.serial_numbers
          ? JSON.parse(item.serial_numbers)
          : [],
      };
    });

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
      original_total_amount: purchase.total_amount,
      total_amount: adjustedTotal,
      items: itemsWithSerials,
      payment_summary: {
        total_paid: totalPaid,
        total_debit_notes: debitNotes,
        original_total: purchase.total_amount,
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
      "Failed to fetch purchase with financial summary: " + error.message,
    );
  }
}

export function getPurchaseItemsForLabels(purchaseId) {
  return db
    .prepare(
      `
    SELECT 
      p.id, 
      p.name, 
      p.product_code, 
      COALESCE(NULLIF(pi.barcode, ''), NULLIF(p.barcode, ''), p.product_code) as barcode,
      COALESCE(pb.mrp, pi.mrp, p.mrp) as mrp, 
      pi.mop, 
      pi.mfw_price, 
      p.size, 
      p.weight,
      p.tracking_type,
      pi.quantity as purchase_quantity,
      pi.unit as purchase_unit,
      COALESCE(pb.batch_uid, pi.batch_uid) as batch_uid,
      COALESCE(pb.batch_number, pi.batch_number) as batch_number,
      pb.barcode as batch_barcode, 
      pi.serial_numbers,
      pi.margin
    FROM purchase_items pi
    JOIN products p ON pi.product_id = p.id
    LEFT JOIN product_batches pb ON pb.purchase_id = pi.purchase_id AND pb.product_id = pi.product_id
    WHERE pi.purchase_id = ?
  `,
    )
    .all(purchaseId);
}

export async function deletePurchase(id) {
  await db.run("BEGIN");
  const items = await db.all(
    `SELECT product_id, quantity, unit FROM purchase_items WHERE purchase_id = ?`,
    [id],
  );

  const getProductStmt = db.prepare(
    "SELECT base_unit, secondary_unit, conversion_factor FROM products WHERE id = ?",
  );

  for (const item of items) {
    const product = getProductStmt.get(item.product_id);
    let qtyToDeduct = item.quantity;
    if (product) {
      qtyToDeduct = convertToStockQuantity(item.quantity, item.unit, product);
    }

    await db.run(`UPDATE products SET quantity = quantity - ? WHERE id = ?`, [
      qtyToDeduct,
      item.product_id,
    ]);
  }
  await db.run(`DELETE FROM purchase_items WHERE purchase_id = ?`, [id]);
  await db.run(`DELETE FROM purchases WHERE id = ?`, [id]);
  await db.run("COMMIT");
  return true;
}

export function updatePurchase(id, data, newItems) {
  const executeUpdate = db.transaction(() => {
    db.prepare(`DELETE FROM purchase_items WHERE purchase_id = ?`).run(id);

    const insertItemStmt = db.prepare(`
      INSERT INTO purchase_items (
        purchase_id, product_id, quantity, rate, gst_rate, discount, unit,
        batch_uid, batch_number, barcode, serial_numbers, expiry_date, mfg_date,
        mrp, margin, mop, mfw_price
      ) VALUES (
        @purchase_id, @product_id, @quantity, @rate, @gst_rate, @discount, @unit,
        @batch_uid, @batch_number, @barcode, @serial_numbers, @expiry_date, @mfg_date,
        @mrp, @margin, @mop, @mfw_price
      )
    `);

    for (const item of newItems) {
      insertItemStmt.run({
        purchase_id: id,
        product_id: item.product_id,
        quantity: item.quantity,
        rate: item.rate,
        gst_rate: item.gst_rate,
        discount: item.discount || 0,
        unit: normalizeItemUnit(item.unit),
        batch_uid: item.batch_uid || null,
        batch_number: item.batch_number || null,
        barcode: item.barcode || null,
        serial_numbers: item.serial_numbers
          ? JSON.stringify(item.serial_numbers)
          : null,
        expiry_date: item.expiry_date || null,
        mfg_date: item.mfg_date || null,
        mrp: item.mrp || null,
        margin: item.margin || 0,
        mop: item.mop || null,
        mfw_price: item.mfw_price || null,
      });
    }

    db.prepare(
      `
      UPDATE purchases 
      SET supplier_id = @supplier_id, 
          reference_no = @reference_no, 
          date = @date, 
          status = @status, 
          note = @note, 
          total_amount = @total_amount, 
          paid_amount = @paid_amount,
          is_reverse_charge = @is_reverse_charge
      WHERE id = @id
    `,
    ).run({
      supplier_id: data.supplier_id,
      reference_no: data.reference_no,
      date: data.date,
      status: data.status,
      note: data.note || "",
      total_amount: data.total_amount,
      paid_amount: data.paid_amount,
      is_reverse_charge: data.is_reverse_charge ? 1 : 0,
      id: id,
    });
  });

  return executeUpdate();
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
        p.id, p.internal_ref_no, p.reference_no, p.date, p.status, p.supplier_id, s.name AS supplier_name,
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
        p.id, p.supplier_id, p.reference_no, p.date, p.status, p.total_amount AS original_total_amount,
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
    `SELECT SUM(total_amount) AS total_amount, SUM(paid_amount) AS paid_amount FROM purchases p WHERE ${where}`,
  );
  const monthlyStmt = db.prepare(
    `SELECT ${
      filter === "month" ? "date(p.date)" : "strftime('%Y-%m', p.date)"
    } AS period, SUM(total_amount) AS total FROM purchases p WHERE ${where} GROUP BY period ORDER BY period`,
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
      `SELECT s.name AS supplier_name, SUM(p.total_amount) AS total FROM purchases p JOIN suppliers s ON p.supplier_id = s.id WHERE ${where} GROUP BY s.id ORDER BY total DESC LIMIT 5`,
    )
    .all(...params);
  const byQuantity = db
    .prepare(
      `SELECT s.name AS supplier_name, SUM(pi.quantity) AS total_qty FROM purchases p JOIN suppliers s ON p.supplier_id = s.id JOIN purchase_items pi ON pi.purchase_id = p.id WHERE ${where} GROUP BY s.id ORDER BY total_qty DESC LIMIT 5`,
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
      `SELECT c.name AS category_name, SUM(pi.quantity * pi.rate) AS total_spend FROM purchases p JOIN purchase_items pi ON pi.purchase_id = p.id JOIN products pr ON pi.product_id = pr.id JOIN categories c ON pr.category = c.id WHERE ${where} GROUP BY c.id ORDER BY total_spend DESC`,
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
      `SELECT s.name AS supplier_name, COUNT(*) AS count FROM purchases p JOIN suppliers s ON p.supplier_id = s.id GROUP BY s.id ORDER BY count DESC LIMIT 1`,
    )
    .get();
  const recent = db
    .prepare(
      `SELECT reference_no, date FROM purchases ORDER BY date DESC LIMIT 5`,
    )
    .all();
  return { ...total, ...avg, ...max, top_supplier: topSupplier, recent };
}

export function getPurchaseOrderMetrics(filters) {
  const { where, params } = getDateFilter({ ...filters, alias: "p" });
  const row = db.prepare(`
    SELECT
      COUNT(*) AS purchaseCount,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingCount,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paidCount,
      COUNT(DISTINCT supplier_id) AS uniqueSuppliers
    FROM purchases p WHERE ${where}
  `).get(...params);

  return {
    purchaseCount: row.purchaseCount || 0,
    pendingCount: row.pendingCount || 0,
    paidPercentage: row.purchaseCount
      ? Math.round((row.paidCount / row.purchaseCount) * 100)
      : 0,
    uniqueSuppliers: row.uniqueSuppliers || 0,
  };
}

export function getTopPurchasedProducts({ limit = 5, ...filters }) {
  const { where, params } = getDateFilter({ ...filters, alias: "p" });
  const stmt = db.prepare(`
    SELECT pr.name, SUM(pi.quantity) AS qty, SUM(pi.price) AS revenue
    FROM purchase_items pi
    JOIN purchases p ON pi.purchase_id = p.id
    JOIN products pr ON pi.product_id = pr.id
    WHERE ${where}
    GROUP BY pr.id
    ORDER BY revenue DESC
    LIMIT ?
  `);
  return stmt.all(...params, limit);
}

export function getPurchasePaymentModeBreakdown(filters) {
  const { where, params } = getDateFilter({ ...filters, alias: "p" });
  const totalStmt = db.prepare(
    `SELECT SUM(paid_amount) AS total FROM purchases p WHERE ${where}`
  );
  const total = totalStmt.get(...params)?.total || 0;

  const stmt = db.prepare(`
    SELECT payment_mode AS mode, SUM(paid_amount) AS amount
    FROM purchases p
    WHERE ${where}
    GROUP BY payment_mode
  `);

  return stmt.all(...params).map((row) => ({
    ...row,
    percentage: total ? Math.round((row.amount / total) * 100) : 0,
  }));
}

/**
 * Processes a purchase return, updates stock/batches/serials, logs adjustment,
 * and creates a Debit Note transaction that reduces the purchase bill balance.
 */
export function processPurchaseReturn(payload) {
  const { purchaseId, returnItems, note, customTotalAmount, gstAmount } = payload;

  const transaction = db.transaction(() => {
    // 1. Get original purchase & supplier info
    const purchase = db
      .prepare(
        `
      SELECT p.*, s.name as supplier_name, s.gst_number as supplier_gstin
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `,
      )
      .get(purchaseId);

    if (!purchase) throw new Error("Purchase bill not found");

    let totalRefundAmount = 0;
    const dnRef = generateReference("DN");

    // 2. Process each returned purchase item
    for (const item of returnItems) {
      const {
        purchase_item_id,
        quantity,
        returnToStock = true,
        price,
        selectedSerials,
      } = item;
      totalRefundAmount += Number(price) || 0;

      const purchaseItem = db
        .prepare(
          `
        SELECT pi.*, p.name as product_name, p.tracking_type
        FROM purchase_items pi
        JOIN products p ON pi.product_id = p.id
        WHERE pi.id = ?
      `,
        )
        .get(purchase_item_id);

      if (!purchaseItem) continue;

      // Increment return_quantity on purchase_items table
      db.prepare(
        `
        UPDATE purchase_items
        SET return_quantity = COALESCE(return_quantity, 0) + ?
        WHERE id = ?
      `,
      ).run(quantity, purchase_item_id);

      const currentProduct = getProductById(purchaseItem.product_id);
      if (!currentProduct) continue;

      const stockQty = convertToStockQuantity(
        quantity,
        purchaseItem.unit,
        currentProduct,
      );

      if (returnToStock) {
        // Deduct stock from master product
        const newQty = Math.max(0, currentProduct.quantity - stockQty);
        updateProductQuantity(purchaseItem.product_id, newQty);

        // Find linked batch if any
        let batchId = null;
        if (
          currentProduct.tracking_type === "batch" ||
          currentProduct.tracking_type === "serial"
        ) {
          const batch = db
            .prepare(
              `
            SELECT id, quantity FROM product_batches
            WHERE purchase_id = ? AND product_id = ?
          `,
            )
            .get(purchaseId, purchaseItem.product_id);

          if (batch) {
            batchId = batch.id;
            const newBatchQty = Math.max(0, batch.quantity - stockQty);
            db.prepare(
              "UPDATE product_batches SET quantity = ? WHERE id = ?",
            ).run(newBatchQty, batch.id);
          }
        }

        // Handle Serials status update if serial tracked
        if (
          currentProduct.tracking_type === "serial" &&
          Array.isArray(selectedSerials) &&
          selectedSerials.length > 0
        ) {
          const updateSerialStmt = db.prepare(
            `UPDATE product_serials SET status = 'returned' WHERE product_id = ? AND serial_number = ? AND status = 'available'`,
          );
          for (const sn of selectedSerials) {
            updateSerialStmt.run(purchaseItem.product_id, sn);
          }
        }

        // Log in stock_adjustments history
        AdjustmentRepo.createAdjustmentLog({
          product_id: purchaseItem.product_id,
          category: "Purchase Return",
          old_quantity: currentProduct.quantity,
          new_quantity: newQty,
          adjustment: -stockQty,
          reason: `Returned to Supplier via Debit Note ${dnRef} (Bill #${purchase.reference_no})`,
          batch_id: batchId,
          serial_id: null,
          adjusted_by: "System-PurchaseReturn",
        });
      }
    }

    // 3. Financial Debit Note Transaction (-finalDebitAmount to reduce purchase total balance)
    const finalDebitAmount =
      customTotalAmount !== undefined
        ? Number(customTotalAmount)
        : totalRefundAmount;

    const returnGstVal = Number(gstAmount) || 0;
    const todayDate = new Date().toISOString().split("T")[0];

    const result = db
      .prepare(
        `
      INSERT INTO transactions (
        reference_no, type, bill_id, bill_type, entity_id, entity_type,
        transaction_date, amount, gst_amount, payment_mode, status, note
      ) VALUES (?, 'debit_note', ?, 'purchase', ?, 'supplier', ?, ?, ?, 'Cash', 'completed', ?)
    `,
      )
      .run(
        dnRef,
        purchaseId,
        purchase.supplier_id,
        todayDate,
        -Math.abs(finalDebitAmount),
        returnGstVal,
        note || `Debit Note against Purchase Bill #${purchase.reference_no}`,
      );

    const transactionId = result.lastInsertRowid;

    return {
      success: true,
      dnId: transactionId,
      debitNoteRef: dnRef,
      refundAmount: finalDebitAmount,
      gstAmount: returnGstVal,
      purchaseId: purchaseId,
    };
  });

  return transaction();
}
