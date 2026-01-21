const { formatDate, formatAmount } = require("../../invoiceTemplate.js");
const { getTrackingHtml, BRANDING_FOOTER } = require("./utils.js");

const thermal80mm = (data) => {
  const { sale, shop } = data;
  const showDiscount = Boolean(shop.show_discount_column);

  const itemsHtml = sale.items
    .map((item) => {
      const total = item.price;
      return `
      <div style="border-bottom: 1px dashed #ccc; padding: 4px 0;">
        <div style="font-weight:600; font-size:12px; margin-bottom:2px;">
          ${item.product_name}
          ${getTrackingHtml(item)}
        </div>
        <div style="display:flex; justify-content:space-between; font-size:11px; color:#444;">
          <span>${item.quantity} x ${formatAmount(item.rate)} ${
            showDiscount && item.discount ? `(-${item.discount}%)` : ""
          }</span>
          <span style="font-weight:600; color:#000;">${formatAmount(
            total,
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
            sale.total_amount + (sale.discount || 0),
          )}</span></div>
          ${
            sale.discount > 0
              ? `<div class="info-row"><span>Discount:</span> <span>-${formatAmount(
                  sale.discount,
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

module.exports = thermal80mm;
