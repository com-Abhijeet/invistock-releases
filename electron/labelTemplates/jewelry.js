const { getBaseStyle, BRANDING_HTML, getPriceDetails } = require("./utils.js");

const jewelryTemplates = {
  jew_standard: (item, shop, barcode, width) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .jw { display: flex; align-items: center; border: 1px solid #ccc; padding: 1px; font-size: 8px; border-radius: 2px; }
        .l { width: 60%; padding-right: 2px; overflow: hidden; }
        .r { width: 40%; text-align: center; border-left: 1px solid #ccc; padding-left: 2px; display: flex; flex-direction: column; justify-content: center; }
        .nm { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; margin-bottom: 1px; }
        .p { font-weight: 800; font-size: 9px; }
        .c { font-size: 6px; color: #555; }
      </style>
      <div class="wrapper">
        <div class="jw">
           <div class="l">
              <div class="nm">${item.name}</div>
              <div class="c">${item.product_code}</div>
              <div class="c">${item.weight ? `Wt: ${item.weight}` : ""}</div>
           </div>
           <div class="r">
              <img src="${barcode}" style="height: 5mm; margin-bottom: 1px;" />
              <div class="p">₹${mainPrice}</div>
              <div class="c">${encoded}</div>
           </div>
        </div>
      </div>
    `;
  },

  jew_dumbell: (item, shop, barcode, width) => {
    const { mainPrice } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .db { text-align: center; font-size: 7px; }
        .nm { font-weight: 700; white-space: nowrap; overflow: hidden; }
        .pr { font-weight: 800; font-size: 8px; margin-top: 1px; }
      </style>
      <div class="wrapper">
        <div class="db">
           <div class="nm">${item.name}</div>
           <img src="${barcode}" style="height: 4mm; margin: 1px auto;" />
           <div class="pr">₹${mainPrice}</div>
        </div>
      </div>
    `;
  },
};

module.exports = jewelryTemplates;
