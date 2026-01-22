const {
  formatAddress,
  formatDate,
  formatAmount,
  numberToWords,
} = require("../../invoiceTemplate.js");
const { getTrackingHtml, BRANDING_FOOTER } = require("./utils.js");

const a5Portrait = (data) => {
  const { sale, shop } = data;
  const isInclusive = shop.is_inclusive || false;
  const showHSN = Boolean(shop.hsn_required);
  const gstEnabled = Boolean(shop.gstin);

  // Column Widths for Portrait
  const colWidths = showHSN
    ? ["5%", "45%", "10%", "10%", "15%", "15%"]
    : ["5%", "55%", "10%", "15%", "15%"];

  // Calculate empty rows to fill the page
  // A5 Portrait typically fits around 15-18 rows comfortably depending on font size
  const MIN_ROWS = 16;
  const itemsCount = sale.items.length;
  const emptyRowCount = Math.max(0, MIN_ROWS - itemsCount);
  const emptyRows = Array.from({ length: emptyRowCount });

  return `
    <html>
      <head>
        <title>Invoice #${sale.reference_no}</title>
        <style>
          @page { size: A5 portrait; margin: 0; }
          body { 
            font-family: 'Arial', sans-serif; 
            font-size: 10px; 
            color: #000; 
            margin: 0; 
            padding: 10mm;
            display: flex;
            flex-direction: column;
            min-height: 190mm;
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
          
          /* Items Wrapper */
          .middle-section { 
            flex: 1 1 auto; 
            display: flex; 
            flex-direction: column; 
            /* Outer borders */
            border: 1px solid #000;
            margin-bottom: 0; 
          }

          /* Table Layout */
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          thead { display: table-header-group; height: 25px; }
          tr.data-row { height: auto; }
          
          /* Empty row styling to ensure lines extend */
          tr.empty-row td { height: 20px; color: transparent; }

          th { background: #eee; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px; font-size: 9px; text-transform: uppercase; text-align: left; font-weight: bold; }
          
          /* Borders for cells */
          /* Changed border-bottom to 0 to remove lines between items */
          td { padding: 4px; vertical-align: top; word-wrap: break-word; border-right: 1px solid #000; border-bottom: 0; }
          
          /* Remove last border for columns */
          td:last-child, th:last-child { border-right: 0; }
          
          /* Ensure empty rows also have borders */
          /* Changed border-bottom to 0 for empty rows as well */
          tr.empty-row td { border-right: 1px solid #000; border-bottom: 0; }
          tr.empty-row td:last-child { border-right: 0; }
          
          /* Remove bottom border of the LAST row in the table to avoid double border with container */
          tr:last-child td { border-bottom: 0; }

          .text-right { text-align: right; }
          .text-center { text-align: center; }

          /* FOOTER SECTION */
          .footer-section { 
             display: flex; 
             border: 1px solid #000; 
             border-top: 0; /* Middle section handles the divider line */
             flex-shrink: 0; 
             min-height: 35mm; 
             page-break-inside: avoid;
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
        
        <!-- HEADER -->
        <div class="header-box">
          <div class="shop-info">
            <h1>${shop.shop_name}</h1>
            <div>${formatAddress(
              shop.address_line1,
              shop.city,
              shop.state,
              shop.pincode,
            )}</div>
            <div>Ph: ${shop.contact_number}</div>
            ${gstEnabled ? `<div><strong>GSTIN: ${shop.gstin}</strong></div>` : ""}
          </div>
          <div class="invoice-meta">
            <div class="flex" style="justify-content:space-between;"><span>Invoice No:</span> <span class="bold">${sale.reference_no}</span></div>
            <div class="flex" style="justify-content:space-between;"><span>Date:</span> <span class="bold">${formatDate(
              sale.created_at,
            )}</span></div>
            <div class="flex" style="justify-content:space-between;"><span>Place of Supply:</span> <span>${sale.customer_state || shop.state}</span></div>
          </div>
        </div>

        <!-- CUSTOMER -->
        <div class="customer-row">
          <div class="bill-to">
            <span style="font-size:9px; color:#555;">BILLED TO:</span><br>
            <span class="bold" style="font-size:12px;">${
              sale.customer_name || "Cash Customer"
            }</span><br>
            ${sale.customer_address || ""} ${sale.customer_phone ? `(Ph: ${sale.customer_phone})` : ""}
          </div>
          <div class="extra-meta">
             ${gstEnabled ? `<div>Customer GST: ${sale.customer_gst_no || "Unregistered"}</div>` : ""}
             <div>Pay Mode: ${sale.payment_mode || "Cash"}</div>
          </div>
        </div>

        <!-- ITEMS SECTION -->
        <div class="middle-section">
          <table>
            <thead>
              <tr>
                <th width="${colWidths[0]}" class="text-center">#</th>
                <th width="${colWidths[1]}">Item Name</th>
                ${showHSN ? `<th width="${colWidths[2]}" class="text-center">HSN</th>` : ""}
                <th width="${
                  showHSN ? colWidths[3] : colWidths[2]
                }" class="text-right">Qty</th>
                <th width="${
                  showHSN ? colWidths[4] : colWidths[3]
                }" class="text-right">Rate</th>
                <th width="${
                  showHSN ? colWidths[5] : colWidths[4]
                }" class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items
                .map(
                  (item, i) => `
                <tr class="data-row">
                  <td class="text-center">${i + 1}</td>
                  <td>${item.product_name} ${getTrackingHtml(item)}</td>
                  ${showHSN ? `<td class="text-center">${item.hsn || "-"}</td>` : ""}
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">${formatAmount(item.rate)}</td>
                  <td class="text-right bold">${formatAmount(item.price)}</td>
                </tr>
              `,
                )
                .join("")}
              
              <!-- Empty Rows for filler -->
              ${emptyRows
                .map(
                  () => `
                <tr class="empty-row">
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  ${showHSN ? `<td>&nbsp;</td>` : ""}
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- FOOTER SECTION -->
        <div class="footer-section">
            
            <!-- LEFT COLUMN: Words, Terms, Bank, QR -->
            <div class="footer-left">
               <div>
                  <div style="font-weight:bold; margin-bottom:2px;">Amount in Words:</div>
                  <div style="font-style:italic;">${numberToWords(
                    sale.total_amount,
                  )} Only</div>
                  <div style="margin-top: 4px; font-size:8px; color:#555;">Terms: Goods once sold will not be taken back.</div>
               </div>

               <div class="bank-qr-row">
                 <div class="bank-details">
                    <div class="bold" style="margin-bottom:2px;">Bank Details</div>
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

            <!-- RIGHT COLUMN: Totals & Signature -->
            <div class="footer-right">
              <div>
                <div class="totals-row"><span>Subtotal:</span><span>${formatAmount(
                  sale.total_amount + (sale.discount || 0),
                )}</span></div>
                ${
                  sale.discount > 0
                    ? `<div class="totals-row"><span>Disc:</span><span>-${formatAmount(
                        sale.discount,
                      )}</span></div>`
                    : ""
                }
                ${
                  isInclusive
                    ? `<div style="text-align:right; font-size:8px; color:#666; margin-bottom:2px;">(All prices inclusive of GST)</div>`
                    : ""
                }
                <div class="totals-row grand-total"><span>TOTAL:</span><span>${formatAmount(
                  sale.total_amount,
                )}</span></div>
              </div>
              
              <div class="signature-box">
                <div style="font-weight:normal; margin-bottom:15px;">For ${shop.shop_name}</div>
                Authorized Signature
              </div>
            </div>
        </div>
        
        ${BRANDING_FOOTER}
      </body>
    </html>
  `;
};

module.exports = a5Portrait;
