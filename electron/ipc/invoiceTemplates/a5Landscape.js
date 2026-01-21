const {
  formatAddress,
  formatDate,
  formatAmount,
  numberToWords,
} = require("../../invoiceTemplate.js");
const { getTrackingHtml, BRANDING_FOOTER } = require("./utils.js");

const a5Landscape = (data) => {
  const { sale, shop } = data;
  const gstEnabled = Boolean(shop.gst_enabled);
  const showHSN = Boolean(shop.hsn_required);

  return `
    <html>
      <head>
        <style>
          @page { size: A5 landscape; margin: 0; }
          body { font-family: 'Arial', sans-serif; font-size: 10px; color: #000; margin: 0; padding: 10mm; width: 190mm; height: 128mm; }
          
          /* Utility Classes */
          .w-50 { width: 50%; } .w-100 { width: 100%; } .text-right { text-align: right; } .text-center { text-align: center; } .bold { font-weight: bold; }
          .flex { display: flex; } .border { border: 1px solid #000; }
          
          /* Header */
          .header-box { display: flex; border: 1px solid #000; border-bottom: 0; }
          .shop-info { flex: 1; padding: 8px; border-right: 1px solid #000; }
          .invoice-meta { width: 40%; padding: 8px; }
          h1 { margin: 0; font-size: 16px; text-transform: uppercase; }
          
          /* Customer Row */
          .customer-row { display: flex; border: 1px solid #000; border-bottom: 0; }
          .bill-to { flex: 1; padding: 5px 8px; border-right: 1px solid #000; }
          .extra-meta { width: 40%; padding: 5px 8px; }
          
          /* Table */
          table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
          th { background: #eee; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px; font-size: 9px; text-transform: uppercase; }
          td { border-right: 1px solid #000; padding: 4px; vertical-align: top; height: 16px; }
          tr:last-child td { border-bottom: 1px solid #000; }
          
          /* Footer Section */
          .footer-section { display: flex; border: 1px solid #000; border-top: 0; }
          .amount-words { flex: 1; padding: 5px; border-right: 1px solid #000; font-size: 9px; }
          .bank-details { flex: 1; padding: 5px; border-right: 1px solid #000; font-size: 9px; display: flex; justify-content: space-between; }
          .totals-area { width: 25%; padding: 5px; }
          
          .signature-area { display: flex; justify-content: space-between; border: 1px solid #000; border-top: 0; padding: 5px; height: 40px; align-items: flex-end; }
        </style>
      </head>
      <body>
        <!-- Header -->
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
            ${
              gstEnabled
                ? `<div><strong>GSTIN: ${shop.gstin}</strong></div>`
                : ""
            }
          </div>
          <div class="invoice-meta">
            <div class="flex" style="justify-content:space-between;"><span>Invoice No:</span> <span class="bold">${
              sale.reference_no
            }</span></div>
            <div class="flex" style="justify-content:space-between;"><span>Date:</span> <span class="bold">${formatDate(
              sale.created_at,
            )}</span></div>
            <div class="flex" style="justify-content:space-between;"><span>Place of Supply:</span> <span>${
              sale.customer_state || shop.state
            }</span></div>
          </div>
        </div>

        <!-- Customer -->
        <div class="customer-row">
          <div class="bill-to">
            <span style="font-size:9px; color:#555;">BILLED TO:</span><br>
            <span class="bold" style="font-size:12px;">${
              sale.customer_name || "Cash Customer"
            }</span><br>
            ${sale.customer_address || ""} ${
              sale.customer_phone ? `(Ph: ${sale.customer_phone})` : ""
            }
          </div>
          <div class="extra-meta">
             ${
               gstEnabled
                 ? `<div>Customer GST: ${
                     sale.customer_gst_no || "Unregistered"
                   }</div>`
                 : ""
             }
             <div>Pay Mode: ${sale.payment_mode || "Cash"}</div>
          </div>
        </div>

        <!-- Items Table -->
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
                <td class="text-center">${i + 1}</td>
                <td>
                  ${item.product_name}
                  ${getTrackingHtml(item)}
                </td>
                ${
                  showHSN
                    ? `<td class="text-center">${item.hsn || "-"}</td>`
                    : ""
                }
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${formatAmount(item.rate)}</td>
                <td class="text-right bold">${formatAmount(item.price)}</td>
              </tr>
            `,
              )
              .join("")}
            <!-- Empty Rows Filler for consistent height if needed -->
            ${Array.from({ length: Math.max(0, 6 - sale.items.length) })
              .map(
                () => `
              <tr><td>&nbsp;</td><td></td>${
                showHSN ? `<td></td>` : ""
              }<td></td><td></td><td></td></tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <!-- Bottom Section -->
        <div class="footer-section">
          <div class="amount-words">
            <div style="font-weight:bold; margin-bottom:2px;">Amount in Words:</div>
            <div style="font-style:italic;">${numberToWords(
              sale.total_amount,
            )}</div>
            ${
              gstEnabled
                ? `<div style="margin-top:5px; font-size:8px;">* Tax amounts are included in total if applicable.</div>`
                : ""
            }
          </div>
          
          <div class="bank-details">
            <div>
              <div class="bold">Bank Details:</div>
              <div>${shop.bank_name || ""}</div>
              <div>A/C: ${shop.bank_account_no || ""}</div>
              <div>IFSC: ${shop.bank_account_ifsc_code || ""}</div>
              ${
                shop.generated_upi_qr && !shop.bank_name
                  ? `<div style="margin-top:2px;">UPI: ${shop.upi_id}</div>`
                  : ""
              }
            </div>
            ${
              shop.generated_upi_qr
                ? `<div style="text-align:center; margin-left:10px;">
                     <img src="${shop.generated_upi_qr}" style="width:60px; height:60px;" />
                   </div>`
                : ""
            }
          </div>

          <div class="totals-area">
             <div class="flex" style="justify-content:space-between;"><span>Subtotal:</span> <span>${formatAmount(
               sale.total_amount + (sale.discount || 0),
             )}</span></div>
             ${
               sale.discount > 0
                 ? `<div class="flex" style="justify-content:space-between;"><span>Disc:</span> <span>-${formatAmount(
                     sale.discount,
                   )}</span></div>`
                 : ""
             }
             <div class="flex bold" style="justify-content:space-between; font-size:12px; margin-top:5px; border-top:1px solid #ccc; padding-top:2px;">
                <span>TOTAL:</span> <span>${formatAmount(
                  sale.total_amount,
                )}</span>
             </div>
          </div>
        </div>

        <div class="signature-area">
           <div style="font-size:9px;">Terms: Goods once sold will not be taken back.</div>
           <div style="text-align:right;">
              <div style="font-weight:bold; font-size:10px;">For ${
                shop.shop_name
              }</div>
              <div style="font-size:9px; margin-top:15px;">Authorized Signature</div>
           </div>
        </div>
        
        ${BRANDING_FOOTER}
      </body>
    </html>
  `;
};

module.exports = a5Landscape;
