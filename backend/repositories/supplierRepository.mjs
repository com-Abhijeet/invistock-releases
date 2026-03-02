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
