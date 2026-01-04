const { getBaseStyle, BRANDING_HTML, getPriceDetails } = require("./utils.js");

const garmentTemplates = {
  // 1. Size Circle (Standard)
  gar_size_circle: (item, shop, barcode, width) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .g-box { border: 1px solid #333; position: relative; padding: 3px; border-radius: 4px; }
        .sz { position: absolute; top: 0; right: 0; background: #000; color: #fff; width: 6mm; height: 6mm; border-bottom-left-radius: 6px; font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .br { font-size: 8px; font-weight: 700; color: #555; text-transform: uppercase; }
        .nm { font-size: 10px; font-weight: 600; width: 80%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
        .btm { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dotted #ccc; padding-top: 2px; }
        .pr { font-size: 13px; font-weight: 800; }
      </style>
      <div class="wrapper">
        <div class="g-box">
           ${item.size ? `<div class="sz">${item.size}</div>` : ""}
           <div class="br">${item.brand || shop.shop_name}</div>
           <div class="nm">${item.name}</div>
           <div class="btm">
              <img src="${barcode}" style="height: 6mm; margin: 0;" />
              <div style="text-align:right;">
                 <div class="pr">₹${mainPrice}</div>
                 <div style="font-size:6px; color:#aaa;">${encoded}</div>
              </div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 2. Elegant / Boutique
  gar_boutique: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .bou { text-align: center; border: 1px solid #ccc; padding: 2px; }
        .bn { font-family: 'Times New Roman', serif; font-size: 10px; font-weight: 700; letter-spacing: 1px; margin-bottom: 2px; text-transform: uppercase; }
        .in { font-size: 9px; color: #444; margin-bottom: 3px; }
        .mt { display: flex; justify-content: center; gap: 8px; font-size: 8px; font-weight: 700; margin-bottom: 2px; }
        .bp { font-size: 14px; font-weight: 700; border-top: 1px solid #000; border-bottom: 1px solid #000; display: inline-block; padding: 1px 6px; margin: 2px 0; }
      </style>
      <div class="wrapper">
        <div class="bou">
           <div class="bn">${item.brand || shop.shop_name}</div>
           <div class="in">${item.name}</div>
           <div class="mt">
              <span>${item.size || "STD"}</span>
              <span>${item.color || ""}</span>
           </div>
           <img src="${barcode}" style="height: 6mm;" />
           <div class="bp">₹${mainPrice}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 3. Grid Specs
  gar_grid: (item, shop, barcode, width) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .gd { border: 1px solid #000; display: grid; grid-template-columns: 1fr 1fr; font-size: 8px; }
        .gd > div { padding: 2px; border-bottom: 1px solid #000; border-right: 1px solid #000; }
        .gd > div:nth-child(2n) { border-right: none; }
        .gd-full { grid-column: span 2; text-align: center; font-weight: 700; border-bottom: 1px solid #000; }
        .gd-bar { grid-column: span 2; text-align: center; padding: 2px; border-bottom: none !important; }
        .pr-bx { grid-column: span 2; text-align: center; background: #eee; font-weight: 800; font-size: 12px; }
      </style>
      <div class="wrapper">
        <div class="gd">
           <div class="gd-full">${item.name.substring(0, 25)}</div>
           <div>Size: <b>${item.size || "-"}</b></div>
           <div>Color: <b>${item.color || "-"}</b></div>
           <div>Brand: <b>${item.brand || "-"}</b></div>
           <div>Code: <b>${encoded}</b></div>
           <div class="pr-bx">₹${mainPrice}</div>
           <div class="gd-bar"><img src="${barcode}" style="height:6mm;" /></div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 4. Vertical Slim
  gar_slim: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .sl { display: flex; border: 1px solid #000; border-radius: 3px; overflow: hidden; }
        .sl-l { width: 20%; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; writing-mode: vertical-rl; transform: rotate(180deg); }
        .sl-r { width: 80%; padding: 2px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
        .nm { font-size: 9px; font-weight: 600; text-align: center; margin-bottom: 2px; }
        .pr { font-weight: 800; font-size: 12px; }
      </style>
      <div class="wrapper">
        <div class="sl">
           <div class="sl-l">${item.size || "M"}</div>
           <div class="sl-r">
              <div class="nm">${item.name}</div>
              <img src="${barcode}" style="height: 7mm; width: 90%;" />
              <div class="pr">₹${mainPrice}</div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 5. Kids / Fun
  gar_kids: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .kd { border: 2px dashed #000; border-radius: 8px; padding: 2px; text-align: center; }
        .kn { font-family: 'Comic Sans MS', sans-serif; font-size: 10px; font-weight: 700; margin-bottom: 2px; }
        .kp { font-size: 14px; font-weight: 800; background: #000; color: #fff; border-radius: 10px; padding: 0 8px; display: inline-block; }
      </style>
      <div class="wrapper">
        <div class="kd">
           <div class="kn">${item.name}</div>
           <img src="${barcode}" style="height: 7mm;" />
           <div class="kp">₹${mainPrice}</div>
           <div style="font-size:7px; margin-top:2px;">Size: ${item.size}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },
};

module.exports = garmentTemplates;
