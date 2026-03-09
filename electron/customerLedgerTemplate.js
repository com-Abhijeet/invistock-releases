/**
 * Generates the HTML for a Customer Statement of Account.
 * @param {object} shop - Shop details.
 * @param {object} customer - Customer details.
 * @param {Array<object>} ledger - The nested array of sales and transactions.
 * @returns {string} The complete HTML string.
 */
function createCustomerLedgerHTML(shop, customer, ledger) {
  // Utility for clean negative currency formatting
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    if (num < 0) {
      return `-₹${Math.abs(num).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const style = `
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #333; }
      .container { width: 210mm; margin: auto; padding: 20px; }
      h1, h2, h3 { text-align: center; margin: 0; }
      .header p { text-align: center; margin: 4px 0; color: #555; }
      .divider { border-top: 2px solid #222; margin: 15px 0; }
      
      .top-section { display: flex; justify-content: space-between; margin-bottom: 20px; }
      .customer-details p { margin: 4px 0; }
      
      .bill-row { background-color: #fafafa; font-weight: bold; border-top: 1px solid #ccc; }
      .bill-row td { padding: 10px 6px; }
      
      .txn-row td { padding: 5px 6px; font-size: 0.9em; border-bottom: 1px dashed #eee; }
      .txn-header td { font-style: italic; color: #666; padding-top: 8px; font-size: 0.85em; text-transform: uppercase; font-weight: bold; }
      
      .summary-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      .summary-table th { text-align: left; padding: 10px 6px; border-bottom: 2px solid #222; background-color: #f0f0f0; }
      .summary-table .right { text-align: right; }
      .summary-table .center { text-align: center; }
      
      .text-success { color: #2e7d32; }
      .text-warning { color: #ed6c02; }
      .text-danger { color: #d32f2f; }
      .text-info { color: #0288d1; }
      .text-secondary { color: #9c27b0; }

      .status-badge {
        padding: 3px 6px;
        border-radius: 4px;
        font-size: 0.8em;
        font-weight: bold;
        text-transform: uppercase;
        border: 1px solid;
      }
      .badge-paid { color: #2e7d32; border-color: #2e7d32; background: #e8f5e9; }
      .badge-partial { color: #ed6c02; border-color: #ed6c02; background: #fff3e0; }
      .badge-credited { color: #0288d1; border-color: #0288d1; background: #e1f5fe; }
      .badge-refund-due { color: #9c27b0; border-color: #9c27b0; background: #f3e5f5; }
      .badge-pending { color: #d32f2f; border-color: #d32f2f; background: #ffebee; }
    </style>
  `;

  let totalBilled = 0;
  let totalCredits = 0;
  let totalNetPaid = 0;
  let totalOutstanding = 0;

  /* ============================================================
     LEDGER ROWS
  ============================================================ */

  const ledgerHtml = ledger
    .map((bill) => {
      // 1. Rigorous CA calculation matching frontend UI
      const amt = parseFloat(bill.total_amount || 0);
      const credits = parseFloat(bill.total_credit_notes || 0);
      const paidIn = parseFloat(bill.total_paid || 0);
      const paidOut = parseFloat(bill.total_refunded || 0);

      const netPaid = paidIn - paidOut;
      const bal = amt - credits - netPaid; // Allows negative balance

      // Accumulate for footer
      totalBilled += amt;
      totalCredits += credits;
      totalNetPaid += netPaid;
      totalOutstanding += bal;

      // Determine Status
      let statusLabel = "PENDING";
      let badgeClass = "badge-pending";

      if (bal <= 0.9 && bal >= -0.9) {
        if (credits >= amt * 0.9 && netPaid <= 0.9) {
          statusLabel = "CREDITED";
          badgeClass = "badge-credited";
        } else {
          statusLabel = "PAID";
          badgeClass = "badge-paid";
        }
      } else if (bal < -0.9) {
        statusLabel = "REFUND DUE";
        badgeClass = "badge-refund-due";
      } else if (netPaid > 0 || credits > 0) {
        statusLabel = "PARTIAL";
        badgeClass = "badge-partial";
      }

      // Balance formatting
      let balColorClass = "";
      if (bal > 0) balColorClass = "text-danger";
      else if (bal < 0) balColorClass = "text-warning";

      // 2. Render Transactions
      const txRows =
        bill.transactions && bill.transactions.length > 0
          ? `
          <tr class="txn-header">
            <td></td>
            <td colspan="6">↳ Settlement History:</td>
          </tr>
          ${bill.transactions
            .map((txn) => {
              const date = new Date(
                txn.transaction_date || txn.date,
              ).toLocaleDateString("en-IN");
              const amountStr = formatCurrency(
                Math.abs(Number(txn.amount || 0)),
              );

              let typeLabel = "PAYMENT IN";
              let prefix = "";
              let colorClass = "text-success";

              if (txn.type === "payment_out") {
                typeLabel = "REFUND (CASH OUT)";
                prefix = "-";
                colorClass = "text-danger";
              } else if (txn.type === "credit_note") {
                typeLabel = "CREDIT NOTE (RETURN)";
                colorClass = "text-warning";
              } else if (txn.type === "debit_note") {
                typeLabel = "DEBIT NOTE (CHARGE)";
                colorClass = "text-danger";
              }

              return `
              <tr class="txn-row">
                <td></td>
                <td colspan="2">${date} &nbsp;|&nbsp; <span class="${colorClass}"><b>${typeLabel}</b></span> &nbsp;(${txn.payment_mode || "N/A"})</td>
                <td class="right">${txn.type === "credit_note" ? amountStr : ""}</td>
                <td class="right ${colorClass}">${txn.type !== "credit_note" ? prefix + amountStr : ""}</td>
                <td></td>
                <td></td>
              </tr>
            `;
            })
            .join("")}
        `
          : "";

      return `
        <tr class="bill-row">
          <td>${new Date(bill.bill_date).toLocaleDateString("en-IN")}</td>
          <td>${bill.reference_no}</td>
          <td class="center"><span class="status-badge ${badgeClass}">${statusLabel}</span></td>
          <td class="right">${formatCurrency(amt)}</td>
          <td class="right text-warning">${credits > 0 ? formatCurrency(credits) : "-"}</td>
          <td class="right text-success">${netPaid !== 0 ? formatCurrency(netPaid) : "-"}</td>
          <td class="right ${balColorClass}">${formatCurrency(bal)}</td>
        </tr>
        ${txRows}
      `;
    })
    .join("");

  /* ============================================================
     FINAL HTML
  ============================================================ */

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Customer Ledger - ${customer.name}</title>
        ${style}
      </head>
      <body>
        <div class="container">

          <div class="header">
            <h2>${shop.shop_name}</h2>
            <p>${[shop.address_line1, shop.city].filter(Boolean).join(", ")}</p>
            <p>GSTIN: ${shop.gstin || "N/A"} | Ph: ${shop.phone || "N/A"}</p>
            <h3 style="margin-top: 15px; text-transform: uppercase;">Statement of Account</h3>
          </div>

          <div class="divider"></div>

          <div class="top-section">
            <div class="customer-details">
              <p style="font-size: 1.2em;"><strong>${customer.name}</strong></p>
              <p><strong>Phone:</strong> ${customer.phone || "N/A"}</p>
              <p><strong>Address:</strong> ${[customer.address, customer.city].filter(Boolean).join(", ")}</p>
              ${customer.gst_no ? `<p><strong>GSTIN:</strong> ${customer.gst_no}</p>` : ""}
            </div>
            
            <div style="text-align: right; background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #ddd;">
               <p style="font-size: 0.9em; margin:0; color: #666; text-transform: uppercase; font-weight: bold;">
                 ${totalOutstanding < 0 ? "Total Refund Owed" : "Net Balance Due"}
               </p>
               <h2 style="margin: 5px 0 0 0; color: ${totalOutstanding < 0 ? "#ed6c02" : totalOutstanding > 0 ? "#d32f2f" : "#2e7d32"};">
                 ${formatCurrency(totalOutstanding)}
               </h2>
            </div>
          </div>

          <table class="summary-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Ref No.</th>
                <th class="center">Status</th>
                <th class="right">Bill Total</th>
                <th class="right">Credits (Returns)</th>
                <th class="right">Net Paid</th>
                <th class="right">Balance</th>
              </tr>
            </thead>

            <tbody>
              ${ledgerHtml || '<tr><td colspan="7" style="text-align: center; padding: 30px; font-style: italic; color: #777;">No transactions found for this period.</td></tr>'}
            </tbody>

            <tfoot>
              <tr><td colspan="7" style="border-top: 2px solid #222; padding: 0;"></td></tr>
              <tr style="font-size: 1.1em; background-color: #fafafa;">
                <td colspan="3" class="right"><strong>Totals:</strong></td>
                <td class="right"><strong>${formatCurrency(totalBilled)}</strong></td>
                <td class="right text-warning"><strong>${formatCurrency(totalCredits)}</strong></td>
                <td class="right text-success"><strong>${formatCurrency(totalNetPaid)}</strong></td>
                <td class="right ${totalOutstanding < 0 ? "text-warning" : totalOutstanding > 0 ? "text-danger" : "text-success"}" style="font-size: 1.2em;">
                  <strong>${formatCurrency(totalOutstanding)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
          
          <div style="margin-top: 30px; font-size: 0.85em; color: #777; text-align: center;">
            <p>This is a computer-generated statement. Values enclosed in (-) represent a credit balance or refund owed.</p>
          </div>

        </div>
      </body>
    </html>
  `;

  return html;
}

module.exports = { createCustomerLedgerHTML };
