// --- SHARED UTILITIES FOR LABEL TEMPLATES ---

const BRANDING_HTML = `
  <div style="font-size: 6px; text-align: center; margin-top: 1px; color: #888; font-family: sans-serif; letter-spacing: 0.5px; line-height: 1;">
    Powered by KOSH
  </div>
`;

const getBaseStyle = (widthMM) => `
  @page { margin: 0; size: ${widthMM}mm auto; }
  body { 
    margin: 0; padding: 0; 
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
    width: ${widthMM}mm; 
    background: #fff; 
    -webkit-print-color-adjust: exact;
    color: #000;
  }
  .wrapper { 
    width: ${widthMM - 1}mm; 
    margin: 0 auto; 
    padding: 0.5mm 0;
    page-break-after: always;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  img { max-width: 100%; object-fit: contain; display: block; margin: 0 auto; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .flex { display: flex; }
  .j-between { justify-content: space-between; }
  .a-center { align-items: center; }
  .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

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
  // Logic:
  // 1. Determine Selling Price: Use MOP (Offer) > Rate > MRP > 0
  const mainPrice = Math.round(item.mop || item.rate || item.mrp || 0);

  // 2. Determine if we show a strikethrough MRP
  // We only strike MRP if we have a specific selling price (MOP/Rate) AND it is lower than MRP.
  // If we fell back to MRP for the mainPrice (i.e. mop/rate are null), we do NOT show a strike.
  const sellingPrice = item.mop || item.rate;
  const showStrike = sellingPrice && item.mrp && item.mrp > sellingPrice;

  const mrp = Math.round(item.mrp || 0);
  const encoded = item.mfw_price ? encodePrice(item.mfw_price) : "";

  return { mainPrice, mrp, showStrike, encoded };
};

// ✅ Exporting with module.exports
module.exports = { BRANDING_HTML, getBaseStyle, encodePrice, getPriceDetails };
