// --- SHARED UTILITIES FOR LABEL TEMPLATES ---

const BRANDING_HTML = "";

/**
 * Generates base styles with dynamic scaling based on label height.
 * @param {number} widthMM
 * @param {number} heightMM
 */
const getBaseStyle = (widthMM, heightMM = 25) => {
  // Baseline height is 25mm.
  // If height is 15mm, scale is 0.6. We cap minimum scale at 0.5 to keep it readable.
  const scale = Math.max(0.5, Math.min(1, heightMM / 25));

  return `
  @page { margin: 0; size: ${widthMM}mm ${heightMM}mm; }
  body { 
    margin: 0; padding: 0; 
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
    width: ${widthMM}mm; 
    height: ${heightMM}mm;
    background: #fff; 
    -webkit-print-color-adjust: exact;
    color: #000;
    overflow: hidden;
  }
  .wrapper { 
    width: 100%;
    height: 100%;
    margin: 0;
    padding: ${1.5 * scale}mm ${1 * scale}mm;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }
  img { max-width: 100%; object-fit: contain; display: block; margin: 0 auto; }
  
  /* Dynamic Utility Classes */
  .fz-xs { font-size: ${7 * scale}px; }
  .fz-sm { font-size: ${9 * scale}px; }
  .fz-md { font-size: ${11 * scale}px; }
  .fz-lg { font-size: ${14 * scale}px; }
  .fz-xl { font-size: ${18 * scale}px; }
  
  .branding { font-size: ${6 * scale}px; margin-top: auto; }
  
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .flex { display: flex; }
  .j-between { justify-content: space-between; }
  .a-center { align-items: center; }
  .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;
};

const encodePrice = (price) => {
  if (!price) return "";
  const pStr = Math.round(price).toString();
  const map = {
    1: "A",
    2: "B",
    3: "C",
    4: "D",
    5: "E",
    6: "F",
    7: "G",
    8: "H",
    9: "I",
    0: "J",
  };
  return pStr
    .split("")
    .map((d) => map[d] || d)
    .join("");
};

const getPriceDetails = (item) => {
  const mrpNum = Number(item.mrp || 0);
  const mopNum = Number(item.mop || 0);
  const rateNum = Number(item.rate || 0);
  const priceNum = Number(item.price || 0);

  // Selling price (MOP) is the prominent price shown in bold on the label
  const sellingPriceVal =
    mopNum > 0 ? mopNum : rateNum > 0 ? rateNum : priceNum > 0 ? priceNum : 0;

  // MRP value
  const mrp = Math.round(mrpNum > 0 ? mrpNum : sellingPriceVal);

  // Main price (bold text on label): Selling price if set (> 0), otherwise fall back to MRP
  const mainPrice = Math.round(sellingPriceVal > 0 ? sellingPriceVal : mrp);

  // Strikethrough MRP only when MOP/sellingPrice is set (> 0), MRP is set (> 0), and MRP > sellingPrice
  const showStrike = sellingPriceVal > 0 && mrpNum > 0 && mrpNum > sellingPriceVal;

  const encoded = item.mfw_price ? encodePrice(item.mfw_price) : "";
  return { mainPrice, mrp, showStrike, encoded };
};

const formatDisplayName = (item) => {
  let name = item.product_name || item.name || item.label || "Product";
  name = name.split(" - Art:")[0].split(" - Size:")[0].split(" - Color:")[0].trim();
  return `<div class="truncate" style="text-align: center; width: 100%; font-weight: 700; line-height: 1.1; margin: 0;">${name}</div>`;
};

const formatItemSubheader = (item, scale = 1) => {
  const details = [];
  const article = item.article_no || "";
  const batch = item.batch_number || item.batch_no || "";
  const size = item.size || item.dim1_value || "";
  const color = item.color || item.dim2_value || "";

  if (article) details.push(`Art: ${article}`);
  else if (batch) details.push(`Batch: ${batch}`);

  if (color) details.push(color);
  if (size) details.push(size);

  if (details.length === 0) return "";
  const fontSize = Math.max(7, Math.round(8.5 * scale));
  return `<div class="sub-header truncate" style="text-align: center; width: 100%; font-size: ${fontSize}px; font-weight: 600; color: #222; line-height: 1.1; margin: 1px 0 2px 0; flex-shrink: 0;">${details.join(" &bull; ")}</div>`;
};

const getItemMetadata = (item) => {
  let name = item.product_name || item.name || item.label || "Product";
  name = name.split(" - Art:")[0].split(" - Size:")[0].split(" - Color:")[0].trim();

  const article = item.article_no || "";
  const batch = item.batch_number || item.batch_no || "";
  const size = item.size || item.dim1_value || "";
  const color = item.color || item.dim2_value || "";

  let topRightText = "";
  if (article) topRightText = `Art: ${article}`;
  else if (batch) topRightText = `B: ${batch}`;

  const variantBadges = [color, size].filter(Boolean).join(" • ");

  return {
    cleanName: name,
    article,
    batch,
    size,
    color,
    topRightText,
    variantBadges,
  };
};

module.exports = {
  BRANDING_HTML,
  getBaseStyle,
  encodePrice,
  getPriceDetails,
  formatDisplayName,
  formatItemSubheader,
  getItemMetadata,
};
