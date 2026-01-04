const { getBaseStyle, BRANDING_HTML, getPriceDetails } = require("./utils.js");

const hardwareTemplates = {
  // 1. Industrial Bold
  hw_bold: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .hb { border: 2px solid #000; padding: 2px; }
        .hn { font-size: 11px; font-weight: 900; text-transform: uppercase; border-bottom: 2px solid #000; margin-bottom: 3px; padding-bottom: 2px; line-height: 1; }
        .hg { display: flex; gap: 4px; }
        .hi { width: 60%; }
        .hinf { width: 40%; display: flex; flex-direction: column; justify-content: center; }
        .hl { font-size: 6px; text-transform: uppercase; color: #555; }
        .hv { font-size: 9px; font-weight: 700; margin-bottom: 2px; }
        .hp { font-size: 12px; font-weight: 900; background: #000; color: #fff; text-align: center; padding: 1px; }
      </style>
      <div class="wrapper">
        <div class="hb">
           <div class="hn">${item.name}</div>
           <div class="hg">
              <div class="hi">
                 <img src="${barcode}" style="width: 100%;" />
                 <div style="text-align:center; font-size:7px; font-weight:700;">${
                   item.product_code
                 }</div>
              </div>
              <div class="hinf">
                 <div class="hl">SIZE/WT</div>
                 <div class="hv">${item.size || item.weight || "-"}</div>
                 <div class="hp">₹${mainPrice}</div>
              </div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 2. Bin Tag (For Shelf)
  hw_bin: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .bn { border: 1px solid #000; text-align: center; padding: 2px; }
        .lc { font-size: 8px; font-weight: 700; background: #ddd; margin-bottom: 2px; }
        .nm { font-weight: 700; font-size: 10px; margin-bottom: 4px; }
        .pr { font-size: 14px; font-weight: 900; }
      </style>
      <div class="wrapper">
        <div class="bn">
           <div class="lc">LOC: ${item.storage_location || "GEN"}</div>
           <div class="nm">${item.name}</div>
           <img src="${barcode}" style="height: 7mm;" />
           <div class="pr">₹${mainPrice}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 3. Weight Focused
  hw_weight: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .wt { display: flex; border: 1px solid #000; border-radius: 4px; padding: 2px; align-items: center; }
        .wt-l { width: 30%; background: #000; color: #fff; text-align: center; padding: 2px 0; font-weight: 700; font-size: 10px; border-radius: 2px; }
        .wt-r { width: 70%; padding-left: 4px; }
        .nm { font-size: 9px; font-weight: 600; margin-bottom: 2px; }
        .pr { font-size: 12px; font-weight: 800; }
      </style>
      <div class="wrapper">
        <div class="wt">
           <div class="wt-l">${item.weight || item.size || "STD"}</div>
           <div class="wt-r">
              <div class="nm">${item.name}</div>
              <img src="${barcode}" style="height: 6mm; width: 80%; margin: 0;" />
              <div class="pr">₹${mainPrice}</div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },
};

module.exports =  hardwareTemplates;
