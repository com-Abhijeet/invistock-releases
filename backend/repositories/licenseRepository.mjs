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
 * Using INSERT OR REPLACE with explicit ID=1 ensures we overwrite any old key.
 * * @param {object} licenseDetails
 * @param {string} licenseDetails.licenseKey The full license key string.
 * @param {string} licenseDetails.status The validated status (e.g., 'valid').
 * @param {string} licenseDetails.expiryDate The ISO string of the expiry date.
 */
export function saveLicenseInfo({ licenseKey, status, expiryDate }) {
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO license_info (id, license_key, status, expiry_date, checked_at)
     VALUES (1, @licenseKey, @status, @expiryDate, CURRENT_TIMESTAMP)`
  );
  stmt.run({ licenseKey, status, expiryDate });
}
