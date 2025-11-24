// ✅ 1. Import the transliteration service
const { getMarathiName } = require("./transliterationService.js");

/**
 * Generates the HTML content for a Non-GST cash receipt with Marathi names.
 * @param {object} shop - The shop details.
 * @param {object} sale - The non-GST sale data.
 * @param {number} printerWidthMM - The width of the printer in millimeters.
 * @returns {Promise<string>} The complete HTML string for the receipt.
 */
async function createNonGstReceiptHTML(shop, sale, printerWidthMM = 80) {
  // ✅ Helper function to format the address
  const formatAddress = (addr, city, state, pincode) =>
    [addr, city, state, pincode].filter(Boolean).join(", ");

  const style = `
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 5px;
        width: ${printerWidthMM}mm;
        box-sizing: border-box;
      }
      .receipt-container {
        padding: 10px;
        text-align: center;
      }
      h3, h4 { margin: 5px 0; }
      p { margin: 2px 0; font-size: 0.9em; }
      .header p { margin: 0; }
      .divider { border-top: 1px dashed #333; margin: 10px 0; }
      
      .items-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9em;
        margin-top: 10px;
      }
      .items-table th, .items-table td {
        padding: 6px 2px;
        text-align: left;
        vertical-align: top;
      }
      .items-table .right { text-align: right; }
      .items-table .center { text-align: center; }
      .items-table thead tr { border-bottom: 1px solid #333; }
      
      .summary-table {
        width: 100%;
        margin-top: 10px;
        font-size: 0.95em;
      }
      .summary-table td { padding: 2px 4px; }
      .summary-table .label { text-align: left; }
      .summary-table .value { text-align: right; }
      .summary-table .total .value { font-size: 1.1em; font-weight: bold; }
      
      .local-name {
        font-size: 0.9em;
        color: #333;
        font-style: italic;
      }
      .text-left { text-align: left; }
    </style>
  `;

  // ✅ 3. Generate item rows and customer name asynchronously
  const [itemsHtml, customerMarathiName] = await Promise.all([
    Promise.all(
      sale.items.map(async (item) => {
        const marathiName = await getMarathiName(item.product_name || "");
        return `
          <tr>
            <td>
              ${item.product_name || "N/A"}
              <br>
              <span class="local-name">${marathiName}</span>
            </td>
            <td class="center">${item.quantity}</td>
            <td class="right">₹${item.rate.toLocaleString("en-IN")}</td>
            <td class="right">₹${item.price.toLocaleString("en-IN")}</td>
          </tr>
        `;
      })
    ).then((rows) => rows.join("")),
    getMarathiName(sale.customer_name || ""),
  ]);

  // Calculate totals
  const subTotal = sale.items.reduce((acc, item) => acc + item.price, 0);
  const discount = Number(sale.discount || 0);
  const grandTotal = subTotal - discount;

  const html = `
    <!DOCTYPE html>
    <html>
      <head><title>Receipt</title>${style}</head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <h3>${
              shop.use_alias_on_bills ? shop.shop_alias : shop.shop_name
            }</h3>
            <h4>CASH MEMO</h4>
          </div>

          <div class="divider"></div>
          
          <div class="text-left">
            <p><strong>Bill No:</strong> ${sale.reference_no}</p>
            <p><strong>Date:</strong> ${new Date(
              sale.created_at
            ).toLocaleString("en-IN")}</p>
          </div>

          <div class="divider"></div>
          <div class="text-left">
            <p><strong>Billed To:</strong></p>
            <p>
              <strong>${sale.customer_name || "Walk-in Customer"}</strong>
              ${
                customerMarathiName
                  ? `<br><span class="local-name">${customerMarathiName}</span>`
                  : ""
              }
            </p>
            <p>${formatAddress(
              sale.customer_address,
              sale.customer_city,
              sale.customer_state,
              sale.customer_pincode
            )}</p>
            <p>Phone: ${sale.customer_phone || "N/A"}</p>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th class="center">Qty</th>
                <th class="right">Rate</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div class="divider"></div>

          <table class="summary-table">
            <tbody>
              <tr>
                <td class="label">Sub-Total</td>
                <td class="value">₹${subTotal.toLocaleString("en-IN")}</td>
              </tr>
              <tr>
                <td class="label">Discount</td>
                <td classs="value">- ₹${discount.toLocaleString("en-IN")}</td>
              </tr>
              <tr class="total">
                <td class="label" style="font-weight: bold;">Grand Total</td>
                <td class="value">₹${grandTotal.toLocaleString("en-IN")}</td>
              </tr>
              <tr>
                <td class="label">Paid via ${sale.payment_mode}</td>
                <td class="value">₹${sale.paid_amount.toLocaleString(
                  "en-IN"
                )}</td>
              </tr>
            </tbody>
          </table>

          <div class="divider"></div>
          <p>Thank you for your visit!</p>
        </div>
      </body>
    </html>
  `;
  return html;
}

module.exports = { createNonGstReceiptHTML };
