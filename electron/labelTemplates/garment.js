const { getBaseStyle, BRANDING_HTML, getPriceDetails } = require("./utils.js");

const garmentTemplates = {
  gar_size_circle: (item, shop, barcode, width, height = 25) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .box { border: 1px solid #333; position: relative; padding: ${3 * scale}px; border-radius: ${4 * scale}px; flex-grow: 1; display: flex; flex-direction: column; }
        .sz { position: absolute; top: 0; right: 0; background: #000; color: #fff; width: ${6 * scale}mm; height: ${6 * scale}mm; border-bottom-left-radius: ${6 * scale}px; font-size: ${9 * scale}px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .br { font-size: ${8 * scale}px; font-weight: 700; color: #555; text-transform: uppercase; margin-bottom: 2px; }
        .nm { font-size: ${10 * scale}px; font-weight: 600; width: 80%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
        .btm { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dotted #ccc; padding-top: ${2 * scale}px; flex-grow: 1; min-height: 0; }
        .bc-box { flex-grow: 1; display: flex; align-items: center; height: 100%; min-height: 0; }
        .bc-box img { max-height: 100%; width: auto; }
        .pr { font-size: ${13 * scale}px; font-weight: 800; line-height: 1; }
      </style>
      <div class="wrapper">
        <div class="box">
           ${item.size ? `<div class="sz">${item.size}</div>` : ""}
           <div class="br truncate">${item.brand || shop.shop_name}</div>
           <div class="nm">${item.name}</div>
           <div class="btm">
              <div class="bc-box"><img src="${barcode}" /></div>
              <div style="text-align:right; flex-shrink: 0; margin-left: ${4 * scale}px;">
                 <div class="pr">₹${mainPrice}</div>
                 <div style="font-size:${6 * scale}px; color:#aaa;">${encoded}</div>
              </div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  gar_boutique: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .bou { text-align: center; border: 1px solid #ccc; padding: ${2 * scale}px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .bn { font-family: serif; font-size: ${10 * scale}px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; line-height: 1; }
        .in { font-size: ${9 * scale}px; color: #444; margin: ${1 * scale}px 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        .mt { display: flex; justify-content: center; gap: ${8 * scale}px; font-size: ${8 * scale}px; font-weight: 700; margin-bottom: 2px; }
        .bc { flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
        .bc img { max-height: 100%; }
        .bp { font-size: ${14 * scale}px; font-weight: 700; border-top: 1px solid #000; border-bottom: 1px solid #000; display: inline-block; padding: ${1 * scale}px ${6 * scale}px; margin-top: ${2 * scale}px; }
      </style>
      <div class="wrapper">
        <div class="bou">
           <div class="bn truncate">${item.brand || shop.shop_name}</div>
           <div class="in">${item.name}</div>
           <div class="mt">
              <span>${item.size || "STD"}</span>
              <span>${item.color || ""}</span>
           </div>
           <div class="bc"><img src="${barcode}" /></div>
           <div><div class="bp">₹${mainPrice}</div></div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  gar_grid: (item, shop, barcode, width, height = 25) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .gd { border: 1px solid #000; display: grid; grid-template-columns: 1fr 1fr; font-size: ${8 * scale}px; flex-grow: 1; min-height: 0; overflow: hidden; }
        .gd > div { padding: ${1 * scale}px ${2 * scale}px; border-bottom: 1px solid #000; border-right: 1px solid #000; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        .gd > div:nth-child(2n) { border-right: none; }
        .full { grid-column: span 2; text-align: center; font-weight: 700; background: #f9f9f9; }
        .bc-cell { grid-column: span 2; text-align: center; padding: ${2 * scale}px; border-bottom: none !important; flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
        .bc-cell img { max-height: 100%; }
        .pr-bx { grid-column: span 2; text-align: center; background: #000; color: #fff; font-weight: 800; font-size: ${12 * scale}px; }
      </style>
      <div class="wrapper">
        <div class="gd">
           <div class="full">${item.name}</div>
           <div>Sz: <b>${item.size || "-"}</b></div>
           <div>Clr: <b>${item.color || "-"}</b></div>
           <div>Br: <b>${item.brand || "-"}</b></div>
           <div>Id: <b>${encoded || "-"}</b></div>
           <div class="pr-bx">₹${mainPrice}</div>
           <div class="bc-cell"><img src="${barcode}" /></div>
        </div>
      </div>
    `;
  },

  gar_slim: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .sl { display: flex; border: 1px solid #000; border-radius: ${3 * scale}px; overflow: hidden; flex-grow: 1; }
        .sl-l { width: 20%; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: ${12 * scale}px; writing-mode: vertical-rl; transform: rotate(180deg); flex-shrink: 0; }
        .sl-r { width: 80%; padding: ${2 * scale}px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; flex-grow: 1; }
        .nm { font-size: ${9 * scale}px; font-weight: 600; text-align: center; line-height: 1.1; height: ${10 * scale}px; overflow: hidden; }
        .bc { flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; width: 100%; }
        .bc img { max-height: 100%; width: auto; }
        .pr { font-weight: 800; font-size: ${12 * scale}px; line-height: 1; margin-top: 2px; }
      </style>
      <div class="wrapper">
        <div class="sl">
           <div class="sl-l">${item.size || "M"}</div>
           <div class="sl-r">
              <div class="nm">${item.name}</div>
              <div class="bc"><img src="${barcode}" /></div>
              <div class="pr">₹${mainPrice}</div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  gar_kids: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .kd { border: ${2 * scale}px dashed #000; border-radius: ${8 * scale}px; padding: ${2 * scale}px; text-align: center; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .kn { font-size: ${10 * scale}px; font-weight: 700; line-height: 1; }
        .bc { flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
        .bc img { max-height: 100%; }
        .kp { font-size: ${14 * scale}px; font-weight: 800; background: #000; color: #fff; border-radius: ${10 * scale}px; padding: 0 ${8 * scale}px; display: inline-block; margin-top: ${2 * scale}px; }
      </style>
      <div class="wrapper">
        <div class="kd">
           <div class="kn truncate">${item.name}</div>
           <div class="bc"><img src="${barcode}" /></div>
           <div><div class="kp">₹${mainPrice}</div></div>
           <div style="font-size:${7 * scale}px; margin-top:2px;">Size: ${item.size || "N/A"}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },
};

module.exports = garmentTemplates;
