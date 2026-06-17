

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

// --- HELPER: Logo URL Construction (Base64 Bypass) ---
const getLogoSrc = (logo) => {
  if (!logo) return "";

  // If it's already a web link or base64, return as is
  if (logo.startsWith("http") || logo.startsWith("data:")) {
    return logo;
  }

  try {
    const { app } = require("electron");
    const path = require("path");
    const fs = require("fs");

    // Construct the absolute path
    const userDataPath = app.getPath("userData");
    let imagePath = logo;

    // Clean up if the user accidentally saved it with file://
    if (logo.startsWith("file://")) {
      imagePath = logo.replace("file://", "");
    } else {
      imagePath = path.join(userDataPath, "images", "logo", logo);
    }

    // Read file synchronously and convert to Base64
    if (fs.existsSync(imagePath)) {
      // get the extension (e.g., 'jpg', 'png')
      let ext = path.extname(imagePath).toLowerCase().replace(".", "") || "png";
      if (ext === "jpg") ext = "jpeg"; // mime type correction

      const base64Data = fs.readFileSync(imagePath, { encoding: "base64" });
      // console.log("LOGO", `data:image/${ext};base64,${base64Data}`);
      return `data:image/${ext};base64,${base64Data}`;
    }

    return ""; // File not found
  } catch (e) {
    console.error("Failed to load logo:", e);
    return "";
  }
};

// --- FOOTER BRANDING ---
const BRANDING_FOOTER = `
  <div style="text-align:center; margin-top:5px; font-size:9px; color:#888; border-top:1px dotted #ddd; padding-top:2x;">
    Powered by KOSH Software &bull; +91 8180904072
  </div>
`;

// --- HELPER: Physical Item Count ---
const MEASURABLE_UNITS = [
  "kg", "g", "mg", "quintal", "tonne", 
  "l", "ml", 
  "m", "cm", "ft", "in"
];

const calculatePhysicalItemCount = (items) => {
  let count = 0;
  items.forEach(item => {
    const unit = (item.unit || "").toLowerCase().trim();
    if (MEASURABLE_UNITS.includes(unit)) {
      count += 1;
    } else {
      // For pcs, doz, box, goni, etc. Add the quantity (default to 1 if missing)
      count += (Number(item.quantity) || 1);
    }
  });
  return count;
};

// Local formatDate to avoid circular dependency with invoiceTemplate.js
const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

// --- HELPER: Estimate extra footer rows consumed by dynamic content ---
/**
 * Estimates how many extra item-row equivalents the footer/summary section
 * occupies beyond the baseline minimum footer (amount-in-words + bank + totals).
 *
 * @param {Object} opts
 * @param {string} opts.termsAndConditions - Terms text
 * @param {string} opts.disclaimer - Disclaimer text
 * @param {string} opts.jurisdiction - Jurisdiction text
 * @param {boolean} opts.hasQrCode - Whether UPI QR code is present
 * @param {boolean} opts.showGstBreakup - Whether GST breakdown row is shown
 * @param {number} [opts.charsPerLine=80] - Approximate chars that fit per line in the footer
 * @param {number} [opts.rowHeightPx=20] - Approximate pixel height of one item row
 * @param {number} [opts.lineHeightPx=12] - Approximate pixel height of one footer text line
 * @returns {number} estimated extra rows to subtract from last page capacity
 */
const estimateFooterExtraRows = (opts = {}) => {
  const {
    termsAndConditions = "",
    disclaimer = "",
    jurisdiction = "",
    hasQrCode = false,
    showGstBreakup = false,
    charsPerLine = 80,
    rowHeightPx = 20,
    lineHeightPx = 12,
  } = opts;

  let extraPx = 0;

  // Terms & Conditions: estimate line wrapping
  if (termsAndConditions) {
    const lineBreaks = (termsAndConditions.match(/\n/g) || []).length;
    const charLines = Math.ceil(termsAndConditions.length / charsPerLine);
    const totalLines = Math.max(charLines, lineBreaks + 1);
    extraPx += totalLines * lineHeightPx;
  }

  // Disclaimer: usually 1-2 lines
  if (disclaimer) {
    const lines = Math.ceil(disclaimer.length / charsPerLine);
    extraPx += lines * lineHeightPx;
  }

  // Jurisdiction: usually 1 line
  if (jurisdiction) {
    extraPx += lineHeightPx;
  }

  // QR code image: ~65-70px tall plus margins
  if (hasQrCode) {
    extraPx += 30; // QR adds height above the baseline bank section
  }

  // GST breakdown row
  if (showGstBreakup) {
    extraPx += lineHeightPx;
  }

  // Convert pixel estimate to row equivalents (round up for safety)
  // Minus 2 because visual padding allows 2 more rows to safely fit
  return Math.max(0, Math.ceil(extraPx / rowHeightPx) - 2);
};

// --- HELPER: Build pages with dynamic capacity ---
/**
 * Builds pagination array with reduced capacity on ALL pages
 * to account for variable footer height, since the footer is rendered on every page.
 *
 * @param {Array} items - All line items
 * @param {number} baseRows - Normal rows per page (when footer is minimal)
 * @param {number} footerExtraRows - Extra rows consumed by footer content
 * @param {number} [minRows=4] - Minimum rows allowed on any page
 * @returns {Array<{items: Array, isLastPage: boolean, pageIndex: number, totalPages: number, startIndex: number}>}
 */
const buildDynamicPages = (items, baseRows, footerExtraRows, minRows = 4) => {
  const actualRowsPerPage = Math.max(baseRows - footerExtraRows, minRows);

  if (items.length === 0) {
    return [{ items: [], isLastPage: true, pageIndex: 1, totalPages: 1, startIndex: 0 }];
  }

  const pages = [];
  let offset = 0;

  while (offset < items.length) {
    const pageItems = items.slice(offset, offset + actualRowsPerPage);
    pages.push({ items: pageItems, startIndex: offset });
    offset += actualRowsPerPage;
  }

  // Annotate pages with metadata
  const totalPages = pages.length;
  return pages.map((page, i) => ({
    ...page,
    isLastPage: i === totalPages - 1,
    pageIndex: i + 1,
    totalPages,
  }));
};

module.exports = {
  calculateGST,
  getTrackingHtml,
  BRANDING_FOOTER,
  getLogoSrc,
  calculatePhysicalItemCount,
  estimateFooterExtraRows,
  buildDynamicPages,
};
