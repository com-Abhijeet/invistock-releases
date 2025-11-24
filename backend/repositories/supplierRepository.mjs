import db from "../db/db.mjs";

/**
 * @description Inserts a new supplier record into the database.
 * @param {object} supplierData An object containing the supplier's details.
 * @param {string} supplierData.name The supplier's name.
 * @param {string} [supplierData.contact_person] The contact person's name.
 * @param {string} [supplierData.phone] The supplier's phone number.
 * @param {string} [supplierData.email] The supplier's email address.
 * @param {string} [supplierData.address] The supplier's street address.
 * @param {string} [supplierData.city] The supplier's city.
 * @param {string} [supplierData.state] The supplier's state.
 * @param {string} [supplierData.pincode] The supplier's pincode.
 * @param {string} [supplierData.gst_number] The supplier's GSTIN.
 * // ... other properties
 * @returns {object} The newly created supplier object, including its new ID.
 * @throws {Error} Throws an error if the database insertion fails.
 */
export function createSupplier(supplierData) {
  try {
    // ✅ Destructure all fields, including the new address fields, for clarity
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

    // ✅ Update the INSERT statement with the new address columns
    const stmt = db.prepare(`
      INSERT INTO suppliers (
        name, contact_person, phone, email, address, city, state, pincode,
        gst_number, supplier_type, bank_account, ifsc_code, upi_id, notes
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    // ✅ Pass the new address variables to the run command
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
      notes
    );

    // ✅ Return the complete new supplier object with the generated ID
    return { id: info.lastInsertRowid, ...supplierData };
  } catch (error) {
    console.error("Error in createSupplier repository:", error.message);
    // ✅ Throw the error so the service layer can handle it
    throw new Error(
      `Database error: Could not create supplier. ${error.message}`
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
  const stmt = db.prepare(`
    UPDATE suppliers SET
      name = ?, contact_person = ?, phone = ?, email = ?, address = ?,
      gst_number = ?, supplier_type = ?, bank_account = ?, ifsc_code = ?, upi_id = ?,
      total_supplied_amount = ?, total_paid_amount = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  const result = stmt.run(
    data.name,
    data.contact_person,
    data.phone,
    data.email,
    data.address,
    data.gst_number,
    data.supplier_type,
    data.bank_account,
    data.ifsc_code,
    data.upi_id,
    data.total_supplied_amount,
    data.total_paid_amount,
    data.notes,
    id
  );

  return result.changes;
}

export function deleteSupplier(id) {
  return db.prepare("DELETE FROM suppliers WHERE id = ?").run(id).changes;
}
