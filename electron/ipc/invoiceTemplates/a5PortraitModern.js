const {
  formatAddress,
  formatDate,
  formatAmount,
  numberToWords,
} = require("../../invoiceTemplate.js");
const { getTrackingHtml, BRANDING_FOOTER, getLogoSrc } = require("./utils.js");

const a5PortraitCentered = (data) => {
  const { sale, shop, localSettings } = data;

  const colSettings = localSettings?.columns || {};
  const displaySettings = localSettings?.display || {};
  const legalSettings = localSettings?.legal || {};

  // Dynamic Logo Construction
  const logoSrc = getLogoSrc(shop.logo_url || shop.logo);

  // Snapshot Variables
  const custName = sale.customer_name || "Cash Customer";
  const custPhone = sale.customer_phone || "";
  const custAddress = sale.bill_address || sale.customer_address || "";
  const custCity = sale.customer_city || "";
  const custState = sale.state || sale.customer_state || "";
  const custPincode = sale.pincode || sale.customer_pincode || "";
  const custGst = sale.gstin || sale.customer_gst_no || "";

  // 1. Preferences & Dynamic UI
  const gstEnabled = Boolean(shop.gst_enabled);
  const inclusiveTax = Boolean(shop.inclusive_tax_pricing);

  const showHSN = Boolean(colSettings.showHsnSac ?? true);
  const showDiscountCol = Boolean(colSettings.showDiscountCol ?? false);
  const showGstBreakup = Boolean(
    displaySettings.showGstBreakdownBottom ?? true,
  );

  const jurisdiction = legalSettings.jurisdiction || "";
  const disclaimer = legalSettings.disclaimer || "";
  const termsAndConditions = legalSettings.termsAndConditions || "";

  const showGstPctCol =
    gstEnabled && Boolean(colSettings.showGstRateCol ?? true);
  const showGstAmtCol =
    gstEnabled && Boolean(colSettings.showGstAmtCol ?? true) && !inclusiveTax;

  const isInterstate =
    gstEnabled &&
    shop.state &&
    custState &&
    shop.state.toLowerCase() !== custState.toLowerCase();

  // 2. Pagination (Reduced to 15 to accommodate taller centered header)
  const ROWS_PER_PAGE = 15;
  const items = sale.items;
  const totalPages = Math.ceil(items.length / ROWS_PER_PAGE) || 1;

  let totalTaxableValue = 0,
    totalTaxAmount = 0,
    totalCgst = 0,
    totalSgst = 0,
    totalIgst = 0;

  const subTotal = sale.items.reduce((sum, item) => sum + (item.price || 0), 0);
  const discountPercentage = sale.discount || 0;
  const discountAmount = (subTotal * discountPercentage) / 100;
  const netAmount = subTotal - discountAmount;
  const roundOff = sale.total_amount - netAmount;

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

  let totalColumns = 5;
  if (showHSN) totalColumns++;
  if (showDiscountCol) totalColumns++;
  if (showGstPctCol) totalColumns++;
  if (showGstAmtCol) totalColumns++;

  const renderPage = (pageData) => {
    const { items: pageItems, isLastPage, pageIndex, totalPages } = pageData;

    const itemsHTML = pageItems
      .map((item, i) => {
        const valAfterDisc =
          item.rate * item.quantity * (1 - (item.discount || 0) / 100);
        let gstAmount =
          gstEnabled && !inclusiveTax
            ? valAfterDisc * ((item.gst_rate || 0) / 100)
            : 0;

        return `
        <tr class="data-row">
            <td class="text-center">${(pageIndex - 1) * ROWS_PER_PAGE + i + 1}</td>
            <td style="text-align:left;">
                <div class="item-name">${item.product_name || item.name || "Unknown"}</div>
                ${item.description ? `<div style="font-size: 8px; font-style: italic; color: #555;">${item.description}</div>` : ""}
                ${getTrackingHtml(item)}
            </td>
            ${showHSN ? `<td class="text-center">${item.hsn || "-"}</td>` : ""}
            <td class="text-center">${item.quantity} ${item.unit || ""}</td>
            <td class="text-right">${formatAmount(item.rate)}</td>
            ${showDiscountCol ? `<td class="text-center">${item.discount || 0}%</td>` : ""}
            ${showGstPctCol ? `<td class="text-center">${item.gst_rate || 0}%</td>` : ""}
            ${showGstAmtCol ? `<td class="text-right">${formatAmount(gstAmount)}</td>` : ""}
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
            ${showGstPctCol ? `<td style="border-right:1px solid #000;">&nbsp;</td>` : ""}
            ${showGstAmtCol ? `<td style="border-right:1px solid #000;">&nbsp;</td>` : ""}
            <td style="">&nbsp;</td>
        </tr>`;

    const pageTrackerRow =
      totalPages > 1
        ? `<tr class="page-tracker-row"><td colspan="${totalColumns}">Page ${pageIndex} of ${totalPages}</td></tr>`
        : "";

    return `
    <div class="page-container">
        
        <!-- MODERN CENTERED HEADER -->
        <div class="centered-header">
            ${logoSrc ? `<img src="${logoSrc}" class="logo-img" onerror="this.style.display='none'" />` : ""}
            <div class="shop-name">${shop.use_alias_on_bills && shop.shop_alias ? shop.shop_alias : shop.shop_name}</div>
            <div class="shop-address">${formatAddress(shop.address_line1, shop.city, shop.state, shop.pincode)}</div>
            <div class="shop-contact">Ph: ${shop.contact_number} ${gstEnabled ? `| <strong>GSTIN: ${shop.gstin}</strong>` : ""}</div>
        </div>

        <div class="invoice-title-bar">
            ${shop.gst_invoice_format || "TAX INVOICE"}
        </div>

        <!-- CUSTOMER & META ROW -->
        <div class="customer-meta-section">
            <div class="bill-to-box">
                <div class="label">BILLED TO:</div>
                <div class="bold" style="font-size:12px; margin-top:2px;">${custName}</div>
                <div style="font-size:9px; margin-top:2px;">${formatAddress(custAddress, custCity, custState, custPincode)} ${custPhone ? `<br>Ph: ${custPhone}` : ""}</div>
                ${gstEnabled ? `<div style="font-size:9px; margin-top:2px;">Cust GST: ${custGst || "Unregistered"}</div>` : ""}
            </div>
            
            <div class="invoice-details-box">
                <table class="meta-table">
                    <tr><td class="meta-label">Invoice No:</td><td class="bold text-right">${sale.reference_no}</td></tr>
                    <tr><td class="meta-label">Date:</td><td class="bold text-right">${formatDate(sale.created_at)}</td></tr>
                    <tr><td class="meta-label">State:</td><td class="text-right">${custState || shop.state || ""}</td></tr>
                    <tr><td class="meta-label">Mode:</td><td class="text-right">${sale.payment_mode || "Cash"}</td></tr>
                </table>
            </div>
        </div>

        <!-- ITEMS TABLE (Laser Printer Optimized - No Grey Backgrounds) -->
        <div class="items-table-container">
          <table>
            <thead>
              <tr>
                <th width="5%" class="text-center">#</th>
                <th width="35%">Item Name</th>
                ${showHSN ? `<th width="8%" class="text-center">HSN</th>` : ""}
                <th width="8%" class="text-center">Qty</th>
                <th width="12%" class="text-right">Rate</th>
                ${showDiscountCol ? `<th width="8%" class="text-center">Disc</th>` : ""}
                ${showGstPctCol ? `<th width="8%" class="text-center">GST%</th>` : ""}
                ${showGstAmtCol ? `<th width="12%" class="text-right">GST Amt</th>` : ""}
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

        <!-- FOOTER -->
        <div class="footer-section">
          <div class="footer-left">
            <div>
              <div class="bold">Amount in Words:</div>
              <div style="font-style:italic; margin-bottom:8px;">${numberToWords(sale.total_amount)}</div>
              ${
                gstEnabled && showGstBreakup
                  ? `
                  <div style="font-size:9px; border-top:1px dotted #000; padding-top:4px;">
                      Taxable: ${formatAmount(totalTaxableValue)}<br>
                      ${isInterstate ? `IGST: ${formatAmount(totalIgst)}` : `CGST: ${formatAmount(totalCgst)} | SGST: ${formatAmount(totalSgst)}`}
                  </div>`
                  : ""
              }
              ${inclusiveTax ? `<div style="font-weight: bold; font-size: 10px; margin-top: 6px;">* All prices are inclusive of GST</div>` : ""}
            </div>

            <div class="bank-qr-row">
              <div class="bank-details">
                <div class="bold" style="text-decoration: underline;">Bank Details</div>
                <div style="margin-top:2px;">${shop.bank_name || "N/A"}</div>
                <div>A/C: ${shop.bank_account_no || "N/A"}</div>
                <div>IFSC: ${shop.bank_account_ifsc_code || "N/A"}</div>
              </div>
              ${shop.generated_upi_qr ? `<div><img src="${shop.generated_upi_qr}" onerror="this.style.display='none'" class="qr-img" /></div>` : ""}
            </div>
            
            <div class="legal-terms">
                ${termsAndConditions ? `<strong>Terms:</strong><br>${termsAndConditions}<br>` : ""}
                ${disclaimer ? `<strong>Disclaimer:</strong> ${disclaimer}<br>` : ""}
                ${jurisdiction ? `<em>${jurisdiction}</em>` : ""}
            </div>
          </div>

          <div class="footer-right">
             <div class="totals-box">
               ${
                 isLastPage
                   ? `
               <div class="flex-between"><span>Subtotal:</span> <span>${formatAmount(subTotal)}</span></div>
               ${discountPercentage > 0 ? `<div class="flex-between" style="color:#d32f2f;"><span>Disc (${discountPercentage}%):</span> <span>-${formatAmount(discountAmount)}</span></div>` : ""}
               ${Math.abs(roundOff) > 0.01 ? `<div class="flex-between"><span>Round Off:</span> <span>${roundOff > 0 ? "+" : ""}${formatAmount(roundOff)}</span></div>` : ""}
               <div class="grand-total flex-between">
                  <span>TOTAL:</span> <span>${formatAmount(sale.total_amount)}</span>
               </div>
               <div class="flex-between" style="font-size:10px; margin-top:4px;"><span>Paid:</span> <span>${formatAmount(sale.paid_amount)}</span></div>
               `
                   : `<div class="continued">Continued...</div>`
               }
             </div>

             <div class="signature-box">
                <div style="margin-bottom:15px;">For ${shop.shop_name}</div>
                <div style="font-weight:normal; font-size:9px; border-top: 1px solid #000; padding-top:4px; display:inline-block;">Authorized Signature</div>
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
          @page { size: A5 portrait; margin: 0; }
          body { font-family: 'Arial', sans-serif; font-size: 11px; color: #000; margin: 0; padding: 0; background: #fff; }
          .page-container { width: 148mm; height: 210mm; padding: 10mm; box-sizing: border-box; display: flex; flex-direction: column; page-break-after: always; }
          .page-container:last-child { page-break-after: auto; }
          
          .bold { font-weight: bold; }
          .flex-between { display: flex; justify-content: space-between; } 
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          
          /* Modern Centered Layout CSS */
          .centered-header { text-align: center; margin-bottom: 6px; }
          .logo-img { max-height: 55px; max-width: 180px; object-fit: contain; margin-bottom: 6px; }
          .shop-name { font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
          .shop-address { font-size: 9px; margin-top: 2px; }
          .shop-contact { font-size: 9px; margin-top: 2px; color: #000; }
          
          .invoice-title-bar { text-align: center; font-size: 14px; font-weight: bold; letter-spacing: 1px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; margin-bottom: 6px; }
          
          .customer-meta-section { display: flex; justify-content: space-between; margin-bottom: 6px; }
          .bill-to-box { width: 60%; }
          .label { font-size: 9px; color: #000; text-transform: uppercase; font-weight: bold; border-bottom: 1px solid #000; display: inline-block; padding-bottom: 1px; }
          
          .invoice-details-box { width: 35%; }
          .meta-table { width: 100%; border: none; }
          .meta-table td { padding: 1px 0; border: none; font-size: 10px; }
          .meta-label { color: #000; width: 45%; }

          .items-table-container { flex-grow: 1; display: flex; border: 1px solid #000; border-bottom: 0; overflow: hidden; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; height: 100%; }
          
          /* Laser-friendly tables: No background color, strong borders */
          th { border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 6px; font-size: 9px; text-transform: uppercase; text-align: left; background: #fff; }
          td { border-right: 1px solid #000; padding: 4px 6px; vertical-align: middle; font-size: 9px; }
          tr.data-row { height: 1px; }
          tr.filler-row { height: auto; }
          tr.filler-row td { border-bottom: 0; }
          tr.page-tracker-row { height: 1px; border-top: 1px solid #000; }
          tr.page-tracker-row td { text-align: center; font-size: 8px; padding: 2px; font-weight: bold; border-right: 0; }
          .item-name { font-size: 10px; font-weight: 500; }

          .footer-section { display: flex; border: 1px solid #000; flex-shrink: 0; min-height: 45mm; }
          .footer-left { flex: 1; padding: 8px; border-right: 1px solid #000; font-size: 10px; display: flex; flex-direction: column; justify-content: space-between; }
          .footer-right { width: 35%; padding: 8px; display: flex; flex-direction: column; justify-content: space-between; }
          
          .bank-qr-row { display: flex; gap: 10px; margin-top: 6px; border-top: 1px dashed #000; padding-top: 6px; align-items: center; }
          .bank-details { flex: 1; line-height: 1.3; font-size: 9px; }
          .qr-img { width: 50px; height: 50px; border: 1px solid #000; padding: 1px; }
          .legal-terms { font-size: 9px; color: #000; line-height: 1.3; margin-top: 8px; }
          
          .grand-total { border-top: 1px solid #000; margin-top: 6px; padding-top: 6px; font-weight: bold; font-size: 14px; }
          .continued { height: 40px; display: flex; align-items: center; justify-content: center; color: #000; font-style: italic; }
          .signature-box { text-align: right; font-weight: bold; font-size: 10px; }
        </style>
      </head>
      <body>${pages.map(renderPage).join("")}</body>
    </html>`;
};

module.exports = a5PortraitCentered;
