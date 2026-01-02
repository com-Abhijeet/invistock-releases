// You'll need to create and import these helper functions
const {
  formatAddress,
  formatDate,
  formatAmount,
  numberToWords,
} = require("./formatters.js");

function createInvoiceHTML({ sale, shop }) {
  const gstEnabled = Boolean(shop.gst_enabled);
  const showHSN = Boolean(shop.hsn_required);
  const showDiscount = Boolean(shop.show_discount_column);
  const inclusiveTax = Boolean(shop.inclusive_tax_pricing);

  // If GST is enabled but Inclusive Tax is ON, we HIDE the tax breakdown columns.
  // We only show tax breakdown if GST is enabled AND Tax is Exclusive.
  const showTaxBreakdown = gstEnabled && !inclusiveTax;

  const isInterstate = gstEnabled && shop.state !== sale.customer_state;

  // Calculate Totals
  let totalTaxableValue = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  sale.items.forEach((item) => {
    const baseVal = item.rate * item.quantity;
    const valAfterDisc = baseVal * (1 - (item.discount || 0) / 100);

    let taxableValue = 0;
    let gstAmount = 0;

    if (gstEnabled) {
      if (inclusiveTax) {
        const divisor = 1 + item.gst_rate / 100;
        taxableValue = valAfterDisc / divisor;
        gstAmount = valAfterDisc - taxableValue;
      } else {
        taxableValue = valAfterDisc;
        gstAmount = taxableValue * (item.gst_rate / 100);
      }
    } else {
      taxableValue = valAfterDisc;
    }

    totalTaxableValue += taxableValue;

    if (gstEnabled) {
      if (isInterstate) {
        totalIgst += gstAmount;
      } else {
        totalCgst += gstAmount / 2;
        totalSgst += gstAmount / 2;
      }
    }
  });

  // Generate Item Rows
  const itemsHTML = sale.items
    .map((item, index) => {
      const baseVal = item.rate * item.quantity;
      const valAfterDisc = baseVal * (1 - (item.discount || 0) / 100);

      let taxableValue = 0;
      let gstAmount = 0;

      if (gstEnabled) {
        if (inclusiveTax) {
          const divisor = 1 + item.gst_rate / 100;
          taxableValue = valAfterDisc / divisor;
          gstAmount = valAfterDisc - taxableValue;
        } else {
          taxableValue = valAfterDisc;
          gstAmount = taxableValue * (item.gst_rate / 100);
        }
      } else {
        taxableValue = valAfterDisc;
      }

      const gstRate = item.gst_rate || 0;
      let gstColumns = "";

      // Only generate GST columns if breakdown is enabled
      if (showTaxBreakdown) {
        if (isInterstate) {
          gstColumns = `
          <td>${gstRate.toFixed(2)}%</td>
          <td>${formatAmount(gstAmount)}</td>
        `;
        } else {
          gstColumns = `
          <td>${(gstRate / 2).toFixed(2)}%</td>
          <td>${formatAmount(gstAmount / 2)}</td>
          <td>${(gstRate / 2).toFixed(2)}%</td>
          <td>${formatAmount(gstAmount / 2)}</td>
        `;
        }
      }

      return `
      <tr>
        <td>${index + 1}</td>
        ${showHSN ? `<td>${item.hsn_code || ""}</td>` : ""}
        <td style="text-align: left;">${item.product_name}</td>
        <td>${formatAmount(item.rate)}</td>
        <td>${item.quantity}</td>
        ${showTaxBreakdown ? `<td>${formatAmount(taxableValue)}</td>` : ""}
        ${gstColumns}
        ${showDiscount ? `<td>${item.discount || 0}%</td>` : ""}
        <td>${formatAmount(item.price)}</td>
      </tr>
    `;
    })
    .join("");

  let gstHeader = "";
  let gstSubHeader = "";

  if (showTaxBreakdown) {
    if (isInterstate) {
      gstHeader = `<th colspan="2">IGST</th>`;
      gstSubHeader = `<th>Rate</th><th>Amt</th>`;
    } else {
      gstHeader = `<th colspan="2">CGST</th><th colspan="2">SGST</th>`;
      gstSubHeader = `<th>Rate</th><th>Amt</th><th>Rate</th><th>Amt</th>`;
    }
  }

  // Dynamic Rate Header
  const rateHeader = inclusiveTax ? "Rate" : "Rate";

  return `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; }
            .bill-container { background: #fff; margin: 20px auto; padding: 20px; border: 1px solid #ccc; width: 210mm; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 6px; text-align: right; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 10px; }
            .header h1 { margin: 0; color: #333; }
            .details-table td { padding: 8px; border: 1px solid #eee; vertical-align: top; }
            .items-table { margin-top: 20px; }
            .items-table th { background-color: #f2f2f2; border: 1px solid #ddd; }
            .items-table td { border: 1px solid #ddd; }
            .totals-table { width: 50%; margin-left: auto; margin-top: 20px; }
            .totals-table td { padding: 6px; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; }
            .footer .bank-details { text-align: left; }
            .footer .signature { text-align: right; padding-top: 40px; border-top: 1px solid #333; }
            .note { margin-top: 15px; font-style: italic; font-size: 11px; color: #555; }
        </style>
      </head>
      <body>
        <div class="bill-container">
          <div class="header">
            <h1>${shop.gst_invoice_format || "Tax Invoice"}</h1>
            <h2>${
              shop.use_alias_on_bills && shop.shop_alias
                ? shop.shop_alias
                : shop.shop_name
            }</h2>
            <p>${
              shop.use_alias_on_bills && shop.shop_alias
                ? " "
                : formatAddress(
                    shop.address_line1,
                    shop.city,
                    shop.state,
                    shop.pincode
                  )
            }</p>
            <p><strong>GSTIN:</strong> ${
              shop.gstin || "N/A"
            } | <strong>Phone:</strong> ${shop.contact_number || "N/A"}</p>
          </div>
            
            <table class="details-table">
                <tr>
                    <td style="width: 50%; text-align: left;">
                        <strong>Billed To:</strong><br/>
                        <strong>${
                          sale.customer_name || "Walking Customer"
                        }</strong><br/>
                        ${formatAddress(
                          sale.customer_address,
                          sale.customer_city,
                          sale.customer_state,
                          sale.customer_pincode
                        )}<br/>
                        Phone: ${sale.customer_phone || "N/A"}<br/>
                        GSTIN: ${sale.customer_gst_no || "Unregistered"}
                    </td>
                    <td style="width: 50%; text-align: left;">
                        <strong>Invoice No:</strong> ${sale.reference_no}<br/>
                        <strong>Date:</strong> ${formatDate(
                          sale.created_at
                        )}<br/>
                        <strong>Place of Supply:</strong> ${
                          sale.customer_state || shop.state
                        }
                    </td>
                </tr>
            </table>

            <table class="items-table">
              <thead>
                <tr>
                  <th rowspan="2">#</th>
                  ${showHSN ? `<th rowspan="2">HSN</th>` : ""}
                  <th rowspan="2">Item Description</th>
                  <th rowspan="2">${rateHeader}</th>
                  <th rowspan="2">Qty</th>
                  ${showTaxBreakdown ? `<th rowspan="2">Taxable Val</th>` : ""}
                  ${gstHeader}
                  ${showDiscount ? `<th rowspan="2">Disc</th>` : ""}
                  <th rowspan="2">Total</th>
                </tr>
                ${showTaxBreakdown ? `<tr>${gstSubHeader}</tr>` : ""}
              </thead>
              <tbody>${itemsHTML}</tbody>
            </table>

            <table class="totals-table">
                ${
                  showTaxBreakdown
                    ? `<tr><td>Taxable Amount:</td><td>${formatAmount(
                        totalTaxableValue
                      )}</td></tr>`
                    : ""
                }
                ${
                  showTaxBreakdown && !isInterstate
                    ? `<tr><td>CGST:</td><td>${formatAmount(
                        totalCgst
                      )}</td></tr>`
                    : ""
                }
                ${
                  showTaxBreakdown && !isInterstate
                    ? `<tr><td>SGST:</td><td>${formatAmount(
                        totalSgst
                      )}</td></tr>`
                    : ""
                }
                ${
                  showTaxBreakdown && isInterstate
                    ? `<tr><td>IGST:</td><td>${formatAmount(
                        totalIgst
                      )}</td></tr>`
                    : ""
                }
                <tr><td><strong>Grand Total:</strong></td><td><strong>${formatAmount(
                  sale.total_amount
                )}</strong></td></tr>
                <tr><td>Paid Amount:</td><td>${formatAmount(
                  sale.paid_amount
                )}</td></tr>
            </table>

            <div style="margin-top: 20px; font-size: 12px;">
                <strong>Amount in Words:</strong> ${numberToWords(
                  sale.total_amount
                )}
            </div>
            
            ${
              inclusiveTax
                ? `<div class="note"><strong>Note:</strong> All prices/rates shown are inclusive of GST.</div>`
                : ""
            }

            <div class="footer">
                <div class="bank-details">
                    <strong>Bank Details:</strong><br/>
                    A/C Name: ${shop.bank_account_holder_name || ""}<br/>
                    A/C No: ${shop.bank_account_no || ""}<br/>
                    IFSC: ${shop.bank_account_ifsc_code || ""}<br/>
                    Bank: ${shop.bank_name || ""} - ${
    shop.bank_account_branch || ""
  }
                </div>
                ${
                  shop.generated_upi_qr
                    ? `<div class="qr-wrap"><img src="${shop.generated_upi_qr}" style="width:120px;height:120px;" /></div>`
                    : ""
                }
                <div class="signature">
                    Authorized Signature
                </div>
            </div>
        </div>
      </body>
    </html>
  `;
}

module.exports = { createInvoiceHTML };
