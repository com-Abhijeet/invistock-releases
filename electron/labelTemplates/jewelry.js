const { getBaseStyle, BRANDING_HTML, getPriceDetails } = require("./utils.js");

const jewelryTemplates = {
  jew_standard: (item, shop, barcode, width, height = 25) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .jw { display: flex; align-items: center; border: 1px solid #ccc; padding: ${1 * scale}px; font-size: ${8 * scale}px; border-radius: ${2 * scale}px; flex-grow: 1; height: 100%; }
        .l { width: 60%; padding-right: ${2 * scale}px; overflow: hidden; display: flex; flex-direction: column; justify-content: center; }
        .r { width: 40%; text-align: center; border-left: 1px solid #ccc; padding-left: ${2 * scale}px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; height: 100%; }
        .nm { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; margin-bottom: 1px; }
        .p { font-weight: 800; font-size: ${9 * scale}px; line-height: 1; }
        .c { font-size: ${6 * scale}px; color: #555; }
        .bc img { max-height: 100%; width: 100%; }
      </style>
      <div class="wrapper">
        <div class="jw">
           <div class="l">
              <div class="nm">${item.name}</div>
              <div class="c">${item.product_code || ""}</div>
              <div class="c">${item.weight ? `Wt: ${item.weight}` : ""}</div>
           </div>
           <div class="r">
              <div style="flex-grow: 1; display: flex; align-items: center;"><img src="${barcode}" style="height: ${4 * scale}mm;" /></div>
              <div class="p">₹${mainPrice}</div>
              <div class="c">${encoded}</div>
           </div>
        </div>
      </div>
    `;
  },

  jew_dumbell: (item, shop, barcode, width, height = 25) => {
    const { mainPrice } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .db { text-align: center; font-size: ${7 * scale}px; flex-grow: 1; display: flex; flex-direction: column; justify-content: center; }
        .nm { font-weight: 700; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        .pr { font-weight: 800; font-size: ${8 * scale}px; margin-top: ${1 * scale}px; }
        .bc img { max-height: 100%; }
      </style>
      <div class="wrapper">
        <div class="db">
           <div class="nm">${item.name}</div>
           <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0;">
             <img src="${barcode}" style="height: 100%; max-height: 80%;" />
           </div>
           <div class="pr">₹${mainPrice}</div>
        </div>
      </div>
    `;
  },
};

module.exports = jewelryTemplates;
