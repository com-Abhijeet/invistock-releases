const {
  formatDate,
  formatAmount,
  formatAddress,
  numberToWords,
} = require("../../invoiceTemplate.js");
const { getTrackingHtml, BRANDING_FOOTER, getLogoSrc } = require("./utils.js");

const a4Modern = (data) => {
  const { sale, shop, localSettings } = data;
  const gstEnabled = Boolean(shop.gst_enabled);
  const isInclusive = shop.is_inclusive || false;

  const colSettings = localSettings.columns || {};
  const legalSettings = localSettings.legal || {};

  const showHsnSac = Boolean(colSettings.showHsnSac ?? true);
  const showDiscountCol = Boolean(colSettings.showDiscountCol ?? false);
  const showGstRateCol = Boolean(colSettings.showGstRateCol ?? true);
  const showGstAmtCol = Boolean(colSettings.showGstAmtCol ?? true);

  const jurisdiction = legalSettings.jurisdiction || "";
  const disclaimer = legalSettings.disclaimer || "";
  const termsAndConditions = legalSettings.termsAndConditions || "";

  // Dynamic Logo Construction - Updated to use logo_url first
  const logoSrc = getLogoSrc(shop.logo_url || shop.logo);

  // Snapshot Variables
  const custName = sale.customer_name || "Valued Customer";
  const custPhone = sale.customer_phone || "";
  const custAddress = sale.bill_address || sale.customer_address || "";
  const custCity = sale.customer_city || "";
  const custState = sale.state || sale.customer_state || "";
  const custPincode = sale.pincode || sale.customer_pincode || "";
  const custGst = sale.gstin || sale.customer_gst_no || "";

  // --- MULTI-PAGE LOGIC ---
  const ROWS_PER_PAGE = 20;
  const items = sale.items;
  const totalPages = Math.ceil(items.length / ROWS_PER_PAGE) || 1;

  // Calculate Totals Correctly
  const subTotal = sale.items.reduce((sum, item) => sum + (item.price || 0), 0);
  const discountPercentage = sale.discount || 0;
  const discountAmount = (subTotal * discountPercentage) / 100;
  const netAmount = subTotal - discountAmount;
  const roundOff = sale.total_amount - netAmount;

  const pages = [];
  for (let i = 0; i < totalPages; i++) {
    const start = i * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    const pageItems = items.slice(start, end);
    pages.push({
      items: pageItems,
      isLastPage: i === totalPages - 1,
      pageIndex: i + 1,
      totalPages: totalPages,
    });
  }

  const renderPage = (pageData) => {
    const { items: pageItems, isLastPage, pageIndex, totalPages } = pageData;

    return `
    <div class="page-container">
        <!-- HEADER -->
        <div class="header">
          <div style="display: flex; align-items: center; gap: 20px;">
            <div>
              <div class="brand-name">${shop.shop_name}</div>
              <div style="color: #4b5563; font-size: 13px; margin-top: 4px;">${
                shop.address_line1
              }, ${shop.city}</div>
              <div style="color: #4b5563; font-size: 13px;">${
                shop.contact_number
              }</div>
            </div>
            ${logoSrc ? `<img src="${logoSrc}" onerror="this.style.display='none'" style="max-height: 60px; max-width: 160px; object-fit: contain;" />` : ""}
          </div>
          <div>
            <div class="invoice-label">INVOICE</div>
            <div style="text-align: right; margin-top: 10px;">
              <div class="meta-label">Invoice #</div>
              <div class="meta-value">${sale.reference_no}</div>
              <div class="meta-label">Date</div>
              <div class="meta-value">${formatDate(sale.created_at)}</div>
              ${totalPages > 1 ? `<div class="meta-label" style="margin-top:4px;">Page</div><div class="meta-value">${pageIndex} / ${totalPages}</div>` : ""}
            </div>
          </div>
        </div>

        <!-- CUSTOMER INFO -->
        <div class="customer-box">
          <div class="meta-label">Billed To</div>
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${custName}</div>
          <div style="font-size: 13px; color: #4b5563;">
            ${custPhone ? `Ph: ${custPhone}<br>` : ""}
            ${formatAddress(custAddress, custCity, custState, custPincode)}
            ${custGst ? `<br>GSTIN: ${custGst}` : ""}
          </div>
        </div>

        <!-- ITEMS TABLE -->
        <div class="items-container">
          <table>
            <thead>
              <tr>
                <th width="auto">Item Description</th>
                ${showHsnSac ? '<th width="10%" style="text-align:center">HSN</th>' : ""}
                <th width="8%" style="text-align:center">Qty</th>
                <th width="12%" style="text-align:right">Rate</th>
                ${showDiscountCol ? '<th width="8%" style="text-align:right">Disc</th>' : ""}
                ${showGstRateCol && gstEnabled ? '<th width="8%" style="text-align:center">GST%</th>' : ""}
                ${showGstAmtCol && gstEnabled && !isInclusive ? '<th width="10%" style="text-align:right">GST Amt</th>' : ""}
                <th width="15%" style="text-align:right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems
                .map((item) => {
                  const valAfterDisc =
                    item.rate *
                    item.quantity *
                    (1 - (item.discount || 0) / 100);
                  const gstAmt =
                    gstEnabled && !isInclusive
                      ? valAfterDisc * ((item.gst_rate || 0) / 100)
                      : 0;

                  return `
                  <tr>
                    <td>
                      <div style="font-weight:600;">${item.product_name || item.name || "Unknown"}</div>
                      ${item.description ? `<div style="font-size: 10px; font-style: italic; color: #6b7280; margin-top:2px;">${item.description}</div>` : ""}
                      ${getTrackingHtml(item)}
                    </td>
                    ${showHsnSac ? `<td style="text-align:center">${item.hsn || "-"}</td>` : ""}
                    <td style="text-align:center">${item.quantity} ${item.unit || ""}</td>
                    <td style="text-align:right">${formatAmount(item.rate)}</td>
                    ${showDiscountCol ? `<td style="text-align:right">${item.discount || 0}%</td>` : ""}
                    ${showGstRateCol && gstEnabled ? `<td style="text-align:center">${item.gst_rate || 0}%</td>` : ""}
                    ${showGstAmtCol && gstEnabled && !isInclusive ? `<td style="text-align:right">${formatAmount(gstAmt)}</td>` : ""}
                    <td style="text-align:right; font-weight:600;">${formatAmount(item.price)}</td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- FOOTER (Terms, Bank, Totals, Signature) -->
        <div class="footer-container">
          
          <!-- LEFT: Words, Terms, Bank -->
          <div class="footer-left">
            <div style="font-weight:600; color:#111;">Amount in Words:</div>
            <div style="font-style:italic; margin-bottom: 5px;">${numberToWords(
              sale.total_amount,
            )}</div>
            
            <div class="bank-qr-row" style="margin-top: 15px; margin-bottom: 15px;">
              <div class="bank-details">
                <div style="font-weight:700; margin-bottom:2px;">Payment Details</div>
                Bank: <strong>${shop.bank_name || "N/A"}</strong><br>
                A/C: ${shop.bank_account_no || "N/A"}<br>
                IFSC: ${shop.bank_account_ifsc_code || "N/A"}
              </div>
              ${
                shop.generated_upi_qr
                  ? `<div class="qr-code">
                       <img src="${shop.generated_upi_qr}" style="width:70px; height:70px; border:1px solid #eee; padding:2px;" />
                       <div style="font-size:9px; color:#6b7280; margin-top:2px;">Scan to Pay</div>
                     </div>`
                  : ""
              }
            </div>

            <div style="font-size: 10px; line-height: 1.4; color: #374151;">
               ${termsAndConditions ? `<strong>Terms & Conditions:</strong><br><span style="white-space: pre-wrap;">${termsAndConditions}</span><br>` : ""}
               ${disclaimer ? `<div style="margin-top:4px;"><strong>Disclaimer:</strong> ${disclaimer}</div>` : ""}
               ${jurisdiction ? `<div style="margin-top:2px;"><em>${jurisdiction}</em></div>` : ""}
            </div>
          </div>

          <!-- RIGHT: Totals & Signature -->
          <div class="footer-right">
             ${
               isLastPage
                 ? `
                 <div class="summary-row"><span>Subtotal</span> <span>${formatAmount(subTotal)}</span></div>
                 
                 ${
                   discountPercentage > 0
                     ? `<div class="summary-row" style="color:#ef4444;"><span>Discount (${discountPercentage}%)</span> <span>-${formatAmount(
                         discountAmount,
                       )}</span></div>`
                     : ""
                 }
                 
                 ${
                   Math.abs(roundOff) > 0.01
                     ? `<div class="summary-row"><span>Round Off</span> <span>${roundOff > 0 ? "+" : ""}${formatAmount(roundOff)}</span></div>`
                     : ""
                 }
                 
                 ${
                   isInclusive
                     ? `<div style="font-size:10px; color:#666; margin-top:2px;">All prices are inclusive of GST</div>`
                     : ""
                 }

                 <div class="summary-row total-row"><span>Total</span> <span>${formatAmount(
                   sale.total_amount,
                 )}</span></div>
             `
                 : `
                <div style="height:80px; display:flex; align-items:center; justify-content:flex-end; color:#ccc;">
                    Continued on next page...
                </div>
             `
             }

             <div class="signature-box">
                Authorized Signature
             </div>
          </div>
        </div>
        ${BRANDING_FOOTER}
    </div>
    `;
  };

  return `
    <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          @page { size: A4; margin: 0; }
          body { 
            font-family: 'Inter', sans-serif; 
            margin: 0; 
            padding: 0;
            color: #1f2937; 
            background: #fff;
          }
          
          .page-container {
             width: 210mm;
             height: 297mm;
             padding: 15mm; 
             box-sizing: border-box;
             display: flex;
             flex-direction: column;
             page-break-after: always;
          }
          
          .page-container:last-child {
             page-break-after: auto;
          }

          .header { display: flex; justify-content: space-between; margin-bottom: 30px; flex-shrink: 0; }
          .brand-name { font-size: 24px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: -0.5px; }
          .invoice-label { font-size: 36px; font-weight: 800; color: #e5e7eb; text-align: right; line-height: 1; }
          .meta-label { font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 2px; }
          .meta-value { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
          
          .customer-box { background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #f3f4f6; margin-bottom: 30px; flex-shrink: 0; }
          
          .items-container { flex-grow: 1; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
          td { padding: 16px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
          
          .footer-container { 
            margin-top: 20px; 
            padding-top: 20px; 
            border-top: 2px solid #e5e7eb; 
            display: flex; 
            justify-content: space-between;
            align-items: flex-end;
            flex-shrink: 0;
          }

          .footer-left { width: 60%; font-size: 12px; color: #4b5563; }
          .footer-right { width: 35%; text-align: right; }

          .bank-qr-row { display: flex; gap: 20px; margin-top: 15px; }
          .bank-details { flex: 1; font-size: 11px; line-height: 1.4; border-left: 2px solid #e5e7eb; padding-left: 10px; }
          .qr-code { width: 80px; text-align: center; }
          
          .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
          .total-row { border-top: 2px solid #e5e7eb; margin-top: 10px; padding-top: 10px; font-weight: 800; font-size: 18px; color: #111; }
          .signature-box { margin-top: 40px; font-size: 11px; font-weight: 600; text-align: right; }
        </style>
      </head>
      <body>
        ${pages.map(renderPage).join("")}
      </body>
    </html>
  `;
};

module.exports = a4Modern;
