const { formatDate } = require("../../invoiceTemplate.js");

// --- HELPER: GST Calculation ---
const calculateGST = (items, inclusive, gstEnabled) => {
  if (!gstEnabled) return { totalTax: 0, breakdown: [] };

  let totalTax = 0;
  let breakdown = { cgst: 0, sgst: 0, igst: 0 };

  items.forEach((item) => {
    const baseVal = item.rate * item.quantity;
    const valAfterDisc = baseVal * (1 - (item.discount || 0) / 100);
    let taxAmt = 0;

    if (inclusive) {
      const divisor = 1 + item.gst_rate / 100;
      const taxable = valAfterDisc / divisor;
      taxAmt = valAfterDisc - taxable;
    } else {
      taxAmt = valAfterDisc * (item.gst_rate / 100);
    }

    totalTax += taxAmt;
    breakdown.cgst += taxAmt / 2;
    breakdown.sgst += taxAmt / 2;
  });
  return { totalTax, breakdown };
};

// --- HELPER: Tracking Details Formatter ---
const getTrackingHtml = (item) => {
  const parts = [];
  if (item.batch_number) parts.push(`Batch: ${item.batch_number}`);
  if (item.expiry_date) parts.push(`Exp: ${formatDate(item.expiry_date)}`);
  if (item.serial_number) parts.push(`S/N: ${item.serial_number}`);

  if (parts.length === 0) return "";

  // Returns semi-text grayish
  return `<div style="font-size: 85%; color: #6b7280; font-weight: normal; margin-top: 1px; font-style: italic;">
    ${parts.join(" | ")}
  </div>`;
};

// --- FOOTER BRANDING ---
const BRANDING_FOOTER = `
  <div style="text-align:center; margin-top:5px; font-size:9px; color:#888; border-top:1px dotted #ddd; padding-top:2x;">
    Powered by KOSH Software &bull; +91 8180904072
  </div>
`;

module.exports = {
  calculateGST,
  getTrackingHtml,
  BRANDING_FOOTER,
};
