import db from "../db/db.mjs";
import { getDateFilter } from "../utils/dateFilter.mjs";
import { generateReference as generateTransactionReference } from "./referenceRepository.mjs";

/**
 * @description Maps a full transaction type name to its abbreviated reference type.
 */
function mapTransactionTypeToReferenceType(transactionType) {
  const map = {
    payment_in: "PI",
    payment_out: "PO",
    credit_note: "CN",
    debit_note: "DN",
  };
  if (!map[transactionType]) {
    throw new Error(`Unknown transaction type: ${transactionType}`);
  }
  return map[transactionType];
}

/**
 * @description Creates a new transaction record in the database.
 */
export function createTransaction(transactionData) {
  try {
    const stmt = db.prepare(`
      INSERT INTO transactions (
        reference_no, type, bill_id, bill_type, entity_id, entity_type,
        transaction_date, amount, payment_mode, status, note, gst_amount, discount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const refType = mapTransactionTypeToReferenceType(transactionData.type);
    const reference_no = generateTransactionReference(refType);

    // Ensure defaults
    const status = transactionData.status || "success";
    const gstAmount = transactionData.gst_amount || 0;
    const discount = transactionData.discount || 0;

    const result = stmt.run(
      reference_no,
      transactionData.type,
      transactionData.bill_id,
      transactionData.bill_type,
      transactionData.entity_id,
      transactionData.entity_type,
      transactionData.transaction_date,
      transactionData.amount,
      transactionData.payment_mode,
      status,
      transactionData.note,
      gstAmount,
      discount
    );

    return result;
  } catch (error) {
    console.error("Repo Error: createTransaction", error.message);
    throw new Error("Database insert failed: " + error.message);
  }
}

/**
 * @description Retrieves a paginated list of transactions with robust joining.
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
    let params = [...dateParams];

    // Exclude deleted by default unless specifically asked (future proofing)
    whereClauses.push("t.status != 'deleted'");

    if (query) {
      whereClauses.push(
        `(LOWER(t.reference_no) LIKE ? OR LOWER(t.note) LIKE ? OR LOWER(COALESCE(c.name, sup.name)) LIKE ?)`
      );
      const q = `%${query.toLowerCase()}%`;
      params.push(q, q, q);
    }

    if (type && type !== "all") {
      whereClauses.push(`t.type = ?`);
      params.push(type);
    }

    if (status) {
      whereClauses.push(`t.status = ?`);
      params.push(status);
    }

    const whereString = whereClauses.join(" AND ");

    // Main Query
    let recordsQuery = `
      SELECT 
        t.*,
        COALESCE(c.name, sup.name) as entity_name,
        COALESCE(c.phone, sup.phone) as entity_phone,
        CASE 
          WHEN t.bill_type = 'sale' THEN s.reference_no
          WHEN t.bill_type = 'sale_non_gst' THEN sng.reference_no
          WHEN t.bill_type = 'purchase' THEN p.reference_no
          ELSE NULL
        END as bill_ref_no
      FROM transactions AS t
      LEFT JOIN customers c ON t.entity_type = 'customer' AND t.entity_id = c.id
      LEFT JOIN suppliers sup ON t.entity_type = 'supplier' AND t.entity_id = sup.id
      LEFT JOIN sales s ON t.bill_type = 'sale' AND t.bill_id = s.id
      LEFT JOIN sales_non_gst sng ON t.bill_type = 'sale_non_gst' AND t.bill_id = sng.id
      LEFT JOIN purchases p ON t.bill_type = 'purchase' AND t.bill_id = p.id
      WHERE ${whereString}
      ORDER BY t.created_at DESC
    `;

    // Count Query
    const countQuery = `
      SELECT COUNT(t.id) AS count 
      FROM transactions AS t
      LEFT JOIN customers c ON t.entity_type = 'customer' AND t.entity_id = c.id
      LEFT JOIN suppliers sup ON t.entity_type = 'supplier' AND t.entity_id = sup.id
      WHERE ${whereString}
    `;

    const totalRecords = db.prepare(countQuery).get(...params).count;

    if (!all) {
      recordsQuery += ` LIMIT ? OFFSET ?`;
      params.push(limit, (page - 1) * limit);
    }

    const records = db.prepare(recordsQuery).all(...params);

    return { records, totalRecords };
  } catch (error) {
    throw new Error("Repo Error: getAllTransactions " + error.message);
  }
}

/**
 * @description Retrieves a single transaction by ID.
 */
export function getTransactionById(id) {
  try {
    const stmt = db.prepare(`
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
      WHERE t.id = ? AND t.status != 'deleted'
    `);

    return stmt.get(id);
  } catch (error) {
    throw new Error("Repo Error: getTransactionById " + error.message);
  }
}

/**
 * @description Gets all transactions for a specific bill (e.g., all payments for Sale #101).
 */
export function getTransactionsByRelatedId(billId, billType) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM transactions
      WHERE bill_id = ? AND bill_type = ? AND status != 'deleted'
      ORDER BY created_at ASC
    `);
    return stmt.all(billId, billType);
  } catch (error) {
    throw new Error("Repo Error: getTransactionsByRelatedId " + error.message);
  }
}

/**
 * @description Updates a transaction record.
 */
export function updateTransaction(id, updatedData) {
  try {
    const fields = Object.keys(updatedData);
    if (fields.length === 0) return { changes: 0 };

    const setClause = fields.map((field) => `${field} = ?`).join(", ");
    const params = Object.values(updatedData);
    params.push(id);

    const stmt = db.prepare(
      `UPDATE transactions SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    );
    return stmt.run(...params);
  } catch (error) {
    throw new Error("Repo Error: updateTransaction " + error.message);
  }
}

/**
 * @description Soft deletes a transaction.
 */
export function deleteTransaction(id) {
  try {
    return db
      .prepare(
        "UPDATE transactions SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .run(id);
  } catch (error) {
    throw new Error("Repo Error: deleteTransaction " + error.message);
  }
}

// --- Reporting / Summary Functions ---

export function getCustomerAccountSummary(customerId, filters = {}) {
  try {
    // 1. Total Sales
    const { where: sWhere, params: sParams } = getDateFilter({
      ...filters,
      alias: "s",
    });
    const salesStmt = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(id) as count
      FROM sales s
      WHERE customer_id = ? AND status != 'cancelled' AND is_quote = 0 AND ${sWhere}
    `);
    const sales = salesStmt.get(customerId, ...sParams);

    // 2. Transactions (Payments In + Credit Notes)
    const { where: tWhere, params: tParams } = getDateFilter({
      ...filters,
      alias: "t",
    });
    const transStmt = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'payment_in' THEN amount ELSE 0 END), 0) as paid,
        COALESCE(SUM(CASE WHEN type = 'credit_note' THEN amount ELSE 0 END), 0) as credit
      FROM transactions t
      WHERE entity_id = ? AND entity_type = 'customer' AND status != 'deleted' AND ${tWhere}
    `);
    const trans = transStmt.get(customerId, ...tParams);

    const outstanding = sales.total - (trans.paid + trans.credit);

    return {
      total_sales: sales.total,
      total_invoices: sales.count,
      total_paid: trans.paid,
      total_credit_notes: trans.credit,
      outstanding_balance: outstanding > 0 ? outstanding : 0, // Ensure no negative balance shown (unless deliberate overpayment)
    };
  } catch (error) {
    throw new Error("Repo Error: getCustomerAccountSummary " + error.message);
  }
}

export function getSupplierAccountSummary(supplierId, filters = {}) {
  try {
    // 1. Total Purchases
    const { where: pWhere, params: pParams } = getDateFilter({
      ...filters,
      alias: "p",
    });
    const purStmt = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(id) as count
      FROM purchases p
      WHERE supplier_id = ? AND status != 'cancelled' AND ${pWhere}
    `);
    const purchases = purStmt.get(supplierId, ...pParams);

    // 2. Transactions
    const { where: tWhere, params: tParams } = getDateFilter({
      ...filters,
      alias: "t",
    });
    const transStmt = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'payment_out' THEN amount ELSE 0 END), 0) as paid,
        COALESCE(SUM(CASE WHEN type = 'debit_note' THEN amount ELSE 0 END), 0) as debit
      FROM transactions t
      WHERE entity_id = ? AND entity_type = 'supplier' AND status != 'deleted' AND ${tWhere}
    `);
    const trans = transStmt.get(supplierId, ...tParams);

    const outstanding = purchases.total - (trans.paid + trans.debit);

    return {
      total_purchases: purchases.total,
      total_bills: purchases.count,
      total_paid: trans.paid,
      total_debit_notes: trans.debit,
      outstanding_balance: outstanding > 0 ? outstanding : 0,
    };
  } catch (error) {
    throw new Error("Repo Error: getSupplierAccountSummary " + error.message);
  }
}

export function getEntityTransactions(filters) {
  // Implementation uses getAllTransactions logic but strict filter
  // Reuse getAllTransactions logic manually or call it?
  // Let's implement specific optimized query
  try {
    const { entityId, entityType, page = 1, limit = 20, all = false } = filters;

    // ... reusing standard structure ...
    let where = "entity_id = ? AND entity_type = ? AND status != 'deleted'";
    let params = [entityId, entityType];

    // Count
    const count = db
      .prepare(`SELECT COUNT(*) as c FROM transactions WHERE ${where}`)
      .get(...params).c;

    // Fetch
    let sql = `SELECT * FROM transactions WHERE ${where} ORDER BY created_at DESC`;
    if (!all) {
      sql += " LIMIT ? OFFSET ?";
      params.push(limit, (page - 1) * limit);
    }

    const records = db.prepare(sql).all(...params);
    return { records, totalRecords: count };
  } catch (e) {
    throw new Error("Repo Error: " + e.message);
  }
}
