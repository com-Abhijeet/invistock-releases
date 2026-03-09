/**
 * Generates the HTML for a Transaction/Voucher Receipt.
 * Supports A4, A5, and Thermal layouts dynamically.
 */
function createTransactionReceiptHTML(data) {
  const {
    shop = {},
    transaction = {},
    entity = {},
    linkedBill = null,
    printOptions = {},
  } = data;

  const size = printOptions.size || "A5";
  const orientation = printOptions.orientation || "landscape";
  const isThermal = size.toLowerCase().includes("mm");

  // Formatters
  const formatAmt = (val) =>
    Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const txDate = new Date(
    transaction.transaction_date || transaction.created_at || Date.now(),
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const amountStr = formatAmt(transaction.amount);

  // Dynamic Voucher Titles & Colors
  let title = "VOUCHER";
  let entityLabel = "Party";
  let themeColor = "#374151"; // Default Gray
  let lightBg = "#f3f4f6";

  if (transaction.type === "payment_in") {
    title = "RECEIPT VOUCHER";
    entityLabel = "Received From";
    themeColor = "#059669"; // Success Green
    lightBg = "#ecfdf5";
  } else if (transaction.type === "payment_out") {
    title = "PAYMENT VOUCHER";
    entityLabel = "Paid To";
    themeColor = "#dc2626"; // Error Red
    lightBg = "#fef2f2";
  } else if (transaction.type === "credit_note") {
    title = "CREDIT NOTE";
    entityLabel = "Customer";
    themeColor = "#ea580c"; // Warning Orange
    lightBg = "#fff7ed";
  } else if (transaction.type === "debit_note") {
    title = "DEBIT NOTE";
    entityLabel = "Supplier";
    themeColor = "#dc2626"; // Error Red
    lightBg = "#fef2f2";
  }

  // --- THERMAL LAYOUT (80mm / 58mm) ---
  if (isThermal) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            @page { size: ${size} auto; margin: 0; }
            body { font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.4; color: #000; margin: 0; padding: 5mm; }
            .t-center { text-align: center; }
            .t-bold { font-weight: bold; }
            .t-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .t-divider { border-top: 1px dashed #000; margin: 8px 0; }
            .t-amount-box { border: 1px solid #000; padding: 6px; text-align: center; font-size: 16px; margin: 10px 0; }
            .t-signatures { margin-top: 25px; page-break-inside: avoid; } 
          </style>
        </head>
        <body>
          <div class="t-center">
            <div class="t-bold" style="font-size: 16px;">${shop.shop_name || "Shop Name"}</div>
            <div>${[shop.address_line1, shop.city].filter(Boolean).join(", ")}</div>
            <div>Ph: ${shop.contact_number || shop.phone || ""}</div>
            ${shop.gstin ? `<div>GSTIN: ${shop.gstin}</div>` : ""}
          </div>
          
          <div class="t-divider"></div>
          <div class="t-center t-bold" style="font-size: 14px; text-decoration: underline; margin-bottom: 8px;">${title}</div>
          
          <div class="t-row"><span>Date:</span> <span>${txDate}</span></div>
          <div class="t-row"><span>Ref:</span> <span>${transaction.reference_no || "-"}</span></div>
          
          <div class="t-divider"></div>
          <div style="margin-bottom: 4px;" class="t-bold">${entityLabel}:</div>
          <div>${entity.name || "Cash Customer"}</div>
          ${entity.phone ? `<div>Ph: ${entity.phone}</div>` : ""}
          
          <div class="t-amount-box t-bold">₹ ${amountStr}</div>
          
          <div class="t-row"><span>Mode:</span> <span style="text-transform: uppercase;">${transaction.payment_mode || "CASH"}</span></div>
          ${linkedBill ? `<div class="t-row"><span>Agst Bill:</span> <span>${linkedBill.reference_no || "-"}</span></div>` : ""}
          ${transaction.note ? `<div style="margin-top: 6px;">Note: ${transaction.note}</div>` : ""}
          
          <div class="t-divider"></div>
          <div class="t-signatures">
            <div class="t-center" style="margin-top: 25px;">Sign: ____________________</div>
            <div class="t-center" style="margin-top: 10px; font-size: 10px;">Thank You!</div>
          </div>
        </body>
      </html>
    `;
  }

  // --- STANDARD LAYOUT (A4 / A5) - MODERNIZED & COMPACTED FOR A5 ---
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          /* Reduced margin to give more vertical space on A5 */
          @page { size: ${size} ${orientation}; margin: 8mm; }
          body { 
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
            color: #1f2937; 
            padding: 0; 
            margin: 0; 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Reduced vertical padding from 30px to 20px */
          .voucher-wrapper { 
            border: 1px solid #e5e7eb; 
            border-top: 8px solid ${themeColor};
            border-radius: 8px;
            padding: 20px 30px; 
            position: relative; 
            box-sizing: border-box; 
            background: #ffffff; 
            page-break-inside: avoid; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            overflow: hidden;
          }
          
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-20deg);
            font-size: 70px;
            font-weight: 900;
            color: rgba(0,0,0,0.02);
            white-space: nowrap;
            z-index: 0;
            pointer-events: none;
          }

          .relative-z { position: relative; z-index: 1; }

          /* Reduced bottom margin */
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .header-table td { vertical-align: top; }
          
          .shop-name { font-size: 20px; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0; color: #111827; letter-spacing: 0.5px; }
          .shop-details { font-size: 11px; color: #4b5563; margin: 2px 0; }
          
          .title-block { text-align: right; }
          .title-text { font-size: 20px; font-weight: 900; color: ${themeColor}; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px; }
          
          .meta-box { 
            display: inline-block; 
            background: #f9fafb; 
            border: 1px solid #f3f4f6; 
            border-radius: 6px; 
            padding: 8px 12px; 
            text-align: left; 
            min-width: 170px; 
          }
          .meta-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; }
          .meta-row:last-child { margin-bottom: 0; }
          .meta-label { color: #6b7280; font-weight: 600; margin-right: 15px; }
          .meta-value { color: #111827; font-weight: 800; font-family: monospace; font-size: 12px; }
          
          /* Reduced cell padding from 14px to 10px */
          .content-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .content-table td { padding: 10px 8px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
          .td-label { width: 35%; font-weight: 600; color: #4b5563; }
          .td-value { font-weight: 700; color: #111827; font-size: 14px; }
          
          .amount-box { 
            display: inline-block; 
            background: ${lightBg}; 
            color: ${themeColor}; 
            border: 1.5px solid ${themeColor}; 
            border-radius: 6px; 
            padding: 6px 20px; 
            font-weight: 900; 
            font-size: 20px; 
            box-shadow: 2px 2px 0px ${themeColor};
          }
          
          /* Reduced margin-top from 50px to 30px */
          .signatures-container { 
            display: flex; 
            justify-content: space-between; 
            margin-top: 30px; 
            page-break-inside: avoid; 
          }
          .signature-line { 
            border-top: 1px solid #9ca3af; 
            padding-top: 6px; 
            width: 180px; 
            text-align: center; 
            color: #374151; 
            font-weight: 700; 
            font-size: 11px; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
          }
          .signature-sub { font-size: 9px; color: #6b7280; font-weight: normal; margin-top: 3px; text-transform: none; }
        </style>
      </head>
      <body>
        <div class="voucher-wrapper">
          <div class="watermark">${title}</div>
          
          <div class="relative-z">
            <table class="header-table">
              <tr>
                <td style="width: 50%;">
                  ${shop.logo_url ? `<img src="${shop.logo_url}" style="max-height: 45px; margin-bottom: 10px; object-fit: contain;" />` : ""}
                  <h1 class="shop-name">${shop.shop_name || "Shop Name"}</h1>
                  <p class="shop-details">${[shop.address_line1, shop.city, shop.state].filter(Boolean).join(", ")}</p>
                  <p class="shop-details">Ph: ${shop.contact_number || shop.phone || "N/A"} ${shop.gstin ? `&nbsp;|&nbsp; GSTIN: ${shop.gstin}` : ""}</p>
                </td>
                <td class="title-block">
                  <h2 class="title-text">${title}</h2>
                  <div class="meta-box">
                    <div class="meta-row">
                      <span class="meta-label">Voucher No:</span>
                      <span class="meta-value">${transaction.reference_no || "-"}</span>
                    </div>
                    <div class="meta-row">
                      <span class="meta-label">Date:</span>
                      <span class="meta-value">${txDate}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </table>
            
            <table class="content-table">
              <tr>
                <td class="td-label">${entityLabel}:</td>
                <td class="td-value">
                  ${entity.name || "Cash / Walk-in"} 
                  ${entity.phone ? `<span style="color: #6b7280; font-size: 12px; font-weight: 500; margin-left: 8px;">(Ph: ${entity.phone})</span>` : ""}
                </td>
              </tr>
              <tr>
                <td class="td-label">Amount (₹):</td>
                <td class="td-value">
                  <div class="amount-box">₹ ${amountStr}</div>
                </td>
              </tr>
              <tr>
                <td class="td-label">Payment Mode:</td>
                <td class="td-value" style="text-transform: uppercase;">
                  <span style="background: #f3f4f6; padding: 4px 10px; border-radius: 4px; border: 1px solid #e5e7eb; font-size: 12px;">
                    ${transaction.payment_mode || "CASH"}
                  </span>
                </td>
              </tr>
              ${
                linkedBill
                  ? `
              <tr>
                <td class="td-label">Adjusted Against Bill:</td>
                <td class="td-value">${linkedBill.reference_no}</td>
              </tr>
              `
                  : ""
              }
              ${
                transaction.note
                  ? `
              <tr>
                <td class="td-label">Remarks / Narration:</td>
                <td class="td-value" style="font-weight: 500; font-style: italic; color: #4b5563;">${transaction.note}</td>
              </tr>
              `
                  : ""
              }
            </table>
            
            <div class="signatures-container">
              <div>
                <div class="signature-line">Receiver's Signature</div>
              </div>
              <div>
                <div class="signature-line">
                  Authorized Signatory
                  <div class="signature-sub">For ${shop.shop_name}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

module.exports = { createTransactionReceiptHTML };
