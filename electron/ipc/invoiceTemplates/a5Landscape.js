const {
  formatAddress,
  formatDate,
  formatAmount,
  numberToWords,
} = require("../../invoiceTemplate.js");
const { getTrackingHtml, BRANDING_FOOTER } = require("./utils.js");

const a5Landscape = (data) => {
  const { sale, shop } = data;

  // 1. Preferences & Dynamic UI
  const gstEnabled = Boolean(shop.gst_enabled);
  const showHSN = Boolean(shop.hsn_required);
  const inclusiveTax = Boolean(shop.inclusive_tax_pricing);
  const showGstBreakup =
    shop.show_gst_breakup !== undefined ? Boolean(shop.show_gst_breakup) : true;
  const showDiscountCol = Boolean(shop.show_discount_column);

  // Per Guide: If inclusive, hide per-item GST columns
  const showGstPerItem = gstEnabled && !inclusiveTax;

  // Header State Logic
  const isInterstate =
    gstEnabled &&
    shop.state &&
    sale.customer_state &&
    shop.state.toLowerCase() !== sale.customer_state.toLowerCase();

  // 2. Pagination & Row Counting
  // A5 Landscape is shorter (148mm), 12 rows is optimal for filling the space properly
  const ROWS_PER_PAGE = 10;
  const items = sale.items;
  const totalPages = Math.ceil(items.length / ROWS_PER_PAGE) || 1;

  // Pre-calculate totals for footer tax summary
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

  // Calculate Colspan for Page Tracker
  let totalColumns = 4; // #, Name, Qty, Rate
  if (showHSN) totalColumns++;
  if (showDiscountCol) totalColumns++;
  if (showGstPerItem) totalColumns++;
  if (showGstPerItem && showGstBreakup) totalColumns++;
  totalColumns++; // Total

  const renderPage = (pageData) => {
    const { items: pageItems, isLastPage, pageIndex, totalPages } = pageData;

    const itemsHTML = pageItems
      .map((item, i) => {
        const valAfterDisc =
          item.rate * item.quantity * (1 - (item.discount || 0) / 100);
        let gstAmount =
          gstEnabled && !inclusiveTax
            ? valAfterDisc * (item.gst_rate / 100)
            : 0;

        return `
        <tr class="data-row">
            <td class="text-center">${(pageIndex - 1) * ROWS_PER_PAGE + i + 1}</td>
            <td style="text-align:left;">
                <div class="item-name">${item.product_name}</div>
                ${getTrackingHtml(item)}
            </td>
            ${showHSN ? `<td class="text-center">${item.hsn || "-"}</td>` : ""}
            <td class="text-center">${item.quantity}</td>
            <td class="text-right">${formatAmount(item.rate)}</td>
            ${showDiscountCol ? `<td class="text-center">${item.discount || 0}%</td>` : ""}
            ${showGstPerItem ? `<td class="text-center">${item.gst_rate}%</td>` : ""}
            ${showGstPerItem && showGstBreakup ? `<td class="text-right">${formatAmount(gstAmount)}</td>` : ""}
            <td class="text-right bold">${formatAmount(item.price)}</td>
        </tr>`;
      })
      .join("");

    // 3. Filler Row Strategy (CSS Height: auto)
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

    // 4. Page Tracker Row
    const pageTrackerRow =
      totalPages > 1
        ? `
        <tr class="page-tracker-row">
            <td colspan="${totalColumns}">Page ${pageIndex} of ${totalPages}</td>
        </tr>`
        : "";

    return `
    <div class="page-container">
        <!-- Header -->
        <div class="header-box">
          <div class="shop-info">
            <h1>${shop.gst_invoice_format || "Tax Invoice"}</h1>
            <div class="bold" style="font-size:13px;">${shop.use_alias_on_bills && shop.shop_alias ? shop.shop_alias : shop.shop_name}</div>
            <div style="font-size:9px;">${formatAddress(shop.address_line1, shop.city, shop.state, shop.pincode)}</div>
            <div style="font-size:9px;">Ph: ${shop.contact_number} ${gstEnabled ? `| <strong>GSTIN: ${shop.gstin}</strong>` : ""}</div>
          </div>
          <div class="invoice-meta">
            <div class="flex-between"><span>Invoice No:</span> <span class="bold">${sale.reference_no}</span></div>
            <div class="flex-between"><span>Date:</span> <span class="bold">${formatDate(sale.created_at)}</span></div>
            <div class="flex-between"><span>State:</span> <span>${sale.customer_state || shop.state}</span></div>
          </div>
        </div>

        <!-- Customer -->
        <div class="customer-row">
          <div class="bill-to">
            <span class="label">BILLED TO:</span><br>
            <span class="bold" style="font-size:11px;">${sale.customer_name || "Cash Customer"}</span><br>
            <span style="font-size:9px;">${sale.customer_address || ""} ${sale.customer_phone ? `(Ph: ${sale.customer_phone})` : ""}</span>
          </div>
          <div class="extra-meta">
             ${gstEnabled ? `<div>Cust GST: ${sale.customer_gst_no || "Unregistered"}</div>` : ""}
             <div>Pay Mode: ${sale.payment_mode || "Cash"}</div>
          </div>
        </div>

        <!-- Items Table Container (Flex Grow) -->
        <div class="items-table-container">
          <table>
            <thead>
              <tr>
                <th width="4%" class="text-center">#</th>
                <th width="35%">Item Name</th>
                ${showHSN ? `<th width="8%" class="text-center">HSN</th>` : ""}
                <th width="8%" class="text-center">Qty</th>
                <th width="12%" class="text-right">Rate</th>
                ${showDiscountCol ? `<th width="7%" class="text-center">Disc</th>` : ""}
                ${showGstPerItem ? `<th width="7%" class="text-center">GST%</th>` : ""}
                ${showGstPerItem && showGstBreakup ? `<th width="10%" class="text-right">GST Amt</th>` : ""}
                <th width="12%" class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
              ${fillerRowHTML}
              ${pageTrackerRow}
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="footer-section">
          <div class="footer-left">
            <div>
              <div class="bold">Amount in Words:</div>
              <div style="font-style:italic;">${numberToWords(sale.total_amount)}</div>
              ${inclusiveTax ? `<div style="font-weight:bold; margin-top:4px;">* Prices are inclusive of GST</div>` : ""}
              ${
                gstEnabled && showGstBreakup && !inclusiveTax
                  ? `
                <div style="margin-top:6px; font-size:9px; border-top:1px dotted #ccc; padding-top:4px;">
                    Taxable: ${formatAmount(totalTaxableValue)}<br>
                    ${isInterstate ? `IGST: ${formatAmount(totalIgst)}` : `CGST: ${formatAmount(totalCgst)} | SGST: ${formatAmount(totalSgst)}`}
                </div>`
                  : ""
              }
            </div>

            <div class="bank-qr-row">
              <div class="bank-details">
                <div class="bold">Bank Details:</div>
                <div>${shop.bank_name || "N/A"} | A/C: ${shop.bank_account_no || "N/A"}</div>
                <div>IFSC: ${shop.bank_account_ifsc_code || "N/A"}</div>
              </div>
              ${shop.generated_upi_qr ? `<div><img src="${shop.generated_upi_qr}" class="qr-img" /></div>` : ""}
            </div>
          </div>

          <div class="footer-right">
             <div class="totals-box">
               ${
                 isLastPage
                   ? `
               <div class="flex-between"><span>Subtotal:</span> <span>${formatAmount(sale.total_amount + (sale.discount || 0))}</span></div>
               ${sale.discount > 0 ? `<div class="flex-between" style="color:red;"><span>Disc:</span> <span>-${formatAmount(sale.discount)}</span></div>` : ""}
               <div class="grand-total flex-between">
                  <span>TOTAL:</span> <span>${formatAmount(sale.total_amount)}</span>
               </div>
               `
                   : `<div class="continued">Continued...</div>`
               }
             </div>

             <div class="signature-box">
                <div style="margin-bottom:12px;">For ${shop.shop_name}</div>
                <div style="font-weight:normal; font-size:8px;">Authorized Signature</div>
             </div>
          </div>
        </div>
        ${BRANDING_FOOTER}
    </div>`;
  };

  const pages = [];
  for (let i = 0; i < totalPages; i++) {
    pages.push({
      items: items.slice(i * ROWS_PER_PAGE, (i + 1) * ROWS_PER_PAGE),
      isLastPage: i === totalPages - 1,
      pageIndex: i + 1,
      totalPages: totalPages,
    });
  }

  return `
    <html>
      <head>
        <style>
          @page { size: A5 landscape; margin: 0; }
          body { font-family: 'Arial', sans-serif; font-size: 10px; color: #000; margin: 0; padding: 0; background: #fff; }
          .page-container { width: 210mm; height: 148mm; padding: 8mm; box-sizing: border-box; display: flex; flex-direction: column; page-break-after: always; }
          .page-container:last-child { page-break-after: auto; }
          .bold { font-weight: bold; }
          .flex-between { display: flex; justify-content: space-between; } 
          .header-box { display: flex; border: 1px solid #000; border-bottom: 0; }
          .shop-info { flex: 1; padding: 6px; border-right: 1px solid #000; }
          .invoice-meta { width: 30%; padding: 6px; font-size: 9px; }
          h1 { margin: 0; font-size: 15px; text-transform: uppercase; color: #333; }
          .customer-row { display: flex; border: 1px solid #000; border-bottom: 0; }
          .bill-to { flex: 1; padding: 4px 6px; border-right: 1px solid #000; }
          .label { font-size: 8px; color: #666; font-weight: bold; }
          .extra-meta { width: 30%; padding: 4px 6px; font-size: 9px; }
          .items-table-container { flex-grow: 1; display: flex; border: 1px solid #000; border-bottom: 0; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; height: 100%; }
          th { background: #f2f2f2; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px; font-size: 8px; text-transform: uppercase; text-align: left; }
          td { border-right: 1px solid #000; padding: 3px 5px; vertical-align: middle; }
          tr.data-row { height: 1px; }
          tr.filler-row { height: auto; }
          tr.filler-row td { border-bottom: 0; }
          tr.page-tracker-row { height: 1px; background: #fafafa; border-top: 1px solid #000; }
          tr.page-tracker-row td { text-align: center; font-size: 7px; color: #888; padding: 1px; font-weight: bold; border-right: 0; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .item-name { font-size: 9px; font-weight: 500; }
          .footer-section { display: flex; border: 1px solid #000; min-height: 30mm; }
          .footer-left { flex: 1; padding: 6px; border-right: 1px solid #000; font-size: 8px; display: flex; flex-direction: column; justify-content: space-between; }
          .footer-right { width: 30%; padding: 6px; display: flex; flex-direction: column; justify-content: space-between; }
          .bank-qr-row { display: flex; gap: 8px; margin-top: 4px; border-top: 1px dotted #ccc; padding-top: 4px; align-items: center; }
          .bank-details { flex: 1; line-height: 1.2; }
          .qr-img { width: 45px; height: 45px; border: 1px solid #ddd; padding: 1px; }
          .grand-total { border-top: 1px solid #000; margin-top: 4px; padding-top: 4px; font-weight: bold; font-size: 12px; }
          .continued { height: 30px; display: flex; align-items: center; justify-content: flex-end; color: #999; font-style: italic; }
          .signature-box { text-align: right; font-weight: bold; font-size: 9px; }
        </style>
      </head>
      <body>${pages.map(renderPage).join("")}</body>
    </html>`;
};

module.exports = a5Landscape;
