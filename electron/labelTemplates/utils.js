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
    1: "A", 2: "B", 3: "C", 4: "D", 5: "E", 6: "F", 7: "G", 8: "H", 9: "I", 0: "J",
  };
  return pStr.split("").map((d) => map[d] || d).join("");
};

const getPriceDetails = (item) => {
  // Logic: Show MOP if exists, else Rate. 
  // Strike MRP ONLY if MOP exists and MRP > MOP.
  const mainPrice = Math.round(item.mop || item.rate || 0);
  const showStrike = item.mop && item.mrp && item.mrp > item.mop;
  const mrp = Math.round(item.mrp || 0);
  const encoded = item.mfw_price ? encodePrice(item.mfw_price) : "";

  return { mainPrice, mrp, showStrike, encoded };
};

// ✅ Exporting with module.exports
module.exports = { BRANDING_HTML, getBaseStyle, encodePrice, getPriceDetails };