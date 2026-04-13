// --- SHARED UTILITIES FOR LABEL TEMPLATES ---

const BRANDING_HTML = `
  <div class="branding" style="text-align: center; color: #888; font-family: sans-serif; letter-spacing: 0.5px; line-height: 1;">
    Powered by KOSH
  </div>
`;

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
  const mainPrice = Math.round(item.mop || item.rate || item.mrp || 0);
  const sellingPrice = item.mop || item.rate;
  const showStrike = sellingPrice && item.mrp && item.mrp > sellingPrice;
  const mrp = Math.round(item.mrp || 0);
  const encoded = item.mfw_price ? encodePrice(item.mfw_price) : "";
  return { mainPrice, mrp, showStrike, encoded };
};

module.exports = { BRANDING_HTML, getBaseStyle, encodePrice, getPriceDetails };
