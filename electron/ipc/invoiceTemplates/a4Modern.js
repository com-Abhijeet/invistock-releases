const {
  formatDate,
  formatAmount,
  numberToWords,
} = require("../../invoiceTemplate.js");
const { getTrackingHtml, BRANDING_FOOTER } = require("./utils.js");

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
                  ${getTrackingHtml(item)}
                  ${
                    item.hsn
                      ? `<div style="font-size:10px; color:#9ca3af; margin-top:1px;">HSN: ${item.hsn}</div>`
                      : ""
                  }
                </td>
                <td style="text-align:center">${item.quantity}</td>
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

        <div class="summary">
          <div class="summary-box">
             <div class="summary-row"><span>Subtotal</span> <span>${formatAmount(
               sale.total_amount + (sale.discount || 0),
             )}</span></div>
             ${
               gstEnabled
                 ? `<div class="summary-row"><span>Tax (GST)</span> <span>Included</span></div>`
                 : ""
             }
             ${
               sale.discount > 0
                 ? `<div class="summary-row" style="color:#ef4444;"><span>Discount</span> <span>-${formatAmount(
                     sale.discount,
                   )}</span></div>`
                 : ""
             }
             <div class="summary-row total-row"><span>Total</span> <span>${formatAmount(
               sale.total_amount,
             )}</span></div>
             <div style="text-align:right; font-size:11px; margin-top:4px; color:#6b7280;">${numberToWords(
               sale.total_amount,
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

module.exports = a4Modern;
