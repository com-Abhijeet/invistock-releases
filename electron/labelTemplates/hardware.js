const { getBaseStyle, BRANDING_HTML, getPriceDetails } = require("./utils.js");

const hardwareTemplates = {
  hw_bold: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .hb { border: ${2 * scale}px solid #000; padding: ${2 * scale}px; flex-grow: 1; display: flex; flex-direction: column; }
        .hn { font-size: ${11 * scale}px; font-weight: 900; text-transform: uppercase; border-bottom: ${2 * scale}px solid #000; margin-bottom: ${3 * scale}px; line-height: 1; }
        .hg { display: flex; gap: ${4 * scale}px; flex-grow: 1; min-height: 0; }
        .hi { width: 60%; display: flex; flex-direction: column; justify-content: space-between; }
        .hinf { width: 40%; display: flex; flex-direction: column; justify-content: center; text-align: right; }
        .bc-wrap { flex-grow: 1; display: flex; align-items: center; }
        .bc-wrap img { width: 100%; max-height: 100%; }
        .hl { font-size: ${6 * scale}px; text-transform: uppercase; color: #555; }
        .hv { font-size: ${9 * scale}px; font-weight: 700; margin-bottom: 2px; }
        .hp { font-size: ${12 * scale}px; font-weight: 900; background: #000; color: #fff; text-align: center; padding: 1px; }
      </style>
      <div class="wrapper">
        <div class="hb">
           <div class="hn truncate">${item.name}</div>
           <div class="hg">
              <div class="hi">
                 <div class="bc-wrap"><img src="${barcode}" /></div>
                 <div class="center" style="font-size:${7 * scale}px; font-weight:700;">${item.product_code || ""}</div>
              </div>
              <div class="hinf">
                 <div class="hl">SIZE/WT</div>
                 <div class="hv truncate">${item.size || item.weight || "-"}</div>
                 <div class="hp">₹${mainPrice}</div>
              </div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  hw_bin: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .bn { border: 1px solid #000; text-align: center; padding: ${2 * scale}px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .lc { font-size: ${8 * scale}px; font-weight: 700; background: #ddd; margin-bottom: 2px; }
        .nm { font-weight: 700; font-size: ${10 * scale}px; line-height: 1.1; }
        .bc { flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
        .bc img { max-height: 100%; }
        .pr { font-size: ${14 * scale}px; font-weight: 900; }
      </style>
      <div class="wrapper">
        <div class="bn">
           <div class="lc">LOC: ${item.storage_location || "GEN"}</div>
           <div class="nm">${item.name}</div>
           <div class="bc"><img src="${barcode}" /></div>
           <div class="pr">₹${mainPrice}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  hw_weight: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .wt { display: flex; border: 1px solid #000; border-radius: ${4 * scale}px; padding: ${2 * scale}px; align-items: center; flex-grow: 1; }
        .wt-l { width: 30%; background: #000; color: #fff; text-align: center; padding: ${4 * scale}px 0; font-weight: 700; font-size: ${10 * scale}px; border-radius: ${2 * scale}px; flex-shrink: 0; }
        .wt-r { width: 70%; padding-left: ${4 * scale}px; display: flex; flex-direction: column; justify-content: center; flex-grow: 1; height: 100%; }
        .nm { font-size: ${9 * scale}px; font-weight: 600; margin-bottom: 2px; line-height: 1.1; }
        .bc img { width: 100%; max-height: 100%; }
        .pr { font-size: ${12 * scale}px; font-weight: 800; }
      </style>
      <div class="wrapper">
        <div class="wt">
           <div class="wt-l">${item.weight || item.size || "STD"}</div>
           <div class="wt-r">
              <div class="nm truncate">${item.name}</div>
              <img src="${barcode}" style="height: 100%; max-height: 50%; width: 80%;" />
              <div class="pr">₹${mainPrice}</div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },
};

module.exports = hardwareTemplates;
