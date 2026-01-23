const bwipjs = require("bwip-js");
// ✅ 1. Import the transliteration service
const { getMarathiName } = require("./transliterationService.js");

/**
 * Generates a responsive HTML shipping label.
 * Layout changes based on the printerWidthMM.
 * @param {object} shop - The shop details (sender).
 * @param {object} sale - The flat sale data object.
 * @param {number} printerWidthMM - The width of the printer in millimeters.
 *@returns {Promise<string>} A promise that resolves with the complete HTML string.
 */
async function createShippingLabelHTML(shop, sale, printerWidthMM) {
  // --- 1. SET LAYOUT FLAG ---
  // We'll consider anything over 90mm (like a 4-inch label) as "large"
  const isLargeLayout = printerWidthMM > 90;

  // --- 2. GENERATE BARCODE ---
  const barcodeImage = await new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: "code128",
        text: sale.reference_no,
        scale: 3,
        height: 15,
        includetext: true,
        textxalign: "center",
      },
      (err, png) => {
        if (err) reject(err);
        else resolve(`data:image/png;base64,${png.toString("base64")}`);
      },
    );
  });

  // --- 3. FETCH ALL TRANSLATIONS IN PARALLEL ---
  const [customerNameMR, customerAddressMR, customerCityMR, customerStateMR] =
    await Promise.all([
      getMarathiName(sale.customer_name || ""),
      getMarathiName(sale.customer_address || ""),
      getMarathiName(sale.customer_city || ""),
      getMarathiName(sale.customer_state || ""),
    ]);

  // --- 4. CONDITIONAL CSS STYLES ---
  const style = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        color: #111;
      }
      .label-container {
        width: ${printerWidthMM}mm;
        border: 2px solid #000;
        padding: 15px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        box-sizing: border-box;
      }
      h3, h4, p, strong, div { margin: 0; padding: 0; }
      .section-title {
        font-size: 0.8em;
        font-weight: bold;
        color: #333;
        margin-bottom: 5px;
        text-transform: uppercase;
        border-bottom: 1px solid #ccc;
        padding-bottom: 3px;
      }
      .from-address { font-size: 0.9em; line-height: 1.4; }
      .barcode-section { text-align: center; margin-top: 10px; }
      .barcode-section img { max-width: 90%; height: auto; }

      /* --- Small Layout (Default) --- */
      .layout-small .ship-to-address { line-height: 1.5; }
      .layout-small .ship-to-address .name { font-size: 1.4em; font-weight: bold; }
      .layout-small .local-name { font-size: 0.95em; color: #333; font-style: italic; }
      .layout-small .items-table { width: 100%; border-collapse: collapse; font-size: 0.85em; margin-top: 5px; }
      .layout-small .items-table th, .layout-small .items-table td {
        padding: 6px 2px;
        text-align: left; 
        border-bottom: 1px solid #eee;
        vertical-align: top;
      }
      .layout-small .items-table th { font-weight: bold; }

      /* --- Large Layout (Side-by-Side) --- */
      .layout-large .address-container,
      .layout-large .item-container {
        display: flex;
        flex-direction: row;
        gap: 10px;
      }
      .layout-large .col-en, .layout-large .col-mr {
        flex: 1; /* Each takes 50% width */
        line-height: 1.5;
      }
      .layout-large .col-en .name { font-size: 1.4em; font-weight: bold; }
      .layout-large .col-mr .name { font-size: 1.2em; font-weight: bold; font-style: italic; }
      .layout-large .col-mr { border-left: 1px dashed #ccc; padding-left: 10px; font-style: italic; }
      
      .layout-large .items-table { width: 100%; border-collapse: collapse; font-size: 0.9em; margin-top: 5px; }
      .layout-large .items-table th, .layout-large .items-table td {
        padding: 6px 4px;
        text-align: left; 
        border-bottom: 1px solid #eee;
        vertical-align: top;
      }
      .layout-large .items-table th { font-weight: bold; }
      .layout-large .col-mr-item { font-style: italic; color: #333; }

      @media screen {
        body { background-color: #f0f0f0; display: flex; justify-content: center; padding-top: 20px; }
        .label-container { background-color: #fff; box-shadow: 0 0 10px rgba(0,0,0,0.15); }
      }
    </style>
  `;

  // --- 5. CONDITIONAL HTML FOR ITEMS TABLE ---
  const itemsThead = isLargeLayout
    ? `
    <thead>
      <tr>
        <th>Item (English)</th>
        <th>Item (Marathi)</th>
        <th>Qty</th>
      </tr>
    </thead>
  `
    : `
    <thead>
      <tr>
        <th>Item Description</th>
        <th>Qty</th>
      </tr>
    </thead>
  `;

  const itemsHtml = (
    await Promise.all(
      sale.items.map(async (item) => {
        const marathiName = await getMarathiName(item.product_name || "");
        if (isLargeLayout) {
          return `
          <tr>
            <td>${item.product_name || "N/A"}</td>
            <td class="col-mr-item">${marathiName}</td>
            <td>${item.quantity}</td>
          </tr>
        `;
        } else {
          return `
          <tr>
            <td>
              ${item.product_name || "N/A"}
              <br>
              <span class="local-name">${marathiName}</span>
            </td>
            <td>${item.quantity}</td>
          </tr>
        `;
        }
      }),
    )
  ).join("");

  // --- 6. CONDITIONAL HTML FOR "SHIP TO" BLOCK ---
  const shipToHtml = isLargeLayout
    ? `
    <div class="address-container">
      <div class="col-en">
        <div class="name">${sale.customer_name}</div>
        <div>${sale.customer_address || ""}</div>
        <div>${sale.customer_city || ""}, ${sale.customer_state || ""} - ${
          sale.customer_pincode || ""
        }</div>
        <div>Ph: ${sale.customer_phone}</div>
      </div>
      <div class="col-mr">
        <div class="name">${customerNameMR}</div>
        <div>${customerAddressMR}</div>
        <div>${customerCityMR}, ${customerStateMR}</div>
      </div>
    </div>
  `
    : `
    <div class="ship-to-address">
      <div class="name">
        ${sale.customer_name}
        <br>
        <span class="local-name" style="font-weight: bold; font-size: 1.1em;">${customerNameMR}</span>
      </div>
      <div>
        ${sale.customer_address || ""}
        <br>
        <span class="local-name">${customerAddressMR}</span>
      </div>
      <div>
        ${sale.customer_city || ""}, ${sale.customer_state || ""} - ${
          sale.customer_pincode || ""
        }
        <br>
        <span class="local-name">${customerCityMR}, ${customerStateMR}</span>
      </div>
      <div>Ph: ${sale.customer_phone}</div>
    </div>
  `;

  // --- 7. ASSEMBLE THE FINAL HTML ---
  const html = `
    <!DOCTYPE html>
    <html>
      <head><title>Shipping Label</title>${style}</head>
      <body class="${isLargeLayout ? "layout-large" : "layout-small"}">
        <div class="label-container">
          
          <div class="ship-to-section">
            <div class="section-title">Ship To</div>
            ${shipToHtml} </div>

          <div class="from-section">
            <div class="section-title">Shipped By</div>
            <div class="from-address">
              <strong>${shop.shop_name}</strong><br>
              ${shop.address_line1 || ""}<br>
              ${shop.city || ""}, ${shop.state || ""} - ${shop.pincode || ""}
            </div>
          </div>

          <div class="contents-section">
            <div class="section-title">Package Contents (Order: ${
              sale.reference_no
            })</div>
            <table class="items-table">
              ${itemsThead} <tbody>${itemsHtml}</tbody>
            </table>
          </div>

          <div class="barcode-section">
            <img src="${barcodeImage}" alt="Barcode for ${sale.reference_no}" />
          </div>
        </div>
      </body>
    </html>
  `;
  return html;
}

module.exports = { createShippingLabelHTML };
