const {
  formatAddress,
  formatDate,
  formatAmount,
  numberToWords,
} = require("../../invoiceTemplate.js");
const { getTrackingHtml, BRANDING_FOOTER } = require("./utils.js");

const a5Landscape = (data) => {
  const { sale, shop } = data;
  const isInclusive = shop.is_inclusive || false;
  const showHSN = Boolean(shop.hsn_required);

  // Column Widths for alignment
  const colWidths = showHSN
    ? ["5%", "45%", "10%", "10%", "15%", "15%"]
    : ["5%", "55%", "10%", "15%", "15%"];

  // --- MULTI-PAGE LOGIC ---
  const ROWS_PER_PAGE = 8; // Fewer items fit on Landscape due to height
  const items = sale.items;
  const totalPages = Math.ceil(items.length / ROWS_PER_PAGE) || 1;
  
  const pages = [];
  for (let i = 0; i < totalPages; i++) {
    const start = i * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    const pageItems = items.slice(start, end);
    pages.push({
      items: pageItems,
      isLastPage: i === totalPages - 1,
      pageIndex: i + 1,
      totalPages: totalPages
    });
  }

  const renderPage = (pageData) => {
    const { items: pageItems, isLastPage, pageIndex, totalPages } = pageData;
    
    // Calculate empty rows needed
    const emptyRowsCount = ROWS_PER_PAGE - pageItems.length;
    const emptyRows = Array.from({ length: Math.max(0, emptyRowsCount) });

    return `
    <div class="page-container">
        <!-- Header -->
        <div class="header-box">
          <div class="shop-info">
            <h1>${shop.shop_name}</h1>
            <div>${formatAddress(shop.address_line1, shop.city, shop.state, shop.pincode)}</div>
            <div>Ph: ${shop.contact_number}</div>
            ${shop.gstin ? `<div><strong>GSTIN: ${shop.gstin}</strong></div>` : ""}
          </div>
          <div class="invoice-meta">
            <div class="flex" style="justify-content:space-between;"><span>Invoice No:</span> <span class="bold">${sale.reference_no}</span></div>
            <div class="flex" style="justify-content:space-between;"><span>Date:</span> <span class="bold">${formatDate(sale.created_at)}</span></div>
            <div class="flex" style="justify-content:space-between;"><span>Place of Supply:</span> <span>${sale.customer_state || shop.state}</span></div>
            ${totalPages > 1 ? `<div class="flex" style="justify-content:flex-end; font-size:9px; margin-top:4px;">Page ${pageIndex} of ${totalPages}</div>` : ""}
          </div>
        </div>

        <!-- Customer -->
        <div class="customer-row">
          <div class="bill-to">
            <span style="font-size:9px; color:#555;">BILLED TO:</span><br>
            <span class="bold" style="font-size:12px;">${sale.customer_name || "Cash Customer"}</span><br>
            ${sale.customer_address || ""} ${sale.customer_phone ? `(Ph: ${sale.customer_phone})` : ""}
          </div>
          <div class="extra-meta">
             ${shop.gstin ? `<div>Customer GST: ${sale.customer_gst_no || "Unregistered"}</div>` : ""}
             <div>Pay Mode: ${sale.payment_mode || "Cash"}</div>
          </div>
        </div>

        <!-- Items Wrapper -->
        <div class="items-wrapper">
          <table>
            <thead>
              <tr>
                <th width="${colWidths[0]}" class="text-center">#</th>
                <th width="${colWidths[1]}">Item Name</th>
                ${showHSN ? `<th width="${colWidths[2]}" class="text-center">HSN</th>` : ""}
                <th width="${showHSN ? colWidths[3] : colWidths[2]}" class="text-right">Qty</th>
                <th width="${showHSN ? colWidths[4] : colWidths[3]}" class="text-right">Rate</th>
                <th width="${showHSN ? colWidths[5] : colWidths[4]}" class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems
                .map(
                  (item, i) => `
                <tr class="data-row">
                  <td class="text-center">${(pageIndex - 1) * ROWS_PER_PAGE + i + 1}</td>
                  <td>${item.product_name} ${getTrackingHtml(item)}</td>
                  ${showHSN ? `<td class="text-center">${item.hsn || "-"}</td>` : ""}
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">${formatAmount(item.rate)}</td>
                  <td class="text-right bold">${formatAmount(item.price)}</td>
                </tr>
              `,
                )
                .join("")}
              
              <!-- Empty Rows -->
              ${emptyRows.map(() => `
                <tr class="spacer-row">
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    ${showHSN ? `<td>&nbsp;</td>` : ""}
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="footer-section">
          <!-- LEFT -->
          <div class="footer-left">
            <div>
              <div style="font-weight:bold; margin-bottom:2px;">Amount in Words:</div>
              <div style="font-style:italic;">${numberToWords(sale.total_amount)} Only</div>
              <div style="margin-top: 4px; font-size:8px; color:#555;">Terms: Goods once sold will not be taken back.</div>
            </div>

            <div class="bank-qr-row">
              <div class="bank-details">
                <div class="bold">Bank Details:</div>
                <div>${shop.bank_name || "N/A"}</div>
                <div>A/C: ${shop.bank_account_no || "N/A"}</div>
                <div>IFSC: ${shop.bank_account_ifsc_code || "N/A"}</div>
              </div>
              ${
                shop.generated_upi_qr
                  ? `
                <div><img src="${shop.generated_upi_qr}" style="width:50px; height:50px; border:1px solid #ccc;" /></div>
              `
                  : ""
              }
            </div>
          </div>

          <!-- RIGHT -->
          <div class="footer-right">
             <div>
               ${isLastPage ? `
               <div class="totals-row"><span>Subtotal:</span> <span>${formatAmount(sale.total_amount + (sale.discount || 0))}</span></div>
               ${sale.discount > 0 ? `<div class="totals-row"><span>Disc:</span> <span>-${formatAmount(sale.discount)}</span></div>` : ""}
               ${isInclusive ? `<div style="text-align:right; font-size:8px; color:#666; margin-bottom:2px;">(All prices inclusive of GST)</div>` : ""}
               <div class="totals-row grand-total">
                  <span>TOTAL:</span> <span>${formatAmount(sale.total_amount)}</span>
               </div>
               ` : `
                <div style="height:40px; display:flex; align-items:center; justify-content:flex-end; color:#999; font-style:italic;">
                    Continued...
                </div>
               `}
             </div>

             <div class="signature-box">
                <div style="font-weight:normal; margin-bottom:15px;">For ${shop.shop_name}</div>
                Authorized Signature
             </div>
          </div>
        </div>
        ${BRANDING_FOOTER}
    </div>
    `;
  }

  return `
    <html>
      <head>
        <style>
          @page { size: A5 landscape; margin: 0; }
          body { 
            font-family: 'Arial', sans-serif; 
            font-size: 10px; 
            color: #000; 
            margin: 0; 
            padding: 0;
            background: #fff;
          }
          
          .page-container {
             width: 210mm;
             height: 148mm; /* A5 Landscape */
             padding: 10mm;
             box-sizing: border-box;
             display: flex;
             flex-direction: column;
             page-break-after: always;
          }
          .page-container:last-child {
             page-break-after: auto;
          }

          /* Utility Classes */
          .bold { font-weight: bold; }
          .flex { display: flex; } 
          
          /* Header */
          .header-box { display: flex; border: 1px solid #000; border-bottom: 0; flex-shrink: 0; }
          .shop-info { flex: 1; padding: 8px; border-right: 1px solid #000; }
          .invoice-meta { width: 40%; padding: 8px; }
          h1 { margin: 0; font-size: 16px; text-transform: uppercase; }
          
          /* Customer Row */
          .customer-row { display: flex; border: 1px solid #000; border-bottom: 0; flex-shrink: 0; }
          .bill-to { flex: 1; padding: 5px 8px; border-right: 1px solid #000; }
          .extra-meta { width: 40%; padding: 5px 8px; }
          
          /* Items Wrapper (Flex Grow) */
          .items-wrapper { 
            flex-grow: 1; 
            border: 1px solid #000; 
            border-bottom: 0; 
            display: flex; 
            flex-direction: column; 
          }
          
          /* Table Styles for Full Height Borders */
          table { width: 100%; border-collapse: collapse; table-layout: fixed; height: 100%; }
          thead { display: table-header-group; height: 25px; }
          
          /* Standard data rows take minimal height */
          tr.data-row { height: 1px; } 
          
          /* Spacer row takes remaining height */
          tr.spacer-row td { height: 20px; border-bottom: 0; border-right: 1px solid #000; }
          tr.spacer-row td:last-child { border-right: 0; }
          
          th { background: #eee; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px; font-size: 9px; text-transform: uppercase; text-align: left; }
          td { border-right: 1px solid #000; padding: 4px; vertical-align: top; word-wrap: break-word; }
          
          /* Remove right border from last column */
          th:last-child, td:last-child { border-right: 0; }
          
          .text-right { text-align: right; }
          .text-center { text-align: center; }

          /* Footer Section */
          .footer-section { 
            display: flex; 
            border: 1px solid #000; 
            flex-shrink: 0; 
            min-height: 35mm; 
          }
          .footer-left { flex: 1; padding: 5px; border-right: 1px solid #000; font-size: 9px; display: flex; flex-direction: column; justify-content: space-between; }
          .footer-right { width: 35%; padding: 5px; display: flex; flex-direction: column; justify-content: space-between; }
          
          .bank-qr-row { display: flex; gap: 10px; margin-top: 5px; border-top: 1px dotted #ccc; padding-top: 5px; }
          .bank-details { flex: 1; }
          
          .totals-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .grand-total { border-top: 1px solid #000; margin-top: 4px; padding-top: 4px; font-weight: bold; font-size: 12px; }
          .signature-box { text-align: right; margin-top: 5px; font-size: 9px; font-weight: bold; }
        </style>
      </head>
      <body>
        ${pages.map(renderPage).join("")}
      </body>
    </html>
  `;
};

module.exports = a5Landscape;