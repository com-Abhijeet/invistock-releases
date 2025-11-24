import db from "../db/db.mjs";

/** Returns financial year string, e.g. "2025-26" */
function getFinancialYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan
  return month >= 3
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

/**
 * Generates a GST-compliant, sequential reference number.
 * @param {'S' | 'NGS' | 'P' | 'CN' | 'DN' | 'PI' | 'PO'} type
 */
export function generateReference(type) {
  const transaction = db.transaction(() => {
    // 1. Fetch Shop Settings
    const shop = db.prepare("SELECT * FROM shop WHERE id = 1").get();
    if (!shop) throw new Error("Shop settings not found.");

    const currentFy = getFinancialYear();
    let counterColumn, prefix;

    // 2. Determine Column & Prefix
    switch (type) {
      case "S":
        counterColumn = "sale_invoice_counter";
        prefix = shop.invoice_prefix || "INV";
        break;
      case "NGS":
        counterColumn = "non_gst_sale_counter";
        prefix = "CSH";
        break;
      case "P":
        counterColumn = "purchase_bill_counter";
        prefix = "BILL";
        break;
      case "CN":
        counterColumn = "credit_note_counter";
        prefix = "CN";
        break;
      case "DN":
        counterColumn = "debit_note_counter";
        prefix = "DN";
        break;
      case "PI":
        counterColumn = "payment_in_counter";
        prefix = "RCPT";
        break;
      case "PO":
        counterColumn = "payment_out_counter";
        prefix = "PAY";
        break;
      default:
        throw new Error(`Invalid reference type: ${type}`);
    }

    // 3. Compare Financial Years
    // Use the DB value. If null, we will initialize it below.
    const dbFy = shop.last_reset_fy;
    let numberForThisInvoice;

    if (dbFy && dbFy !== currentFy) {
      // --- CASE A: NEW FINANCIAL YEAR (Reset Everything) ---
      numberForThisInvoice = 1;

      db.prepare(
        `
        UPDATE shop SET 
          sale_invoice_counter = 1,
          purchase_bill_counter = 1,
          credit_note_counter = 1,
          debit_note_counter = 1,
          payment_in_counter = 1,
          payment_out_counter = 1,
          non_gst_sale_counter = 1,
          ${counterColumn} = 2, -- Set next ID for this specific type
          last_reset_fy = ?
        WHERE id = 1
      `
      ).run(currentFy);
    } else {
      // --- CASE B: SAME YEAR (Or First Run/Null) ---

      // If dbFy was null, we are technically in the "Same Year" flow (current),
      // but we MUST update the DB to lock in this year so it doesn't stay NULL.

      numberForThisInvoice = shop[counterColumn] || 1;

      // Increment the specific counter AND ensure last_reset_fy is set
      db.prepare(
        `
        UPDATE shop SET 
          ${counterColumn} = ${counterColumn} + 1,
          last_reset_fy = ? 
        WHERE id = 1
      `
      ).run(currentFy);
    }

    // 4. Format and Return
    const padded = String(numberForThisInvoice).padStart(7, "0");
    return `${prefix}/${currentFy}/${padded}`;
  });

  return transaction();
}
