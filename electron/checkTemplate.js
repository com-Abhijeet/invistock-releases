/**
 * checkTemplate.js
 * High-precision HTML template for bank checks.
 * Supports dynamic dimensions and field positioning.
 */
const { numberToWords } = require("./invoiceTemplate.js");

function createCheckHTML(data) {
  const { 
    payee, 
    amount, 
    date, 
    config = {} 
  } = data;

  const amountInWords = numberToWords(amount);

  // Use provided dimensions or fallback to Indian Standard
  const width = config.width || 203;
  const height = config.height || 93;

  // Split date into digits for boxes (DDMMYYYY)
  const dateStr = (date || "").replace(/[^0-9]/g, "");
  // Use config.date.spacing or fallback to 3.5mm
  const dateSpacing = (config.date && config.date.spacing) || 3.5;
  const dateHtml = dateStr.split("").map((digit, i) => 
    `<span style="position: absolute; left: ${i * dateSpacing}mm;">${digit}</span>`
  ).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
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
        .amount {
          font-weight: bold;
          font-size: 18px;
        }
        .amount::before, .amount::after {
          content: '/-';
        }
        .amount::before {
          content: '₹ ';
        }
      </style>
    </head>
    <body>
      <div class="field date-container" style="top: ${config.date.top}mm; left: ${config.date.left}mm;">
        ${dateHtml}
      </div>
      
      <div class="field payee" style="top: ${config.payee.top}mm; left: ${config.payee.left}mm;">
        ${payee}
      </div>
      
      <div class="field words" style="top: ${config.wordsLine1.top}mm; left: ${config.wordsLine1.left}mm; max-width: 120mm; overflow: hidden;">
        ${amountInWords}
      </div>
      
      <div class="field amount" style="top: ${config.amount.top}mm; left: ${config.amount.left}mm;">
        ${amount.toLocaleString('en-IN')}
      </div>
    </body>
    </html>
  `;
}

module.exports = { createCheckHTML };
