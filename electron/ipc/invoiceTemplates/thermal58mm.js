const { formatDate, formatAmount } = require("../../invoiceTemplate.js");
const { getTrackingHtml, BRANDING_FOOTER } = require("./utils.js");

const thermal58mm = (data) => {
  const { sale, shop } = data;
  const isInclusive = shop.is_inclusive || false;

  // Snapshot Variables (New Schema) w/ Legacy Fallbacks
  const custName = sale.customer_name || "Cash Sale";
  const custGst = sale.gstin || sale.customer_gst_no || "";

  // Calculate Subtotal and Discount Correctly
  const subTotal = sale.items.reduce((sum, item) => sum + (item.price || 0), 0);
  const discountPercentage = sale.discount || 0;
  const discountAmount = (subTotal * discountPercentage) / 100;
  const netAmount = subTotal - discountAmount;
  const roundOff = sale.total_amount - netAmount;

  const itemsHtml = sale.items
    .map(
      (item) => `
    <div style="margin-bottom:6px;">
      <div style="font-weight:bold; font-size:11px; line-height:1.2; text-transform: uppercase;">
        ${item.product_name || item.name || "ITEM"}
        ${getTrackingHtml(item)}
      </div>
      <div style="display:flex; justify-content:space-between; font-size:10px; margin-top:1px;">
        <span>  ${item.quantity} ${item.unit || ""} x ${formatAmount(item.rate)}</span>
        <span style="font-weight:bold;">${formatAmount(item.price)}</span>
      </div>
    </div>
  `,
    )
    .join("");

  return `
    <html>
      <head>
        <style>
          body { font-family: 'Consolas', 'Courier New', monospace; margin: 0; padding: 2px; font-size: 10px; width: 48mm; color: #000; }
          .center { text-align: center; }
          h1 { margin: 0; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
          .line { border-top: 1px dashed #000; margin: 4px 0; }
          .flex { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center">
          <h1>${shop.shop_name}</h1>
          <div style="font-size: 9px;">${shop.address_line1}, ${shop.city}</div>
          <div style="font-size: 9px;">Ph: ${shop.contact_number}</div>
          ${shop.gstin ? `<div style="font-size: 9px;">GSTIN: ${shop.gstin}</div>` : ""}
        </div>
        
        <div class="line"></div>
        <div class="flex"><span>Bill No: ${sale.reference_no}</span></div>
        <div class="flex"><span>Date: ${formatDate(sale.created_at)}</span></div>
        <div class="flex"><span>Cust: ${custName}</span></div>
        ${custGst ? `<div class="flex"><span>GSTIN: ${custGst}</span></div>` : ""}
        <div class="line"></div>
        
        <div class="flex bold" style="font-size: 9px;">
           <span>ITEM / QTY x RATE</span>
           <span>AMOUNT</span>
        </div>
        <div class="line"></div>
        
        <div>${itemsHtml}</div>
        
        <div class="line"></div>

        <div class="flex">
          <span>Total Items:</span>
          <span>${sale.items.length}</span>
        </div>

        <div class="flex">
          <span>Subtotal:</span>
          <span>${formatAmount(subTotal)}</span>
        </div>
        
        ${
          discountPercentage > 0
            ? `
        <div class="flex">
          <span>Disc (${discountPercentage}%):</span>
          <span>-${formatAmount(discountAmount)}</span>
        </div>`
            : ""
        }

        ${
          Math.abs(roundOff) > 0.01
            ? `
        <div class="flex">
          <span>Round Off:</span>
          <span>${roundOff > 0 ? "+" : ""}${formatAmount(roundOff)}</span>
        </div>`
            : ""
        }

        <div class="line"></div>
        <div class="flex bold" style="font-size:13px; margin:4px 0;">
          <span>GRAND TOTAL</span>
          <span>${formatAmount(sale.total_amount)}</span>
        </div>
        <div class="line"></div>
        
        ${
          discountAmount > 0
            ? `
        <div class="center" style="margin: 8px 0; padding: 4px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000;">
           <div class="bold" style="font-size: 11px;">** SAVINGS **</div>
           <div class="bold" style="font-size: 12px; margin-top: 2px;">You saved Rs. ${formatAmount(discountAmount)}!</div>
        </div>`
            : ""
        }

        ${
          isInclusive
            ? `<div class="center" style="font-size:9px; color:#555; margin-top:4px;">(All prices inclusive of GST)</div>`
            : ""
        }

        ${
          shop.generated_upi_qr
            ? `<div class="center" style="margin-top:10px;"><img src="${shop.generated_upi_qr}" style="width:70px;" /></div>`
            : ""
        }

        <div class="center" style="margin-top: 10px; font-weight: bold;">
          Thank you for shopping!
          <div style="font-size: 9px; font-weight: normal; margin-top: 2px;">Visit Us Again</div>
        </div>
        
        ${BRANDING_FOOTER}
      </body>
    </html>
  `;
};

module.exports = thermal58mm;
