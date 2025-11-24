import db from "../db/db.mjs";
import { getDateFilter } from "../utils/dateFilter.mjs";
import { generateReference as generateTransactionReference } from "./referenceRepository.mjs";

/**
 * @description Maps a full transaction type name to its abbreviated reference type.
 * @param {string} transactionType - The transaction type (e.g., 'payment_in', 'credit_note').
 * @returns {string} The corresponding abbreviated type for the reference generator (e.g., 'PI', 'CN').
 * @throws {Error} If an unknown transaction type is provided.
 */
function mapTransactionTypeToReferenceType(transactionType) {
  switch (transactionType) {
    case "payment_in":
      return "PI";
    case "payment_out":
      return "PO";
    case "credit_note":
      return "CN";
    case "debit_note":
      return "DN";
    default:
      throw new Error(
        `Unknown transaction type for reference generation: ${transactionType}`
      );
  }
}

/**
 * @description Creates a new transaction record in the database.
 * @param {object} transactionData - The data for the new transaction.
 * @returns {object} The result of the database operation, including the last inserted ID.
 * @throws {Error} If transaction creation fails.
 */
export async function createTransaction(transactionData) {
  try {
    const stmt = db.prepare(`
      INSERT INTO transactions (
        reference_no, type, bill_id, bill_type, entity_id, entity_type,
        transaction_date, amount, payment_mode, status, note, gst_amount, discount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const refType = mapTransactionTypeToReferenceType(transactionData.type);

    const reference_no = generateTransactionReference(refType);

    const params = [
      reference_no,
      transactionData.type,
      transactionData.bill_id || null, // Updated to use bill_id
      transactionData.bill_type || null, // Updated to use bill_type
      transactionData.entity_id,
      transactionData.entity_type,
      transactionData.transaction_date,
      transactionData.amount,
      transactionData.payment_mode || null,
      transactionData.status,
      transactionData.note || null,
      transactionData.gst_amount || 0,
      transactionData.discount || 0,
    ];

    const result = stmt.run(...params);

    const transaction = await getTransactionById(result.lastInsertRowid);
    return transaction;
  } catch (error) {
    console.error("Error in createTransaction:", error.message);
    throw new Error("Transaction creation failed: " + error.message);
  }
}

/**
 * @description Retrieves a paginated list of transactions with optional filters.
 * @param {object} options - Filtering and pagination options.
 * @param {number} [options.page=1] - The page number to fetch.
 * @param {number} [options.limit=20] - The number of records per page.
 * @param {string} [options.query=''] - A search query for reference number or notes.
 * @param {string} [options.type=null] - Filters by transaction type ('sale', 'payment', etc.). Can also be 'all'.
 * @param {string} [options.status=null] - Filters by transaction status.
 * @param {string} [options.filter=null] - The date filter type ('today', 'month', etc.).
 * @param {string} [options.year=null] - The year for a 'year' filter.
 * @param {string} [options.startDate=null] - The start date for a 'custom' filter.
 * @param {string} [options.endDate=null] - The end date for a 'custom' filter.
 * @param {boolean} [options.all=false] - If true, fetches all records without pagination.
 * @returns {object} An object containing the filtered records and the total count.
 * @throws {Error} If fetching transactions fails.
 */
export function getAllTransactions({
  page = 1,
  limit = 20,
  query = "",
  type = null,
  status = null,
  filter = null,
  year = null,
  startDate = null,
  endDate = null,
  all = false,
}) {
  try {
    const { where: dateWhere, params: dateParams } = getDateFilter({
      filter,
      from: startDate,
      to: endDate,
      alias: "t",
    });

    let whereClauses = [dateWhere];
    const params = [...dateParams];

    // Filter by query (case-insensitive search on reference_no and note)
    if (query) {
      whereClauses.push(
        `(LOWER(t.reference_no) LIKE ? OR LOWER(t.note) LIKE ?)`
      );
      params.push(`%${query.toLowerCase()}%`, `%${query.toLowerCase()}%`);
    }

    // Filter by transaction type
    // Only apply the filter if 'type' is not 'all' or null
    if (type && type !== "all") {
      whereClauses.push(`t.type = ?`);
      params.push(type);
    }

    // Filter by status
    if (status) {
      whereClauses.push(`t.status = ?`);
      params.push(status);
    }

    const whereString =
      whereClauses
        .filter((clause) => clause && clause !== "1=1")
        .join(" AND ") || "1=1";

    const totalCountStmt = db.prepare(`
      SELECT COUNT(id) AS count FROM transactions AS t WHERE ${whereString}
    `);
    const totalRecords = totalCountStmt.get(...params).count;

    let recordsQuery = `
      SELECT * FROM transactions AS t
      WHERE ${whereString}
      ORDER BY t.created_at DESC
    `;

    const queryParams = [...params];

    if (!all) {
      const offset = (page - 1) * limit;
      recordsQuery += ` LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);
    }

    const recordsStmt = db.prepare(recordsQuery);
    const records = recordsStmt.all(...queryParams);

    return { records, totalRecords };
  } catch (error) {
    console.error("Error in getAllTransactions:", error.message);
    throw new Error("Failed to fetch all transactions: " + error.message);
  }
}

/**
 * @description Retrieves a single transaction record with all related details for printing a slip.
 * This includes customer/supplier data and all associated items.
 * @param {number} transactionId - The ID of the transaction to retrieve.
 * @returns {object|null} The detailed transaction object, or null if not found.
 * @throws {Error} If fetching the transaction fails.
 */
export function getTransactionById(transactionId) {
  try {
    const transactionStmt = db.prepare(`
            SELECT
                t.*,
                CASE t.entity_type
                    WHEN 'customer' THEN c.name
                    WHEN 'supplier' THEN s.name
                END AS entity_name,
                CASE t.entity_type
                    WHEN 'customer' THEN c.phone
                    WHEN 'supplier' THEN s.phone
                END AS entity_phone,
                CASE t.entity_type
                    WHEN 'customer' THEN c.address
                    WHEN 'supplier' THEN s.address
                END AS entity_address
            FROM transactions t
            LEFT JOIN customers c ON t.entity_type = 'customer' AND t.entity_id = c.id
            LEFT JOIN suppliers s ON t.entity_type = 'supplier' AND t.entity_id = s.id
            WHERE t.id = ?
        `);

    const transaction = transactionStmt.get(transactionId);
    if (!transaction) {
      return null;
    }

    // Fetch items based on transaction type (sale or purchase)
    let items = [];
    if (transaction.type === "sale" || transaction.type === "credit_note") {
      const itemsStmt = db.prepare(`
                SELECT
                    si.*,
                    p.name AS product_name,
                    p.product_code,
                    p.hsn
                FROM sale_items si
                JOIN products p ON si.product_id = p.id
                WHERE si.sale_transaction_id = ?
            `);
      items = itemsStmt.all(transactionId);
    } else if (
      transaction.type === "purchase" ||
      transaction.type === "debit_note"
    ) {
      const itemsStmt = db.prepare(`
                SELECT
                    pi.*,
                    p.name AS product_name,
                    p.product_code,
                    p.hsn
                FROM purchase_items pi
                JOIN products p ON pi.product_id = p.id
                WHERE pi.purchase_transaction_id = ?
            `);
      items = itemsStmt.all(transactionId);
    }

    return { ...transaction, items };
  } catch (error) {
    console.error("Error in getDetailedTransactionById:", error.message);
    throw new Error("Failed to fetch detailed transaction: " + error.message);
  }
}

/**
 * @description Retrieves all transactions related to a specific original sale or purchase.
 * @param {number} relatedId - The ID of the original transaction (sale or purchase).
 * @param {string} entityType - The type of the original transaction ('customer' or 'supplier').
 * @returns {Array<object>} An array of related transaction records.
 * @throws {Error} If fetching related transactions fails.
 */
export function getTransactionsByRelatedId(relatedId, entityType) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM transactions
      WHERE bill_id = ? AND entity_type = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(relatedId, entityType);
  } catch (error) {
    console.error("Error in getTransactionsByRelatedId:", error.message);
    throw new Error("Failed to fetch related transactions: " + error.message);
  }
}

/**
 * @description Updates an existing transaction record by its ID.
 * @param {number} id - The ID of the transaction to update.
 * @param {object} updatedData - The data to update.
 * @returns {object} The result of the database operation.
 * @throws {Error} If the update fails.
 */
export function updateTransaction(id, updatedData) {
  try {
    // Dynamically build the query based on provided fields
    const fields = Object.keys(updatedData);
    const setClause = fields.map((field) => `${field} = ?`).join(", ");
    const params = Object.values(updatedData);

    const stmt = db.prepare(`
      UPDATE transactions
      SET ${setClause}
      WHERE id = ?
    `);

    params.push(id);
    const result = stmt.run(...params);
    return result;
  } catch (error) {
    console.error("Error in updateTransaction:", error.message);
    throw new Error("Transaction update failed: " + error.message);
  }
}

/**
 * @description Soft-deletes a transaction by updating its status to 'deleted'.
 * @param {number} id - The ID of the transaction to soft-delete.
 * @returns {object} The result of the database operation.
 * @throws {Error} If the soft-delete operation fails.
 */
export function deleteTransaction(id) {
  try {
    const stmt = db.prepare(
      "UPDATE transactions SET status = 'deleted' WHERE id = ?"
    );
    return stmt.run(id);
  } catch (error) {
    console.error("Error in deleteTransaction:", error.message);
    throw new Error("Transaction soft-delete failed: " + error.message);
  }
}

/**
 * @description Retrieves a customer's account summary based on sales and transactions.
 * @param {number} customerId - The ID of the customer.
 * @param {object} [filters={}] - Optional date filters.
 * @returns {object} A summary including total sales, total paid, and outstanding balance.
 * @throws {Error} If fetching the data fails.
 */
export function getCustomerAccountSummary(customerId, filters = {}) {
  try {
    // 1. Get total sales (gross) from the sales table
    const { where: salesWhere, params: salesParams } = getDateFilter({
      filter: filters.filter,
      from: filters.startDate,
      to: filters.endDate,
      alias: "s",
    });
    const salesStmt = db.prepare(`
      SELECT 
        COALESCE(SUM(s.total_amount), 0) AS total_sales,
        COUNT(s.id) AS total_invoices
      FROM sales AS s
      WHERE s.customer_id = ? 
        AND ${salesWhere} 
        AND s.status NOT IN ('cancelled', 'refunded')
        AND s.is_quote = 0 
    `);
    const salesSummary = salesStmt.get(customerId, ...salesParams);

    // 2. Get total payments and credit notes from the transactions table
    const { where: transWhere, params: transParams } = getDateFilter({
      ...filters,
      alias: "t",
    });
    const transStmt = db.prepare(`
      SELECT
          COALESCE(SUM(CASE WHEN t.type = 'payment_in' THEN t.amount ELSE 0 END), 0) AS total_paid,
          COALESCE(SUM(CASE WHEN t.type = 'credit_note' THEN t.amount ELSE 0 END), 0) AS total_credit_notes
      FROM transactions AS t
      WHERE t.entity_id = ? AND t.entity_type = 'customer' AND ${transWhere} AND t.status NOT IN ('cancelled')
    `);
    const transSummary = transStmt.get(customerId, ...transParams);

    // 3. Calculate the final outstanding balance
    const outstanding_balance =
      salesSummary.total_sales -
      transSummary.total_paid +
      transSummary.total_credit_notes;

    return {
      total_sales: salesSummary.total_sales,
      total_paid: transSummary.total_paid,
      total_credit_notes: transSummary.total_credit_notes,
      total_invoices: salesSummary.total_invoices,
      outstanding_balance,
    };
  } catch (error) {
    console.error("Error in getCustomerAccountSummary:", error.message);
    throw new Error("Failed to get customer account summary.");
  }
}

/**
 * @description Retrieves a supplier's account summary based on purchases and transactions.
 * @param {number} supplierId - The ID of the supplier.
 * @param {object} [filters={}] - Optional date filters.
 * @returns {object} A summary including total purchases, total paid, and outstanding balance.
 * @throws {Error} If fetching the data fails.
 */
export function getSupplierAccountSummary(supplierId, filters = {}) {
  try {
    // 1. Get total purchases (gross) from the purchases table
    const { where: purchaseWhere, params: purchaseParams } = getDateFilter({
      ...filters,
      alias: "p",
    });
    const purchaseStmt = db.prepare(`
      SELECT COALESCE(SUM(p.total_amount), 0) AS total_purchases,
             COUNT(p.id) AS total_bills
      FROM purchases AS p
      WHERE p.supplier_id = ? AND ${purchaseWhere} AND p.status NOT IN ('cancelled', 'refunded')
    `);
    const purchaseSummary = purchaseStmt.get(supplierId, ...purchaseParams);

    // 2. Get total payments and debit notes from the transactions table
    const { where: transWhere, params: transParams } = getDateFilter({
      ...filters,
      alias: "t",
    });
    const transStmt = db.prepare(`
      SELECT
          COALESCE(SUM(CASE WHEN t.type = 'payment_out' THEN t.amount ELSE 0 END), 0) AS total_paid,
          COALESCE(SUM(CASE WHEN t.type = 'debit_note' THEN t.amount ELSE 0 END), 0) AS total_debit_notes
      FROM transactions AS t
      WHERE t.entity_id = ? AND t.entity_type = 'supplier' AND ${transWhere} AND t.status NOT IN ('cancelled')
    `);
    const transSummary = transStmt.get(supplierId, ...transParams);

    // 3. Calculate the final outstanding balance
    const outstanding_balance =
      purchaseSummary.total_purchases -
      transSummary.total_paid +
      transSummary.total_debit_notes;

    return {
      total_purchases: purchaseSummary.total_purchases,
      total_paid: transSummary.total_paid,
      total_debit_notes: transSummary.total_debit_notes,
      total_bills: purchaseSummary.total_bills,
      outstanding_balance,
    };
  } catch (error) {
    console.error("Error in getSupplierAccountSummary:", error.message);
    throw new Error("Failed to get supplier account summary.");
  }
}

/**
 * @description Retrieves a paginated list of transactions for a specific customer or supplier.
 * @param {object} options - Filtering and pagination options.
 * @param {number} options.entityId - The ID of the customer or supplier.
 * @param {string} options.entityType - The type of entity ('customer' or 'supplier').
 * @param {number} [options.page=1] - The page number to fetch.
 * @param {number} [options.limit=20] - The number of records per page.
 * @param {string} [options.query=''] - A search query for reference number or notes.
 * @param {string} [options.type=null] - Filters by transaction type.
 * @param {string} [options.status=null] - Filters by transaction status.
 * @param {string} [options.filter=null] - The date filter type ('today', 'month', etc.).
 * @param {string} [options.year=null] - The year for a 'year' filter.
 * @param {string} [options.startDate=null] - The start date for a 'custom' filter.
 * @param {string} [options.endDate=null] - The end date for a 'custom' filter.
 * @param {boolean} [options.all=false] - If true, fetches all records without pagination.
 * @returns {object} An object with records and total count.
 * @throws {Error} If fetching transactions fails.
 */
export function getEntityTransactions({
  entityId,
  entityType,
  page = 1,
  limit = 20,
  query = "",
  type = null,
  status = null,
  filter = null,
  year = null,
  startDate = null,
  endDate = null,
  all = false,
}) {
  try {
    const { where: dateWhere, params: dateParams } = getDateFilter({
      filter,
      from: startDate,
      to: endDate,
      alias: "t",
    });

    let whereClauses = [`t.entity_id = ?`, `t.entity_type = ?`, dateWhere];
    const params = [entityId, entityType, ...dateParams];

    if (query) {
      whereClauses.push(
        `(LOWER(t.reference_no) LIKE ? OR LOWER(t.note) LIKE ?)`
      );
      params.push(`%${query.toLowerCase()}%`, `%${query.toLowerCase()}%`);
    }
    if (type && type !== "all") {
      whereClauses.push(`t.type = ?`);
      params.push(type);
    }
    if (status) {
      whereClauses.push(`t.status = ?`);
      params.push(status);
    }

    const whereString =
      whereClauses
        .filter((clause) => clause && clause !== "1=1")
        .join(" AND ") || "1=1";

    const totalCountStmt = db.prepare(
      `SELECT COUNT(id) AS count FROM transactions AS t WHERE ${whereString}`
    );
    const totalRecords = totalCountStmt.get(...params).count;

    let recordsQuery = `
      SELECT * FROM transactions AS t
      WHERE ${whereString}
      ORDER BY t.created_at DESC
    `;
    const queryParams = [...params];

    if (!all) {
      const offset = (page - 1) * limit;
      recordsQuery += ` LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);
    }

    const recordsStmt = db.prepare(recordsQuery);
    const records = recordsStmt.all(...queryParams);

    return { records, totalRecords };
  } catch (error) {
    console.error("Error in getEntityTransactions:", error.message);
    throw new Error("Failed to fetch entity transactions: " + error.message);
  }
}
