import db from "../db/db.mjs";

/**
 * Retrieves the current license information from the database.
 * @returns {object | undefined} The license info object or undefined if not found.
 */
export function getLicenseInfo() {
  const stmt = db.prepare("SELECT * FROM license_info WHERE id = 1");
  return stmt.get();
}

/**
 * Saves or updates the license key and its status in the database.
 * @param {object} licenseDetails
 * @param {string} licenseDetails.licenseKey The full license key string.
 * @param {string} licenseDetails.status The validated status.
 * @param {string} licenseDetails.expiryDate The ISO string of the expiry date.
 */
export function saveLicenseInfo({ licenseKey, status, expiryDate }) {
  // "INSERT OR REPLACE" is an "upsert": it updates the row if it exists, or inserts it if it doesn't.
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO license_info (id, license_key, status, expiry_date, checked_at)
     VALUES (1, @licenseKey, @status, @expiryDate, CURRENT_TIMESTAMP)`
  );
  stmt.run({ licenseKey, status, expiryDate });
}
