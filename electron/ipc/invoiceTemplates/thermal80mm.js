const { formatDate, formatAmount } = require("../../invoiceTemplate.js");
const { getTrackingHtml, BRANDING_FOOTER } = require("./utils.js");

const thermal80mm = (data) => {
  const { sale, shop } = data;
  const showDiscount = Boolean(shop.show_discount_column);
  const isInclusive = shop.is_inclusive || false;

  // Snapshot Variables (New Schema) w/ Legacy Fallbacks
  const custName = sale.customer_name || "Cash Sale";
  const custGst = sale.gstin || sale.customer_gst_no || "";

  // Calculate Totals Correctly
  const subTotal = sale.items.reduce((sum, item) => sum + (item.price || 0), 0);
  const discountPercentage = sale.discount || 0;
  const discountAmount = (subTotal * discountPercentage) / 100;
  const netAmount = subTotal - discountAmount;
  const roundOff = sale.total_amount - netAmount;

  // Supermarket layout: Item Name on line 1. Qty, Rate, Amount on line 2.
  const itemsHtml = sale.items
    .map((item) => {
      const total = item.price;
      return `
      <div style="margin-bottom: 6px;">
        <div style="font-weight:bold; font-size:12px; text-transform: uppercase;">
          ${item.product_name || item.name || "ITEM"}
          ${getTrackingHtml(item)}
        </div>
        <div style="display:flex; justify-content:space-between; font-size:11px; margin-top:2px;">
          <span>  ${item.quantity} ${item.unit || ""} x ${formatAmount(item.rate)} ${
            showDiscount && item.discount ? `(-${item.discount}%)` : ""
          }</span>
          <span style="font-weight:bold;">${formatAmount(total)}</span>
        </div>
      </div>
    `;
    })
    .join("");

  return `
    <html>
      <head>
        <style>
          body { font-family: 'Consolas', 'Courier New', monospace; margin: 0; padding: 5px; font-size: 12px; width: 78mm; color: #000; background: #fff; }
          .header { text-align: center; margin-bottom: 8px; }
          h1 { font-size: 18px; margin: 0; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
          .meta { font-size: 11px; margin-top: 3px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .info-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px; }
          .totals { margin-top: 8px; font-size: 12px; }
          .grand-total { font-size: 15px; font-weight: bold; margin: 4px 0; }
          .qr-box { text-align: center; margin-top: 15px; }
          .bold { font-weight: bold; }
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
        <div class="info-row"><span>Bill No: <span class="bold">${sale.reference_no}</span></span></div>
        <div class="info-row"><span>Date: ${formatDate(sale.created_at)}</span> <span>Mode: ${sale.payment_mode || "Cash"}</span></div>
        <div class="info-row"><span>Customer: ${custName}</span></div>
        ${custGst ? `<div class="info-row"><span>GSTIN: ${custGst}</span></div>` : ""}
        <div class="divider"></div>

        <div class="info-row bold" style="font-size: 10px;">
           <span>ITEM / QTY x RATE</span>
           <span>AMOUNT</span>
        </div>
        <div class="divider"></div>

        <div>${itemsHtml}</div>

        <div class="divider"></div>

        <div class="totals">
          <div class="info-row"><span>Total Items:</span> <span>${sale.items.length}</span></div>
          <div class="info-row"><span>Subtotal:</span> <span>${formatAmount(subTotal)}</span></div>
          ${
            discountPercentage > 0
              ? `<div class="info-row"><span>Discount (${discountPercentage}%):</span> <span>-${formatAmount(discountAmount)}</span></div>`
              : ""
          }
           ${
             Math.abs(roundOff) > 0.01
               ? `<div class="info-row"><span>Round Off:</span> <span>${roundOff > 0 ? "+" : ""}${formatAmount(roundOff)}</span></div>`
               : ""
           }
          
          <div class="divider"></div>
          <div class="info-row grand-total">
            <span>GRAND TOTAL</span>
            <span>${formatAmount(sale.total_amount)}</span>
          </div>
          <div class="divider"></div>
        </div>

        ${
          discountAmount > 0
            ? `
        <div style="text-align: center; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6px 0; margin: 10px 0;">
           <div class="bold" style="font-size: 13px;">** SAVINGS **</div>
           <div class="bold" style="font-size: 14px; margin-top: 3px;">You saved Rs. ${formatAmount(discountAmount)} !</div>
        </div>`
            : ""
        }

        ${
          isInclusive
            ? `<div style="text-align:center; font-size:10px; color:#555; margin-top:4px;">(All prices are inclusive of GST)</div>`
            : ""
        }

        ${
          shop.generated_upi_qr
            ? `
          <div class="qr-box">
            <img src="${shop.generated_upi_qr}" style="width:90px; height:90px; border: 1px solid #eee; padding: 4px;" />
            <div style="font-size:10px; margin-top:2px;">Scan to Pay</div>
          </div>
        `
            : ""
        }
        
        <div style="text-align:center; font-weight:bold; font-size:12px; margin-top:15px;">
           Thank You for Shopping!
           <div style="font-weight:normal; font-size:10px; margin-top:2px;">Visit Us Again</div>
        </div>
        ${BRANDING_FOOTER}
      </body>
    </html>
  `;
};

module.exports = thermal80mm;
