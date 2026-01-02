/**
 * Generates the HTML for a single product label.
 * Layout: Barcode on Top. Bottom Split: Left (Details) vs Right (Prices).
 * * Recommended Minimum Label Size: 50mm x 25mm
 */
function createLabelHTML(item, shop, barcodeBase64, printerWidthMM) {
  // Calculate safe width (mm) - reserve 1mm margin on each side
  const safeWidth = printerWidthMM - 2;

  // Helper to encode wholesale price discreetly (A=1, B=2, ... J=0)
  // Example: 120 -> ABJ
  const encodePrice = (price) => {
    if (!price) return "";
    const pStr = Math.round(price).toString();
    const map = {
      1: "A",
      2: "B",
      3: "C",
      4: "D",
      5: "E",
      6: "F",
      7: "G",
      8: "H",
      9: "I",
      0: "J",
    };
    return pStr
      .split("")
      .map((d) => map[d] || d)
      .join("");
  };

  const style = `
    <style>
      @page {
        margin: 0;
        size: ${printerWidthMM}mm auto; 
      }
      body { 
        margin: 0; 
        padding: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        width: ${printerWidthMM}mm;
        background-color: #fff;
        -webkit-print-color-adjust: exact; 
      }
      
      .label-wrapper {
        width: ${safeWidth}mm;
        margin: 0 auto;
        padding-top: 1mm;
        padding-bottom: 1mm;
        page-break-after: always; 
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .label-box {
        width: 100%;
        display: flex;
        flex-direction: column;
        border: 1px solid #000;
        border-radius: 3px;
        overflow: hidden; /* Clips content to rounded corners */
        position: relative;
      }

      /* --- TOP: Barcode Section --- */
      .barcode-section {
        width: 100%;
        height: 12mm; /* Fixed height for barcode area */
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1mm 0;
        background: #fff;
        border-bottom: 1px solid #000;
        position: relative;
      }
      
      .barcode-img { 
        max-width: 95%; 
        height: 100%; 
        object-fit: contain; 
      }

      /* Discreet Code Positioned in Barcode Area */
      .discreet-code {
        position: absolute;
        bottom: 1px;
        right: 2px;
        font-size: 6px;
        font-family: monospace;
        color: #888;
        font-weight: bold;
      }

      /* --- BOTTOM: Split Layout --- */
      .info-section {
        display: flex;
        flex-direction: row;
        width: 100%;
      }

      /* LEFT: Product Details (65%) */
      .name-col {
        width: 65%;
        border-right: 1px solid #000;
        padding: 1mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .shop-name { 
        font-size: 8px; 
        font-weight: 700; 
        text-transform: uppercase; 
        color: #000;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 1px;
      }

      .product-name { 
        font-size: 10px; 
        font-weight: 800; 
        line-height: 1.1;
        margin-bottom: 1px;
        color: #000;
        /* Limit to 2 lines */
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .product-code { 
        font-size: 8px; 
        font-family: 'Courier New', monospace; 
        color: #333;
        margin-top: auto; 
      }

      /* RIGHT: Price & Specs (35%) */
      .price-col {
        width: 35%;
        display: flex;
        flex-direction: column;
      }

      .price-box {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: #f0f0f0; 
        padding: 1px;
      }
      
      .price-val { 
        font-size: 12px; 
        font-weight: 900; 
        color: #000;
      }

      .specs-box {
        border-top: 1px solid #000;
        text-align: center;
        font-size: 8px;
        font-weight: 700;
        padding: 1px;
        background: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    </style>
  `;

  const shopName =
    shop.use_alias_on_bills && shop.shop_alias
      ? shop.shop_alias
      : shop.shop_name;

  let mainPrice = item.rate || item.mrp || 0;

  // Format Display Price
  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(mainPrice);

  // Generate Encoded Wholesale Price (if available)
  const encodedMFW = item.mfw_price ? encodePrice(item.mfw_price) : "";

  // Specs
  const specs = [];
  if (item.size) specs.push(item.size);
  if (item.color) specs.push(item.color);

  const specsString = specs.length > 0 ? specs.join("/") : "";

  const content = `
    <div class="label-wrapper">
      <div class="label-box">
        
        <!-- TOP: Barcode -->
        <div class="barcode-section">
          <img class="barcode-img" src="${barcodeBase64}" alt="Barcode" />
          <!-- Encoded MFW Price (Visible to shopkeeper, gibberish to customer) -->
          ${encodedMFW ? `<div class="discreet-code">${encodedMFW}</div>` : ""}
        </div>

        <!-- BOTTOM: Info -->
        <div class="info-section">
          
          <!-- LEFT: Details -->
          <div class="name-col">
            <div class="shop-name">${shopName}</div>
            <div class="product-name">${item.name}</div>
            <div class="product-code">${
              item.product_code || item.sku || ""
            }</div>
          </div>

          <!-- RIGHT: Price -->
          <div class="price-col">
            <div class="price-box">
               <div class="price-val">${formattedPrice}</div>
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
