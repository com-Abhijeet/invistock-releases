import db from "../db/db.mjs";
import { normalizeBooleans } from "../utils/normalizeBooleans.mjs";

export const getShop = async () => {
  // better-sqlite3 does not support .get as a Promise, use synchronous .prepare().get()
  return db.prepare("SELECT * FROM shop LIMIT 1").get();
};

/** Returns financial year string, e.g. "2025-26" */
function getFinancialYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan
  return month >= 3
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

/**
 * @typedef {Object} ShopData
 * @property {string} shop_name
 * @property {string} [owner_name]
 * @property {string} [contact_number]
 * @property {string} [email]
 * @property {string} [address_line1]
 * @property {string} [address_line2]
 * @property {string} [city]
 * @property {string} [state]
 * @property {string} [pincode]
 * @property {string} [country]
 * @property {string} [gstin]
 * @property {string} [gst_registration_type]
 * @property {string} [pan_number]
 * @property {string} [logo_url]
 * @property {string} [website_url]
 * @property {string} [invoice_prefix]
 * @property {number} [invoice_start_number]
 * @property {string} [financial_year_start]
 * @property {boolean} [gst_enabled]
 * @property {boolean} [inclusive_tax_pricing]
 * @property {number} [default_gst_rate]
 * @property {boolean} [hsn_required]
 * @property {string} [gst_invoice_format]
 * @property {boolean} [show_gst_breakup]
 * @property {string} [currency_symbol]
 * @property {string} [currency_position]
 * @property {string} [date_format]
 * @property {string} [time_format]
 * @property {string} [default_payment_mode]
 * @property {boolean} [allow_negative_stock]
 * @property {number} [low_stock_threshold]
 * @property {string} [default_printer]
 * @property {boolean} [print_after_save]
 * @property {number} [label_printer_width_mm]
 * @property {string} [label_template_default]
 * @property {string} [invoice_template_id]
 * @property {string} [theme]
 * @property {string} [language]
 * @property {boolean} [round_off_total]
 * @property {boolean} [show_discount_column]
 * @property {string} [barcode_prefix]
 * @property {boolean} [enable_auto_backup]
 * @property {string} [backup_path]
 * @property {number} [bank_account_no]
 * @property {string} [bank_account_ifsc_code]
 * @property {string} [bank_account_holder_name]
 * @property {'savings' | 'current'} [bank_account_type]
 * @property {string} [bank_account_branch]
 * @property {string} [bank_name]
 * @property {string} [upi_id]
 * @property {string} [upi_banking_name]
 */

/**
 * Create a new shop. Automatically sets the last_reset_fy to the current financial year.
 * @param {Partial<ShopData>} shopData - Shop details
 * @returns {Promise<{id:number}>}
 */
export const createShop = async (shopData) => {
  try {
    // ✅ 1. Get the current financial year
    const currentFy = getFinancialYear();

    const normalizedData = normalizeBooleans(shopData);

    // ✅ 2. Add the new financial year field to the data object
    const dataToInsert = {
      ...normalizedData,
      last_reset_fy: currentFy,
    };

    // ✅ 3. Add the column and placeholder to the SQL statement
    const stmt = db.prepare(`
      INSERT INTO shop (
        shop_name, owner_name, contact_number, email,
        address_line1, address_line2, city, state, pincode, country,
        gstin, gst_registration_type, pan_number, logo_url, website_url,
        invoice_prefix, invoice_start_number, financial_year_start,
        gst_enabled, inclusive_tax_pricing, default_gst_rate, hsn_required,
        gst_invoice_format, show_gst_breakup,
        currency_symbol, currency_position, date_format, time_format,
        default_payment_mode, allow_negative_stock, low_stock_threshold,
        default_printer, print_after_save, label_printer_width_mm, label_template_default, invoice_template_id,
        theme, language, round_off_total, show_discount_column, barcode_prefix,
        enable_auto_backup, backup_path,
        bank_account_no, bank_account_ifsc_code, bank_account_holder_name,
        bank_account_type, bank_account_branch, bank_name, upi_id, upi_banking_name,
        last_reset_fy, invoice_template_id, label_template_id
      ) VALUES (
        @shop_name, @owner_name, @contact_number, @email,
        @address_line1, @address_line2, @city, @state, @pincode, @country,
        @gstin, @gst_registration_type, @pan_number, @logo_url, @website_url,
        @invoice_prefix, @invoice_start_number, @financial_year_start,
        @gst_enabled, @inclusive_tax_pricing, @default_gst_rate, @hsn_required,
        @gst_invoice_format, @show_gst_breakup,
        @currency_symbol, @currency_position, @date_format, @time_format,
        @default_payment_mode, @allow_negative_stock, @low_stock_threshold,
        @default_printer, @print_after_save, @label_printer_width_mm, @label_template_default, @invoice_template_id,
        @theme, @language, @round_off_total, @show_discount_column, @barcode_prefix,
        @enable_auto_backup, @backup_path,
        @bank_account_no, @bank_account_ifsc_code, @bank_account_holder_name,
        @bank_account_type, @bank_account_branch, @bank_name, @upi_id, @upi_banking_name,
        @last_reset_fy, @invoice_template_id, @label_template_id
      )
    `);

    // ✅ 4. Use the new data object for the insert
    const result = stmt.run(dataToInsert);
    return { id: result.lastInsertRowid };
  } catch (error) {
    console.error("Error creating shop:", error);
    throw new Error("Creating Shop Failed");
  }
};

/**
 * @description Updates the shop settings in the database.
 * @param {object} shopData - An object containing the fields to update.
 * @returns {object} The result of the database operation.
 */
export function updateShop(shopData) {
  // We don't want to update the 'id'
  const { id, ...updateData } = shopData;

  const fields = Object.keys(updateData);
  if (fields.length === 0) {
    // If no data is passed, there's nothing to do.
    return { changes: 0 };
  }

  // Build the "SET" part of the query dynamically: "field1 = ?, field2 = ?, ..."
  const setClause = fields.map((field) => `${field} = ?`).join(", ");
  const params = Object.values(updateData);

  const query = `UPDATE shop SET ${setClause} WHERE id = 1`;

  try {
    const stmt = db.prepare(query);
    const result = stmt.run(...params);
    return result;
  } catch (error) {
    console.error("Database error in updateShop:", error);
    throw new Error("Could not update shop settings in the database.");
  }
}
