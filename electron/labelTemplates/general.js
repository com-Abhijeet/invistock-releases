const { getBaseStyle, BRANDING_HTML, getPriceDetails } = require("./utils.js");

const generalTemplates = {
  // 1. Standard Split
  gen_standard: (item, shop, barcode, width) => {
    const { mainPrice, mrp, showStrike, encoded } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .box { border: 1px solid #000; border-radius: 3px; overflow: hidden; }
        .head { background: #000; color: #fff; font-size: 8px; text-align: center; font-weight: 700; padding: 1px 0; text-transform: uppercase; }
        .main { padding: 2px; text-align: center; }
        .name { font-size: 10px; font-weight: 600; line-height: 1.1; margin-bottom: 2px; height: 22px; overflow: hidden; }
        .pr-row { display: flex; justify-content: center; align-items: baseline; gap: 4px; border-top: 1px dotted #ccc; margin-top: 2px; padding-top: 1px; }
        .price { font-size: 14px; font-weight: 800; }
        .old { font-size: 8px; text-decoration: line-through; color: #666; }
        .foot { display: flex; justify-content: space-between; font-size: 7px; margin-top: 1px; padding: 0 2px; }
      </style>
      <div class="wrapper">
        <div class="box">
          <div class="head">${shop.shop_name}</div>
          <div class="main">
            <div class="name">${item.name}</div>
            <img src="${barcode}" style="height: 7mm; width: 95%;" />
            <div class="pr-row">
               ${showStrike ? `<span class="old">MRP ₹${mrp}</span>` : ""}
               <span class="price">₹${mainPrice}</span>
            </div>
            <div class="foot">
               <span>${item.product_code || item.sku || ""}</span>
               <b>${encoded}</b>
            </div>
          </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 2. Minimalist
  gen_minimal: (item, shop, barcode, width) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .cont { text-align: center; padding: 2px; }
        .shop { font-size: 7px; text-transform: uppercase; letter-spacing: 1px; color: #555; border-bottom: 1px solid #eee; margin-bottom: 2px; }
        .nm { font-size: 10px; font-weight: 600; line-height: 1.1; margin-bottom: 2px; }
        .big-pr { font-size: 16px; font-weight: 900; }
        .enc { font-size: 6px; color: #aaa; position: absolute; bottom: 1px; right: 1px; }
      </style>
      <div class="wrapper" style="position:relative;">
        <div class="cont">
          <div class="shop">${shop.shop_name}</div>
          <div class="nm">${item.name}</div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
             <img src="${barcode}" style="height: 8mm; width: 60%;" />
             <div class="big-pr">₹${mainPrice}</div>
          </div>
          <div class="enc">${encoded}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 3. QR Heavy
  gen_qr: (item, shop, barcode, width) => {
    const { mainPrice, encoded } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .q-row { display: flex; border: 1px solid #ccc; padding: 2px; border-radius: 4px; align-items: center; }
        .q-l { width: 35%; border-right: 1px dashed #ddd; padding-right: 2px; }
        .q-r { width: 65%; padding-left: 4px; }
        .nm { font-size: 9px; font-weight: 600; margin-bottom: 2px; line-height: 1.1; }
        .pr { font-size: 13px; font-weight: 800; }
        .cd { font-size: 7px; color: #555; }
      </style>
      <div class="wrapper">
        <div class="q-row">
           <div class="q-l"><img src="${barcode}" style="width:100%;" /></div>
           <div class="q-r">
              <div class="nm">${item.name}</div>
              <div class="flex j-between a-center">
                 <span class="pr">₹${mainPrice}</span>
                 <span style="font-size:6px; color:#aaa;">${encoded}</span>
              </div>
              <div class="cd">${item.product_code || ""}</div>
           </div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },

  // 4. Asset Tag
  gen_asset: (item, shop, barcode, width) => {
    return `
      <style>
        ${getBaseStyle(width)}
        .ast { border: 2px solid #000; text-align: center; border-radius: 4px; padding: 2px; }
        .prop { font-size: 6px; text-transform: uppercase; color: #555; letter-spacing: 1px; }
        .shp { font-size: 9px; font-weight: 700; border-bottom: 1px solid #000; margin-bottom: 2px; }
        .cd { font-family: monospace; font-weight: 700; font-size: 10px; margin-top: 2px; }
      </style>
      <div class="wrapper">
        <div class="ast">
           <div class="prop">Property Of</div>
           <div class="shp">${shop.shop_name}</div>
           <img src="${barcode}" style="height: 8mm;" />
           <div class="cd">${item.product_code}</div>
        </div>
      </div>
    `;
  },

  // 5. Discount / Sale
  gen_sale: (item, shop, barcode, width) => {
    const { mainPrice, mrp, showStrike, encoded } = getPriceDetails(item);
    return `
      <style>
        ${getBaseStyle(width)}
        .sal { border: 1px dashed #000; text-align: center; border-radius: 4px; padding: 2px; }
        .snm { font-size: 9px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pr-blk { background: #000; color: #fff; display: inline-block; padding: 1px 6px; border-radius: 2px; margin: 2px 0; }
        .pr-val { font-size: 14px; font-weight: 800; }
        .old-val { font-size: 8px; text-decoration: line-through; margin-right: 4px; color: #ccc; }
      </style>
      <div class="wrapper">
        <div class="sal">
           <div class="snm">${item.name}</div>
           <div class="pr-blk">
              ${showStrike ? `<span class="old-val">₹${mrp}</span>` : ""}
              <span class="pr-val">₹${mainPrice}</span>
           </div>
           <img src="${barcode}" style="height: 7mm;" />
           <div style="font-size:6px; text-align:right;">${encoded}</div>
        </div>
        ${BRANDING_HTML}
      </div>
    `;
  },
};

module.exports = generalTemplates;
