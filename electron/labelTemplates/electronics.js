const { getBaseStyle, BRANDING_HTML, getPriceDetails } = require("./utils.js");

const electronicsTemplates = {
  // 1. Spec Sheet
  ele_spec: (item, shop, barcode, width) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .es { border: 1px solid #000; padding: 2px; }
        .tt { font-size: 9px; font-weight: 700; border-bottom: 1px solid #eee; margin-bottom: 2px; }
        .rw { display: flex; justify-content: space-between; font-size: 8px; color: #444; margin-bottom: 1px; }
        .pr { font-size: 12px; font-weight: 800; background: #eee; padding: 1px 4px; }
        .sn { font-size: 7px; letter-spacing: 1px; text-align: center; margin-top: 1px; font-family: monospace; }
      </style>
      <div class="wrapper">
        <div class="es">
           <div class="tt">${item.name}</div>
           ${
             item.brand
               ? `<div class="rw"><span>Brand</span><b>${item.brand}</b></div>`
               : ""
           }
           <div class="rw">
              <span>Model</span>
              <span>${item.product_code}</span>
           </div>
           <div class="rw" style="align-items:center;">
              <span style="font-size:6px;">${encoded}</span>
              <span class="pr">₹${mainPrice}</span>
           </div>
           <img src="${barcode}" style="height: 6mm;" />
           <div class="sn">S/N: ${item.product_code}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 2. High Tech Dark
  ele_dark: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .dk { background: #000; color: #fff; padding: 3px; border-radius: 4px; text-align: center; }
        .nm { font-size: 9px; font-weight: 700; margin-bottom: 2px; }
        .bc-box { background: #fff; padding: 2px; border-radius: 2px; }
        .pr { font-size: 12px; font-weight: 700; margin-top: 2px; }
      </style>
      <div class="wrapper">
        <div class="dk">
           <div class="nm">${item.name}</div>
           <div class="bc-box">
              <img src="${barcode}" style="height: 6mm;" />
           </div>
           <div class="pr">₹${mainPrice}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 3. Warranty Info
  ele_warranty: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .wr { border: 1px dashed #000; padding: 2px; }
        .nm { font-weight: 700; font-size: 9px; }
        .w-lbl { font-size: 7px; background: #ddd; display: inline-block; padding: 0 2px; margin: 1px 0; }
        .rw { display: flex; justify-content: space-between; align-items: flex-end; }
      </style>
      <div class="wrapper">
        <div class="wr">
           <div class="nm">${item.name}</div>
           <div class="w-lbl">Warranty Void If Removed</div>
           <div class="rw">
              <img src="${barcode}" style="height: 7mm; width: 60%; margin:0;" />
              <div style="font-weight:800; font-size:12px;">₹${mainPrice}</div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 4. Mobile Accessory (Small)
  ele_mobile: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .mb { text-align: center; border: 1px solid #ccc; padding: 2px; }
        .nm { font-size: 9px; font-weight: 600; white-space: nowrap; overflow: hidden; }
        .pr { font-size: 14px; font-weight: 800; }
      </style>
      <div class="wrapper">
        <div class="mb">
           <div class="nm">${item.name}</div>
           <img src="${barcode}" style="height: 7mm;" />
           <div class="pr">₹${mainPrice}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 5. Serial Focus
  ele_serial: (item, shop, barcode, width) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .sr { display: flex; align-items: center; border: 1px solid #000; padding: 1px; }
        .l { width: 70%; padding-right: 2px; }
        .r { width: 30%; border-left: 1px solid #000; text-align: center; }
        .nm { font-size: 8px; font-weight: 600; max-height: 10px; overflow: hidden; }
        .cd { font-family: monospace; font-size: 8px; margin-top: 1px; }
      </style>
      <div class="wrapper">
        <div class="sr">
           <div class="l">
              <div class="nm">${item.name}</div>
              <img src="${barcode}" style="height: 6mm; width: 100%; margin: 1px 0;" />
              <div class="cd">SN: ${item.product_code}</div>
           </div>
           <div class="r">
              <div style="font-size:7px; color:#aaa;">${encoded}</div>
              <div style="font-weight:800; font-size:11px; margin-top:4px;">₹${mainPrice}</div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 6. Box Label (Large)
  ele_box: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .bx { border: 2px solid #000; padding: 3px; }
        .rw { display: flex; justify-content: space-between; }
        .nm { font-size: 11px; font-weight: 800; margin-bottom: 2px; }
        .specs { font-size: 8px; color: #555; }
      </style>
      <div class="wrapper">
        <div class="bx">
           <div class="nm">${item.name}</div>
           <div class="rw">
              <div class="specs">
                 <div>Color: ${item.color || "-"}</div>
                 <div>Model: ${item.product_code}</div>
              </div>
              <div style="font-size:16px; font-weight:900;">₹${mainPrice}</div>
           </div>
           <img src="${barcode}" style="height: 8mm; margin-top: 2px;" />
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 7. Component Tag (Tiny)
  ele_comp: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .cp { font-size: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #ddd; padding: 1px; }
      </style>
      <div class="wrapper">
        <div class="cp">
           <div style="width:60%; overflow:hidden;">
              <div style="white-space:nowrap;">${item.name}</div>
              <div style="font-weight:700;">₹${mainPrice}</div>
           </div>
           <img src="${barcode}" style="height: 5mm; width: 35%;" />
        </div>
      </div>
    `;
  },

  // 8. Service Tag
  ele_service: (item, shop, barcode, width) => {
    return `
      <style>
        ${getBaseStyle(width)}
        .sv { text-align: center; border: 1px dashed #000; padding: 2px; }
        .lbl { font-size: 8px; font-weight: 700; text-transform: uppercase; background: #ddd; }
      </style>
      <div class="wrapper">
        <div class="sv">
           <div class="lbl">Service ID</div>
           <img src="${barcode}" style="height: 8mm; margin: 2px auto;" />
           <div style="font-family:monospace; font-weight:700; font-size:10px;">${
             item.product_code
           }</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 9. Cable Tag (Wrap around style)
  ele_cable: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .cb { display: flex; font-size: 8px; border: 1px solid #000; }
        .cb > div { flex: 1; text-align: center; padding: 2px; border-right: 1px solid #000; display: flex; flex-direction: column; justify-content: center; }
        .cb > div:last-child { border-right: none; }
      </style>
      <div class="wrapper">
        <div class="cb">
           <div>${item.name.substring(0, 10)}</div>
           <div><img src="${barcode}" style="height:5mm;" /></div>
           <div style="font-weight:800;">₹${mainPrice}</div>
        </div>
      </div>
    `;
  },

  // 10. Gaming / RGB
  ele_gaming: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .gm { border: 2px solid #000; background: #333; color: #fff; padding: 2px; text-align: center; border-radius: 4px; }
        .gn { font-weight: 700; font-size: 10px; color: #0f0; text-transform: uppercase; }
        .gb { background: #fff; padding: 2px; margin: 2px 0; border-radius: 2px; }
      </style>
      <div class="wrapper">
        <div class="gm">
           <div class="gn">${item.name}</div>
           <div class="gb"><img src="${barcode}" style="height: 6mm;" /></div>
           <div style="font-weight:700;">₹${mainPrice}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },
};

module.exports = electronicsTemplates;
