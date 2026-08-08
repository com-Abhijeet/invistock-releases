/**
 * checkTemplate.js
 * High-precision HTML template for bank checks.
 * Supports dynamic dimensions and field positioning.
 */
const { numberToWords } = require("./invoiceTemplate.js");

/**
 * Utility to split amount words into line 1 and line 2
 */
function getAmountInWordsLines(amount, maxLine1Length = 45) {
  if (!amount || amount <= 0) return { line1: "", line2: "" };

  let words = "";
  try {
    words = typeof numberToWords === "function" ? numberToWords(amount) : "";
  } catch (e) {
    words = "";
  }

  if (!words || words.length <= maxLine1Length) {
    return { line1: words, line2: "" };
  }

  const wordsArr = words.split(" ");
  let line1 = "";
  let line2 = "";

  for (const word of wordsArr) {
    if ((line1 + " " + word).trim().length <= maxLine1Length) {
      line1 = (line1 + " " + word).trim();
    } else {
      line2 = (line2 + " " + word).trim();
    }
  }

  return { line1, line2 };
}

function createCheckHTML(data = {}) {
  const { payee = "", amount = 0, date = "", config = {} } = data;

  // Split amount into two lines matching front-end config schema
  const { line1: wordsLine1, line2: wordsLine2 } =
    getAmountInWordsLines(amount);

  // Dimensions with Indian CTS 2010 default fallbacks
  const width = config.width || 203;
  const height = config.height || 93;

  // Safe field coordinates extraction with defaults
  const dateConfig = config.date || { top: 8, left: 152, spacing: 4.2 };
  const payeeConfig = config.payee || { top: 20, left: 25 };
  const wordsLine1Config = config.wordsLine1 || { top: 29, left: 35 };
  const wordsLine2Config = config.wordsLine2 || { top: 38, left: 15 };
  const amountConfig = config.amount || { top: 42, left: 155 };

  // Format date as DDMMYYYY for box positioning
  const dateStr = (date || "").replace(/[^0-9]/g, "");
  const dateSpacing = dateConfig.spacing || 4.2;

  const dateHtml = dateStr
    .split("")
    .map(
      (digit, i) =>
        `<span style="position: absolute; left: ${i * dateSpacing}mm;">${digit}</span>`,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          size: ${width}mm ${height}mm;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          width: ${width}mm;
          height: ${height}mm;
          font-family: 'Courier New', Courier, monospace;
          font-size: 14px;
          color: #000;
          position: relative;
          background: transparent;
          -webkit-print-color-adjust: exact;
        }
        .field {
          position: absolute;
          white-space: nowrap;
        }
        .date-container {
          position: absolute;
          font-weight: bold;
          font-size: 16px;
        }
        .payee {
          font-weight: bold;
          font-size: 16px;
        }
        .words-line1, .words-line2 {
          font-size: 13px;
        }
        .amount {
          font-weight: bold;
          font-size: 18px;
        }
      </style>
    </head>
    <body>
      <div class="field date-container" style="top: ${dateConfig.top}mm; left: ${dateConfig.left}mm;">
        ${dateHtml}
      </div>
      
      <div class="field payee" style="top: ${payeeConfig.top}mm; left: ${payeeConfig.left}mm;">
        ${payee}
      </div>
      
      <div class="field words-line1" style="top: ${wordsLine1Config.top}mm; left: ${wordsLine1Config.left}mm;">
        ${wordsLine1}
      </div>

      ${
        wordsLine2
          ? `<div class="field words-line2" style="top: ${wordsLine2Config.top}mm; left: ${wordsLine2Config.left}mm;">
              ${wordsLine2}
            </div>`
          : ""
      }
      
      <div class="field amount" style="top: ${amountConfig.top}mm; left: ${amountConfig.left}mm;">
        ₹ ${Number(amount).toLocaleString("en-IN")}/-
      </div>
    </body>
    </html>
  `;
}

module.exports = { createCheckHTML };
