const {
  getBaseStyle,
  BRANDING_HTML,
  getPriceDetails,
  formatDisplayName,
} = require("./utils.js");

const generalTemplates = {
  gen_standard: (item, shop, barcode, width, height = 25) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    const nameHTML = formatDisplayName(item);
    return `
      <style>
        ${getBaseStyle(width, height)}
        .box { border: 1px solid #000; border-radius: ${3 * scale}px; overflow: hidden; flex-grow: 1; display: flex; flex-direction: column; }
        .head { background: #000; color: #fff; font-size: ${8 * scale}px; text-align: center; font-weight: 700; padding: ${1 * scale}px 0; text-transform: uppercase; flex-shrink: 0; }
        .main { padding: ${2 * scale}px; text-align: center; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; min-height: 0; }
        .name { font-size: ${10 * scale}px; font-weight: 600; line-height: 1.1; overflow: hidden; flex-shrink: 0; width: 100%; }
        .bc-wrap { flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; padding: ${1 * scale}px 0; width: 100%; }
        .bc-wrap img { width: 85%; max-height: 100%; object-fit: contain; display: block; margin: 0 auto; }
        .price { font-size: ${14 * scale}px; font-weight: 800; line-height: 1; }
        .foot { display: flex; justify-content: flex-end; font-size: ${7 * scale}px; padding: 0 ${2 * scale}px; line-height: 1; margin-top: auto; }
      </style>
      <div class="wrapper">
        <div class="box">
          <div class="head">${shop.shop_name}</div>
          <div class="main">
            <div class="name">${nameHTML}</div>
            <div class="bc-wrap"><img src="${barcode}" /></div>
            <div class="price">₹${mainPrice}</div>
            ${encoded ? `<div class="foot"><b>${encoded}</b></div>` : ""}
          </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  gen_minimal: (item, shop, barcode, width, height = 25) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    const nameHTML = formatDisplayName(item);
    return `
      <style>
        ${getBaseStyle(width, height)}
        .cont { text-align: center; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
        .shop { font-size: ${7 * scale}px; text-transform: uppercase; color: #555; border-bottom: 0.5px solid #eee; flex-shrink: 0; }
        .nm { font-size: ${11 * scale}px; font-weight: 700; line-height: 1.1; margin: ${1 * scale}px 0; overflow: hidden; width: 100%; }
        .mid { display: flex; align-items: center; justify-content: space-between; flex-grow: 1; min-height: 0; width: 100%; gap: ${4 * scale}px; }
        .bc-box { flex-grow: 1; display: flex; align-items: center; min-height: 0; width: 70%; }
        .bc-box img { width: 85%; max-height: 100%; object-fit: contain; display: block; margin: 0 auto; }
        .pr { font-size: ${16 * scale}px; font-weight: 900; white-space: nowrap; flex-shrink: 0; }
        .enc { font-size: ${6 * scale}px; color: #aaa; text-align: right; }
      </style>
      <div class="wrapper">
        <div class="cont">
          <div class="shop">${shop.shop_name}</div>
          <div class="nm">${nameHTML}</div>
          <div class="mid">
             <div class="bc-box"><img src="${barcode}" /></div>
             <div class="pr">₹${mainPrice}</div>
          </div>
          ${encoded ? `<div class="enc">${encoded}</div>` : ""}
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  gen_qr: (item, shop, barcode, width, height = 25) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    const nameHTML = formatDisplayName(item);
    return `
      <style>
        ${getBaseStyle(width, height)}
        .row { display: flex; border: 1px solid #ccc; padding: ${2 * scale}px; border-radius: ${4 * scale}px; align-items: center; flex-grow: 1; }
        .l { width: 35%; border-right: 1px dashed #ddd; padding-right: ${2 * scale}px; height: 100%; display: flex; align-items: center; }
        .l img { width: 100%; max-height: 100%; object-fit: contain; }
        .r { width: 65%; padding-left: ${4 * scale}px; display: flex; flex-direction: column; justify-content: center; height: 100%; overflow: hidden; }
        .nm { font-size: ${9 * scale}px; font-weight: 600; line-height: 1.1; margin-bottom: ${2 * scale}px; overflow: hidden; width: 100%; }
        .pr { font-size: ${13 * scale}px; font-weight: 800; }
      </style>
      <div class="wrapper">
        <div class="row">
           <div class="l"><img src="${barcode}" /></div>
           <div class="r">
              <div class="nm">${nameHTML}</div>
              <div class="flex j-between a-center">
                 <span class="pr">₹${mainPrice}</span>
                 ${encoded ? `<span style="font-size:${6 * scale}px; color:#aaa;">${encoded}</span>` : ""}
              </div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  gen_asset: (item, shop, barcode, width, height = 25) => {
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    const batchTag = item.batch_number || item.batch_no || "";
    return `
      <style>
        ${getBaseStyle(width, height)}
        .ast { border: ${2 * scale}px solid #000; text-align: center; border-radius: ${4 * scale}px; padding: ${2 * scale}px; flex-grow: 1; display: flex; flex-direction: column; }
        .prop { font-size: ${6 * scale}px; text-transform: uppercase; color: #555; }
        .shp { font-size: ${9 * scale}px; font-weight: 700; border-bottom: 1px solid #000; margin-bottom: ${2 * scale}px; }
        .bc { flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; width: 100%; }
        .bc img { width: 85%; max-height: 100%; object-fit: contain; display: block; margin: 0 auto; }
        .cd { font-family: monospace; font-weight: 700; font-size: ${9 * scale}px; margin-top: ${2 * scale}px; }
      </style>
      <div class="wrapper">
        <div class="ast">
           <div class="prop">Property Of</div>
           <div class="shp truncate">${shop.shop_name}</div>
           <div class="bc"><img src="${barcode}" /></div>
           ${batchTag ? `<div class="cd">Batch: ${batchTag}</div>` : ""}
        </div>
      </div>
    `;
  },

  gen_sale: (item, shop, barcode, width, height = 25) => {
    const { mainPrice, mrp, showStrike, encoded } = getPriceDetails(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));
    const nameHTML = formatDisplayName(item);
    return `
      <style>
        ${getBaseStyle(width, height)}
        .sal { border: 1px dashed #000; text-align: center; border-radius: ${4 * scale}px; padding: ${2 * scale}px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .snm { font-size: ${9 * scale}px; font-weight: 600; width: 100%; overflow: hidden; }
        .pr-blk { background: #000; color: #fff; display: inline-block; padding: ${1 * scale}px ${6 * scale}px; border-radius: ${2 * scale}px; margin: ${2 * scale}px auto; flex-shrink: 0; }
        .pr-val { font-size: ${14 * scale}px; font-weight: 800; }
        .old-val { font-size: ${8 * scale}px; text-decoration: line-through; margin-right: ${4 * scale}px; color: #ccc; }
        .bc { flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0; width: 100%; }
        .bc img { width: 85%; max-height: 100%; object-fit: contain; display: block; margin: 0 auto; }
      </style>
      <div class="wrapper">
        <div class="sal">
           <div class="snm">${nameHTML}</div>
           <div class="pr-blk">
              ${showStrike ? `<span class="old-val">₹${mrp}</span>` : ""}
              <span class="pr-val">₹${mainPrice}</span>
           </div>
           <div class="bc"><img src="${barcode}" /></div>
           ${encoded ? `<div style="font-size:${6 * scale}px; text-align:right;">${encoded}</div>` : ""}
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },
};

module.exports = generalTemplates;
