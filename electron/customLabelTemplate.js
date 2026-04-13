/**
 * customLabelTemplates.js
 * Highly flexible, responsive templates for custom printing.
 * Uses Flexbox to prevent clipping at small heights (e.g., 15mm).
 */

const getFlexWrapper = (width, height, rotation, innerContent) => {
  const isRotated = rotation === 90 || rotation === 270;
  const contentWidth = isRotated ? height : width;
  const contentHeight = isRotated ? width : height;

  return `
    <div style="width: ${width}mm; height: ${height}mm; position: relative; overflow: hidden; background: white;">
       <div style="
         width: ${contentWidth}mm;
         height: ${contentHeight}mm;
         position: absolute;
         top: 50%;
         left: 50%;
         transform: translate(-50%, -50%) rotate(${rotation || 0}deg);
         transform-origin: center center;
       ">
         ${innerContent}
       </div>
    </div>
  `;
};

const customTemplates = {
  custom_garment_standard: (item, config, barcodeImg, width, shop, height) => {
    const isRotated = config.rotation === 90 || config.rotation === 270;
    const contentHeight = isRotated ? width : height;

    // Scale fonts dynamically based on height (baseline 25mm)
    const hScale = Math.min(1, contentHeight / 25);
    const fontScale = Math.max(0.55, hScale);

    const fz = (size) => `${(size * fontScale).toFixed(1)}px`;
    const pad = (size) => `${(size * fontScale).toFixed(1)}px`;

    const innerContent = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: ${pad(3)}; background: #fff; border: 1.5px solid #000; border-radius: ${pad(4)}; display: flex; flex-direction: column; overflow: hidden; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        
        ${
          config.showShopName && shop?.shop_name
            ? `
          <div style="font-size: ${fz(8)}; font-weight: 800; text-align: center; text-transform: uppercase; border-bottom: 0.5px solid #ccc; padding-bottom: ${pad(2)}; margin-bottom: ${pad(2)}; line-height: 1; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #333;">
            ${shop.shop_name}
          </div>
        `
            : ""
        }
        
        <div style="display: flex; justify-content: space-between; align-items: flex-start; line-height: 1; flex-shrink: 0; gap: 4px;">
          <div style="font-size: ${fz(10)}; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-grow: 1;">${item.name || "Product"}</div>
          ${config.showSize && item.size ? `<div style="background: #000; color: #fff; font-size: ${fz(8)}; padding: ${pad(1)} ${pad(3)}; border-radius: 2px; font-weight: 900; white-space: nowrap;">${item.size}</div>` : ""}
        </div>
        
        ${
          config.showBarcode
            ? `
          <div style="flex-grow: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: ${pad(2)} 0; overflow: hidden;">
            <img src="${barcodeImg}" style="max-width: 100%; max-height: 100%; object-fit: contain; flex-grow: 1; min-height: 0; display: block;" />
            ${config.showBarcodeText ? `<div style="font-size: ${fz(7.5)}; font-weight: 600; text-align: center; margin-top: 1px; line-height: 1; flex-shrink: 0; font-family: monospace;">${item.barcode || ""}</div>` : ""}
          </div>
        `
            : `<div style="flex-grow: 1; min-height: 0;"></div>`
        }
        
        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 0.5px solid #eee; padding-top: ${pad(2)}; flex-shrink: 0; line-height: 1;">
          <div style="font-size: ${fz(14)}; font-weight: 900; letter-spacing: -0.5px; color: #000;">₹${item.mrp || 0}</div>
          ${config.showSecretCode && item.custom_price_code ? `<div style="font-size: ${fz(9)}; font-weight: 800; color: #444;">${item.custom_price_code}</div>` : ""}
        </div>
      </div>
    `;

    return getFlexWrapper(width, height, config.rotation, innerContent);
  },

  custom_minimal: (item, config, barcodeImg, width, shop, height) => {
    const isRotated = config.rotation === 90 || config.rotation === 270;
    const contentHeight = isRotated ? width : height;
    const hScale = Math.min(1, contentHeight / 25);
    const fontScale = Math.max(0.55, hScale);

    const fz = (size) => `${(size * fontScale).toFixed(1)}px`;
    const pad = (size) => `${(size * fontScale).toFixed(1)}px`;

    const innerContent = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; padding: ${pad(3)}; background: #fff; border: 1px dashed #777; display: flex; flex-direction: column; overflow: hidden; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        
        ${
          config.showShopName && shop?.shop_name
            ? `
          <div style="font-size: ${fz(7)}; color: #666; text-align: center; margin-bottom: ${pad(2)}; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${shop.shop_name}
          </div>
        `
            : ""
        }
        
        <div style="font-size: ${fz(10)}; font-weight: 700; text-align: center; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${item.name} ${config.showSize && item.size ? `(${item.size})` : ""}
        </div>
        
        ${
          config.showBarcode
            ? `
          <div style="flex-grow: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: ${pad(2)} 0; overflow: hidden;">
            <img src="${barcodeImg}" style="max-width: 90%; max-height: 100%; object-fit: contain; flex-grow: 1; min-height: 0; display: block;" />
            ${config.showBarcodeText ? `<div style="font-size: ${fz(7.5)}; font-weight: 600; text-align: center; margin-top: 1px; line-height: 1; flex-shrink: 0; font-family: monospace;">${item.barcode || ""}</div>` : ""}
          </div>
        `
            : `<div style="flex-grow: 1; min-height: 0;"></div>`
        }
        
        <div style="display: flex; justify-content: center; gap: ${pad(8)}; align-items: baseline; flex-shrink: 0; line-height: 1;">
          <div style="font-size: ${fz(13)}; font-weight: 900; color: #000;">₹${item.mrp || 0}</div>
          ${config.showSecretCode && item.custom_price_code ? `<div style="font-size: ${fz(9)}; font-weight: 800; color: #444;">/ ${item.custom_price_code}</div>` : ""}
        </div>
      </div>
    `;

    return getFlexWrapper(width, height, config.rotation, innerContent);
  },

  custom_bold_tag: (item, config, barcodeImg, width, shop, height) => {
    const isRotated = config.rotation === 90 || config.rotation === 270;
    const contentHeight = isRotated ? width : height;
    const hScale = Math.min(1, contentHeight / 25);
    const fontScale = Math.max(0.55, hScale);

    const fz = (size) => `${(size * fontScale).toFixed(1)}px`;
    const pad = (size) => `${(size * fontScale).toFixed(1)}px`;

    const innerContent = `
      <div style="width: 100%; height: 100%; box-sizing: border-box; background: #fff; border: 2px solid #000; border-radius: ${pad(6)}; display: flex; flex-direction: column; overflow: hidden; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        
        <div style="background: #000; color: #fff; padding: ${pad(3)}; text-align: center; font-size: ${fz(10)}; font-weight: 800; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${config.showShopName && shop?.shop_name ? shop.shop_name.toUpperCase() : item.name.toUpperCase()}
        </div>
        
        <div style="flex-grow: 1; display: flex; flex-direction: column; padding: ${pad(3)}; overflow: hidden;">
          ${config.showShopName && shop?.shop_name ? `<div style="font-size: ${fz(8)}; font-weight: 700; text-align: center; margin-bottom: ${pad(2)}; flex-shrink: 0;">${item.name}</div>` : ""}
          
          <div style="font-size: ${fz(16)}; font-weight: 900; text-align: center; margin: ${pad(2)} 0; flex-shrink: 0; line-height: 1;">₹${item.mrp}</div>
          
          ${
            config.showBarcode
              ? `
            <div style="flex-grow: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden;">
              <img src="${barcodeImg}" style="max-width: 90%; max-height: 100%; object-fit: contain; flex-grow: 1; min-height: 0; display: block;" />
              ${config.showBarcodeText ? `<div style="font-size: ${fz(7.5)}; font-weight: 600; text-align: center; margin-top: 1px; line-height: 1; flex-shrink: 0; font-family: monospace;">${item.barcode || ""}</div>` : ""}
            </div>
          `
              : `<div style="flex-grow: 1; min-height: 0;"></div>`
          }
          
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: ${pad(2)}; border-top: 1px solid #000; padding-top: ${pad(2)}; flex-shrink: 0; line-height: 1;">
            ${config.showSize && item.size ? `<div style="font-size: ${fz(8)}; font-weight: 800;">SIZE: ${item.size}</div>` : "<div></div>"}
            ${config.showSecretCode && item.custom_price_code ? `<div style="font-size: ${fz(10)}; font-weight: 900;">${item.custom_price_code}</div>` : ""}
          </div>
        </div>
      </div>
    `;

    return getFlexWrapper(width, height, config.rotation, innerContent);
  },
};

module.exports = { customTemplates };
