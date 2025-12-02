/**
 * Generates the HTML for a single product label.
 * Layout: Barcode on Top. Bottom Split: Left (Details) vs Right (Prices).
 */
function createLabelHTML(item, shop, barcodeBase64, printerWidthMM) {
  // Calculate safe width
  const safeWidth = printerWidthMM - 2;

  const style = `
    <style>
      body { 
        margin: 0; 
        padding: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        width: ${printerWidthMM}mm;
        box-sizing: border-box;
        -webkit-print-color-adjust: exact; 
      }
      
      .label-wrapper {
        width: ${safeWidth}mm;
        margin: 0 auto;
        padding: 2px 0;
        page-break-after: always; 
        overflow: hidden;
      }

      .label-box {
        border: 2px solid #000;
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
      }

      /* --- TOP: Barcode --- */
      .barcode-section {
        border-bottom: 2px solid #000;
        text-align: center;
        padding: 3px;
        height: 45px; /* Fixed height */
        display: flex;
        justify-content: center;
        align-items: center;
        background: #fff;
      }
      
      .barcode-img { 
        /* Fixed width relative to container, prevents flexing weirdly */
        width: 90%; 
        height: 100%; 
        object-fit: fill; 
      }

      /* --- BOTTOM: Split Layout --- */
      .info-section {
        display: flex;
        width: 100%;
        min-height: 40px; /* Ensure minimum height */
      }

      /* LEFT: Names (60%) */
      .name-col {
        width: 60%;
        border-right: 2px solid #000;
        padding: 4px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: left;
        overflow: hidden;
      }

      .shop-name { 
        font-size: 0.65rem; 
        font-weight: 700; 
        text-transform: uppercase; 
        margin-bottom: 2px;
        border-bottom: 1px solid #ccc;
        padding-bottom: 1px;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .product-name { 
        font-size: 0.85rem; 
        font-weight: 800; 
        line-height: 1.1;
        margin-bottom: 1px;
        /* Limit to 2 lines */
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .product-code { 
        font-size: 0.65rem; 
        font-family: monospace; 
        color: #444;
      }

      /* RIGHT: Prices & Specs (40%) */
      .price-col {
        width: 40%;
        display: flex;
        flex-direction: column;
      }

      .price-box {
        flex: 1; /* Takes remaining space */
        display: flex;
        justify-content: center;
        align-items: center;
        background: #f9f9f9;
        padding: 2px;
        border-bottom: 1px solid #000;
      }
      
      .price-val { 
        font-size: 0.95rem; 
        font-weight: 600; 
        text-align: center;
        line-height: 1.2;
      }

      .specs-box {
        height: 18px; /* Fixed height for specs */
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 0.7rem;
        font-weight: 700;
        color: #333;
        gap: 4px;
        background: #fff;
      }
    </style>
  `;

  const shopName = shop.use_alias_on_bills ? shop.shop_alias : shop.shop_name;

  // ✅ Price Logic: MRP | MFW
  const prices = [];
  if (item.mrp) prices.push(item.mrp);
  if (item.mfw_price) prices.push(item.mfw_price);

  // Join with separator, e.g. "1200 | 950"
  const priceString = prices.length > 0 ? prices.join(" | ") : "₹0";

  // ✅ Specs Logic
  const specs = [];
  if (item.size) specs.push(item.size);
  if (item.weight) specs.push(item.weight);
  const specsString = specs.join(" | ");

  const content = `
    <div class="label-wrapper">
      <div class="label-box">
        
        <!-- TOP: Barcode -->
        <div class="barcode-section">
          <img class="barcode-img" src="${barcodeBase64}" alt="Barcode" />
        </div>

        <!-- BOTTOM: Split Info -->
        <div class="info-section">
          
          <!-- LEFT: Names -->
          <div class="name-col">
            <div class="shop-name">${shopName}</div>
            <div class="product-name">${item.name}</div>
            <div class="product-code">${item.product_code}</div>
          </div>

          <!-- RIGHT: Prices & Specs -->
          <div class="price-col">
            <div class="price-box">
               <div class="price-val">${priceString}</div>
            </div>
            ${specsString ? `<div class="specs-box">${specsString}</div>` : ""}
          </div>

        </div>

      </div>
    </div>
  `;

  return { style, content };
}

module.exports = { createLabelHTML };
