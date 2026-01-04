const {
  formatAddress,
  formatDate,
  formatAmount,
  numberToWords,
  createInvoiceHTML,
} = require("../invoiceTemplate.js");

// --- HELPER: GST Calculation ---
const calculateGST = (items, inclusive, gstEnabled) => {
  if (!gstEnabled) return { totalTax: 0, breakdown: [] };

  let totalTax = 0;
  let breakdown = { cgst: 0, sgst: 0, igst: 0 };

  items.forEach((item) => {
    const baseVal = item.rate * item.quantity;
    const valAfterDisc = baseVal * (1 - (item.discount || 0) / 100);
    let taxAmt = 0;

    if (inclusive) {
      const divisor = 1 + item.gst_rate / 100;
      const taxable = valAfterDisc / divisor;
      taxAmt = valAfterDisc - taxable;
    } else {
      taxAmt = valAfterDisc * (item.gst_rate / 100);
    }

    totalTax += taxAmt;
    // Simple split for local supply assumption (can be expanded for interstate)
    breakdown.cgst += taxAmt / 2;
    breakdown.sgst += taxAmt / 2;
  });
  return { totalTax, breakdown };
};

// --- FOOTER BRANDING ---
const BRANDING_FOOTER = `
  <div style="text-align:center; margin-top:15px; font-size:9px; color:#888; border-top:1px dotted #ddd; padding-top:4px;">
    Powered by KOSH Software &bull; +91 8180904072
  </div>
`;

// ==========================================
// 1. THERMAL 80MM TEMPLATE (Professional Receipt)
// ==========================================
const thermal80mm = (data) => {
  const { sale, shop } = data;
  const showDiscount = Boolean(shop.show_discount_column);

  const itemsHtml = sale.items
    .map((item) => {
      const total = item.price;
      return `
      <div style="border-bottom: 1px dashed #ccc; padding: 4px 0;">
        <div style="font-weight:600; font-size:12px; margin-bottom:2px;">${
          item.product_name
        }</div>
        <div style="display:flex; justify-content:space-between; font-size:11px; color:#444;">
          <span>${item.quantity} x ${formatAmount(item.rate)} ${
        showDiscount && item.discount ? `(-${item.discount}%)` : ""
      }</span>
          <span style="font-weight:600; color:#000;">${formatAmount(
            total
          )}</span>
        </div>
      </div>
    `;
    })
    .join("");

  return `
    <html>
      <head>
        <style>
          body { font-family: 'Roboto', sans-serif; margin: 0; padding: 5px; font-size: 12px; width: 78mm; color: #000; background: #fff; }
          .header { text-align: center; margin-bottom: 10px; }
          h1 { font-size: 18px; margin: 0; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
          .meta { font-size: 11px; color: #333; margin-top: 3px; }
          .divider { border-top: 2px solid #000; margin: 8px 0; }
          .info-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
          .totals { margin-top: 10px; font-size: 12px; }
          .grand-total { font-size: 16px; font-weight: 800; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 6px 0; margin-top: 5px; }
          .qr-box { text-align: center; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${shop.shop_name}</h1>
          <div class="meta">${shop.address_line1}, ${shop.city}</div>
          <div class="meta">Ph: ${shop.contact_number}</div>
          ${shop.gstin ? `<div class="meta">GSTIN: ${shop.gstin}</div>` : ""}
        </div>
        
        <div class="divider"></div>
        <div class="info-row"><span>Bill No: <b>${
          sale.reference_no
        }</b></span> <span>${formatDate(sale.created_at)}</span></div>
        <div class="info-row"><span>Customer:</span> <span>${
          sale.customer_name || "Cash Sale"
        }</span></div>
        <div class="divider" style="border-top-style: dashed; border-width: 1px;"></div>

        <div>${itemsHtml}</div>

        <div class="totals">
          <div class="info-row"><span>Subtotal:</span> <span>${formatAmount(
            sale.total_amount + (sale.discount || 0)
          )}</span></div>
          ${
            sale.discount > 0
              ? `<div class="info-row"><span>Discount:</span> <span>-${formatAmount(
                  sale.discount
                )}</span></div>`
              : ""
          }
          
          <div class="info-row grand-total">
            <span>TOTAL</span>
            <span>${formatAmount(sale.total_amount)}</span>
          </div>
        </div>

        ${
          shop.generated_upi_qr
            ? `
          <div class="qr-box">
            <img src="${shop.generated_upi_qr}" style="width:100px; height:100px; border: 1px solid #eee; padding: 4px;" />
            <div style="font-size:10px; margin-top:2px;">Scan to Pay</div>
          </div>
        `
            : ""
        }
        
        <div style="text-align:center; font-weight:600; font-size:12px; margin-top:15px;">Thank You! Visit Again</div>
        ${BRANDING_FOOTER}
      </body>
    </html>
  `;
};

// ==========================================
// 2. THERMAL 58MM TEMPLATE (Compact)
// ==========================================
const thermal58mm = (data) => {
  const { sale, shop } = data;

  const itemsHtml = sale.items
    .map(
      (item) => `
    <div style="margin-bottom:6px; border-bottom:1px dotted #ccc; padding-bottom:4px;">
      <div style="font-weight:700; font-size:11px; line-height:1.2;">${
        item.product_name
      }</div>
      <div style="display:flex; justify-content:space-between; font-size:10px; margin-top:2px;">
        <span>${item.quantity} x ${item.rate}</span>
        <span style="font-weight:600;">${formatAmount(item.price)}</span>
      </div>
    </div>
  `
    )
    .join("");

  return `
    <html>
      <head>
        <style>
          body { font-family: 'Arial Narrow', Arial, sans-serif; margin: 0; padding: 2px; font-size: 10px; width: 48mm; color: #000; }
          .center { text-align: center; }
          h1 { margin: 0; font-size: 14px; font-weight: 800; text-transform: uppercase; }
          .line { border-top: 1px dashed #000; margin: 6px 0; }
          .flex { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center">
          <h1>${shop.shop_name}</h1>
          <div>${shop.city}</div>
          <div>${shop.contact_number}</div>
        </div>
        <div class="line"></div>
        <div class="flex"><span>#${sale.reference_no}</span> <span>${formatDate(
    sale.created_at
  )}</span></div>
        <div style="margin-bottom:4px;">To: ${
          sale.customer_name || "Cash"
        }</div>
        <div class="line"></div>
        
        <div>${itemsHtml}</div>

        <div class="line"></div>
        <div class="flex bold" style="font-size:13px; margin-top:6px;">
          <span>TOTAL:</span>
          <span>${formatAmount(sale.total_amount)}</span>
        </div>
        
        ${
          shop.generated_upi_qr
            ? `<div class="center" style="margin-top:10px;"><img src="${shop.generated_upi_qr}" style="width:80px;" /></div>`
            : ""
        }
        ${BRANDING_FOOTER}
      </body>
    </html>
  `;
};

// ==========================================
// 3. A4 STANDARD (Classic)
// ==========================================
const a4Standard = (data) => {
  // We utilize the robust base generator from invoiceTemplate.js but inject our footer
  const html = createInvoiceHTML(data);
  return html.replace("</body>", `${BRANDING_FOOTER}</body>`);
};

// ==========================================
// 4. A4 MODERN (Clean SaaS Look)
// ==========================================
const a4Modern = (data) => {
  const { sale, shop } = data;
  const gstEnabled = Boolean(shop.gst_enabled);

  return `
    <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; color: #1f2937; background: #fff; }
          .header { display: flex; justify-content: space-between; margin-bottom: 50px; }
          .brand-name { font-size: 24px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: -0.5px; }
          .invoice-label { font-size: 36px; font-weight: 800; color: #e5e7eb; text-align: right; line-height: 1; }
          .meta-label { font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 2px; }
          .meta-value { font-size: 13px; font-weight: 600; margin-bottom: 12px; }
          
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .box { background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #f3f4f6; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
          td { padding: 16px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
          
          .summary { display: flex; justify-content: flex-end; }
          .summary-box { width: 300px; }
          .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; }
          .total-row { border-top: 2px solid #e5e7eb; margin-top: 10px; padding-top: 15px; font-weight: 800; font-size: 18px; color: #111; }
          
          .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; }
        </style>
      </head>
      <body>
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
            </div>
          </div>
        </div>

        <div class="grid">
          <div class="box">
            <div class="meta-label">Billed To</div>
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${
              sale.customer_name || "Valued Customer"
            }</div>
            <div style="font-size: 13px; color: #4b5563;">
              ${sale.customer_phone ? `Ph: ${sale.customer_phone}<br>` : ""}
              ${sale.customer_address || ""}
            </div>
          </div>
          <div class="box" style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div class="meta-label">Payment Details</div>
              <div style="font-size: 13px; color: #4b5563;">
                 Bank: <strong>${shop.bank_name || "N/A"}</strong><br>
                 A/C: ${shop.bank_account_no || "N/A"}<br>
                 IFSC: ${shop.bank_account_ifsc_code || "N/A"}
              </div>
            </div>
            ${
              shop.generated_upi_qr
                ? `<div style="text-align:center;">
                     <img src="${shop.generated_upi_qr}" style="width:80px; height:80px; border:1px solid #eee; padding:2px; background:white;" />
                     <div style="font-size:9px; color:#6b7280; margin-top:2px;">Scan to Pay</div>
                   </div>`
                : ""
            }
          </div>
        </div>

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
            ${sale.items
              .map(
                (item) => `
              <tr>
                <td>
                  <div style="font-weight:600;">${item.product_name}</div>
                  ${
                    item.hsn
                      ? `<div style="font-size:10px; color:#9ca3af;">HSN: ${item.hsn}</div>`
                      : ""
                  }
                </td>
                <td style="text-align:center">${item.quantity}</td>
                <td style="text-align:right">${formatAmount(item.rate)}</td>
                <td style="text-align:right; font-weight:600;">${formatAmount(
                  item.price
                )}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-box">
             <div class="summary-row"><span>Subtotal</span> <span>${formatAmount(
               sale.total_amount + (sale.discount || 0)
             )}</span></div>
             ${
               gstEnabled
                 ? `<div class="summary-row"><span>Tax (GST)</span> <span>Included</span></div>`
                 : ""
             }
             ${
               sale.discount > 0
                 ? `<div class="summary-row" style="color:#ef4444;"><span>Discount</span> <span>-${formatAmount(
                     sale.discount
                   )}</span></div>`
                 : ""
             }
             <div class="summary-row total-row"><span>Total</span> <span>${formatAmount(
               sale.total_amount
             )}</span></div>
             <div style="text-align:right; font-size:11px; margin-top:4px; color:#6b7280;">${numberToWords(
               sale.total_amount
             )}</div>
          </div>
        </div>

        <div class="footer">
          <div>Terms: Goods once sold will not be taken back.</div>
          <div style="text-align:right;">Authorized Signature</div>
        </div>
        ${BRANDING_FOOTER}
      </body>
    </html>
  `;
};

// ==========================================
// 5. A5 LANDSCAPE (Full Detail - Optimized)
// ==========================================
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
              shop.pincode
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
              sale.created_at
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
                <td>${item.product_name}</td>
                ${
                  showHSN
                    ? `<td class="text-center">${item.hsn || "-"}</td>`
                    : ""
                }
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${formatAmount(item.rate)}</td>
                <td class="text-right bold">${formatAmount(item.price)}</td>
              </tr>
            `
              )
              .join("")}
            <!-- Empty Rows Filler for consistent height if needed -->
            ${Array.from({ length: Math.max(0, 6 - sale.items.length) })
              .map(
                () => `
              <tr><td>&nbsp;</td><td></td>${
                showHSN ? `<td></td>` : ""
              }<td></td><td></td><td></td></tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <!-- Bottom Section -->
        <div class="footer-section">
          <div class="amount-words">
            <div style="font-weight:bold; margin-bottom:2px;">Amount in Words:</div>
            <div style="font-style:italic;">${numberToWords(
              sale.total_amount
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
               sale.total_amount + (sale.discount || 0)
             )}</span></div>
             ${
               sale.discount > 0
                 ? `<div class="flex" style="justify-content:space-between;"><span>Disc:</span> <span>-${formatAmount(
                     sale.discount
                   )}</span></div>`
                 : ""
             }
             <div class="flex bold" style="justify-content:space-between; font-size:12px; margin-top:5px; border-top:1px solid #ccc; padding-top:2px;">
                <span>TOTAL:</span> <span>${formatAmount(
                  sale.total_amount
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

const templates = {
  thermal_80mm: thermal80mm,
  thermal_58mm: thermal58mm,
  a4_standard: a4Standard,
  a4_modern: a4Modern,
  a5_landscape: a5Landscape,
};

const getTemplate = (templateId, data) => {
  const generator = templates[templateId] || templates["a4_standard"];
  return generator(data);
};

module.exports = { getTemplate, availableTemplates: Object.keys(templates) };
