import db from "../db/db.mjs";

function getFinancialYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  // Returns format: "2025-26"
  return month >= 3
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

export function generateReference(type) {
  // 1. Wrap in Transaction (ACID compliance)
  // This ensures no other process can modify the DB while we are calculating
  const transaction = db.transaction(() => {
    // 2. Fetch Settings
    const shop = db.prepare("SELECT * FROM shop WHERE id = 1").get();
    if (!shop) throw new Error("Shop settings not found.");

    const currentFy = getFinancialYear();
    let counterColumn, prefix;

    // Map types to columns
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

    // 3. FINANCIAL YEAR RESET CHECK
    // If we are in a new year, we "Zero Out" the counters.
    // We set them to 0, so that the very next step (0 + 1) results in Invoice #1.
    if (shop.last_reset_fy !== currentFy) {
      console.log(
        `[BACKEND] New FY Detected: ${currentFy}. Resetting counters to 0.`
      );

      db.prepare(
        `
        UPDATE shop SET 
          sale_invoice_counter = 0,
          purchase_bill_counter = 0,
          credit_note_counter = 0,
          debit_note_counter = 0,
          payment_in_counter = 0,
          payment_out_counter = 0,
          non_gst_sale_counter = 0,
          last_reset_fy = ?
        WHERE id = 1
      `
      ).run(currentFy);
    }

    // 4. ATOMIC INCREMENT (The "Dynamic" Part)
    // This runs for BOTH new years and existing years.
    // It is the single source of truth.
    // SQLite's 'RETURNING' clause gives us the new value immediately.

    const result = db
      .prepare(
        `
      UPDATE shop 
      SET ${counterColumn} = ${counterColumn} + 1 
      WHERE id = 1 
      RETURNING ${counterColumn} as new_count
    `
      )
      .get();

    if (!result) throw new Error("Failed to generate reference counter.");

    const numberForThisInvoice = result.new_count;

    // 5. Format and Return
    const padded = String(numberForThisInvoice).padStart(7, "0");
    return `${prefix}/${currentFy}/${padded}`;
  });

  return transaction();
}
