/**
 * customLabelTemplates.js
 * Decoupled templates for custom printing.
 * Includes subtle branding and optional shop name display.
 */

const BRANDING_HTML = `
  <div style="text-align: center; font-size: 5px; color: #bbb; margin-top: 3px; font-style: italic; letter-spacing: 0.3px;">
    powered by Kosh Software
  </div>
`;

const getBaseStyle = (width) => `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: white; }
  .wrapper { 
    width: ${width}mm; 
    overflow: hidden; 
    padding: 1.5mm;
  }
  img.barcode { width: 100%; height: auto; display: block; margin: 1.5mm 0; }
  .price-text { font-size: 13px; font-weight: 800; color: #000; }
  .shop-header { 
    font-size: 8px; 
    font-weight: 800; 
    color: #444; 
    text-align: center; 
    margin-bottom: 3px; 
    text-transform: uppercase;
    border-bottom: 0.5px solid #eee;
    padding-bottom: 2px;
  }
`;

const customTemplates = {
  custom_garment_standard: (item, config, barcodeImg, width, shop) => {
    return `
      <style>${getBaseStyle(width)}</style>
      <div class="wrapper">
        <div style="border: 1.2px solid #000; padding: 3px; border-radius: 4px;">
          ${config.showShopName && shop?.shop_name ? `<div class="shop-header">${shop.shop_name}</div>` : ""}
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px;">
            <div style="font-size: 10px; font-weight: 700; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name || "Product"}</div>
            ${config.showSize && item.size ? `<div style="background: #000; color: #fff; font-size: 9px; padding: 1px 4px; border-radius: 2px; font-weight: 800;">${item.size}</div>` : ""}
          </div>
          
          ${config.showBarcode ? `<img src="${barcodeImg}" class="barcode" />` : ""}
          
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 3px; border-top: 0.5px solid #eee; padding-top: 3px;">
            <div class="price-text">₹${item.mrp || 0}</div>
            ${config.showSecretCode ? `<div class="price-text" style="font-size: 10px;">${item.custom_price_code || ""}</div>` : ""}
          </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  custom_minimal: (item, config, barcodeImg, width, shop) => {
    return `
      <style>${getBaseStyle(width)}</style>
      <div class="wrapper">
        <div style="text-align: center; border: 1px dashed #444; padding: 5px; border-radius: 2px;">
          ${config.showShopName && shop?.shop_name ? `<div style="font-size: 7px; color: #666; margin-bottom: 2px;">${shop.shop_name}</div>` : ""}
          <div style="font-size: 9px; font-weight: 700; margin-bottom: 2px;">${item.name} ${config.showSize && item.size ? `(${item.size})` : ""}</div>
          ${config.showBarcode ? `<img src="${barcodeImg}" class="barcode" style="height: 7mm; width: 90%; margin: 2px auto;" />` : ""}
          <div style="display: flex; justify-content: center; gap: 8px; margin-top: 4px;">
            <div class="price-text">₹${item.mrp}</div>
            ${config.showSecretCode ? `<div class="price-text">/ ${item.custom_price_code}</div>` : ""}
          </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  custom_bold_tag: (item, config, barcodeImg, width, shop) => {
    return `
      <style>${getBaseStyle(width)}</style>
      <div class="wrapper">
        <div style="border: 2px solid #000; padding: 0; overflow: hidden; border-radius: 6px;">
          <div style="background: #000; color: #fff; padding: 3px; text-align: center; font-size: 10px; font-weight: 800;">
            ${config.showShopName && shop?.shop_name ? shop.shop_name.toUpperCase() : item.name.toUpperCase()}
          </div>
          <div style="padding: 4px; text-align: center;">
            ${config.showShopName && shop?.shop_name ? `<div style="font-size: 7px; margin-bottom: 2px;">${item.name}</div>` : ""}
            <div style="font-size: 18px; font-weight: 900; margin: 2px 0;">₹${item.mrp}</div>
            ${config.showBarcode ? `<img src="${barcodeImg}" class="barcode" style="height: 6mm;" />` : ""}
            ${config.showSecretCode ? `<div style="font-size: 11px; font-weight: 800; border-top: 1px solid #000; padding-top: 2px; margin-top: 2px;">${item.custom_price_code}</div>` : ""}
            ${config.showSize ? `<div style="font-size:8px; margin-top:2px;">SIZE: ${item.size}</div>` : ""}
          </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },
};

module.exports = { customTemplates };
