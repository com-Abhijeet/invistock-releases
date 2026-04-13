const { getBaseStyle, BRANDING_HTML, getPriceDetails } = require("./utils.js");

const generalTemplates = {
  gen_standard: (item, shop, barcode, width, height = 25) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .box { border: 1px solid #000; border-radius: ${3 * scale}px; overflow: hidden; flex-grow: 1; display: flex; flex-direction: column; }
        .head { background: #000; color: #fff; font-size: ${8 * scale}px; text-align: center; font-weight: 700; padding: ${1 * scale}px 0; text-transform: uppercase; flex-shrink: 0; }
        .main { padding: ${2 * scale}px; text-align: center; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; min-height: 0; }
        .name { font-size: ${10 * scale}px; font-weight: 600; line-height: 1.1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; flex-shrink: 0; }
        .bc-wrap { flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; padding: ${1 * scale}px 0; }
        .bc-wrap img { max-height: 100%; width: auto; }
        .price { font-size: ${14 * scale}px; font-weight: 800; line-height: 1; }
        .foot { display: flex; justify-content: space-between; font-size: ${7 * scale}px; padding: 0 ${2 * scale}px; line-height: 1; margin-top: auto; }
      </style>
      <div class="wrapper">
        <div class="box">
          <div class="head">${shop.shop_name}</div>
          <div class="main">
            <div class="name">${item.name}</div>
            <div class="bc-wrap"><img src="${barcode}" /></div>
            <div class="price">₹${mainPrice}</div>
            <div class="foot">
               <span>${item.product_code || ""}</span>
               <b>${encoded}</b>
            </div>
          </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  gen_minimal: (item, shop, barcode, width, height = 25) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .cont { text-align: center; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
        .shop { font-size: ${7 * scale}px; text-transform: uppercase; color: #555; border-bottom: 0.5px solid #eee; flex-shrink: 0; }
        .nm { font-size: ${11 * scale}px; font-weight: 700; line-height: 1.1; margin: ${1 * scale}px 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        .mid { display: flex; align-items: center; justify-content: space-between; flex-grow: 1; min-height: 0; }
        .bc-box { flex-grow: 1; display: flex; align-items: center; min-height: 0; width: 60%; }
        .bc-box img { max-height: 100%; width: auto; }
        .pr { font-size: ${16 * scale}px; font-weight: 900; padding-left: ${4 * scale}px; }
        .enc { font-size: ${6 * scale}px; color: #aaa; text-align: right; }
      </style>
      <div class="wrapper">
        <div class="cont">
          <div class="shop">${shop.shop_name}</div>
          <div class="nm">${item.name}</div>
          <div class="mid">
             <div class="bc-box"><img src="${barcode}" /></div>
             <div class="pr">₹${mainPrice}</div>
          </div>
          <div class="enc">${encoded}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  gen_qr: (item, shop, barcode, width, height = 25) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .row { display: flex; border: 1px solid #ccc; padding: ${2 * scale}px; border-radius: ${4 * scale}px; align-items: center; flex-grow: 1; }
        .l { width: 35%; border-right: 1px dashed #ddd; padding-right: ${2 * scale}px; height: 100%; display: flex; align-items: center; }
        .r { width: 65%; padding-left: ${4 * scale}px; display: flex; flex-direction: column; justify-content: center; height: 100%; }
        .nm { font-size: ${9 * scale}px; font-weight: 600; line-height: 1.1; margin-bottom: ${2 * scale}px; overflow: hidden; }
        .pr { font-size: ${13 * scale}px; font-weight: 800; }
        .cd { font-size: ${7 * scale}px; color: #555; }
      </style>
      <div class="wrapper">
        <div class="row">
           <div class="l"><img src="${barcode}" style="width:100%; max-height: 100%;" /></div>
           <div class="r">
              <div class="nm truncate">${item.name}</div>
              <div class="flex j-between a-center">
                 <span class="pr">₹${mainPrice}</span>
                 <span style="font-size:${6 * scale}px; color:#aaa;">${encoded}</span>
              </div>
              <div class="cd">${item.product_code || ""}</div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  gen_asset: (item, shop, barcode, width, height = 25) => {
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .ast { border: ${2 * scale}px solid #000; text-align: center; border-radius: ${4 * scale}px; padding: ${2 * scale}px; flex-grow: 1; display: flex; flex-direction: column; }
        .prop { font-size: ${6 * scale}px; text-transform: uppercase; color: #555; }
        .shp { font-size: ${9 * scale}px; font-weight: 700; border-bottom: 1px solid #000; margin-bottom: ${2 * scale}px; }
        .bc { flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
        .bc img { max-height: 100%; }
        .cd { font-family: monospace; font-weight: 700; font-size: ${10 * scale}px; margin-top: ${2 * scale}px; }
      </style>
      <div class="wrapper">
        <div class="ast">
           <div class="prop">Property Of</div>
           <div class="shp truncate">${shop.shop_name}</div>
           <div class="bc"><img src="${barcode}" /></div>
           <div class="cd">${item.product_code}</div>
        </div>
      </div>
    `;
  },

  gen_sale: (item, shop, barcode, width, height = 25) => {
    const { mainPrice, mrp, showStrike, encoded } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    return `
      <style>
        ${getBaseStyle(width, height)}
        .sal { border: 1px dashed #000; text-align: center; border-radius: ${4 * scale}px; padding: ${2 * scale}px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .snm { font-size: ${9 * scale}px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pr-blk { background: #000; color: #fff; display: inline-block; padding: ${1 * scale}px ${6 * scale}px; border-radius: ${2 * scale}px; margin: ${2 * scale}px auto; flex-shrink: 0; }
        .pr-val { font-size: ${14 * scale}px; font-weight: 800; }
        .old-val { font-size: ${8 * scale}px; text-decoration: line-through; margin-right: ${4 * scale}px; color: #ccc; }
        .bc { flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
        .bc img { max-height: 100%; }
      </style>
      <div class="wrapper">
        <div class="sal">
           <div class="snm">${item.name}</div>
           <div class="pr-blk">
              ${showStrike ? `<span class="old-val">₹${mrp}</span>` : ""}
              <span class="pr-val">₹${mainPrice}</span>
           </div>
           <div class="bc"><img src="${barcode}" /></div>
           <div style="font-size:${6 * scale}px; text-align:right;">${encoded}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },
};

module.exports = generalTemplates;
