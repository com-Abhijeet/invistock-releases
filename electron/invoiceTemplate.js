// invoiceTemplate.js - Standard A4 Template & Helpers

// --- HELPERS ---
const formatAmount = (amount) =>
  `₹${(amount || 0).toLocaleString("en-IN", {
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

// --- NEW HELPER: Tracking Details Formatter ---
const getTrackingHtml = (item) => {
  const parts = [];
  if (item.batch_number) parts.push(`Batch: ${item.batch_number}`);
  if (item.expiry_date) parts.push(`Exp: ${formatDate(item.expiry_date)}`);
  if (item.serial_number) parts.push(`S/N: ${item.serial_number}`);

  if (parts.length === 0) return "";

  return `<div style="font-size: 9px; color: #555; font-style: italic; margin-top: 2px;">
    ${parts.join(" | ")}
  </div>`;
};

// --- STANDARD A4 GENERATOR (STRUCTURED) ---
function createInvoiceHTML({ sale, shop }) {
  const gstEnabled = Boolean(shop.gst_enabled);
  const showHSN = Boolean(shop.hsn_required);
  const inclusiveTax = Boolean(shop.inclusive_tax_pricing);
  // Default to showing breakup if undefined, otherwise respect preference
  const showGstBreakup =
    shop.show_gst_breakup !== undefined ? Boolean(shop.show_gst_breakup) : true;

  // GST Calculations for Footer
  const isInterstate =
    gstEnabled &&
    shop.state &&
    sale.customer_state &&
    shop.state.toLowerCase() !== sale.customer_state.toLowerCase();

  let totalTaxableValue = 0,
    totalCgst = 0,
    totalSgst = 0,
    totalIgst = 0,
    totalTaxAmount = 0;

  // Pre-calculate totals for footer
  sale.items.forEach((item) => {
    const baseVal = item.rate * item.quantity;
    const valAfterDisc = baseVal * (1 - (item.discount || 0) / 100);
    let taxableValue = 0,
      gstAmount = 0;

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
    totalTaxAmount += gstAmount;

    if (gstEnabled) {
      if (isInterstate) totalIgst += gstAmount;
      else {
        totalCgst += gstAmount / 2;
        totalSgst += gstAmount / 2;
      }
    }
  });

  // --- COLUMN HEADERS LOGIC ---
  const itemsHTML = sale.items
    .map((item, index) => {
      // Per Item Calculation
      const baseVal = item.rate * item.quantity;
      const valAfterDisc = baseVal * (1 - (item.discount || 0) / 100);
      let gstAmount = 0;

      if (gstEnabled) {
        if (inclusiveTax) {
          const divisor = 1 + item.gst_rate / 100;
          const taxableValue = valAfterDisc / divisor;
          gstAmount = valAfterDisc - taxableValue;
        } else {
          gstAmount = valAfterDisc * (item.gst_rate / 100);
        }
      }

      return `
    <tr>
      <td class="text-center">${index + 1}</td>
      <td style="text-align:left;">
        <div style="font-size:10px; font-weight:500;">${item.product_name}</div>
        ${getTrackingHtml(item)} <!-- Added Tracking Info Here -->
      </td>
      ${showHSN ? `<td class="text-center">${item.hsn || "-"}</td>` : ""}
      <td class="text-center">${item.quantity}</td>
      <td class="text-right">${formatAmount(item.rate)}</td>
      
      ${gstEnabled ? `<td class="text-center">${item.gst_rate}%</td>` : ""}
      ${
        gstEnabled && showGstBreakup
          ? `<td class="text-right">${formatAmount(gstAmount)}</td>`
          : ""
      }
      
      <td class="text-right bold">${formatAmount(item.price)}</td>
    </tr>`;
    })
    .join("");

  return `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
            /* STRICT A4 SIZE */
            @page { size: A4; margin: 10mm; }
            
            body { 
                font-family: 'Arial', sans-serif; 
                font-size: 11px; 
                margin: 0; 
                padding: 10px; 
                width: 100%; 
                box-sizing: border-box;
                background-color: #fff;
                color: #000;
            }
            
            /* Utility Classes */
            .text-right { text-align: right; } 
            .text-center { text-align: center; } 
            .bold { font-weight: bold; }
            .flex { display: flex; } 
            
            /* Header */
            .header-box { display: flex; border: 1px solid #000; border-bottom: 0; }
            .shop-info { flex: 1; padding: 8px; border-right: 1px solid #000; }
            .invoice-meta { width: 40%; padding: 8px; }
            h1 { margin: 0 0 5px 0; font-size: 18px; text-transform: uppercase; }
            
            /* Customer Row */
            .customer-row { display: flex; border: 1px solid #000; border-bottom: 0; }
            .bill-to { flex: 1; padding: 5px 8px; border-right: 1px solid #000; }
            .extra-meta { width: 40%; padding: 5px 8px; }
            
            /* Table */
            table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 0; }
            th { background: #eee; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 6px; font-size: 10px; text-transform: uppercase; }
            /* Reduced padding and font-size for compact item rows */
            td { border-right: 1px solid #000; border-bottom: 1px solid #eee; padding: 4px 6px; vertical-align: middle; font-size: 9px; }
            tr:last-child td { border-bottom: 1px solid #000; }
            
            /* Footer Section */
            .footer-section { display: flex; border: 1px solid #000; border-top: 0; }
            .amount-words { flex: 1; padding: 8px; border-right: 1px solid #000; font-size: 10px; }
            .bank-details { flex: 1; padding: 8px; border-right: 1px solid #000; font-size: 10px; }
            .totals-area { width: 30%; padding: 8px; }
            
            .signature-area { display: flex; justify-content: space-between; border: 1px solid #000; border-top: 0; padding: 8px; height: 60px; align-items: flex-end; }

            .qr-wrap { text-align: center; margin-top: 5px; }
            
            @media print { 
                body { padding: 0; margin: 0; width: 100%; }
            }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header-box">
          <div class="shop-info">
            <h1>${shop.gst_invoice_format || "Tax Invoice"}</h1>
            <div style="font-weight:bold; font-size:14px; margin-bottom:4px;">${
              shop.use_alias_on_bills && shop.shop_alias
                ? shop.shop_alias
                : shop.shop_name
            }</div>
            <div>${
              shop.use_alias_on_bills && shop.shop_alias
                ? ""
                : formatAddress(
                    shop.address_line1,
                    shop.city,
                    shop.state,
                    shop.pincode
                  )
            }</div>
            ${
              gstEnabled
                ? `<div style="margin-top:4px;"><strong>GSTIN: ${
                    shop.gstin || "N/A"
                  }</strong> | Ph: ${shop.contact_number || ""}</div>`
                : `<div>Ph: ${shop.contact_number || ""}</div>`
            }
          </div>
          <div class="invoice-meta">
            <div class="flex" style="justify-content:space-between; margin-bottom:4px;">
                <span>Invoice No:</span> <span class="bold">${
                  sale.reference_no
                }</span>
            </div>
            <div class="flex" style="justify-content:space-between; margin-bottom:4px;">
                <span>Date:</span> <span class="bold">${formatDate(
                  sale.created_at
                )}</span>
            </div>
            <div class="flex" style="justify-content:space-between;">
                <span>State:</span> <span>${
                  sale.customer_state || shop.state
                }</span>
            </div>
          </div>
        </div>

        <!-- Customer -->
        <div class="customer-row">
          <div class="bill-to">
            <span style="font-size:9px; color:#555; text-transform:uppercase;">Billed To:</span><br>
            <span class="bold" style="font-size:12px;">${
              sale.customer_name || "Cash Customer"
            }</span><br>
            ${formatAddress(
              sale.customer_address,
              sale.customer_city,
              sale.customer_state,
              sale.customer_pincode
            )}
            ${sale.customer_phone ? `<br>Ph: ${sale.customer_phone}` : ""}
          </div>
          <div class="extra-meta">
             ${
               gstEnabled
                 ? `<div>Cust GST: ${
                     sale.customer_gst_no || "Unregistered"
                   }</div>`
                 : ""
             }
             <div style="margin-top:4px;">Mode: ${
               sale.payment_mode || "Cash"
             }</div>
          </div>
        </div>

        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              <th width="5%" class="text-center">#</th>
              <th width="35%" style="text-align:left;">Item Name</th>
              ${showHSN ? `<th width="10%" class="text-center">HSN</th>` : ""}
              <th width="8%" class="text-center">Qty</th>
              <th width="12%" class="text-right">Rate</th>
              
              ${
                gstEnabled ? `<th width="8%" class="text-center">GST%</th>` : ""
              }
              ${
                gstEnabled && showGstBreakup
                  ? `<th width="12%" class="text-right">GST Amt</th>`
                  : ""
              }
              
              <th width="15%" class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <!-- Footer Section -->
        <div class="footer-section">
          
          <!-- Words & Tax Summary (if needed) -->
          <div class="amount-words">
            <div style="font-weight:bold; margin-bottom:4px;">Amount in Words:</div>
            <div style="font-style:italic; margin-bottom:8px;">${numberToWords(
              sale.total_amount
            )}</div>
            
            ${
              gstEnabled
                ? `
            <div style="border-top:1px dotted #ccc; padding-top:4px; font-size:9px;">
               <div>Taxable: ${formatAmount(totalTaxableValue)}</div>
               ${
                 isInterstate
                   ? `<div>IGST: ${formatAmount(totalIgst)}</div>`
                   : `<div>CGST: ${formatAmount(
                       totalCgst
                     )} | SGST: ${formatAmount(totalSgst)}</div>`
               }
               <div class="bold">Total Tax: ${formatAmount(
                 totalTaxAmount
               )}</div>
            </div>`
                : ""
            }
          </div>
          
          <!-- Bank & QR -->
          <div class="bank-details">
             <div class="bold" style="margin-bottom:2px;">Bank Details:</div>
             <div>${shop.bank_name || ""}</div>
             <div>A/C: ${shop.bank_account_no || ""}</div>
             <div>IFSC: ${shop.bank_account_ifsc_code || ""}</div>
             ${
               shop.generated_upi_qr
                 ? `<div class="qr-wrap"><img src="${shop.generated_upi_qr}" style="width:70px;height:70px;" /></div>`
                 : ""
             }
          </div>

          <!-- Totals -->
          <div class="totals-area">
             <div class="flex" style="justify-content:space-between; margin-bottom:4px;">
                <span>Subtotal:</span> 
                <span>${formatAmount(
                  sale.total_amount + (sale.discount || 0)
                )}</span>
             </div>
             ${
               sale.discount > 0
                 ? `<div class="flex" style="justify-content:space-between; margin-bottom:4px; color:red;">
                      <span>Discount:</span> 
                      <span>-${formatAmount(sale.discount)}</span>
                    </div>`
                 : ""
             }
             
             <div class="flex bold" style="justify-content:space-between; font-size:14px; margin-top:8px; border-top:1px solid #000; padding-top:6px;">
                <span>TOTAL:</span> 
                <span>${formatAmount(sale.total_amount)}</span>
             </div>
             
             <div class="flex" style="justify-content:space-between; font-size:10px; margin-top:4px;">
                <span>Paid:</span> 
                <span>${formatAmount(sale.paid_amount)}</span>
             </div>
          </div>
        </div>

        <div class="signature-area">
           <div style="font-size:9px; width:60%;">
              <strong>Terms:</strong><br>
              1. Goods once sold will not be taken back.<br>
              2. Subject to ${shop.city} jurisdiction.
           </div>
           <div style="text-align:right; width:40%;">
              <div style="font-weight:bold; font-size:10px;">For ${
                shop.shop_name
              }</div>
              <div style="font-size:9px;">Authorized Signature</div>
           </div>
        </div>
      </body>
    </html>`;
}

module.exports = {
  createInvoiceHTML,
  formatAmount,
  formatDate,
  formatAddress,
  numberToWords,
};
