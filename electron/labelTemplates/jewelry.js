const {
  getBaseStyle,
  BRANDING_HTML,
  getPriceDetails,
  formatDisplayName,
} = require("./utils.js");

const jewelryTemplates = {
  jew_standard: (item, shop, barcode, width, height = 25) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    const nameHTML = formatDisplayName(item);
    return `
      <style>
        ${getBaseStyle(width, height)}
        .jw { display: flex; align-items: center; border: 1px solid #ccc; padding: ${1 * scale}px; font-size: ${8 * scale}px; border-radius: ${2 * scale}px; flex-grow: 1; height: 100%; }
        .l { width: 60%; padding-right: ${2 * scale}px; overflow: hidden; display: flex; flex-direction: column; justify-content: center; }
        .r { width: 40%; text-align: center; border-left: 1px solid #ccc; padding-left: ${2 * scale}px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; height: 100%; }
        .nm { width: 100%; font-weight: 600; margin-bottom: 1px; }
        .p { font-weight: 800; font-size: ${9 * scale}px; line-height: 1; }
        .c { font-size: ${6 * scale}px; color: #555; }
        .r img { width: 100%; max-height: ${5 * scale}mm; object-fit: fill; }
      </style>
      <div class="wrapper">
        <div class="jw">
           <div class="l">
              <div class="nm">${nameHTML}</div>
              ${item.weight ? `<div class="c">Wt: ${item.weight}</div>` : ""}
           </div>
           <div class="r">
              <div style="flex-grow: 1; display: flex; align-items: center; width: 100%;"><img src="${barcode}" /></div>
              <div class="p">₹${mainPrice}</div>
              ${encoded ? `<div class="c">${encoded}</div>` : ""}
           </div>
        </div>
      </div>
    `;
  },

  jew_dumbell: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    const nameHTML = formatDisplayName(item);
    return `
      <style>
        ${getBaseStyle(width, height)}
        .db { text-align: center; font-size: ${7 * scale}px; flex-grow: 1; display: flex; flex-direction: column; justify-content: center; }
        .nm { font-weight: 700; width: 100%; }
        .pr { font-weight: 800; font-size: ${8 * scale}px; margin-top: ${1 * scale}px; }
        .db img { width: 100%; max-height: 80%; object-fit: fill; }
      </style>
      <div class="wrapper">
        <div class="db">
           <div class="nm">${nameHTML}</div>
           <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; width: 100%;">
             <img src="${barcode}" />
           </div>
           <div class="pr">₹${mainPrice}</div>
        </div>
      </div>
    `;
  },
};

module.exports = jewelryTemplates;
