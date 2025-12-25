/**
 * Generates the HTML for a Customer Statement of Account.
 * @param {object} shop - Shop details.
 * @param {object} customer - Customer details.
 *_ @param {Array<object>} ledger - The nested array of sales and transactions.
 * @returns {string} The complete HTML string.
 */
function createCustomerLedgerHTML(shop, customer, ledger) {
  const style = `
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; }
      .container { width: 210mm; margin: auto; padding: 20px; }
      h1, h2, h3 { text-align: center; margin: 0; }
      .header p { text-align: center; margin: 2px 0; }
      .divider { border-top: 2px solid #333; margin: 15px 0; }
      
      .customer-details { margin-bottom: 20px; }
      .customer-details p { margin: 3px 0; }
      
      .bill-row { background-color: #f4f4f4; font-weight: bold; border-top: 1px solid #ccc; }
      .bill-row td { padding: 8px 4px; }
      
      .txn-row td { padding: 4px 4px 4px 20px; font-size: 0.9em; border-bottom: 1px solid #eee; }
      .txn-header td { font-style: italic; color: #555; }
      
      .summary-table { width: 100%; border-collapse: collapse; }
      .summary-table th { text-align: left; padding: 5px; border-bottom: 2px solid #333; }
      .summary-table .right { text-align: right; }
    </style>
  `;

  // Loop through each bill and its transactions
  const ledgerHtml = ledger
    .map(
      (bill) => `
    <tr class="bill-row">
      <td>${new Date(bill.bill_date).toLocaleDateString("en-IN")}</td>
      <td>${bill.reference_no}</td>
      <td class="right">₹${bill.total_amount.toLocaleString("en-IN")}</td>
      <td class="right">₹${bill.paid_amount.toLocaleString("en-IN")}</td>
      <td class="right">₹${bill.amount_pending.toLocaleString("en-IN")}</td>
    </tr>
    
    ${
      bill.transactions.length > 0
        ? `
      <tr class="txn-header">
        <td></td>
        <td colspan="4">Payments for this bill:</td>
      </tr>
      ${bill.transactions
        .map(
          (txn) => `
        <tr class="txn-row">
          <td></td>
          <td colspan="2">${new Date(txn.transaction_date).toLocaleDateString(
            "en-IN"
          )}</td>
          <td class="right">(${txn.payment_mode || "Unspecified"})</td>
          <td class="right">- ₹${txn.amount.toLocaleString("en-IN")}</td>
        </tr>
      `
        )
        .join("")}
    `
        : ""
    }
  `
    )
    .join("");

  const totalOutstanding = ledger.reduce(
    (sum, bill) => sum + bill.amount_pending,
    0
  );

  const html = `
    <!DOCTYPE html>
    <html><head><title>Customer Ledger</title>${style}</head>
    <body>
      <div class="container">
        <div class="header">
          <h2>${shop.shop_name}</h2>
          <p>${shop.address_line1 || ""}, ${shop.city || ""}</p>
          <h3>Statement of Account</h3>
        </div>
        <div class="divider"></div>
        <div class="customer-details">
          <p><strong>Customer:</strong> ${customer.name}</p>
          <p><strong>Phone:</strong> ${customer.phone || "N/A"}</p>
          <p><strong>Address:</strong> ${[customer.address, customer.city]
            .filter(Boolean)
            .join(", ")}</p>
        </div>
        <table class="summary-table">
          <thead>
            <tr>
              <th>Bill Date</th>
              <th>Reference No.</th>
              <th class="right">Bill Amount</th>
              <th class="right">Amount Paid</th>
              <th class="right">Amount Pending</th>
            </tr>
          </thead>
          <tbody>${ledgerHtml}</tbody>
          <tfoot>
            <tr style="border-top: 2px solid #333; font-size: 1.2em; font-weight: bold;">
              <td colspan="4" class="right">Total Outstanding Balance:</td>
              <td class="right">₹${totalOutstanding.toLocaleString(
                "en-IN"
              )}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </body></html>
  `;
  return html;
}

module.exports = { createCustomerLedgerHTML };
