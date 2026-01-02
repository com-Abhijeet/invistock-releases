const {
  formatAddress,
  formatDate,
  formatAmount,
  numberToWords,
} = require("../invoiceTemplate.js"); // We reuse helpers

// --- 1. THERMAL 80MM TEMPLATE ---
const thermal80mm = (data) => {
  const { sale, shop } = data;
  const gstEnabled = Boolean(shop.gst_enabled);
  const showDiscount = Boolean(shop.show_discount_column);

  let itemsHtml = sale.items
    .map((item, i) => {
      const total = item.price;
      return `
        <tr>
          <td style="width:5%">${i + 1}</td>
          <td style="width:55%">
            ${item.product_name}<br>
            <span style="font-size:10px;color:#555">
              ${item.quantity} x ${formatAmount(item.rate)}
              ${
                showDiscount && item.discount > 0
                  ? ` (Disc: ${item.discount}%)`
                  : ""
              }
            </span>
          </td>
          <td style="width:40%;text-align:right;vertical-align:top">
            ${formatAmount(total)}
          </td>
        </tr>
      `;
    })
    .join("");

  // GST Summary for Footer (Simplified for Thermal)
  let gstHtml = "";
  if (gstEnabled) {
    // Calculate total tax from items if not readily available in 'sale' object root
    // Assuming sale.items has tax info. We'll show a simple "Tax Included" line or breakup if configured.
    // For thermal, keep it compact.
    gstHtml = `
        <div style="border-top:1px dashed #000; margin-top:5px; padding-top:2px; font-size:10px;">
           GST Summary Available on Request
        </div>
      `;
  }

  return `
    <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; margin: 0; padding: 5px; font-size: 12px; width: 72mm; }
          .header { text-align: center; margin-bottom: 10px; }
          h1 { font-size: 16px; margin: 0; font-weight: bold; }
          p { margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; border-bottom: 1px solid #000; font-size: 11px; }
          td { padding: 4px 0; }
          .totals { margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .grand { font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${shop.shop_name}</h1>
          <p>${shop.address_line1}</p>
          <p>${shop.city} - ${shop.pincode}</p>
          <p>Ph: ${shop.contact_number}</p>
          ${shop.gstin ? `<p>GSTIN: ${shop.gstin}</p>` : ""}
        </div>
        
        <div style="border-bottom:1px dashed #000; padding-bottom:5px; margin-bottom:5px;">
          Bill No: ${sale.reference_no}<br>
          Date: ${formatDate(sale.created_at)}<br>
          Customer: ${sale.customer_name || "Cash Sale"}
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div class="totals">
          <div class="row"><span>Subtotal:</span> <span>${formatAmount(
            sale.total_amount
          )}</span></div>
          ${
            sale.discount > 0
              ? `<div class="row"><span>Discount:</span> <span>-${formatAmount(
                  sale.discount
                )}</span></div>`
              : ""
          }
          <div class="row grand"><span>GRAND TOTAL:</span> <span>${formatAmount(
            sale.total_amount
          )}</span></div>
          <div class="row"><span>Paid:</span> <span>${formatAmount(
            sale.paid_amount
          )}</span></div>
        </div>

        <div class="footer">
          <p>Thank You! Visit Again.</p>
        </div>
      </body>
    </html>
  `;
};

// --- 2. THERMAL 58MM TEMPLATE ---
const thermal58mm = (data) => {
  // Almost same as 80mm but tighter CSS
  const { sale, shop } = data;
  const showDiscount = Boolean(shop.show_discount_column);

  let itemsHtml = sale.items
    .map(
      (item) => `
    <tr>
      <td colspan="2" style="padding-top:4px; font-weight:bold;">${
        item.product_name
      }</td>
    </tr>
    <tr>
      <td style="padding-bottom:4px; border-bottom:1px dotted #ccc;">
        ${item.quantity} x ${item.rate}
        ${showDiscount && item.discount > 0 ? `(-${item.discount}%)` : ""}
      </td>
      <td style="text-align:right; padding-bottom:4px; border-bottom:1px dotted #ccc;">
        ${formatAmount(item.price)}
      </td>
    </tr>
  `
    )
    .join("");

  return `
    <html>
      <head>
        <style>
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 2px; font-size: 10px; width: 48mm; }
          .center { text-align: center; }
          h2 { margin: 0; font-size: 12px; }
          p { margin: 1px 0; }
          table { width: 100%; border-collapse: collapse; }
          .totals { margin-top: 5px; border-top: 1px solid #000; padding-top: 2px; }
          .flex { display: flex; justify-content: space-between; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center">
          <h2>${shop.shop_name}</h2>
          <p>${shop.city}</p>
          <p>${shop.contact_number}</p>
        </div>
        <hr style="border-top: 1px dashed #000;">
        <div>
          Inv: ${sale.reference_no}<br>
          ${formatDate(sale.created_at)}
        </div>
        <hr style="border-top: 1px dashed #000;">
        
        <table>
          ${itemsHtml}
        </table>

        <div class="totals">
          <div class="flex bold" style="font-size:12px; margin-top:5px;">
            <span>TOTAL:</span>
            <span>${formatAmount(sale.total_amount)}</span>
          </div>
        </div>
        
        <div class="center" style="margin-top:10px;">Thank You</div>
      </body>
    </html>
  `;
};

// --- 3. A4 STANDARD (Classic Table) ---
const a4Standard = (data) => {
  // Leverages existing detailed logic but structured specifically for A4
  return require("../invoiceTemplate.js").createInvoiceHTML(data);
};

// --- 4. A4 MODERN (Clean, Minimalist) ---
const a4Modern = (data) => {
  const { sale, shop } = data;

  // Clean, borderless table, plenty of whitespace
  return `
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; margin-bottom: 50px; }
          .brand h1 { margin: 0; font-size: 24px; color: #2c3e50; text-transform: uppercase; letter-spacing: 2px; }
          .brand p { margin: 2px 0; color: #7f8c8d; font-size: 12px; }
          .invoice-meta { text-align: right; }
          .invoice-meta h2 { margin: 0; font-size: 32px; color: #bdc3c7; font-weight: 300; }
          .bill-to { margin-bottom: 30px; }
          .bill-to h3 { font-size: 14px; text-transform: uppercase; color: #95a5a6; border-bottom: 1px solid #eee; padding-bottom: 5px; width: 50%; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          th { text-align: left; padding: 15px 10px; background: #f8f9fa; color: #2c3e50; font-weight: 600; font-size: 12px; text-transform: uppercase; }
          td { padding: 15px 10px; border-bottom: 1px solid #ecf0f1; font-size: 13px; }
          .total-section { width: 300px; margin-left: auto; }
          .row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
          .grand-total { font-size: 18px; font-weight: bold; color: #27ae60; border-top: 2px solid #27ae60; padding-top: 10px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <h1>${shop.shop_name}</h1>
            <p>${shop.address_line1}, ${shop.city}</p>
            <p>${shop.state} - ${shop.pincode}</p>
            <p>GSTIN: ${shop.gstin || "N/A"}</p>
          </div>
          <div class="invoice-meta">
            <h2>INVOICE</h2>
            <p><strong># ${sale.reference_no}</strong></p>
            <p>${formatDate(sale.created_at)}</p>
          </div>
        </div>

        <div class="bill-to">
          <h3>Bill To</h3>
          <p><strong>${sale.customer_name || "Walking Customer"}</strong></p>
          ${sale.customer_phone ? `<p>Ph: ${sale.customer_phone}</p>` : ""}
          ${sale.customer_address ? `<p>${sale.customer_address}</p>` : ""}
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align:center">Qty</th>
              <th style="text-align:right">Rate</th>
              <th style="text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items
              .map(
                (item) => `
              <tr>
                <td>${item.product_name}</td>
                <td style="text-align:center">${item.quantity}</td>
                <td style="text-align:right">${formatAmount(item.rate)}</td>
                <td style="text-align:right">${formatAmount(item.price)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div class="total-section">
          <div class="row"><span>Subtotal</span> <span>${formatAmount(
            sale.total_amount
          )}</span></div>
          <div class="row grand-total"><span>Total</span> <span>${formatAmount(
            sale.total_amount
          )}</span></div>
        </div>
      </body>
    </html>
  `;
};

// --- 5. A5 LANDSCAPE (Compact Invoice) ---
const a5Landscape = (data) => {
  // Similar to A4 but with CSS configured for @page { size: A5 landscape }
  const { sale, shop } = data;
  return `
    <html>
      <head>
        <style>
          @page { size: A5 landscape; margin: 10mm; }
          body { font-family: Arial, sans-serif; font-size: 11px; }
          .container { display: flex; gap: 20px; }
          .left { flex: 1; }
          .right { flex: 1; text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ccc; padding: 4px; text-align: left; }
          .header { border-bottom: 2px solid #333; padding-bottom: 5px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size:16px; font-weight:bold;">${shop.shop_name}</div>
          <div>${shop.city} | ${shop.contact_number}</div>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
           <div>
             <strong>To:</strong> ${sale.customer_name}<br>
             Inv: ${sale.reference_no}
           </div>
           <div style="text-align:right">
             Date: ${formatDate(sale.created_at)}
           </div>
        </div>
        <table>
          <thead>
            <tr style="background:#eee;">
              <th>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items
              .map(
                (item) => `
              <tr>
                <td>${item.product_name}</td>
                <td>${item.quantity}</td>
                <td>${item.rate}</td>
                <td>${item.price}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <div style="text-align:right; margin-top:10px; font-size:14px; font-weight:bold;">
           Grand Total: ${formatAmount(sale.total_amount)}
        </div>
      </body>
    </html>
  `;
};

// --- MANAGER ---

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
