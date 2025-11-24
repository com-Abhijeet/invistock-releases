const { BrowserWindow } = require("electron");
const QRCode = require("qrcode");
const { getMarathiName } = require("./transliterationService.js");

function numberToWords(num) {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 === 0 ? "" : " and " + inWords(n % 100))
      );
    if (n < 100000)
      return (
        inWords(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + inWords(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        inWords(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + inWords(n % 100000) : "")
      );
    return "Number too large";
  }
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let words = inWords(rupees) + " Rupees";
  if (paise > 0) {
    words += " and " + inWords(paise) + " Paise";
  }
  return words + " Only";
}

async function createInvoiceHTML(payload) {
  const { sale, shop } = payload;
  if (!shop || !sale) throw new Error("Shop and Sale details are required.");

  const gstEnabled = shop.gst_enabled;
  const showHSN = shop.hsn_required;
  const showDiscount = shop.show_discount_column;
  const currencySymbol = shop.currency_symbol || "₹";

  // ✅ Compare states in a case-insensitive way
  const isInterstate =
    gstEnabled &&
    shop.state &&
    sale.customer_state &&
    shop.state.toLowerCase() !== sale.customer_state.toLowerCase();

  // Helper Functions
  const formatAmount = (amount) =>
    `${currencySymbol}${(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  const formatAddress = (addr, city, state, pincode) =>
    [addr, city, state, pincode].filter(Boolean).join(", ");

  // Calculate Invoice Totals (logic is unchanged)
  let totalTaxableValue = 0,
    totalCgst = 0,
    totalSgst = 0,
    totalIgst = 0;
  sale.items.forEach((item) => {
    const taxableValue =
      item.rate * item.quantity * (1 - (item.discount || 0) / 100);
    totalTaxableValue += taxableValue;
    if (gstEnabled) {
      const gstAmount = taxableValue * (item.gst_rate / 100);
      if (isInterstate) {
        totalIgst += gstAmount;
      } else {
        totalCgst += gstAmount / 2;
        totalSgst += gstAmount / 2;
      }
    }
  });

  // Dynamic GST Table Headers (logic is unchanged)
  let gstHeader = "",
    gstSubHeader = "";
  if (gstEnabled) {
    if (isInterstate) {
      gstHeader = `<th colspan="2" style="text-align:center;">IGST</th>`;
      gstSubHeader = `<th>Rate</th><th>Amt</th>`;
    } else {
      gstHeader = `<th colspan="2" style="text-align:center;">CGST</th><th colspan="2" style="text-align:center;">SGST</th>`;
      gstSubHeader = `<th>Rate</th><th>Amt</th><th>Rate</th><th>Amt</th>`;
    }
  }

  // Dynamic Item Rows (logic is unchanged)
  const itemsHTML = (
    await Promise.all(
      sale.items.map(async (item, index) => {
        const marathiName = await getMarathiName(item.product_name || "");
        const taxableValue =
          item.rate * item.quantity * (1 - (item.discount || 0) / 100);
        let gstCells = "";
        if (gstEnabled) {
          const gstAmount = taxableValue * (item.gst_rate / 100);
          if (isInterstate) {
            gstCells = `<td>${item.gst_rate || 0}%</td><td>${gstAmount.toFixed(
              2
            )}</td>`;
          } else {
            gstCells = `<td>${item.gst_rate / 2 || 0}%</td><td>${(
              gstAmount / 2
            ).toFixed(2)}</td>
                        <td>${item.gst_rate / 2 || 0}%</td><td>${(
              gstAmount / 2
            ).toFixed(2)}</td>`;
          }
        }
        return `
        <tr>
          <td>${index + 1}</td>
          ${showHSN ? `<td>${item.hsn || ""}</td>` : ""}
          <td style="text-align:left;">${item.product_name}
            <br><span class="local-name">${marathiName}</span>
          </td>
          <td>${taxableValue.toFixed(2)}</td>
          <td>${item.quantity}</td>
          ${gstCells}
          ${showDiscount ? `<td>${item.discount || 0}%</td>` : ""}
          <td>${formatAmount(item.price)}</td>
        </tr>
      `;
      })
    )
  ).join("");

  const customerMarathiName = await getMarathiName(sale.customer_name || "");

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
            .toolbar { display:none; } @media print { .toolbar { display: none !important; } }
            .local-name {
              font-size: 0.9em;
              color: #333;
              font-style: italic;
            }
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
            }</p>${
    gstEnabled &&
    `<p>
        <strong>GSTIN:</strong> ${
          shop.gstin || "N/A"
        } | <strong>Phone:</strong>{" "}
        ${shop.contact_number || "N/A"}
      </p>`
  }
            
          </div>
            
            <table class="details-table">
                <tr>
                    <td style="width: 50%; text-align: left;">
                        <strong>Billed To:</strong><br/>
                        <strong>${
                          sale.customer_name || "Walking Customer"
                        }</strong><br/>
                        <strong class="local-name">${customerMarathiName}</strong><br/>
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
                  <th rowspan="2">Taxable Val</th>
                  <th rowspan="2">Qty</th>
                  ${gstHeader}
                  ${showDiscount ? `<th rowspan="2">Disc</th>` : ""}
                  <th rowspan="2">Total</th>
                </tr>
                ${gstEnabled ? `<tr>${gstSubHeader}</tr>` : ""}
              </thead>
              <tbody>${itemsHTML}</tbody>
            </table>

            <table class="totals-table">
                <tr><td>Taxable Amount:</td><td>${formatAmount(
                  totalTaxableValue
                )}</td></tr>
                ${
                  gstEnabled && !isInterstate
                    ? `<tr><td>CGST:</td><td>${formatAmount(
                        totalCgst
                      )}</td></tr>`
                    : ""
                }
                ${
                  gstEnabled && !isInterstate
                    ? `<tr><td>SGST:</td><td>${formatAmount(
                        totalSgst
                      )}</td></tr>`
                    : ""
                }
                ${
                  gstEnabled && isInterstate
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

async function printInvoice(payload) {
  // ✅ Destructure 'copies' from the payload, with a default of 1
  const { sale, shop, copies = 1 } = payload;

  if (!sale || !shop) {
    console.error("❌ Missing sale or shop data for invoice printing.");
    return;
  }

  // Generate QR code if UPI details are available
  if (shop?.upi_id && shop?.upi_banking_name) {
    const upiUrl = `upi://pay?pa=${encodeURIComponent(
      shop.upi_id
    )}&pn=${encodeURIComponent(
      shop.upi_banking_name
    )}&am=${sale.total_amount.toFixed(2)}&cu=INR`;
    shop.generated_upi_qr = await QRCode.toDataURL(upiUrl);
  } else {
    shop.generated_upi_qr = null;
  }

  const printWin = new BrowserWindow({
    width: 900,
    height: 1000,
    show: !Boolean(shop.silent_printing), // The window is created hidden and closed after printing
    title: "Invoice Print",
  });

  // ✅ Set the CSP for this window to allow Base64 images (for the QR code)
  printWin.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": ["img-src 'self' data:"],
        },
      });
    }
  );

  const htmlContent = await createInvoiceHTML({ sale, shop });
  printWin.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent)
  );

  // ✅ Add the print logic
  printWin.webContents.on("did-finish-load", () => {
    printWin.webContents.print(
      {
        silent: Boolean(shop.silent_printing),
        printBackground: true,
        deviceName: shop.invoice_printer_name || undefined,
        copies: copies > 0 ? copies : 1,
      },
      (success, errorType) => {
        if (!success) console.error("❌ Invoice print failed:", errorType);
        printWin.close(); // Close the hidden window after printing is done
      }
    );
  });
}

module.exports = { printInvoice };
