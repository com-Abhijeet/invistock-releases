const { getBaseStyle, BRANDING_HTML, getPriceDetails } = require("./utils.js");

const electronicsTemplates = {
  ele_spec: (item, shop, barcode, width, height = 25) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .es { border: 1px solid #000; padding: ${2 * scale}px; flex-grow: 1; display: flex; flex-direction: column; }
        .tt { font-size: ${9 * scale}px; font-weight: 700; border-bottom: 1px solid #eee; margin-bottom: ${2 * scale}px; line-height: 1.1; }
        .rw { display: flex; justify-content: space-between; font-size: ${8 * scale}px; color: #444; margin-bottom: 1px; }
        .pr { font-size: ${12 * scale}px; font-weight: 800; background: #eee; padding: 1px ${4 * scale}px; }
        .bc { flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; margin: ${1 * scale}px 0; }
        .bc img { max-height: 100%; }
        .sn { font-size: ${7 * scale}px; text-align: center; font-family: monospace; flex-shrink: 0; }
      </style>
      <div class="wrapper">
        <div class="es">
           <div class="tt truncate">${item.name}</div>
           <div class="rw"><span>Brand</span><b>${item.brand || "-"}</b></div>
           <div class="rw"><span>Model</span><span>${item.product_code || "-"}</span></div>
           <div class="rw" style="align-items:center;">
              <span style="font-size:${6 * scale}px;">${encoded}</span>
              <span class="pr">₹${mainPrice}</span>
           </div>
           <div class="bc"><img src="${barcode}" /></div>
           <div class="sn">S/N: ${item.product_code || "---"}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  ele_dark: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .dk { background: #000; color: #fff; padding: ${3 * scale}px; border-radius: ${4 * scale}px; text-align: center; flex-grow: 1; display: flex; flex-direction: column; }
        .nm { font-size: ${9 * scale}px; font-weight: 700; margin-bottom: ${2 * scale}px; line-height: 1.1; }
        .bc-box { background: #fff; padding: ${2 * scale}px; border-radius: ${2 * scale}px; flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
        .bc-box img { max-height: 100%; }
        .pr { font-size: ${12 * scale}px; font-weight: 700; margin-top: ${2 * scale}px; }
      </style>
      <div class="wrapper">
        <div class="dk">
           <div class="nm truncate">${item.name}</div>
           <div class="bc-box"><img src="${barcode}" /></div>
           <div class="pr">₹${mainPrice}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  ele_warranty: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .wr { border: 1px dashed #000; padding: ${2 * scale}px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .nm { font-weight: 700; font-size: ${9 * scale}px; }
        .w-lbl { font-size: ${7 * scale}px; background: #ddd; display: inline-block; padding: 0 ${2 * scale}px; align-self: flex-start; }
        .rw { display: flex; justify-content: space-between; align-items: center; flex-grow: 1; min-height: 0; }
        .bc { width: 60%; height: 100%; display: flex; align-items: center; }
        .bc img { max-height: 100%; }
        .pr { font-weight: 800; font-size: ${12 * scale}px; }
      </style>
      <div class="wrapper">
        <div class="wr">
           <div class="nm truncate">${item.name}</div>
           <div class="w-lbl">Warranty Void If Removed</div>
           <div class="rw">
              <div class="bc"><img src="${barcode}" /></div>
              <div class="pr">₹${mainPrice}</div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  ele_mobile: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .mb { text-align: center; border: 1px solid #ccc; padding: ${2 * scale}px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .nm { font-size: ${9 * scale}px; font-weight: 600; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        .bc { flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
        .bc img { max-height: 100%; }
        .pr { font-size: ${14 * scale}px; font-weight: 800; }
      </style>
      <div class="wrapper">
        <div class="mb">
           <div class="nm">${item.name}</div>
           <div class="bc"><img src="${barcode}" /></div>
           <div class="pr">₹${mainPrice}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  ele_serial: (item, shop, barcode, width, height = 25) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .sr { display: flex; border: 1px solid #000; padding: ${1 * scale}px; flex-grow: 1; min-height: 0; }
        .l { width: 70%; padding-right: ${2 * scale}px; display: flex; flex-direction: column; justify-content: space-between; }
        .r { width: 30%; border-left: 1px solid #000; text-align: center; display: flex; flex-direction: column; justify-content: center; }
        .nm { font-size: ${8 * scale}px; font-weight: 600; line-height: 1.1; overflow: hidden; }
        .bc { flex-grow: 1; display: flex; align-items: center; min-height: 0; }
        .bc img { max-height: 100%; }
        .cd { font-family: monospace; font-size: ${8 * scale}px; flex-shrink: 0; }
      </style>
      <div class="wrapper">
        <div class="sr">
           <div class="l">
              <div class="nm truncate">${item.name}</div>
              <div class="bc"><img src="${barcode}" /></div>
              <div class="cd">SN: ${item.product_code || "-"}</div>
           </div>
           <div class="r">
              <div style="font-size:${7 * scale}px; color:#aaa;">${encoded}</div>
              <div style="font-weight:800; font-size:${11 * scale}px;">₹${mainPrice}</div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  ele_box: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .bx { border: ${2 * scale}px solid #000; padding: ${3 * scale}px; flex-grow: 1; display: flex; flex-direction: column; }
        .rw { display: flex; justify-content: space-between; align-items: flex-start; }
        .nm { font-size: ${11 * scale}px; font-weight: 800; line-height: 1.1; margin-bottom: ${2 * scale}px; }
        .specs { font-size: ${8 * scale}px; color: #555; }
        .bc { flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; margin-top: ${2 * scale}px; }
        .bc img { max-height: 100%; }
      </style>
      <div class="wrapper">
        <div class="bx">
           <div class="nm truncate">${item.name}</div>
           <div class="rw">
              <div class="specs">
                 <div>Color: ${item.color || "-"}</div>
                 <div>Model: ${item.product_code || "-"}</div>
              </div>
              <div style="font-size:${16 * scale}px; font-weight:900;">₹${mainPrice}</div>
           </div>
           <div class="bc"><img src="${barcode}" /></div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  ele_comp: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .cp { font-size: ${8 * scale}px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #ddd; padding: ${1 * scale}px; flex-grow: 1; }
      </style>
      <div class="wrapper">
        <div class="cp">
           <div style="width:60%; overflow:hidden;">
              <div class="truncate">${item.name}</div>
              <div style="font-weight:700;">₹${mainPrice}</div>
           </div>
           <img src="${barcode}" style="height: 100%; max-height: 100%; width: 35%;" />
        </div>
      </div>
    `;
  },

  ele_service: (item, shop, barcode, width, height = 25) => {
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .sv { text-align: center; border: 1px dashed #000; padding: ${2 * scale}px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .lbl { font-size: ${8 * scale}px; font-weight: 700; text-transform: uppercase; background: #ddd; flex-shrink: 0; }
        .bc { flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
        .bc img { max-height: 100%; }
        .cd { font-family: monospace; font-weight: 700; font-size: ${10 * scale}px; flex-shrink: 0; }
      </style>
      <div class="wrapper">
        <div class="sv">
           <div class="lbl">Service ID</div>
           <div class="bc"><img src="${barcode}" /></div>
           <div class="cd">${item.product_code || "---"}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  ele_cable: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .cb { display: flex; font-size: ${8 * scale}px; border: 1px solid #000; flex-grow: 1; }
        .cb > div { flex: 1; text-align: center; padding: ${2 * scale}px; border-right: 1px solid #000; display: flex; flex-direction: column; justify-content: center; }
        .cb > div:last-child { border-right: none; }
        .bc img { max-height: 100%; }
      </style>
      <div class="wrapper">
        <div class="cb">
           <div class="truncate">${item.name}</div>
           <div><img src="${barcode}" style="height:100%; max-height: 100%;" /></div>
           <div style="font-weight:800;">₹${mainPrice}</div>
        </div>
      </div>
    `;
  },

  ele_gaming: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .gm { border: ${2 * scale}px solid #000; background: #333; color: #fff; padding: ${2 * scale}px; text-align: center; border-radius: ${4 * scale}px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .gn { font-weight: 700; font-size: ${10 * scale}px; color: #0f0; text-transform: uppercase; }
        .gb { background: #fff; padding: ${2 * scale}px; margin: ${2 * scale}px 0; border-radius: ${2 * scale}px; flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
        .gb img { max-height: 100%; }
      </style>
      <div class="wrapper">
        <div class="gm">
           <div class="gn truncate">${item.name}</div>
           <div class="gb"><img src="${barcode}" /></div>
           <div style="font-weight:700;">₹${mainPrice}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },
};

module.exports = electronicsTemplates;
