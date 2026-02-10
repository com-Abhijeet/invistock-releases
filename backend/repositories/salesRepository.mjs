import db from "../db/db.mjs";
import { getDateFilter } from "../utils/dateFilter.mjs";
import { normalizeBooleans } from "../utils/normalizeBooleans.mjs";
import * as ProductRepo from "../repositories/productRepository.mjs";
import * as AdjustmentRepo from "../repositories/stockAdjustmentRepository.mjs";
import * as BatchRepo from "../repositories/batchRepository.mjs";
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
  console.log(saleData);
  try {
    const runTransaction = db.transaction(() => {
      // Create the sale record
      const saleStmt = db.prepare(`
        INSERT INTO sales (
          customer_id, reference_no, payment_mode, paid_amount, total_amount,
          note, status, discount, is_reverse_charge, is_ecommerce_sale, is_quote, employee_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        employee_id,
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
        normalised_is_quote,
        employee_id,
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
            item.price,
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
      // item expectation: { product_id, quantity, price, returnToStock, sales_item_id }
      // sales_item_id is crucial to identify exactly WHICH serial/batch was returned

      // A. Calculate Refund Amount
      totalRefundAmount += item.price;

      // B. Get Master Product Details
      const currentProduct = ProductRepo.getProductById(item.product_id);
      if (!currentProduct) continue; // Skip if product deleted/invalid

      // C. Retrieve Batch/Serial Context from original Sales Item
      let batchId = null;
      let serialId = null;

      if (item.sales_item_id) {
        const saleItem = db
          .prepare("SELECT batch_id, serial_id FROM sales_items WHERE id = ?")
          .get(item.sales_item_id);
        if (saleItem) {
          batchId = saleItem.batch_id;
          serialId = saleItem.serial_id;
        }
      } else {
        // Fallback: Try to find a matching sales item (less precise for batches)
        const saleItem = db
          .prepare(
            "SELECT batch_id, serial_id FROM sales_items WHERE sale_id = ? AND product_id = ? LIMIT 1",
          )
          .get(saleId, item.product_id);
        if (saleItem) {
          batchId = saleItem.batch_id;
          serialId = saleItem.serial_id;
        }
      }

      // D. Inventory & Status Updates
      if (item.returnToStock) {
        // --- Option 1: Good condition -> Back to shelf ---

        // 1. Update Master Product Quantity
        const newQty = currentProduct.quantity + item.quantity;
        ProductRepo.updateProductQuantity(item.product_id, newQty);

        // 2. Update Batch Quantity
        if (batchId) {
          BatchRepo.updateBatchQuantity(batchId, item.quantity);
        }

        // 3. Update Serial Status
        if (serialId) {
          // Mark as available so it can be sold again
          BatchRepo.updateSerialStatus(serialId, "available");
        }

        // 4. Log Adjustment
        AdjustmentRepo.createAdjustmentLog({
          product_id: item.product_id,
          category: "Sales Return",
          old_quantity: currentProduct.quantity,
          new_quantity: newQty,
          adjustment: item.quantity,
          reason: `Restocked from Bill #${sale.reference_no}`,
          adjusted_by: "System",
          batch_id: batchId,
          serial_id: serialId,
        });
      } else {
        // --- Option 2: Damaged/Scrap ---

        // 1. Master Quantity: No Change (Item is not sellable)

        // 2. Batch Quantity: No Change (Item is not in sellable batch stock)

        // 3. Serial Status: Mark as 'returned' or 'defective'
        // This ensures it doesn't show up in "Available Serials" lists
        if (serialId) {
          BatchRepo.updateSerialStatus(serialId, "returned");
        }

        // 4. Log Adjustment
        // We log it so there is a record, even though net stock didn't change
        AdjustmentRepo.createAdjustmentLog({
          product_id: item.product_id,
          category: "Sales Return (Damaged)",
          old_quantity: currentProduct.quantity,
          new_quantity: currentProduct.quantity,
          adjustment: 0,
          reason: `Return (Damaged) from Bill #${sale.reference_no}`,
          adjusted_by: "System",
          batch_id: batchId,
          serial_id: serialId,
        });
      }
    }

    // 3. Create Credit Note Transaction (Financial)
    db.prepare(
      `
      INSERT INTO transactions (
        reference_no, type, bill_id, bill_type, entity_id, entity_type,
        transaction_date, amount, payment_mode, status, note, gst_amount, discount
      ) VALUES (
        ?, 'credit_note', ?, 'sale', ?, 'customer',
        ?, ?, ?, 'completed', ?, 0, 0
      )
    `,
    ).run(
      `CN-${Date.now()}`,
      saleId,
      sale.customer_id,
      new Date().toISOString().split("T")[0],
      totalRefundAmount,
      "Cash", // Default refund mode
      note || `Refund for Sale #${sale.reference_no}`,
    );

    // 4. Update Sale Status
    // Ideally check if fully returned, but for now mark as returned
    db.prepare("UPDATE sales SET status = 'returned' WHERE id = ?").run(saleId);

    return { success: true, refundAmount: totalRefundAmount };
  });

  return transaction();
}

/* -------------------------------------------------------------------------- */
/* SALE REPOSITORY FUNCTIONS                                                  */
/* -------------------------------------------------------------------------- */

/**
 * @description Retrieves a sale and its associated items by ID, reconciling payment status with transactions.
 * @param {number} saleId - The ID of the sale to retrieve.
 * @returns {object|null} The sale object with a nested array of items and payment summary, or null if not found.
 * @throws {Error} If fetching the sale fails.
 */
export function getSaleWithItemsById(saleId) {
  try {
    const saleStmt = db.prepare(`
      SELECT
        s.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.address AS customer_address,
        c.city as customer_city,
        c.state as customer_state,
        c.pincode as customer_pincode,
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
        si.*, p.name AS product_name, p.product_code, p.hsn,
        pb.batch_number, ps.serial_number
      FROM sales_items si
      LEFT JOIN products p ON si.product_id = p.id
      LEFT JOIN product_batches pb ON si.batch_id = pb.id
      LEFT JOIN product_serials ps ON si.serial_id = ps.id
      WHERE si.sale_id = ?
      ORDER BY si.sr_no ASC
    `);
    const items = itemsStmt.all(saleId);

    /**
     * FINANCIAL RECONCILIATION LOGIC
     * total_paid: (Inflows) - (Outflows/Refunds)
     * total_credit_notes: Reductions in bill value (Returns)
     */
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
    const creditNotes = transactionResult?.total_credit_notes || 0; // Stored as positive in DB, but reduces payable

    // Net Payable = Original Total - Returns/Credit Notes
    // Note: If you store credit notes as positive amounts in your transaction table,
    // you should subtract them here.
    const netPayable = (sale.total_amount || 0) - Math.abs(creditNotes);
    const balance = netPayable - reconciledPaid;

    // Standard accounting tolerance (0.9) to handle tiny rounding issues
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
      // Root properties updated for UI consistency
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
  `,
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
  `,
    )
    .all(...saleIds);

  // 3. Map the items back to their parent sales
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
  } = saleData;

  const {
    is_reverse_charge: normalised_is_reverse_charge,
    is_ecommerce_sale: normalised_is_ecommerce_sale,
    is_quote: normalised_is_quote,
  } = normalizeBooleans({ is_reverse_charge, is_ecommerce_sale, is_quote });

  const stmt = db.prepare(`
    UPDATE sales SET 
      customer_id = ?, reference_no = ?, payment_mode = ?, paid_amount = ?, 
      total_amount = ?, note = ?, status = ?, discount = ?, 
      is_reverse_charge = ?, is_ecommerce_sale = ?, is_quote = ?, employee_id = ?,
      updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `);

  return stmt.run(
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
    normalised_is_quote,
    employee_id || null,
    id,
  );
}

/**
 * @description Fully replaces items for a sale.
 */
export function replaceSaleItems(saleId, items) {
  const deleteStmt = db.prepare("DELETE FROM sales_items WHERE sale_id = ?");
  deleteStmt.run(saleId);

  const insertStmt = db.prepare(`
    INSERT INTO sales_items (
      sale_id, product_id, sr_no, rate, quantity, gst_rate, discount, price, batch_id, serial_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of items) {
    insertStmt.run(
      saleId,
      item.product_id,
      item.sr_no,
      item.rate,
      item.quantity,
      item.gst_rate,
      item.discount,
      item.price,
      item.batch_id || null,
      item.serial_id || null,
    );
  }
}

/**
 * @description Updates specific fields of a sale record.
 * @param {number} id - The ID of the sale to update.
 * @param {object} updates - Key-value pairs of fields to update (e.g., { status: 'paid', paid_amount: 500 }).
 * @returns {object} Result of the update operation (changes count).
 */
export function updateSale(id, updates) {
  try {
    const keys = Object.keys(updates);

    // If no fields to update, return early
    if (keys.length === 0) {
      return { changes: 0 };
    }

    // specific field validation/sanitization can go here if needed
    // e.g. prevent updating 'id' or 'created_at' if passed in updates

    const setClause = keys.map((key) => `${key} = ?`).join(", ");
    const values = Object.values(updates);

    // Add id to the end of values array for the WHERE clause
    values.push(id);

    const stmt = db.prepare(
      `UPDATE sales SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    );

    const result = stmt.run(...values);
    return result;
  } catch (error) {
    console.error("Repo Error: updateSale", error.message);
    throw new Error("Failed to update sale: " + error.message);
  }
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
    ],
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
        ],
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
        p.hsn as hsn,
        si.quantity,
        si.rate,
        si.price,
        si.gst_rate,
        si.discount
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

    // ✅ Destructure 'all' along with other parameters
    const {
      page = 1,
      limit = 10,
      query = "",
      filter,
      startDate,
      endDate,
      all, // boolean: if true, ignore date filtering
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

    // ✅ UPDATED: Only add date filter if 'all' is FALSE and the filter is not default
    if (!all && dateWhere !== "1=1") {
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
      `SELECT * FROM sales WHERE id = ? AND status != 'deleted'`,
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
