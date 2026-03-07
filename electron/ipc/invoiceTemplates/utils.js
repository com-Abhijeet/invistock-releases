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

module.exports = {
  calculateGST,
  getTrackingHtml,
  BRANDING_FOOTER,
  getLogoSrc,
};
