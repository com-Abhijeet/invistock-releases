const {
  formatDate,
  formatAmount,
  numberToWords,
} = require("../../invoiceTemplate.js");
const { getTrackingHtml, BRANDING_FOOTER } = require("./utils.js");

const a4Modern = (data) => {
  const { sale, shop } = data;
  const isInclusive = shop.is_inclusive || false;

  // --- MULTI-PAGE LOGIC ---
  const ROWS_PER_PAGE = 20; // A4 Modern has larger margins/fonts
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
          <div>
            <div class="brand-name">${shop.shop_name}</div>
            <div style="color: #4b5563; font-size: 13px; margin-top: 4px;">${
              shop.address_line1
            }, ${shop.city}</div>
            <div style="color: #4b5563; font-size: 13px;">${
              shop.contact_number
            }</div>
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
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${
            sale.customer_name || "Valued Customer"
          }</div>
          <div style="font-size: 13px; color: #4b5563;">
            ${sale.customer_phone ? `Ph: ${sale.customer_phone}<br>` : ""}
            ${sale.customer_address || ""}
          </div>
        </div>

        <!-- ITEMS TABLE (Fills Center) -->
        <div class="items-container">
          <table>
            <thead>
              <tr>
                <th width="50%">Item Description</th>
                <th width="10%" style="text-align:center">Qty</th>
                <th width="20%" style="text-align:right">Rate</th>
                <th width="20%" style="text-align:right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems
                .map(
                  (item) => `
                <tr>
                  <td>
                    <div style="font-weight:600;">${item.product_name}</div>
                    ${getTrackingHtml(item)}
                    ${
                      item.hsn
                        ? `<div style="font-size:10px; color:#9ca3af; margin-top:1px;">HSN: ${item.hsn}</div>`
                        : ""
                    }
                  </td>
                  <td style="text-align:center">${item.quantity} ${item.unit || ""}</td>
                  <td style="text-align:right">${formatAmount(item.rate)}</td>
                  <td style="text-align:right; font-weight:600;">${formatAmount(
                    item.price,
                  )}</td>
                </tr>
              `,
                )
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
            
            <div style="margin-top: 10px; font-size: 11px;">
               <strong>Terms:</strong> Goods once sold will not be taken back.
            </div>

            <div class="bank-qr-row">
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
             padding: 15mm; /* Margins inside page container */
             box-sizing: border-box;
             display: flex;
             flex-direction: column;
             page-break-after: always;
          }
          
          .page-container:last-child {
             page-break-after: auto;
          }

          /* Header Section */
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; flex-shrink: 0; }
          .brand-name { font-size: 24px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: -0.5px; }
          .invoice-label { font-size: 36px; font-weight: 800; color: #e5e7eb; text-align: right; line-height: 1; }
          .meta-label { font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 2px; }
          .meta-value { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
          
          /* Customer Box */
          .customer-box { background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #f3f4f6; margin-bottom: 30px; flex-shrink: 0; }
          
          /* Items Section - Fills remaining space */
          .items-container { flex-grow: 1; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
          td { padding: 16px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
          
          /* Footer Section - Fixed at bottom */
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

          /* Bank & QR Side by Side */
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
