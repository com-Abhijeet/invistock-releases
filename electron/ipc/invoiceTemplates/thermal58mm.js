const { formatDate, formatAmount } = require("../../invoiceTemplate.js");
const { getTrackingHtml, BRANDING_FOOTER } = require("./utils.js");

const thermal58mm = (data) => {
  const { sale, shop } = data;
  const isInclusive = shop.is_inclusive || false;

  const itemsHtml = sale.items
    .map(
      (item) => `
    <div style="margin-bottom:6px; border-bottom:1px dotted #ccc; padding-bottom:4px;">
      <div style="font-weight:700; font-size:11px; line-height:1.2;">
        ${item.product_name}
        ${getTrackingHtml(item)}
      </div>
      <div style="display:flex; justify-content:space-between; font-size:10px; margin-top:2px;">
        <span>${item.quantity} ${item.unit || ""} x ${item.rate}</span>
        <span style="font-weight:600;">${formatAmount(item.price)}</span>
      </div>
    </div>
  `,
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
          sale.created_at,
        )}</span></div>
        <div style="margin-bottom:4px;">To: ${
          sale.customer_name || "Cash"
        }</div>
        <div class="line"></div>
        
        <div>${itemsHtml}</div>

        <div class="line"></div>
        
        ${
          isInclusive
            ? `<div style="text-align:right; font-size:9px; color:#555; margin-bottom:2px;">(All prices inclusive of GST)</div>`
            : ""
        }

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

module.exports = thermal58mm;
