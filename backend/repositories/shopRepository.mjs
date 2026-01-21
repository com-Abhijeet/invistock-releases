import db from "../db/db.mjs";
import { normalizeBooleans } from "../utils/normalizeBooleans.mjs";

/**
 * Fields that are SYSTEM-MANAGED and must NEVER be updated from settings
 */
const PROTECTED_FIELDS = new Set([
  "sale_invoice_counter",
  "purchase_bill_counter",
  "credit_note_counter",
  "debit_note_counter",
  "payment_in_counter",
  "payment_out_counter",
  "non_gst_sale_counter",
  "last_reset_fy",
]);

/**
 * Fetch shop (single row)
 */
export const getShop = async () => {
  return db.prepare("SELECT * FROM shop LIMIT 1").get();
};

/** Returns financial year string, e.g. "2025-26" */
function getFinancialYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month >= 3
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

/**
 * Create shop (one-time operation)
 * Automatically initializes financial year
 */
export const createShop = async (shopData) => {
  try {
    const currentFy = getFinancialYear();
    const normalizedData = normalizeBooleans(shopData);

    const dataToInsert = {
      ...normalizedData,
      last_reset_fy: currentFy,
    };

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
        default_printer, print_after_save, label_printer_width_mm,
        label_template_default, invoice_template_id,
        theme, language, round_off_total, show_discount_column, barcode_prefix,
        enable_auto_backup, backup_path,
        bank_account_no, bank_account_ifsc_code, bank_account_holder_name,
        bank_account_type, bank_account_branch, bank_name, upi_id, upi_banking_name,
        last_reset_fy
      ) VALUES (
        @shop_name, @owner_name, @contact_number, @email,
        @address_line1, @address_line2, @city, @state, @pincode, @country,
        @gstin, @gst_registration_type, @pan_number, @logo_url, @website_url,
        @invoice_prefix, @invoice_start_number, @financial_year_start,
        @gst_enabled, @inclusive_tax_pricing, @default_gst_rate, @hsn_required,
        @gst_invoice_format, @show_gst_breakup,
        @currency_symbol, @currency_position, @date_format, @time_format,
        @default_payment_mode, @allow_negative_stock, @low_stock_threshold,
        @default_printer, @print_after_save, @label_printer_width_mm,
        @label_template_default, @invoice_template_id,
        @theme, @language, @round_off_total, @show_discount_column, @barcode_prefix,
        @enable_auto_backup, @backup_path,
        @bank_account_no, @bank_account_ifsc_code, @bank_account_holder_name,
        @bank_account_type, @bank_account_branch, @bank_name, @upi_id, @upi_banking_name,
        @last_reset_fy
      )
    `);

    const result = stmt.run(dataToInsert);
    return { id: result.lastInsertRowid };
  } catch (error) {
    console.error("Error creating shop:", error);
    throw new Error("Creating shop failed");
  }
};

/**
 * Update shop settings (SAFE)
 * - Blocks all system-managed counters
 * - Ignores stale localStorage fields
 */
export function updateShop(shopData) {
  const { id, ...incomingData } = shopData;

  // 🛡️ Strip protected/system fields
  for (const key of Object.keys(incomingData)) {
    if (PROTECTED_FIELDS.has(key)) {
      delete incomingData[key];
    }
  }

  const normalizedData = normalizeBooleans(incomingData);
  const fields = Object.keys(normalizedData);

  if (fields.length === 0) {
    return { changes: 0 };
  }

  const setClause = fields.map((field) => `${field} = ?`).join(", ");
  const params = Object.values(normalizedData);

  const query = `
    UPDATE shop
    SET ${setClause}
    WHERE id = 1
  `;

  try {
    const stmt = db.prepare(query);
    return stmt.run(...params);
  } catch (error) {
    console.error("Database error in updateShop:", error);
    throw new Error("Could not update shop settings");
  }
}
