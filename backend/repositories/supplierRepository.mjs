import db from "../db/db.mjs";
import { getDateFilter } from "../utils/dateFilter.mjs";

/**
 * @description Inserts a new supplier record into the database.
 * @param {object} supplierData An object containing the supplier's details.
 * @returns {object} The newly created supplier object, including its new ID.
 * @throws {Error} Throws an error if the database insertion fails.
 */
export function createSupplier(supplierData) {
  try {
    const {
      name,
      contact_person = null,
      phone = null,
      email = null,
      address = null,
      city = null,
      state = null,
      pincode = null,
      gst_number = null,
      supplier_type = "local",
      bank_account = null,
      ifsc_code = null,
      upi_id = null,
      notes = null,
    } = supplierData;

    const stmt = db.prepare(`
      INSERT INTO suppliers (
        name, contact_person, phone, email, address, city, state, pincode,
        gst_number, supplier_type, bank_account, ifsc_code, upi_id, notes
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    const info = stmt.run(
      name,
      contact_person,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      gst_number,
      supplier_type,
      bank_account,
      ifsc_code,
      upi_id,
      notes,
    );

    return { id: info.lastInsertRowid, ...supplierData };
  } catch (error) {
    console.error("Error in createSupplier repository:", error.message);
    throw new Error(
      `Database error: Could not create supplier. ${error.message}`,
    );
  }
}

export async function getAllSuppliers() {
  return await db.prepare("SELECT * FROM suppliers").all();
}

export function getSupplierById(id) {
  return db.prepare("SELECT * FROM suppliers WHERE id = ?").get(id);
}

export function updateSupplier(id, data) {
  // ✅ Removed deprecated total_supplied_amount and total_paid_amount
  // ✅ Added city, state, pincode correctly mapped
  const stmt = db.prepare(`
    UPDATE suppliers SET
      name = ?, contact_person = ?, phone = ?, email = ?, address = ?,
      city = ?, state = ?, pincode = ?, gst_number = ?, supplier_type = ?, 
      bank_account = ?, ifsc_code = ?, upi_id = ?, notes = ?, updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `);

  const result = stmt.run(
    data.name,
    data.contact_person,
    data.phone,
    data.email,
    data.address,
    data.city,
    data.state,
    data.pincode,
    data.gst_number,
    data.supplier_type,
    data.bank_account,
    data.ifsc_code,
    data.upi_id,
    data.notes,
    id,
  );

  return result.changes;
}

export function deleteSupplier(id) {
  return db.prepare("DELETE FROM suppliers WHERE id = ?").run(id).changes;
}

/**
 * Fetches a complete financial ledger for a supplier, grouped by purchase bill.
 * @param {number} supplierId The supplier's ID.
 * @param {object} filters Date filters (startDate, endDate).
 * @returns {object} An object containing the supplier details and their purchase/transaction history.
 */
export function getSupplierLedger(supplierId, filters) {
  // 1. Get the supplier's details
  const supplier = db
    .prepare("SELECT * FROM suppliers WHERE id = ?")
    .get(supplierId);
  if (!supplier) throw new Error("Supplier not found");

  // 2. Build date filter for purchases table
  const { where: dateWhere, params: dateParams } = getDateFilter({
    from: filters.startDate,
    to: filters.endDate,
    alias: "p",
  });

  // Ensure the generic date filter maps to the correct schema column 'date'
  const safeDateWhere = dateWhere.replace(/created_at/g, "date");

  // 3. Fetch all purchases using exact schema logic
  const allPurchases = db
    .prepare(
      `
    SELECT
      id,
      date AS bill_date,
      reference_no,
      total_amount,
      paid_amount,
      (total_amount - paid_amount) AS amount_pending,
      'purchase' AS bill_type
    FROM purchases p
    WHERE supplier_id = ? AND status != 'cancelled' AND ${safeDateWhere}
    ORDER BY date DESC
  `,
    )
    .all(supplierId, ...dateParams);

  // 4. Update the payments query (payment_out for suppliers)
  const getPaymentsStmt = db.prepare(`
    SELECT transaction_date, amount, payment_mode
    FROM transactions
    WHERE bill_id = ? AND bill_type = ? AND type = 'payment_out'
    ORDER BY transaction_date ASC
  `);

  // 5. Map over the list to attach transactions
  const ledger = allPurchases.map((purchase) => {
    const transactions = getPaymentsStmt.all(purchase.id, purchase.bill_type);
    return {
      ...purchase,
      transactions,
    };
  });

  return { supplier, ledger };
}

export async function getSuppliersWithFinancials({
  page = 1,
  limit = 20,
  query = "",
  sortBy = "name",
  sortOrder = "asc",
}) {
  const offset = (page - 1) * limit;
  let whereClause = "1=1";
  const params = [];

  if (query) {
    whereClause += " AND (s.name LIKE ? OR s.phone LIKE ?)";
    params.push(`%${query}%`, `%${query}%`);
  }

  const purchasesSubquery = `
    SELECT 
      supplier_id,
      COUNT(id) as total_bills,
      COALESCE(SUM(total_amount), 0) as total_purchased,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as total_bills_paid
    FROM purchases
    WHERE status != 'cancelled'
    GROUP BY supplier_id
  `;

  const transSubquery = `
    SELECT 
      entity_id,
      COALESCE(SUM(CASE WHEN type = 'payment_out' THEN amount WHEN type = 'payment_in' THEN -amount ELSE 0 END), 0) as total_amount_paid,
      COALESCE(SUM(CASE WHEN type = 'debit_note' THEN amount ELSE 0 END), 0) as total_debit_notes
    FROM transactions
    WHERE entity_type = 'supplier' 
      AND status != 'deleted' 
      AND type IN ('payment_in', 'payment_out', 'debit_note')
    GROUP BY entity_id
  `;

  const sql = `
    SELECT 
      s.id, 
      s.name, 
      s.phone, 
      s.city,
      COALESCE(p_stats.total_bills, 0) as total_bills,
      COALESCE(p_stats.total_purchased, 0) as total_purchased,
      COALESCE(p_stats.total_bills_paid, 0) as total_bills_paid,
      COALESCE(t_stats.total_amount_paid, 0) as total_amount_paid,
      ((COALESCE(p_stats.total_purchased, 0) - COALESCE(t_stats.total_debit_notes, 0)) - COALESCE(t_stats.total_amount_paid, 0)) as total_overdue,
      CASE 
        WHEN (COALESCE(p_stats.total_purchased, 0) - COALESCE(t_stats.total_debit_notes, 0)) <= 0 THEN 0
        ELSE ROUND((COALESCE(t_stats.total_amount_paid, 0) * 100.0) / (COALESCE(p_stats.total_purchased, 0) - COALESCE(t_stats.total_debit_notes, 0)), 2)
      END as payment_percentage
    FROM suppliers s
    LEFT JOIN (${purchasesSubquery}) p_stats ON s.id = p_stats.supplier_id
    LEFT JOIN (${transSubquery}) t_stats ON s.id = t_stats.entity_id
    WHERE ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);

  const countSql = `SELECT COUNT(*) as count FROM suppliers s WHERE ${whereClause}`;
  const totalRecords = db.prepare(countSql).get(...params.slice(0, -2)).count;
  const suppliers = db.prepare(sql).all(...params);

  return {
    data: suppliers,
    total: totalRecords,
    page: parseInt(page),
    limit: parseInt(limit),
  };
}

