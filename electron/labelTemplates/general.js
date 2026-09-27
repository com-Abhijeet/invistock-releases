const {
  getBaseStyle,
  BRANDING_HTML,
  getPriceDetails,
  getItemMetadata,
} = require("./utils.js");

const generalTemplates = {
  gen_standard: (item, shop, barcode, width, height = 25) => {
    const { mainPrice, mrp, showStrike } = getPriceDetails(item);
    const { cleanName, article, batch, size, color } = getItemMetadata(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));

    return `
      <style>
        ${getBaseStyle(width, height)}
        .box {
          border: 1px solid #000;
          border-radius: ${3 * scale}px;
          overflow: hidden;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
        }

        /* TOP BANNER - SHOP NAME CENTERED */
        .head {
          background: #000;
          color: #fff;
          font-size: ${8.5 * scale}px;
          text-align: center;
          font-weight: 800;
          padding: ${1.5 * scale}px 0;
          text-transform: uppercase;
          flex-shrink: 0;
          letter-spacing: 0.5px;
        }

        /* DETAILS BLOCK: COLOR (Far Left) | PRODUCT NAME (Center) | SIZE (Far Right) */
        .meta-block {
          padding: ${2 * scale}px ${2 * scale}px 0 ${2 * scale}px;
          flex-shrink: 0;
        }
        .row-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .col-left {
          width: 25%;
          font-size: ${8 * scale}px;
          font-weight: 700;
          color: #111;
          text-align: left;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-transform: uppercase;
        }
        .col-center {
          width: 50%;
          font-size: ${11 * scale}px;
          font-weight: 800;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.1;
        }
        .col-right {
          width: 25%;
          font-size: ${8 * scale}px;
          font-weight: 700;
          color: #111;
          text-align: right;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-transform: uppercase;
        }

        /* HUGE BARCODE CONTAINER (MAXIMUM HEIGHT & FULL WIDTH) */
        .bc-wrap {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 0;
          width: 100%;
          margin: ${1 * scale}px 0;
          padding: 0;
          overflow: hidden;
        }
        .bc-wrap img {
          width: 99%;
          max-width: 99%;
          flex-grow: 1;
          min-height: 0;
          object-fit: fill;
          display: block;
          margin: 0 auto;
        }
        .bc-code {
          font-family: monospace, Courier, monospace;
          font-size: ${7.5 * scale}px;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-align: center;
          color: #000;
          line-height: 1;
          margin-top: 1px;
          flex-shrink: 0;
        }

        /* BOTTOM ROW: ARTICLE NO (LEFT) | PRICE (RIGHT) WITH SPACE-BETWEEN */
        .bot-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-shrink: 0;
          padding: ${1.5 * scale}px ${2.5 * scale}px;
          border-top: 0.5px solid #ddd;
          line-height: 1;
        }
        .bot-left {
          font-size: ${8 * scale}px;
          font-weight: 700;
          color: #111;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 50%;
        }
        .bot-right {
          text-align: right;
          font-size: ${15 * scale}px;
          font-weight: 900;
          color: #000;
          max-width: 50%;
        }
        .pr-mrp {
          font-size: ${7.5 * scale}px;
          color: #666;
          margin-right: 4px;
          text-decoration: line-through;
        }
      </style>
      <div class="wrapper">
        <div class="box">
          <!-- TOP SHOP NAME BANNER -->
          <div class="head">${shop.shop_name || "KOSH"}</div>

          <!-- COLOR Far Left | PRODUCT NAME Center | SIZE Far Right -->
          <div class="meta-block">
            <div class="row-top">
              <div class="col-left">${color || ""}</div>
              <div class="col-center">${cleanName}</div>
              <div class="col-right">${size ? `${size}` : ""}</div>
            </div>
          </div>

          <!-- HUGE SCANNABLE BARCODE WITH CRISP HTML STRING BELOW -->
          <div class="bc-wrap">
            <img src="${barcode}" />
            <div class="bc-code">${item.barcode || item.customBarcode || ""}</div>
          </div>

          <!-- BOTTOM ROW: ARTICLE NO LEFT | PRICE RIGHT (SPACE BETWEEN) -->
          <div class="bot-row">
            <div class="bot-left">
              ${article ? `Art: ${article}` : (batch ? `Batch: ${batch}` : "")}
            </div>
            <div class="bot-right">
              ${showStrike ? `<span class="pr-mrp">₹${mrp}</span>` : ""}
              ₹${mainPrice}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  gen_minimal: (item, shop, barcode, width, height = 25) => {
    const { mainPrice, mrp, showStrike, encoded } = getPriceDetails(item);
    const { cleanName, topRightText, variantBadges } = getItemMetadata(item);
    const scale = Math.max(0.5, Math.min(1.2, height / 25));

    return `
      <style>
        ${getBaseStyle(width, height)}
        .cont {
          text-align: center;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          overflow: hidden;
        }
        .top-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: ${7.5 * scale}px;
          text-transform: uppercase;
          color: #444;
          border-bottom: 0.5px solid #eee;
          padding-bottom: ${1 * scale}px;
          flex-shrink: 0;
          font-weight: 700;
        }
        .nm {
          font-size: ${11 * scale}px;
          font-weight: 800;
          line-height: 1.1;
          margin: ${1.5 * scale}px 0 0 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          width: 100%;
          flex-shrink: 0;
        }
        .sub {
          font-size: ${7.5 * scale}px;
          font-weight: 600;
          color: #555;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-bottom: ${1 * scale}px;
          flex-shrink: 0;
        }
        .mid {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-grow: 1;
          min-height: 0;
          width: 100%;
          gap: ${4 * scale}px;
          overflow: hidden;
        }
        .bc-box { flex-grow: 1; display: flex; align-items: center; min-height: 0; width: 75%; overflow: hidden; }
        .bc-box img { width: 98%; max-width: 98%; height: 100%; max-height: 100%; object-fit: fill; display: block; margin: 0 auto; }
        .pr-box { text-align: right; flex-shrink: 0; }
        .pr { font-size: ${15 * scale}px; font-weight: 900; white-space: nowrap; line-height: 1; }
        .mrp-strike { font-size: ${7 * scale}px; text-decoration: line-through; color: #777; line-height: 1; margin-bottom: 1px; }
      </style>
      <div class="wrapper">
        <div class="cont">
          <div class="top-header">
            <div>${shop.shop_name || "KOSH"}</div>
            ${topRightText ? `<div>${topRightText}</div>` : ""}
          </div>
          <div class="nm">${cleanName}</div>
          ${variantBadges ? `<div class="sub">${variantBadges}</div>` : ""}
          <div class="mid">
             <div class="bc-box"><img src="${barcode}" /></div>
             <div class="pr-box">
               ${showStrike ? `<div class="mrp-strike">₹${mrp}</div>` : ""}
               <div class="pr">₹${mainPrice}</div>
             </div>
          </div>
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
