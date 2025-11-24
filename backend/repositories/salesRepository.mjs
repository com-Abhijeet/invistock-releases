import db from "../db/db.mjs";
import { getDateFilter } from "../utils/dateFilter.mjs";
import { normalizeBooleans } from "../utils/normalizeBooleans.mjs";
import { createTransaction } from "./transactionRepository.mjs";
import { updateProductQuantity } from "./productRepository.mjs";
import { createAdjustmentLog } from "./stockAdjustmentRepository.mjs"; // You created this earlier
/* -------------------------------------------------------------------------- */
/* SALE REPOSITORY FUNCTIONS                                                  */
/* -------------------------------------------------------------------------- */

/**
 * @description Creates a new sale record in the database.
 * @param {object} saleData - The data for the new sale.
 * @param {Array<object>} items - An array of sale item objects.
 * @returns {number} The ID of the newly created sale.
 * @throws {Error} If sale creation or item insertion fails.
 */
export function createSale(saleData, items) {
  try {
    const runTransaction = db.transaction(() => {
      // Create the sale record
      const saleStmt = db.prepare(`
        INSERT INTO sales (
          customer_id, reference_no, payment_mode, paid_amount, total_amount,
          note, status, discount, is_reverse_charge, is_ecommerce_sale, is_quote
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const {
        customer_id,
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
      } = saleData;

      const {
        is_reverse_charge: normalised_is_reverse_charge,
        is_ecommerce_sale: normalised_is_ecommerce_sale,
        is_quote: normalised_is_quote,
      } = normalizeBooleans({ is_reverse_charge, is_ecommerce_sale, is_quote });

      const saleResult = saleStmt.run(
        customer_id,
        reference_no,
        payment_mode,
        paid_amount,
        total_amount,
        note ?? "",
        status,
        discount,
        normalised_is_reverse_charge,
        normalised_is_ecommerce_sale,
        normalised_is_quote
      );
      const saleId = saleResult.lastInsertRowid;

      // Check for items and create them
      if (items && items.length > 0) {
        const itemStmt = db.prepare(`
          INSERT INTO sales_items (
            sale_id, product_id, sr_no, rate, quantity, gst_rate, discount, price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        items.forEach((item) => {
          itemStmt.run(
            saleId,
            item.product_id,
            item.sr_no,
            item.rate,
            item.quantity,
            item.gst_rate,
            item.discount,
            item.price
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

export function processSalesReturn(payload) {
  const { saleId, returnItems, note } = payload;

  const transaction = db.transaction(() => {
    // 1. Get original sale
    const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(saleId);
    if (!sale) throw new Error("Sale not found");

    let totalRefundAmount = 0;

    // 2. Process each returned item
    for (const item of returnItems) {
      // item = { product_id, quantity, price, returnToStock: boolean }

      // A. Calculate Refund Amount for this item
      // (Assuming 'price' passed from frontend is the unit price * qty returned)
      totalRefundAmount += item.price;

      // B. Inventory Logic
      const currentProduct = db
        .prepare("SELECT quantity FROM products WHERE id = ?")
        .get(item.product_id);

      if (item.returnToStock) {
        // Option 1: Good condition -> Back to shelf
        const newQty = currentProduct.quantity + item.quantity;
        updateProductQuantity(item.product_id, newQty);

        // 2. Log it in Stock Adjustments (Critical for Audit Trail)
        createAdjustmentLog({
          product_id: item.product_id,
          category: "Sales Return", // Matches 'Adjustment (In)' in history
          old_quantity: currentProduct.quantity,
          new_quantity: newQty,
          adjustment: item.quantity, // Positive Value (+)
          reason: `Restocked from Bill #${sale.reference_no}`,
          adjusted_by: "System",
        });
      } else {
        // Option 2: Damaged/Scrap -> Record in Adjustment Log (Don't increase Sellable Stock)
        // NOTE: If you want to track 'Damaged' stock separately, you'd need a separate logic.
        // For now, we effectively 'scrap' it by NOT adding it back to the main quantity,
        // but we verify the logic:
        // Actually, if it was SOLD, it left inventory. If it comes back as SCRAP,
        // we technically receive it then trash it.
        // Simpler logic: We just don't add it back to 'quantity'.
        // But we LOG it so we know why we gave money back.
        createAdjustmentLog({
          product_id: item.product_id,
          category: "Sales Return (Damaged)",
          old_quantity: currentProduct.quantity,
          new_quantity: currentProduct.quantity, // No change to sellable stock
          adjustment: 0,
          reason: `Return from Bill #${sale.reference_no}`,
          adjusted_by: "System",
        });
      }
    }

    // 3. Create Credit Note Transaction (Financial)
    createTransaction({
      type: "credit_note",
      bill_id: saleId,
      bill_type: "sale",
      entity_id: sale.customer_id,
      entity_type: "customer",
      transaction_date: new Date().toISOString().split("T")[0],
      amount: totalRefundAmount,
      payment_mode: "Cash", // Or 'Refund'
      status: "completed",
      note: note || `Refund for Sale #${sale.reference_no}`,
      gst_amount: 0, // You might want to calculate proportional GST reversal here
    });

    // 4. Update Sale Status
    // If fully returned? 'returned'. If partial? 'partial_returned'.
    // For simplicity, let's just mark 'returned' or keep 'paid' but with a note.
    // Ideally, update the `status` column.
    db.prepare("UPDATE sales SET status = 'returned' WHERE id = ?").run(saleId);

    return { success: true, refundAmount: totalRefundAmount };
  });

  return transaction();
}

/* -------------------------------------------------------------------------- */
/* SALE REPOSITORY FUNCTIONS                                                  */
/* -------------------------------------------------------------------------- */

/**
 * @description Retrieves a sale and its associated items by ID.
 * @param {number} saleId - The ID of the sale to retrieve.
 * @returns {object|null} The sale object with a nested array of items, or null if not found.
 * @throws {Error} If fetching the sale fails.
 */

export function getSaleWithItemsById(saleId) {
  try {
    // 💡 Fetch the main sale record. This should be a synchronous operation.
    const saleStmt = db.prepare(`
      SELECT
        s.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.address AS customer_address,
        c.city as customer_city,
        c.state as customer_state,
        c.pincode as customer_pincode,
        c.gst_no AS customer_gst_no
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `);
    const sale = saleStmt.get(saleId);

    // 💡 If the sale doesn't exist, return null early.
    if (!sale) {
      return null;
    }

    // 💡 Fetch the related sale items.
    const itemsStmt = db.prepare(`
      SELECT
        si.*,
        p.name AS product_name,
        p.product_code,
        p.hsn,
        p.brand,
        p.mrp,
        p.mop,
        p.barcode
      FROM sales_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
      ORDER BY si.sr_no ASC
    `);
    const items = itemsStmt.all(saleId);

    // 💡 Return the combined object.
    return { ...sale, items };
  } catch (error) {
    console.error(" Failed to fetch sale with items:", error.message);
    // 💡 Re-throw a custom error for better debugging upstream.
    throw new Error("Failed to fetch sale with items: " + error.message);
  }
}

/**
 * @description Fetches all sales within a date range, including their items and customer details, structured for PDF export.
 * @param {object} filters - Contains startDate and endDate.
 * @returns {Array} An array of complete sale objects, each with a nested 'items' array.
 */
export function getSalesForPDFExport(filters) {
  // 1. Fetch the main sale and customer data for the given period
  const sales = db
    .prepare(
      `
    SELECT
      s.*,
      COALESCE(c.name, 'Walk-in Customer') as customer_name,
      c.address as customer_address,
      c.city as customer_city,
      c.state as customer_state,
      c.pincode as customer_pincode,
      c.phone as customer_phone,
      c.gst_no as customer_gst_no
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE date(s.created_at) BETWEEN @startDate AND @endDate
      AND s.is_quote = 0
  `
    )
    .all(filters);

  if (sales.length === 0) {
    return [];
  }

  // 2. Fetch all related sales items in a single query for efficiency
  const saleIds = sales.map((s) => s.id);
  const items = db
    .prepare(
      `
    SELECT
      si.*,
      p.name as product_name,
      p.hsn
    FROM sales_items si
    JOIN products p ON si.product_id = p.id
    WHERE si.sale_id IN (${saleIds.map(() => "?").join(",")})
  `
    )
    .all(...saleIds);

  // 3. Map the items back to their parent sales
  return sales.map((sale) => ({
    ...sale,
    items: items.filter((item) => item.sale_id === sale.id),
  }));
}

/* -------------------------- Update Sale BY ID
  Currently Not implemented . Updates for sale are bound for scrutiny
-------------------------- */
export async function updateSaleById(id, saleData) {
  const {
    reference_no,
    payment_mode,
    note,
    paid_amount,
    total_amount,
    status,
    customer_id,
  } = saleData;

  // Update main sale record
  await db.run(
    `
    UPDATE sales
    SET reference_no = ?, payment_mode = ?, note = ?, paid_amount = ?, total_amount = ?, status = ?, customer_id = ?
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
      id,
    ]
  );

  // Remove old sale items and re-insert new ones
  await db.run(`DELETE FROM sale_items WHERE sale_id = ?`, [id]);

  if (saleData.items && saleData.items.length > 0) {
    for (const item of saleData.items) {
      await db.run(
        `
        INSERT INTO sale_items (sale_id, product_id, rate, quantity, gst_rate, discount, price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          item.product_id,
          item.rate,
          item.quantity,
          item.gst_rate,
          item.discount,
          item.price,
        ]
      );
    }
  }

  return getSaleById(id); // Re-fetch updated sale
}

/* -------------------------------------------------------------------------- */
/* SALE REPOSITORY FUNCTIONS                                                  */
/* -------------------------------------------------------------------------- */

/**
 * @description Retrieves a paginated list of sales for a data table.
 * @param {number} page - The current page number (1-based).
 * @param {number} limit - The number of records to return per page.
 * @returns {Array<object>} An array of sales records.
 * @throws {Error} If fetching sales fails.
 */
export function getPaginatedSales(page, limit) {
  try {
    const offset = (page - 1) * limit;
    const stmt = db.prepare(`
      SELECT * FROM sales
      WHERE status IN ('paid', 'pending', 'refunded', 'returned')
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    // The .all() method is synchronous, so no async/await is needed.
    return stmt.all(limit, offset);
  } catch (error) {
    console.error("Error in getPaginatedSales:", error.message);
    throw new Error("Failed to fetch paginated sales: " + error.message);
  }
}

/**
 * Updates the status of a sale in the database.
 * @param {number} id - The ID of the sale to update.
 * @param {string} status - The new status for the sale (e.g., 'paid', 'pending', 'refunded').
 * @returns {object} An object containing information about the changes.
 */
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

// In saleRepository.mjs
export function getExportableSalesData(filters) {
  const stmt = db.prepare(`
    SELECT
        s.reference_no,
        date(s.created_at) as invoice_date,
        COALESCE(c.name, 'Walk-in Customer') as customer_name,
        p.name as product_name,
        si.quantity,
        si.rate,
        si.price
    FROM sales_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE date(s.created_at) BETWEEN @startDate AND @endDate
      AND s.is_quote = 0
    ORDER BY s.created_at DESC
  `);
  return stmt.all(filters);
}

/**
 * @description Retrieves sales for a customer, with date filters, search, and pagination.
 * @param {number} customerId - The ID of the customer.
 * @param {object} filters - An object containing filter, date, search, and pagination options.
 * @returns {object} An object containing the paginated sales and the total count.
 * @throws {Error} If fetching customer sales fails.
 */
export function getSalesForCustomer(customerId, filters = {}) {
  try {
    if (!customerId) {
      throw new Error("Customer ID is required.");
    }

    // ✅ Destructure all parameters from the single 'filters' object with defaults
    const {
      page = 1,
      limit = 10,
      query = "",
      filter,
      startDate,
      endDate,
    } = filters;

    const offset = (page - 1) * limit;

    // ✅ Get the date filtering clause from the utility function
    const { where: dateWhere, params: dateParams } = getDateFilter({
      filter,
      from: startDate,
      to: endDate,
      alias: "s", // Use 's' as the alias for the sales table
    });

    // --- Build dynamic WHERE clauses and parameters ---
    const whereClauses = ["s.customer_id = ?"];
    const params = [customerId];

    // Add date filter if it's not the default '1=1'
    if (dateWhere !== "1=1") {
      whereClauses.push(dateWhere);
      params.push(...dateParams);
    }

    // Add search query filter if a query is provided
    if (query) {
      whereClauses.push(`s.reference_no LIKE ?`);
      params.push(`%${query}%`);
    }

    const finalWhereClause = whereClauses.join(" AND ");

    // --- Construct the final SQL queries ---

    const salesQuery = `
      SELECT
        s.id,
        s.reference_no,
        s.created_at,
        s.total_amount,
        s.paid_amount,
        s.status,
        GROUP_CONCAT(p.name || ' (' || si.quantity || ')', '; ') AS items_summary
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

    // Execute queries with the correct parameters
    const sales = salesStmt.all(...params, limit, offset);
    const { total_count } = totalCountStmt.get(...params);

    return { sales, totalCount: total_count };
  } catch (error) {
    console.error("Error in getSalesForCustomer:", error.message);
    throw new Error("Failed to fetch customer sales: " + error.message);
  }
}

/**
 * @description Retrieves a sale by ID, excluding soft-deleted sales.
 * @param {number} saleId - The ID of the sale to retrieve.
 * @returns {object|null} The sale object or null if not found or deleted.
 * @throws {Error} If fetching the sale fails.
 */
export function getSaleById(saleId) {
  try {
    const stmt = db.prepare(
      `SELECT * FROM sales WHERE id = ? AND status != 'deleted'`
    );
    return stmt.get(saleId);
  } catch (err) {
    console.error("Error in getSaleById:", err.message);
    throw new Error("Failed to fetch sale by ID: " + err.message);
  }
}

// --------------------------------------------------------------------------

/**
 * @description Soft-deletes a sale by updating its status to 'deleted'.
 * @param {number} saleId - The ID of the sale to soft-delete.
 * @returns {object} The result of the database operation.
 * @throws {Error} If the soft-delete operation fails.
 */
export function deleteSale(saleId) {
  try {
    const stmt = db.prepare(`UPDATE sales SET status = 'deleted' WHERE id = ?`);
    return stmt.run(saleId);
  } catch (err) {
    console.error("Error in deleteSale:", err.message);
    throw new Error("Failed to soft-delete sale: " + err.message);
  }
}

/**
 * @description Retrieves a summary of sales (total count and amount) within a date range,
 * considering only 'paid' and 'pending' sales.
 * @param {string} start - The start date in 'YYYY-MM-DD' format.
 * @param {string} end - The end date in 'YYYY-MM-DD' format.
 * @returns {object} An object with total sales count and total amount, or a default object if no records are found.
 * @throws {Error} If fetching the sales summary fails.
 */
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

/**
 * @description Searches for sales by a case-insensitive reference number.
 * @param {string} query - The search query for the reference number.
 * @returns {Array<object>} An array of matching sales records.
 * @throws {Error} If the search fails.
 */
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

// --------------------------------------------------------------------------

/**
 * @description Deletes all sales items linked to a specific sale_id.
 * @param {number} saleId - The ID of the sale.
 * @returns {object} The result of the database operation.
 * @throws {Error} If deletion fails.
 */
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
