const { getBaseStyle, BRANDING_HTML, getPriceDetails } = require("./utils.js");

const medicineTemplates = {
  // 1. Dosage Checkbox
  med_dose: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    const expiry = item.expiry_date
      ? new Date(item.expiry_date).toLocaleDateString("en-IN")
      : "";
    return `
      <style>
        ${getBaseStyle(width)}
        .mb { border: 1px solid #000; padding: 2px; border-radius: 3px; }
        .mh { display: flex; justify-content: space-between; font-size: 9px; font-weight: 700; border-bottom: 1px solid #ccc; padding-bottom: 1px; margin-bottom: 2px; }
        .mn { font-size: 10px; font-weight: 700; margin-bottom: 3px; }
        .dg { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px; margin: 3px 0; }
        .di { border: 1px solid #000; font-size: 7px; text-align: center; padding: 1px; border-radius: 2px; }
        .chk { display: block; width: 8px; height: 8px; border: 1px solid #000; margin: 1px auto 0; }
        .mf { display: flex; justify-content: space-between; align-items: flex-end; font-size: 8px; }
      </style>
      <div class="wrapper">
        <div class="mb">
           <div class="mh">
              <span>${shop.shop_name.substring(0, 10)}</span>
              <span>₹${mainPrice}</span>
           </div>
           <div class="mn">${item.name}</div>
           <div class="dg">
              <div class="di">Morn<span class="chk"></span></div>
              <div class="di">Aftn<span class="chk"></span></div>
              <div class="di">Night<span class="chk"></span></div>
           </div>
           <div class="mf">
              <img src="${barcode}" style="height: 5mm; margin: 0;" />
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

  // 2. Expiry Focus
  med_expiry: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    const expiry = item.expiry_date
      ? new Date(item.expiry_date).toLocaleDateString("en-IN")
      : "N/A";
    return `
      <style>
        ${getBaseStyle(width)}
        .ex-box { border: 2px solid #000; padding: 2px; display: flex; }
        .ex-l { width: 60%; padding-right: 2px; border-right: 1px dotted #000; }
        .ex-r { width: 40%; padding-left: 2px; display: flex; flex-direction: column; justify-content: center; text-align: center; }
        .nm { font-weight: 700; font-size: 10px; line-height: 1.1; margin-bottom: 2px; }
        .dt { font-size: 8px; font-weight: 700; color: #d32f2f; }
        .pr { font-size: 14px; font-weight: 800; }
      </style>
      <div class="wrapper">
        <div class="ex-box">
           <div class="ex-l">
              <div class="nm">${item.name}</div>
              <div>Batch: ${item.batch_no || "-"}</div>
              <img src="${barcode}" style="height: 6mm; margin: 2px 0 0 0;" />
           </div>
           <div class="ex-r">
              <div style="font-size:7px;">EXPIRY</div>
              <div class="dt">${expiry}</div>
              <div style="margin-top:4px;">MRP</div>
              <div class="pr">₹${mainPrice}</div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 3. Compact Strip
  med_strip: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .st { text-align: left; padding: 1px; }
        .nm { font-weight: 700; font-size: 9px; white-space: nowrap; overflow: hidden; }
        .rw { display: flex; justify-content: space-between; font-size: 8px; margin-top: 1px; }
      </style>
      <div class="wrapper">
        <div class="st">
           <div class="nm">${item.name}</div>
           <div class="rw">
              <span>Batch: ${item.batch_no || "A1"}</span>
              <span style="font-weight:700;">₹${mainPrice}</span>
           </div>
           <img src="${barcode}" style="height: 6mm; width: 80%; margin: 2px 0;" />
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 4. Hospital / Rack Tag
  med_rack: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .rk { border: 2px solid #000; text-align: center; }
        .rk-h { background: #000; color: #fff; font-size: 12px; font-weight: 700; }
        .rk-b { padding: 2px; }
        .nm { font-size: 9px; font-weight: 600; margin-bottom: 2px; }
      </style>
      <div class="wrapper">
        <div class="rk">
           <div class="rk-h">₹${mainPrice}</div>
           <div class="rk-b">
              <div class="nm">${item.name}</div>
              <div style="font-size:8px;">Loc: ${
                item.storage_location || "R1-S2"
              }</div>
              <img src="${barcode}" style="height: 7mm;" />
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 5. Generic Medical
  med_generic: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .gn { border: 1px solid #ccc; border-radius: 4px; padding: 2px; }
        .nm { font-weight: 700; font-size: 10px; margin-bottom: 2px; color: #0066cc; }
        .rw { display: flex; justify-content: space-between; font-size: 8px; }
      </style>
      <div class="wrapper">
        <div class="gn">
           <div class="nm">${item.name}</div>
           <div class="rw">
              <span>Rx Only</span>
              <span style="font-weight:700;">₹${mainPrice}</span>
           </div>
           <img src="${barcode}" style="height: 7mm; margin-top:2px;" />
           <div style="text-align:center; font-size:7px;">${
             item.product_code
           }</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },
};
module.exports = medicineTemplates;
