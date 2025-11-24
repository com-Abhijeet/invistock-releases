/**
 * Generates the HTML for a single product label.
 * Optimized for thermal printers with minimal whitespace.
 */
function createLabelHTML(item, shop, barcodeBase64, printerWidthMM) {
  // Calculate a safe width (slightly less than the printer width to avoid clipping)
  const safeWidth = printerWidthMM - 2;

  const style = `
    <style>
      body { 
        margin: 0; 
        padding: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        font-size: 12px; 
        width: ${printerWidthMM}mm;
        box-sizing: border-box;
        -webkit-print-color-adjust: exact; 
      }
      .label-container {
        width: ${safeWidth}mm;
        margin: 0 auto;
        text-align: center;
        padding: 2px 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        page-break-after: always; 
        overflow: hidden;
      }
      .shop-name { 
        font-weight: 800; 
        font-size: 0.85rem; 
        text-transform: uppercase; 
        margin-bottom: 2px;
        line-height: 1.1;
      }
      .barcode-img { 
        width: 90%; 
        height: 40px; 
        margin: 4px auto;
        object-fit: fill; 
      }
      .product-name { 
        font-weight: 700; 
        font-size: 0.9rem; 
        margin: 2px 0; 
        line-height: 1.2;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .product-code { 
        font-size: 0.75rem; 
        color: #000; 
        font-family: monospace;
        margin-bottom: 4px;
      }
      
      /* ✅ Table-style layout for Price and Specs */
      .info-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 2px;
        border-top: 1px dashed #000;
      }
      .info-table td {
        padding: 2px;
        text-align: center;
        font-weight: 700;
        font-size: 0.9rem; /* Normalized font size */
      }
      .price-cell {
        font-size: 1rem; /* Prices slightly bigger */
        font-weight: 800;
      }
      .divider {
        border-right: 1px solid #000;
      }
    </style>
  `;

  const shopName = shop.use_alias_on_bills ? shop.shop_alias : shop.shop_name;

  // ✅ Construct the price string: MRP | MFW
  let priceString = "";
  if (item.mrp && item.mfw_price) {
    priceString = `${item.mrp} | ${item.mfw_price}`;
  } else {
    priceString = `${item.mrp || item.mfw_price || 0}`;
  }

  // ✅ Construct the specs string: Size | Weight
  let specsString = "";
  if (item.size && item.weight) {
    specsString = `${item.size} | ${item.weight}`;
  } else {
    specsString = item.size || item.weight || "";
  }

  const content = `
    <div class="label-container">
      <div class="shop-name">${shopName}</div>
      
      <img class="barcode-img" src="${barcodeBase64}" alt="Barcode" />
      
      <div class="product-name">${item.name}</div>
      <div class="product-code">${item.product_code}</div>
      
      <table class="info-table">
        <tr>
          <td class="price-cell" colspan="2">${priceString}</td>
        </tr>
        ${
          specsString
            ? `
        <tr>
          <td colspan="2" style="font-size: 0.8rem; font-weight: 600;">${specsString}</td>
        </tr>
        `
            : ""
        }
      </table>
    </div>
  `;

  return { style, content };
}

module.exports = { createLabelHTML };
