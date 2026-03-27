import db from "../db/db.mjs";
import { getDateFilter } from "../utils/dateFilter.mjs";
import { normalizeBooleans } from "../utils/normalizeBooleans.mjs";
import * as ProductRepo from "../repositories/productRepository.mjs";
import * as AdjustmentRepo from "../repositories/stockAdjustmentRepository.mjs";
import * as BatchRepo from "../repositories/batchRepository.mjs";
import { convertToStockQuantity } from "../services/unitService.mjs"; // Import converter

/* -------------------------------------------------------------------------- */
/* SALE REPOSITORY FUNCTIONS                                                  */
/* -------------------------------------------------------------------------- */

/**
 * @description Creates a new sale record in the database.
 */
export function createSale(saleData, items) {
  try {
    const runTransaction = db.transaction(() => {
      // Create the sale record with snapshot fields included
      const saleStmt = db.prepare(`
        INSERT INTO sales (
          customer_id, customer_name, bill_address, state, pincode, reference_no, payment_mode, paid_amount, total_amount,
          note, status, discount, is_reverse_charge, is_ecommerce_sale, is_quote, employee_id, round_off, gstin
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const {
        customer_id,
        customer_name,
        bill_address,
        state,
        pincode,
        reference_no,
        paid_amount,
        payment_mode,
        note,
        total_amount,
        status,
        discount,
        is_reverse_charge,
        is_ecommerce_sale,
        is_quote,
        employee_id,
        round_off,
        gstin,
      } = saleData;

      const {
        is_reverse_charge: normalised_is_reverse_charge,
        is_ecommerce_sale: normalised_is_ecommerce_sale,
        is_quote: normalised_is_quote,
      } = normalizeBooleans({ is_reverse_charge, is_ecommerce_sale, is_quote });

      const saleResult = saleStmt.run(
        customer_id,
        customer_name || null,
        bill_address || null,
        state || null,
        pincode || null,
        reference_no,

        payment_mode,
        paid_amount,
        total_amount,
        note ?? "",
        status,
        discount,
        normalised_is_reverse_charge,
        normalised_is_ecommerce_sale,
        normalised_is_quote,
        employee_id,
        round_off || 0,
        gstin,
      );
      const saleId = saleResult.lastInsertRowid;

      // Check for items and create them
      if (items && items.length > 0) {
        // Updated to include snapshot fields (product_name, description, barcode, hsn)
        const itemStmt = db.prepare(`
          INSERT INTO sales_items (
            sale_id, product_id, product_name, description, barcode, hsn, sr_no, rate, quantity, gst_rate, discount, price, unit, batch_id, serial_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        items.forEach((item) => {
          itemStmt.run(
            saleId,
            item.product_id,
            item.product_name,
            item.description || null,
            item.barcode || null,
            item.hsn || null,
            item.sr_no,
            item.rate,
            item.quantity,
            item.gst_rate,
            item.discount,
            item.price,
            item.unit || null,
            item.batch_id || null,
            item.serial_id || null,
          );
        });
      }

      return saleId;
    });

    return runTransaction();
  } catch (error) {
    console.error("Error in createSale:", error.message);
    throw new Error("Sale creation failed: " + error.message);
  }
}

/**
 * @description Processes a sales return, updates stock, item return quantities, and creates a credit note.
 */
export function processSalesReturn(payload) {
  const { saleId, returnItems, note, customTotalAmount } = payload;

  const transaction = db.transaction(() => {
    // 1. Get original sale
    const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(saleId);
    if (!sale) throw new Error("Sale not found");

    let totalRefundAmount = 0;
    const cnRef = `CN-${Date.now()}`;

    // 2. Process each returned item
    for (const item of returnItems) {
      const { sales_item_id, quantity, returnToStock, price } = item;
      totalRefundAmount += price;

      const saleItem = db
        .prepare(
          `
        SELECT si.*, p.tracking_type 
        FROM sales_items si
        JOIN products p ON si.product_id = p.id
        WHERE si.id = ?
      `,
        )
        .get(sales_item_id);

      if (!saleItem) continue;

      db.prepare(
        `
        UPDATE sales_items 
        SET return_quantity = COALESCE(return_quantity, 0) + ? 
        WHERE id = ?
      `,
      ).run(quantity, sales_item_id);

      const currentProduct = ProductRepo.getProductById(saleItem.product_id);
      const qtyInStockUnits = convertToStockQuantity(
        quantity,
        saleItem.unit,
        currentProduct,
      );

      if (returnToStock) {
        const newQty = currentProduct.quantity + qtyInStockUnits;
        ProductRepo.updateProductQuantity(saleItem.product_id, newQty);

        if (saleItem.batch_id) {
          db.prepare(
            "UPDATE product_batches SET quantity = quantity + ? WHERE id = ?",
          ).run(qtyInStockUnits, saleItem.batch_id);
        }

        if (saleItem.serial_id) {
          db.prepare(
            "UPDATE product_serials SET status = 'available' WHERE id = ?",
          ).run(saleItem.serial_id);
        }

        AdjustmentRepo.createAdjustmentLog({
          product_id: saleItem.product_id,
          category: "Sales Return",
          old_quantity: currentProduct.quantity,
          new_quantity: newQty,
          adjustment: qtyInStockUnits,
          reason: `Restocked from Bill #${sale.reference_no} (Line ID: ${sales_item_id})`,
          batch_id: saleItem.batch_id,
          serial_id: saleItem.serial_id,
          adjusted_by: "System-Return",
        });
      } else {
        if (saleItem.serial_id) {
          db.prepare(
            "UPDATE product_serials SET status = 'returned' WHERE id = ?",
          ).run(saleItem.serial_id);
        }
      }
    }

    // 3. Handle Credit Note Transaction
    const finalPayout =
      customTotalAmount !== undefined ? customTotalAmount : totalRefundAmount;

    // Capture the result of the insertion to get the row ID
    const result = db
      .prepare(
        `
      INSERT INTO transactions (
        reference_no, type, bill_id, bill_type, entity_id, entity_type,
        transaction_date, amount, payment_mode, status, note
      ) VALUES (?, 'credit_note', ?, 'sale', ?, 'customer', ?, ?, ?, 'completed', ?)
    `,
      )
      .run(
        cnRef,
        saleId,
        sale.customer_id,
        new Date().toISOString().split("T")[0],
        finalPayout,
        "Cash",
        note || `Return against Bill #${sale.reference_no}`,
      );

    // Extract the generated ID
    const cnId = result.lastInsertRowid;

    // 4. Update Sale Status
    const stats = db
      .prepare(
        `
      SELECT SUM(quantity) as sold, SUM(return_quantity) as returned 
      FROM sales_items WHERE sale_id = ?
    `,
      )
      .get(saleId);

    const finalStatus =
      stats.returned >= stats.sold - 0.001 ? "returned" : "partially_returned";
    db.prepare("UPDATE sales SET status = ? WHERE id = ?").run(
      finalStatus,
      saleId,
    );

    return {
      success: true,
      refundAmount: finalPayout,
      status: finalStatus,
      creditNoteRef: cnRef,
      cnId: cnId, // Included the ID in the response
    };
  });

  return transaction();
}

/**
 * @description Retrieves a sale and its associated items by ID, reconciling payment status and return data.
 */
export function getSaleWithItemsById(saleId) {
  try {
    const saleStmt = db.prepare(`
      SELECT
        s.*,
        COALESCE(s.customer_name, c.name) AS customer_name,
        c.phone AS customer_phone,
        COALESCE(s.bill_address, c.address) AS customer_address,
        c.city as customer_city,
        COALESCE(s.state, c.state) as customer_state,
        COALESCE(s.pincode, c.pincode) as customer_pincode,
        c.gst_no AS customer_gst_no,
        es.employee_id
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN employee_sales es ON s.id = es.sale_id
      WHERE s.id = ?
    `);
    const sale = saleStmt.get(saleId);

    if (!sale) return null;

    const itemsStmt = db.prepare(`
      SELECT
        si.*, 
        COALESCE(si.product_name, p.name) AS product_name, 
        COALESCE(si.barcode, p.product_code) AS product_code, 
        COALESCE(si.hsn, p.hsn) AS hsn, 
        p.base_unit,
        pb.batch_number, ps.serial_number
      FROM sales_items si
      LEFT JOIN products p ON si.product_id = p.id
      LEFT JOIN product_batches pb ON si.batch_id = pb.id
      LEFT JOIN product_serials ps ON si.serial_id = ps.id
      WHERE si.sale_id = ?
      ORDER BY si.sr_no ASC
    `);
    const items = itemsStmt.all(saleId);

    const transactionStmt = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE 
          WHEN type IN ('payment_in', 'sale') THEN amount 
          WHEN type = 'payment_out' THEN -amount 
          ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE 
          WHEN type = 'credit_note' THEN amount 
          ELSE 0 END), 0) as total_credit_notes
      FROM transactions
      WHERE bill_id = ? AND bill_type = 'sale' AND status != 'deleted'
    `);
    const transactionResult = transactionStmt.get(saleId);

    const reconciledPaid = transactionResult?.total_paid || 0;
    const creditNotes = transactionResult?.total_credit_notes || 0;
    const netPayable = (sale.total_amount || 0) - Math.abs(creditNotes);
    const balance = netPayable - reconciledPaid;
    const isPaid = balance <= 0.9;
    const isPartial = !isPaid && reconciledPaid > 0;

    return {
      ...sale,
      items,
      payment_summary: {
        total_paid: reconciledPaid,
        total_credit_notes: creditNotes,
        net_payable: netPayable > 0 ? netPayable : 0,
        balance: balance > 0 ? balance : 0,
        status: isPaid ? "paid" : isPartial ? "partial" : "pending",
      },
      paid_amount: reconciledPaid,
      status: isPaid ? "paid" : isPartial ? "partial" : "pending",
    };
  } catch (error) {
    console.error("Failed to fetch sale with items:", error.message);
    throw new Error("Failed to fetch sale with items: " + error.message);
  }
}

/**
 * @description Fetches all sales within a date range, including their items and customer details, structured for PDF export.
 */
export function getSalesForPDFExport(filters) {
  const sales = db
    .prepare(
      `
    SELECT
      s.*,
      COALESCE(s.customer_name, c.name, 'Walk-in Customer') as customer_name,
      COALESCE(s.bill_address, c.address) as customer_address,
      c.city as customer_city,
      COALESCE(s.state, c.state) as customer_state,
      COALESCE(s.pincode, c.pincode) as customer_pincode,
      c.phone as customer_phone,
      c.gst_no as customer_gst_no
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE date(s.created_at) BETWEEN @startDate AND @endDate
      AND s.is_quote = 0
  `,
    )
    .all(filters);

  if (sales.length === 0) {
    return [];
  }

  const saleIds = sales.map((s) => s.id);
  const items = db
    .prepare(
      `
    SELECT
      si.*,
      COALESCE(si.product_name, p.name) as product_name,
      COALESCE(si.hsn, p.hsn) as hsn
    FROM sales_items si
    JOIN products p ON si.product_id = p.id
    WHERE si.sale_id IN (${saleIds.map(() => "?").join(",")})
  `,
    )
    .all(...saleIds);

  return sales.map((sale) => ({
    ...sale,
    items: items.filter((item) => item.sale_id === sale.id),
  }));
}
/**
 * @description Updates the header of a sale.
 */
export function updateSaleHeader(id, saleData) {
  const {
    customer_id,
    customer_name,
    bill_address,
    state,
    pincode,
    gstin,
    reference_no,
    payment_mode,
    paid_amount,
    total_amount,
    note,
    status,
    discount,
    is_reverse_charge,
    is_ecommerce_sale,
    is_quote,
    employee_id,
    round_off,
  } = saleData;

  const {
    is_reverse_charge: normalised_is_reverse_charge,
    is_ecommerce_sale: normalised_is_ecommerce_sale,
    is_quote: normalised_is_quote,
  } = normalizeBooleans({ is_reverse_charge, is_ecommerce_sale, is_quote });

  const stmt = db.prepare(`
    UPDATE sales SET 
      customer_id = ?, customer_name = ?, bill_address = ?, state = ?, pincode = ?, 
      reference_no = ?, payment_mode = ?, paid_amount = ?, total_amount = ?, note = ?, 
      status = ?, discount = ?, is_reverse_charge = ?, is_ecommerce_sale = ?, 
      is_quote = ?, employee_id = ?, round_off = ?, gstin = ?, updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `);

  return stmt.run(
    customer_id,
    customer_name || null,
    bill_address || null,
    state || null,
    pincode || null,
    reference_no,
    payment_mode,
    paid_amount,
    total_amount,
    note ?? "",
    status,
    discount,
    normalised_is_reverse_charge,
    normalised_is_ecommerce_sale,
    normalised_is_quote,
    employee_id || null,
    round_off || 0,
    gstin,
    id,
  );
}

/**
 * @description Fully replaces items for a sale.
 */
export function replaceSaleItems(saleId, items) {
  const deleteStmt = db.prepare("DELETE FROM sales_items WHERE sale_id = ?");
  deleteStmt.run(saleId);

  // Updated to include snapshot fields
  const insertStmt = db.prepare(`
    INSERT INTO sales_items (
      sale_id, product_id, product_name, description, barcode, hsn, sr_no, rate, quantity, gst_rate, discount, price, batch_id, serial_id, unit
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of items) {
    insertStmt.run(
      saleId,
      item.product_id,
      item.product_name,
      item.description || null,
      item.barcode || null,
      item.hsn || null,
      item.sr_no,
      item.rate,
      item.quantity,
      item.gst_rate,
      item.discount,
      item.price,
      item.batch_id || null,
      item.serial_id || null,
      item.unit || null,
    );
  }
}

/**
 * @description Updates specific fields of a sale record.
 */
export function updateSale(id, updates) {
  try {
    const keys = Object.keys(updates);
    if (keys.length === 0) return { changes: 0 };

    const setClause = keys.map((key) => `${key} = ?`).join(", ");
    const values = Object.values(updates);
    values.push(id);

    const stmt = db.prepare(
      `UPDATE sales SET ${setClause}, updated_at = datetime('now', 'localtime') WHERE id = ?`,
    );

    const result = stmt.run(...values);
    return result;
  } catch (error) {
    console.error("Repo Error: updateSale", error.message);
    throw new Error("Failed to update sale: " + error.message);
  }
}

export async function updateSaleById(id, saleData) {
  const {
    reference_no,
    payment_mode,
    note,
    paid_amount,
    total_amount,
    status,
    customer_id,
    customer_name,
    bill_address,
    state,
    pincode,
    round_off,
  } = saleData;

  // Update main sale record
  await db.run(
    `
      UPDATE sales
      SET reference_no = ?, payment_mode = ?, note = ?, paid_amount = ?, total_amount = ?, status = ?, customer_id = ?,
          customer_name = ?, bill_address = ?, state = ?, pincode = ?, round_off = ?,gstin = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
      `,
    [
      reference_no,
      payment_mode,
      note,
      paid_amount,
      total_amount,
      status,
      customer_id,
      customer_name,
      bill_address,
      state,
      pincode,
      round_off,
      gstin,
      id,
    ],
  );

  // Remove old sale items and re-insert new ones
  await db.run(`DELETE FROM sales_items WHERE sale_id = ?`, [id]);

  if (saleData.items && saleData.items.length > 0) {
    for (const item of saleData.items) {
      await db.run(
        `
          INSERT INTO sales_items (sale_id, product_id, product_name, description, barcode, hsn, rate, quantity, gst_rate, discount, price, unit)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        [
          id,
          item.product_id,
          item.product_name,
          item.description || null,
          item.barcode || null,
          item.hsn || null,
          item.rate,
          item.quantity,
          item.gst_rate,
          item.discount,
          item.price,
          item.unit || null,
        ],
      );
    }
  }

  return getSaleById(id);
}

export function getPaginatedSales(page, limit) {
  try {
    const offset = (page - 1) * limit;
    const stmt = db.prepare(`
      SELECT * FROM sales
      WHERE status IN ('paid', 'pending', 'refunded', 'returned')
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    return stmt.all(limit, offset);
  } catch (error) {
    console.error("Error in getPaginatedSales:", error.message);
    throw new Error("Failed to fetch paginated sales: " + error.message);
  }
}

export async function updateSaleStatus(id, status) {
  try {
    const stmt = db.prepare("UPDATE sales SET status = ? WHERE id = ?");
    const info = stmt.run(status, id);

    return info;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
/**
 * @description Fetches highly detailed sales data for Excel export.
 * Supports both Header-level (Sales Register) and Item-level (Product Analysis) exports.
 */
export function getExportableSalesData(filters) {
  const { startDate, endDate, exportType = "item" } = filters;

  if (exportType === "header") {
    // APPROACH 2: 1 Row per Invoice
    const stmt = db.prepare(`
      SELECT
        s.id,
        s.reference_no,
        datetime(s.created_at) as invoice_date,
        COALESCE(s.customer_name, c.name, 'Walk-in Customer') as customer_name,
        c.phone as customer_phone,
        COALESCE(s.bill_address, c.address) as customer_address,
        c.city as customer_city,
        COALESCE(s.state, c.state) as customer_state,
        COALESCE(s.pincode, c.pincode) as customer_pincode,
        c.gst_no as customer_gst_no,
        s.payment_mode,
        (SELECT SUM(price) FROM sales_items WHERE sale_id = s.id) as subtotal,
        (SELECT SUM((price / NULLIF(quantity, 0)) * COALESCE(return_quantity, 0)) FROM sales_items WHERE sale_id = s.id) as returned_amount,
        s.discount as bill_discount_percentage,
        s.round_off as bill_round_off,
        s.total_amount as bill_grand_total,
        s.paid_amount,
        s.status,
        s.note,
        s.employee_id
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE date(s.created_at) BETWEEN @startDate AND @endDate
        AND s.is_quote = 0
      ORDER BY s.created_at DESC
    `);
    return stmt.all({ startDate, endDate });
  } else {
    // APPROACH 1: 1 Row per Item (For deep GST Analysis)
    const stmt = db.prepare(`
      SELECT
        s.reference_no,
        datetime(s.created_at) as invoice_date,
        COALESCE(s.customer_name, c.name, 'Walk-in Customer') as customer_name,
        c.phone as customer_phone,
        COALESCE(s.bill_address, c.address) as customer_address,
        c.city as customer_city,
        COALESCE(s.state, c.state) as customer_state,
        COALESCE(s.pincode, c.pincode) as customer_pincode,
        c.gst_no as customer_gst_no,
        
        COALESCE(si.product_name, p.name) as product_name,
        si.description as item_description,
        COALESCE(si.barcode, p.barcode, p.product_code) as barcode,
        COALESCE(si.hsn, p.hsn) as hsn,
        si.quantity,
        COALESCE(si.return_quantity, 0) as return_quantity,
        si.unit,
        si.rate,
        si.gst_rate,
        si.discount as item_discount_percentage,
        si.price as item_total,
        
        s.discount as bill_discount_percentage,
        s.round_off as bill_round_off,
        s.total_amount as bill_grand_total,
        s.payment_mode,
        s.status
      FROM sales_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE date(s.created_at) BETWEEN @startDate AND @endDate
        AND s.is_quote = 0
      ORDER BY s.created_at DESC, si.id ASC
    `);
    return stmt.all({ startDate, endDate });
  }
}

export function getSalesForCustomer(customerId, filters = {}) {
  try {
    if (!customerId) {
      throw new Error("Customer ID is required.");
    }

    const {
      page = 1,
      limit = 10,
      query = "",
      filter,
      startDate,
      endDate,
      all,
    } = filters;

    const offset = (page - 1) * limit;

    const { where: dateWhere, params: dateParams } = getDateFilter({
      filter,
      from: startDate,
      to: endDate,
      alias: "s",
    });

    const whereClauses = ["s.customer_id = ?"];
    const params = [customerId];

    if (!all && dateWhere !== "1=1") {
      whereClauses.push(dateWhere);
      params.push(...dateParams);
    }

    if (query) {
      whereClauses.push(`s.reference_no LIKE ?`);
      params.push(`%${query}%`);
    }

    const finalWhereClause = whereClauses.join(" AND ");

    const salesQuery = `
      SELECT
        s.id,
        s.reference_no,
        s.created_at,
        s.total_amount,
        s.paid_amount,
        s.status,
        GROUP_CONCAT(COALESCE(si.product_name, p.name) || ' (' || si.quantity || ' ' || COALESCE(si.unit, '') || ')', '; ') AS items_summary
      FROM sales s
      JOIN sales_items si ON s.id = si.sale_id
      JOIN products p ON si.product_id = p.id
      WHERE ${finalWhereClause}
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const totalCountQuery = `
      SELECT COUNT(*) AS total_count
      FROM sales s
      WHERE ${finalWhereClause}
    `;

    const salesStmt = db.prepare(salesQuery);
    const totalCountStmt = db.prepare(totalCountQuery);

    const sales = salesStmt.all(...params, limit, offset);
    const { total_count } = totalCountStmt.get(...params);

    return { sales, totalCount: total_count };
  } catch (error) {
    console.error("Error in getSalesForCustomer:", error.message);
    throw new Error("Failed to fetch customer sales: " + error.message);
  }
}

export function getSaleById(saleId) {
  try {
    const stmt = db.prepare(
      `SELECT * FROM sales WHERE id = ? AND status != 'deleted'`,
    );
    return stmt.get(saleId);
  } catch (err) {
    console.error("Error in getSaleById:", err.message);
    throw new Error("Failed to fetch sale by ID: " + err.message);
  }
}

export function deleteSale(saleId) {
  try {
    const stmt = db.prepare(`UPDATE sales SET status = 'deleted' WHERE id = ?`);
    return stmt.run(saleId);
  } catch (err) {
    console.error("Error in deleteSale:", err.message);
    throw new Error("Failed to soft-delete sale: " + err.message);
  }
}

export function getSalesSummary(start, end) {
  try {
    const stmt = db.prepare(`
      SELECT COUNT(*) as total_sales, SUM(total_amount) as total_amount
      FROM sales
      WHERE date(created_at) BETWEEN date(?) AND date(?)
      AND status IN ('paid', 'pending')
    `);
    const result = stmt.get(start, end);
    return result || { total_sales: 0, total_amount: 0 };
  } catch (error) {
    console.error("Error in getSalesSummary:", error.message);
    throw new Error("Failed to fetch sales summary: " + error.message);
  }
}

export function searchSalesByReference(query) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM sales
      WHERE LOWER(reference_no) LIKE '%' || LOWER(?) || '%'
      AND status IN ('paid', 'pending')
      ORDER BY created_at DESC
    `);
    return stmt.all(query);
  } catch (error) {
    console.error("Error in searchSalesByReference:", error.message);
    throw new Error("Failed to search sales: " + error.message);
  }
}

export function deleteItemsBySaleId(saleId) {
  try {
    const stmt = db.prepare(`DELETE FROM sales_items WHERE sale_id = ?`);
    const result = stmt.run(saleId);
    return result;
  } catch (error) {
    console.error("Error in deleteItemsBySaleId:", error.message);
    throw new Error("Failed to delete sale items: " + error.message);
  }
}
