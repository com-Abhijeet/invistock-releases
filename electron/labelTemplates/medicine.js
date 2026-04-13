const { getBaseStyle, BRANDING_HTML, getPriceDetails } = require("./utils.js");

const medicineTemplates = {
  med_dose: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    const expiry = item.expiry_date
      ? new Date(item.expiry_date).toLocaleDateString("en-IN")
      : "";
    return `
      <style>
        ${getBaseStyle(width, height)}
        .mb { border: 1px solid #000; padding: ${2 * scale}px; border-radius: ${3 * scale}px; flex-grow: 1; display: flex; flex-direction: column; }
        .mh { display: flex; justify-content: space-between; font-size: ${9 * scale}px; font-weight: 700; border-bottom: 1px solid #ccc; flex-shrink: 0; }
        .mn { font-size: ${10 * scale}px; font-weight: 700; line-height: 1.1; margin: ${2 * scale}px 0; flex-shrink: 0; }
        .dg { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: ${2 * scale}px; margin-bottom: ${2 * scale}px; }
        .di { border: 1px solid #000; font-size: ${7 * scale}px; text-align: center; padding: ${1 * scale}px; border-radius: 2px; }
        .chk { display: block; width: ${8 * scale}px; height: ${8 * scale}px; border: 1px solid #000; margin: 1px auto 0; }
        .mf { display: flex; justify-content: space-between; align-items: flex-end; font-size: ${8 * scale}px; flex-grow: 1; min-height: 0; }
        .bc img { max-height: 100%; }
      </style>
      <div class="wrapper">
        <div class="mb">
           <div class="mh">
              <span class="truncate">${shop.shop_name}</span>
              <span>₹${mainPrice}</span>
           </div>
           <div class="mn truncate">${item.name}</div>
           <div class="dg">
              <div class="di">Morn<span class="chk"></span></div>
              <div class="di">Aftn<span class="chk"></span></div>
              <div class="di">Night<span class="chk"></span></div>
           </div>
           <div class="mf">
              <img src="${barcode}" style="height: 100%; max-height: ${6 * scale}mm; margin: 0;" />
              <div style="text-align:right;">
                 ${expiry ? `<div>Exp: ${expiry}</div>` : ""}
                 <div>${item.product_code || ""}</div>
              </div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  med_expiry: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    const expiry = item.expiry_date
      ? new Date(item.expiry_date).toLocaleDateString("en-IN")
      : "N/A";
    return `
      <style>
        ${getBaseStyle(width, height)}
        .ex-box { border: ${2 * scale}px solid #000; padding: ${2 * scale}px; display: flex; flex-grow: 1; }
        .ex-l { width: 60%; padding-right: ${2 * scale}px; border-right: 1px dotted #000; display: flex; flex-direction: column; justify-content: space-between; }
        .ex-r { width: 40%; padding-left: ${2 * scale}px; display: flex; flex-direction: column; justify-content: center; text-align: center; }
        .nm { font-weight: 700; font-size: ${10 * scale}px; line-height: 1.1; height: ${22 * scale}px; overflow: hidden; }
        .dt { font-size: ${8 * scale}px; font-weight: 700; color: #d32f2f; }
        .pr { font-size: ${14 * scale}px; font-weight: 800; }
        .bc img { max-height: 100%; }
      </style>
      <div class="wrapper">
        <div class="ex-box">
           <div class="ex-l">
              <div class="nm">${item.name}</div>
              <div style="font-size:${7 * scale}px;">B: ${item.batch_no || "-"}</div>
              <img src="${barcode}" style="height: ${6 * scale}mm; margin: 2px 0 0 0;" />
           </div>
           <div class="ex-r">
              <div style="font-size:${7 * scale}px;">EXPIRY</div>
              <div class="dt">${expiry}</div>
              <div style="margin-top:${4 * scale}px; font-size:${7 * scale}px;">MRP</div>
              <div class="pr">₹${mainPrice}</div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  med_strip: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .st { text-align: left; padding: 1px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .nm { font-weight: 700; font-size: ${9 * scale}px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        .rw { display: flex; justify-content: space-between; font-size: ${8 * scale}px; }
        .bc { flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
        .bc img { max-height: 100%; width: 90%; }
      </style>
      <div class="wrapper">
        <div class="st">
           <div class="nm">${item.name}</div>
           <div class="rw">
              <span>B: ${item.batch_no || "A1"}</span>
              <span style="font-weight:700;">₹${mainPrice}</span>
           </div>
           <div class="bc"><img src="${barcode}" /></div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  med_rack: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .rk { border: ${2 * scale}px solid #000; text-align: center; flex-grow: 1; display: flex; flex-direction: column; }
        .rk-h { background: #000; color: #fff; font-size: ${12 * scale}px; font-weight: 700; flex-shrink: 0; }
        .rk-b { padding: ${2 * scale}px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .nm { font-size: ${9 * scale}px; font-weight: 600; line-height: 1.1; }
        .bc { flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
        .bc img { max-height: 100%; }
      </style>
      <div class="wrapper">
        <div class="rk">
           <div class="rk-h">₹${mainPrice}</div>
           <div class="rk-b">
              <div class="nm truncate">${item.name}</div>
              <div style="font-size:${8 * scale}px;">Loc: ${item.storage_location || "R1-S2"}</div>
              <div class="bc"><img src="${barcode}" /></div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  med_generic: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .gn { border: 1px solid #ccc; border-radius: ${4 * scale}px; padding: ${2 * scale}px; flex-grow: 1; display: flex; flex-direction: column; }
        .nm { font-weight: 700; font-size: ${10 * scale}px; color: #0066cc; line-height: 1.1; }
        .rw { display: flex; justify-content: space-between; font-size: ${8 * scale}px; margin: ${2 * scale}px 0; }
        .bc { flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
        .bc img { max-height: 100%; }
      </style>
      <div class="wrapper">
        <div class="gn">
           <div class="nm truncate">${item.name}</div>
           <div class="rw">
              <span>Rx Only</span>
              <span style="font-weight:700;">₹${mainPrice}</span>
           </div>
           <div class="bc"><img src="${barcode}" /></div>
           <div style="text-align:center; font-size:${7 * scale}px;">${item.product_code || ""}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },
};
module.exports = medicineTemplates;
