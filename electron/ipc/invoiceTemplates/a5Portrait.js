const {
  formatAddress,
  formatDate,
  formatAmount,
  numberToWords,
} = require("../../invoiceTemplate.js");
const { getTrackingHtml, BRANDING_FOOTER } = require("./utils.js");

const a5Portrait = (data) => {
  const { sale, shop } = data;
  const gstEnabled = Boolean(shop.gst_enabled);
  const showHSN = Boolean(shop.hsn_required);

  // Check if bank details exist
  const hasBankDetails = shop.bank_name && shop.bank_account_no;

  return `
    <html>
      <head>
        <title>Invoice #${sale.reference_no}</title>
        <style>
          @page { 
            size: A5 portrait; 
            margin: 0; 
          }
          body { 
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
            font-size: 10px; 
            color: #111; 
            margin: 0; 
            padding: 10mm;
            /* Flexbox wrapper to push footer to bottom on single page */
            display: flex;
            flex-direction: column;
            min-height: 190mm; /* Approx A5 height minus padding */
          }
          
          /* LAYOUT UTILS */
          .header-section { flex: 0 0 auto; margin-bottom: 10px; }
          .middle-section { flex: 1 1 auto; display: flex; flex-direction: column; }
          .footer-section { flex: 0 0 auto; margin-top: 10px; page-break-inside: avoid; }
          
          .row { display: flex; justify-content: space-between; }
          .col { flex: 1; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .bold { font-weight: 700; }
          .uppercase { text-transform: uppercase; }
          .border-bottom { border-bottom: 1px solid #ddd; }
          .border-top { border-top: 1px solid #000; }
          
          /* HEADER STYLES */
          h1 { font-size: 18px; margin: 0 0 4px 0; letter-spacing: 0.5px; }
          .shop-meta { font-size: 10px; color: #444; line-height: 1.3; }
          .invoice-box { 
            border: 1px solid #000; 
            padding: 8px; 
            margin-top: 10px; 
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #fdfdfd;
          }

          /* TABLE STYLES */
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          thead { display: table-header-group; } /* Repeats header on new page */
          tr { page-break-inside: avoid; }
          th { 
            background: #eee; 
            padding: 6px 4px; 
            text-align: left; 
            font-weight: 700; 
            border-bottom: 2px solid #000;
            font-size: 9px;
            text-transform: uppercase;
          }
          td { 
            padding: 6px 4px; 
            border-bottom: 1px solid #eee; 
            vertical-align: top; 
          }
          
          /* SUMMARY STYLES */
          .summary-box {
            display: flex;
            margin-top: auto; /* Pushes to bottom if flex container has height */
            border-top: 2px solid #000;
            padding-top: 10px;
          }
          .bank-area { flex: 1.5; padding-right: 10px; font-size: 9px; }
          .totals-area { flex: 1; text-align: right; }
          
          .total-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .grand-total { 
            font-size: 14px; 
            font-weight: 800; 
            border-top: 1px dashed #999; 
            border-bottom: 1px dashed #999; 
            padding: 4px 0; 
            margin-top: 6px; 
          }
        </style>
      </head>
      <body>
        
        <!-- TOP SECTION: HEADER -->
        <div class="header-section">
          <div class="row" style="align-items: flex-start;">
            <div class="col" style="flex: 2;">
              <h1 class="uppercase">${shop.shop_name}</h1>
              <div class="shop-meta">
                ${formatAddress(shop.address_line1, shop.city, shop.state, shop.pincode)}<br>
                Phone: <b>${shop.contact_number}</b>
                ${gstEnabled ? `<br>GSTIN: <b>${shop.gstin}</b>` : ""}
              </div>
            </div>
            <div class="col text-right">
              <div style="font-size: 24px; font-weight: 900; color: #ddd; letter-spacing: 2px;">INVOICE</div>
            </div>
          </div>

          <div class="invoice-box">
            <div>
              <div style="font-size: 9px; color: #666; text-transform: uppercase;">Billed To</div>
              <div class="bold" style="font-size: 12px;">${sale.customer_name || "Cash Customer"}</div>
              <div style="font-size: 9px;">${sale.customer_phone || ""}</div>
              ${sale.customer_address ? `<div style="font-size: 9px; color: #555;">${sale.customer_address}</div>` : ""}
              ${gstEnabled && sale.customer_gst_no ? `<div style="font-size: 9px;">GST: ${sale.customer_gst_no}</div>` : ""}
            </div>
            <div class="text-right">
              <div style="font-size: 9px; color: #666; text-transform: uppercase;">Invoice Details</div>
              <div>No: <span class="bold">${sale.reference_no}</span></div>
              <div>Date: <span class="bold">${formatDate(sale.created_at)}</span></div>
            </div>
          </div>
        </div>

        <!-- MIDDLE SECTION: PRODUCT ROWS -->
        <div class="middle-section">
          <table>
            <thead>
              <tr>
                <th width="5%">#</th>
                <th width="45%">Item Name</th>
                ${showHSN ? `<th width="10%">HSN</th>` : ""}
                <th width="10%" class="text-right">Qty</th>
                <th width="15%" class="text-right">Rate</th>
                <th width="15%" class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items
                .map(
                  (item, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>
                    <div class="bold">${item.product_name}</div>
                    ${getTrackingHtml(item)}
                  </td>
                  ${showHSN ? `<td>${item.hsn || "-"}</td>` : ""}
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">${formatAmount(item.rate)}</td>
                  <td class="text-right bold">${formatAmount(item.price)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          
          <!-- This spacer ensures that if items are few, they sit at top, but section fills space -->
          <div style="flex-grow: 1;"></div> 
        </div>

        <!-- BOTTOM SECTION: SUMMARY & FOOTER -->
        <div class="footer-section">
          <div class="summary-box">
            
            <!-- Bank & Words (Left) -->
            <div class="bank-area">
              <div style="margin-bottom: 8px;">
                <span style="color: #666;">Amount in Words:</span><br>
                <span class="bold" style="text-transform: capitalize;">${numberToWords(sale.total_amount)} Only</span>
              </div>

              <!-- Conditional Bank Details -->
              ${
                hasBankDetails
                  ? `
                <div style="background: #f5f5f5; padding: 5px; border-radius: 4px; border: 1px solid #eee;">
                  <div class="bold" style="margin-bottom:2px;">Bank Details</div>
                  <div>${shop.bank_name}</div>
                  <div>A/C: ${shop.bank_account_no}</div>
                  <div>IFSC: ${shop.bank_account_ifsc_code}</div>
                </div>
              `
                  : ""
              }

              <!-- QR Code Logic -->
              ${
                shop.generated_upi_qr
                  ? `
                <div style="margin-top: 8px; display: flex; align-items: center;">
                  <img src="${shop.generated_upi_qr}" style="width: 50px; height: 50px; border: 1px solid #ccc; padding: 2px;">
                  <div style="margin-left: 6px; font-size: 8px; color: #555;">Scan to Pay via UPI</div>
                </div>
              `
                  : ""
              }
            </div>

            <!-- Totals (Right) -->
            <div class="totals-area">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${formatAmount(sale.total_amount + (sale.discount || 0))}</span>
              </div>
              
              ${
                sale.discount > 0
                  ? `
                <div class="total-row" style="color: #d32f2f;">
                  <span>Discount:</span>
                  <span>-${formatAmount(sale.discount)}</span>
                </div>
              `
                  : ""
              }
              
              ${
                gstEnabled
                  ? `
                <div class="total-row" style="font-size: 8px; color: #666; justify-content: flex-end;">
                  (Tax Included)
                </div>
              `
                  : ""
              }

              <div class="grand-total row">
                <span>TOTAL:</span>
                <span>${formatAmount(sale.total_amount)}</span>
              </div>
              
              <div style="margin-top: 20px; text-align: center;">
                <div style="height: 30px;">
                  <!-- Signature space -->
                </div>
                <div style="border-top: 1px solid #000; display: inline-block; width: 100px; padding-top: 2px; font-size: 8px;">
                  Authorized Signature
                </div>
              </div>
            </div>
          </div>
          
          ${BRANDING_FOOTER}
        </div>

      </body>
    </html>
  `;
};

module.exports = a5Portrait;
