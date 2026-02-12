// invoiceTemplate.js - Standard A4 Template with Dynamic Preferences

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
  if (paise > 0) words += " and " + inWords(paise) + " Paise";
  return words + " Only";
}

const getTrackingHtml = (item) => {
  const parts = [];
  if (item.batch_number) parts.push(`Batch: ${item.batch_number}`);
  if (item.expiry_date) parts.push(`Exp: ${formatDate(item.expiry_date)}`);
  if (item.serial_number) parts.push(`S/N: ${item.serial_number}`);
  if (parts.length === 0) return "";
  return `<div style="font-size: 8px; color: #555; font-style: italic; margin-top: 1px;">${parts.join(" | ")}</div>`;
};

const BRANDING_FOOTER = `
  <div style="text-align:center; margin-top:5px; font-size:9px; color:#888; border-top:1px dotted #ddd; padding-top:2x;">
    Powered by KOSH Software &bull; +91 8180904072
  </div>
`;

// --- DYNAMIC A4 GENERATOR ---
function createInvoiceHTML({ sale, shop }) {
  // Shop Preferences
  const gstEnabled = Boolean(shop.gst_enabled);
  const showHSN = Boolean(shop.hsn_required);
  const inclusiveTax = Boolean(shop.inclusive_tax_pricing);
  const showGstBreakup =
    shop.show_gst_breakup !== undefined ? Boolean(shop.show_gst_breakup) : true;
  const showDiscountCol = Boolean(shop.show_discount_column);

  // Logic: If pricing is inclusive, we hide per-item GST columns as per request
  const showGstPerItem = gstEnabled && !inclusiveTax;

  // Header State Logic
  const isInterstate =
    gstEnabled &&
    shop.state &&
    sale.customer_state &&
    shop.state.toLowerCase() !== sale.customer_state.toLowerCase();

  // Footer Calculations
  let totalTaxableValue = 0,
    totalTaxAmount = 0,
    totalCgst = 0,
    totalSgst = 0,
    totalIgst = 0;

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

  // Pagination Logic (Increased ROWS_PER_PAGE to 28 to fill the page better)
  const ROWS_PER_PAGE = 24;
  const items = sale.items;
  const totalPages = Math.ceil(items.length / ROWS_PER_PAGE) || 1;
  const pages = [];
  for (let i = 0; i < totalPages; i++) {
    pages.push({
      items: items.slice(i * ROWS_PER_PAGE, (i + 1) * ROWS_PER_PAGE),
      isLastPage: i === totalPages - 1,
      pageIndex: i + 1,
      totalPages: totalPages,
    });
  }

  // Determine Column Span for Page Tracker
  let totalColumns = 4; // #, Name, Qty, Rate
  if (showHSN) totalColumns++;
  if (showDiscountCol) totalColumns++;
  if (showGstPerItem) totalColumns++; // GST %
  if (showGstPerItem && showGstBreakup) totalColumns++; // GST Amt
  totalColumns++; // Total

  const renderPage = ({
    items: pageItems,
    isLastPage,
    pageIndex,
    totalPages,
  }) => {
    const itemsHTML = pageItems
      .map((item, index) => {
        const baseVal = item.rate * item.quantity;
        const valAfterDisc = baseVal * (1 - (item.discount || 0) / 100);
        let gstAmount = 0;
        if (gstEnabled && !inclusiveTax) {
          gstAmount = valAfterDisc * (item.gst_rate / 100);
        }

        return `
    <tr class="data-row">
      <td class="text-center">${(pageIndex - 1) * ROWS_PER_PAGE + index + 1}</td>
      <td style="text-align:left;">
        <div class="item-name">${item.product_name}</div>
        ${getTrackingHtml(item)}
      </td>
      ${showHSN ? `<td class="text-center">${item.hsn || "-"}</td>` : ""}
      <td class="text-center">${item.quantity} ${item.unit || ""}</td>
      <td class="text-right">${formatAmount(item.rate)}</td>
      ${showDiscountCol ? `<td class="text-center">${item.discount || 0}%</td>` : ""}
      ${showGstPerItem ? `<td class="text-center">${item.gst_rate}%</td>` : ""}
      ${showGstPerItem && showGstBreakup ? `<td class="text-right">${formatAmount(gstAmount)}</td>` : ""}
      <td class="text-right bold">${formatAmount(item.price)}</td>
    </tr>`;
      })
      .join("");

    const fillerRowHTML = `
        <tr class="filler-row">
            <td style="border-right:1px solid #000;">&nbsp;</td>
            <td style="border-right:1px solid #000;">&nbsp;</td>
            ${showHSN ? `<td style="border-right:1px solid #000;">&nbsp;</td>` : ""}
            <td style="border-right:1px solid #000;">&nbsp;</td>
            <td style="border-right:1px solid #000;">&nbsp;</td>
            ${showDiscountCol ? `<td style="border-right:1px solid #000;">&nbsp;</td>` : ""}
            ${showGstPerItem ? `<td style="border-right:1px solid #000;">&nbsp;</td>` : ""}
            ${showGstPerItem && showGstBreakup ? `<td style="border-right:1px solid #000;">&nbsp;</td>` : ""}
            <td style="">&nbsp;</td>
        </tr>`;

    const pageTrackerRow =
      totalPages > 1
        ? `
        <tr class="page-tracker-row">
            <td colspan="${totalColumns}">
                Page ${pageIndex} of ${totalPages}
            </td>
        </tr>`
        : "";

    return `
    <div class="page-container">
        <div class="header-box">
          <div class="shop-info">
            <h1>${shop.gst_invoice_format || "Tax Invoice"}</h1>
            <div class="bold" style="font-size:14px; margin-bottom:2px;">${shop.use_alias_on_bills && shop.shop_alias ? shop.shop_alias : shop.shop_name}</div>
            <div>${shop.use_alias_on_bills && shop.shop_alias ? "" : formatAddress(shop.address_line1, shop.city, shop.state, shop.pincode)}</div>
            ${gstEnabled ? `<div style="margin-top:2px;"><strong>GSTIN: ${shop.gstin || "N/A"}</strong> | Ph: ${shop.contact_number || ""}</div>` : `<div>Ph: ${shop.contact_number || ""}</div>`}
          </div>
          <div class="invoice-meta">
            <div class="flex-between"><span>Inv No:</span> <span class="bold">${sale.reference_no}</span></div>
            <div class="flex-between"><span>Date:</span> <span class="bold">${formatDate(sale.created_at)}</span></div>
            <div class="flex-between"><span>State:</span> <span>${sale.customer_state || shop.state}</span></div>
          </div>
        </div>

        <div class="customer-row">
          <div class="bill-to">
            <span class="label">Billed To:</span><br>
            <span class="bold" style="font-size:12px;">${sale.customer_name || "Cash Customer"}</span><br>
            ${formatAddress(sale.customer_address, sale.customer_city, sale.customer_state, sale.customer_pincode)}
            ${sale.customer_phone ? `<br>Ph: ${sale.customer_phone}` : ""}
          </div>
          <div class="extra-meta">
             ${gstEnabled ? `<div>Cust GST: ${sale.customer_gst_no || "Unregistered"}</div>` : ""}
             <div style="margin-top:2px;">Mode: ${sale.payment_mode || "Cash"}</div>
          </div>
        </div>

        <div class="items-table-container">
            <table>
              <thead>
                <tr>
                  <th width="5%" class="text-center">#</th>
                  <th width="32%" style="text-align:left;">Item Name</th>
                  ${showHSN ? `<th width="8%" class="text-center">HSN</th>` : ""}
                  <th width="8%" class="text-center">Qty</th>
                  <th width="12%" class="text-right">Rate</th>
                  ${showDiscountCol ? `<th width="8%" class="text-center">Disc</th>` : ""}
                  ${showGstPerItem ? `<th width="8%" class="text-center">GST%</th>` : ""}
                  ${showGstPerItem && showGstBreakup ? `<th width="12%" class="text-right">GST Amt</th>` : ""}
                  <th width="15%" class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
                ${fillerRowHTML}
                ${pageTrackerRow}
              </tbody>
            </table>
        </div>

        <div class="footer-section">
          <div class="amount-words">
            <div class="bold">Amount in Words:</div>
            <div style="font-style:italic; margin-bottom:8px;">${numberToWords(sale.total_amount)}</div>
           ${
             gstEnabled
               ? `
      ${
        showGstBreakup
          ? `
          <div style="margin-top:6px; font-size:9px; border-top:1px dotted #ccc; padding-top:4px;">
              Taxable: ${formatAmount(totalTaxableValue)}<br>
              ${
                isInterstate
                  ? `IGST: ${formatAmount(totalIgst)}`
                  : `CGST: ${formatAmount(totalCgst)} | SGST: ${formatAmount(totalSgst)}`
              }
          </div>`
          : ""
      }
      ${
        inclusiveTax
          ? `<div style="margin-top: 10px; font-weight: bold; font-size: 10px;">* All prices are inclusive of GST</div>`
          : ""
      }
    `
               : ""
           }
          </div>
          
          <div class="bank-details">
             <div class="bold">Bank Details:</div>
             <div>${shop.bank_name || ""}</div>
             <div>A/C: ${shop.bank_account_no || ""}</div>
             <div>IFSC: ${shop.bank_account_ifsc_code || ""}</div>
             ${shop.generated_upi_qr ? `<div class="qr-wrap"><img src="${shop.generated_upi_qr}" /></div>` : ""}
          </div>

          <div class="totals-area">
             ${
               isLastPage
                 ? `
             <div class="flex-between"><span>Subtotal:</span> <span>${formatAmount(sale.total_amount + (sale.discount || 0))}</span></div>
             ${sale.discount > 0 ? `<div class="flex-between" style="color:red;"><span>Discount:</span> <span>-${formatAmount(sale.discount)}</span></div>` : ""}
             <div class="grand-total flex-between"><span>TOTAL:</span> <span>${formatAmount(sale.total_amount)}</span></div>
             <div class="flex-between" style="font-size:10px; margin-top:2px;"><span>Paid:</span> <span>${formatAmount(sale.paid_amount)}</span></div>
             `
                 : `<div class="continued">Continued...</div>`
             }
          </div>
        </div>

        <div class="signature-area">
           <div class="terms">
              <strong>Terms:</strong><br>
              1. Goods once sold will not be taken back.<br>
              2. Subject to ${shop.city || "local"} jurisdiction.
           </div>
           <div class="auth-sign">
              <div class="bold">For ${shop.shop_name}</div>
              <div style="font-size:9px; margin-top:30px;">Authorized Signature</div>
           </div>
        </div>
        ${BRANDING_FOOTER}
    </div>`;
  };

  return `
    <html>
      <head>
        <style>
            @page { size: A4; margin: 0; }
            body { font-family: 'Arial', sans-serif; font-size: 11px; margin: 0; padding: 0; background-color: #fff; color: #000; }
            
            .page-container { 
                width: 210mm; 
                height: 290mm; 
                padding: 10mm; 
                box-sizing: border-box; 
                display: flex; 
                flex-direction: column; 
                page-break-after: always; 
            }
            .page-container:last-child { page-break-after: auto; }
            
            .text-right { text-align: right; } 
            .text-center { text-align: center; } 
            .bold { font-weight: bold; }
            .flex-between { display: flex; justify-content: space-between; } 
            
            .header-box { display: flex; border: 1px solid #000; border-bottom: 0; }
            .shop-info { flex: 1; padding: 8px; border-right: 1px solid #000; }
            .invoice-meta { width: 35%; padding: 8px; font-size: 10px; }
            h1 { margin: 0 0 4px 0; font-size: 18px; text-transform: uppercase; }
            
            .customer-row { display: flex; border: 1px solid #000; border-bottom: 0; }
            .bill-to { flex: 1; padding: 5px 8px; border-right: 1px solid #000; line-height: 1.3; }
            .label { font-size: 9px; color: #555; text-transform: uppercase; }
            .extra-meta { width: 35%; padding: 5px 8px; }

            .items-table-container { 
                flex-grow: 1; 
                display: flex; 
                border: 1px solid #000; 
                border-bottom: 0; 
                overflow: hidden;
            }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; height: 100%; }
            th { background: #eee; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 6px; font-size: 9px; text-transform: uppercase; }
            
            tr.data-row { height: 1px; }
            td { border-right: 1px solid #000; padding: 4px 6px; vertical-align: middle; font-size: 9px; }
            
            tr.filler-row { height: auto; }
            tr.filler-row td { border-bottom: 0; }
            
            tr.page-tracker-row { height: 1px; background: #fdfdfd; border-top: 1px solid #000; }
            tr.page-tracker-row td { text-align: center; font-size: 8px; color: #777; padding: 2px; font-weight: bold; border-right: 0; }

            .item-name { font-size: 10px; font-weight: 500; }
            
            .footer-section { display: flex; border: 1px solid #000; flex-shrink: 0; }
            .amount-words { flex: 1.5; padding: 8px; border-right: 1px solid #000; font-size: 10px; }
            .bank-details { flex: 1; padding: 8px; border-right: 1px solid #000; font-size: 9px; position: relative; }
            .totals-area { width: 30%; padding: 8px; }
            .grand-total { border-top: 1px solid #000; margin-top: 6px; padding-top: 6px; font-size: 14px; font-weight: bold; }
            
            .continued { height: 80px; display: flex; align-items: center; justify-content: center; color: #888; font-style: italic; }
            .signature-area { display: flex; justify-content: space-between; border: 1px solid #000; border-top: 0; padding: 8px; height: 70px; align-items: flex-end; }
            .terms { font-size: 8px; width: 60%; color: #444; }
            .auth-sign { text-align: right; width: 40%; }
            
            .qr-wrap { text-align: center; margin-top: 8px; }
            .qr-wrap img { width: 65px; height: 65px; border: 1px solid #eee; }
        </style>
      </head>
      <body>${pages.map(renderPage).join("")}</body>
    </html>`;
}

module.exports = {
  createInvoiceHTML,
  formatAddress,
  formatDate,
  formatAmount,
  numberToWords,
};
