import db from "../db/db.mjs";

function getFinancialYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month >= 3
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

export function generateReference(type) {
  const transaction = db.transaction(() => {
    const shop = db.prepare("SELECT * FROM shop WHERE id = 1").get();
    if (!shop) throw new Error("Shop settings not found.");

    const currentFy = getFinancialYear();
    let counterColumn, prefix;

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

    // ✅ Use the DB value strictly
    const dbFy = shop.last_reset_fy;
    let numberForThisInvoice;

    // Check for New Financial Year (or First Run/Null)
    if (dbFy && dbFy !== currentFy) {
      // --- New Financial Year: Reset Counters ---
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
          ${counterColumn} = 2, -- Set next value for THIS counter
          last_reset_fy = ?     -- ✅ Lock in the new year
        WHERE id = 1
      `
      ).run(currentFy);
    } else {
      // --- Same Financial Year ---
      numberForThisInvoice = shop[counterColumn] || 1;

      // ✅ Always update 'last_reset_fy' even here.
      // This fixes the issue where a NULL db value (fresh install) stays NULL forever.
      db.prepare(
        `
        UPDATE shop SET 
          ${counterColumn} = ${counterColumn} + 1,
          last_reset_fy = ? 
        WHERE id = 1
      `
      ).run(currentFy);
    }

    const padded = String(numberForThisInvoice).padStart(7, "0");
    return `${prefix}/${currentFy}/${padded}`;
  });

  return transaction();
}
