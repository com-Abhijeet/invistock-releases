/**
 * Generates the HTML content for a Non-GST cash receipt.
 * Structure: Boxed/Bordered Table style.
 * Header and Table Columns repeat on page break.
 *
 * UPDATES:
 * - CommonJS Module format.
 * - Uses Shop Alias strictly (no address/contact).
 * - Responsive width handling for various paper sizes.
 * - Added padding to body.
 *
 * @param {object} shop - The shop details.
 * @param {object} sale - The non-GST sale data.
 * @param {number} printerWidthMM - The width of the printer in millimeters (default 80).
 * @returns {Promise<string>} The complete HTML string for the receipt.
 */
async function createNonGstReceiptHTML(shop, sale, printerWidthMM = 80) {
  const style = `
    <style>
      @page { margin: 2mm; size: auto; } /* Minimal margin for thermal */
      body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 5px; /* Added padding as requested */
        width: 100%;
        max-width: ${printerWidthMM}mm; /* Prevents stretching on A4, fills thermal */
        box-sizing: border-box;
        font-size: 12px;
        color: #000;
      }
      
      /* Main Layout Table */
      .main-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #000;
        border-bottom: none; /* Bottom border handled by summary table */
        table-layout: fixed; /* Ensures columns respect widths */
      }

      /* Header Elements inside Thead */
      .header-row td {
        border: none;
        text-align: center;
        padding: 5px;
      }

      .shop-title { 
        font-size: 18px; 
        font-weight: bold; 
        text-transform: uppercase; 
        margin: 5px 0; 
      }
      
      .info-row td {
        border-top: 1px solid #000;
        border-bottom: 1px solid #000;
        padding: 5px;
        font-size: 11px;
      }
      
      .customer-row td {
        border-bottom: 1px solid #000;
        padding: 5px;
        font-size: 11px;
        text-align: left;
      }

      /* Column Headers */
      .col-header th {
        border-bottom: 1px solid #000;
        padding: 4px 2px;
        /* text-align: left;  <-- Removed to allow specific column alignment */
        font-weight: bold;
        font-size: 11px;
        background-color: #f0f0f0 !important;
        -webkit-print-color-adjust: exact; 
      }

      /* Item Rows */
      .item-row td {
        padding: 4px 2px;
        vertical-align: top;
        border-bottom: 1px dotted #ccc;
        font-size: 11px;
        word-wrap: break-word; /* Prevents overflow on small paper */
      }
      .item-row:last-child td {
        border-bottom: none;
      }

      /* Column Widths & Alignments (Applied to both th and td) */
      .col-item { width: 45%; text-align: left; }
      .col-qty { width: 15%; text-align: center; }
      .col-rate { width: 20%; text-align: right; }
      .col-total { width: 20%; text-align: right; }

      /* Summary Section (Separate Table) */
      .summary-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #000;
        border-top: 1px solid #000; /* Distinct separation */
      }
      .summary-row td {
        padding: 4px 5px;
        font-size: 12px;
      }
      .grand-total {
        font-weight: bold;
        font-size: 14px;
        border-top: 1px solid #000;
      }
      
      .footer-msg {
        text-align: center;
        font-size: 10px;
        margin-top: 10px;
        font-style: italic;
      }
      
      /* Ensure header repeats on new pages */
      thead { display: table-header-group; }
      
      /* Utility */
      .right { text-align: right; }
      .left { text-align: left; }
      .bold { font-weight: bold; }
    </style>
  `;

  // Generate item rows
  const itemsHtml = sale.items
    .map(
      (item) => `
    <tr class="item-row">
      <td class="col-item">${item.product_name || "Item"}</td>
      <td class="col-qty">${item.quantity}</td>
      <td class="col-rate">${item.rate.toLocaleString("en-IN")}</td>
      <td class="col-total">${item.price.toLocaleString("en-IN")}</td>
    </tr>
  `
    )
    .join("");

  // Calculate totals
  const subTotal = sale.items.reduce((acc, item) => acc + item.price, 0);
  const discount = Number(sale.discount || 0);
  const grandTotal = subTotal - discount;

  // Use Alias if available, fallback to Name only if Alias is missing
  const displayName =
    shop.shop_alias && shop.shop_alias.trim() !== ""
      ? shop.shop_alias
      : shop.shop_name;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt ${sale.reference_no}</title>
        ${style}
      </head>
      <body>
        
        <table class="main-table">
          <thead>
            <!-- 1. Shop Details (Alias Only) -->
            <tr class="header-row">
              <td colspan="4">
                <div class="shop-title">${displayName}</div>
                <!-- Address and Contact removed as requested -->
              </td>
            </tr>

            <!-- 2. Bill Info -->
            <tr class="info-row">
              <td colspan="4">
                <div style="display: flex; justify-content: space-between;">
                  <span><strong>Bill No:</strong> ${sale.reference_no}</span>
                  <span>${new Date(sale.created_at).toLocaleDateString(
                    "en-IN"
                  )}</span>
                </div>
              </td>
            </tr>
            
            <!-- 3. Customer Info -->
            <tr class="customer-row">
              <td colspan="4">
                <div><strong>To:</strong> ${
                  sale.customer_name || "Walk-in Customer"
                }</div>
              </td>
            </tr>

            <!-- 4. Column Headers -->
            <tr class="col-header">
              <th class="col-item">Item</th>
              <th class="col-qty">Qty</th>
              <th class="col-rate">Rate</th>
              <th class="col-total">Amt</th>
            </tr>
          </thead>
          
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Summary Section -->
        <table class="summary-table">
          <tr class="summary-row">
            <td class="left">Sub Total</td>
            <td class="right">${subTotal.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}</td>
          </tr>
          ${
            discount > 0
              ? `
          <tr class="summary-row">
            <td class="left">Discount</td>
            <td class="right">- ${discount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}</td>
          </tr>`
              : ""
          }
          <tr class="summary-row grand-total">
            <td class="left">GRAND TOTAL</td>
            <td class="right">₹${grandTotal.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}</td>
          </tr>
          <tr class="summary-row">
            <td class="left" style="font-size: 10px;">Paid via ${
              sale.payment_mode
            }</td>
            <td class="right" style="font-size: 10px;">Items: ${
              sale.items.length
            }</td>
          </tr>
        </table>

        <div class="footer-msg">
          Thank you! Visit Again.
        </div>

      </body>
    </html>
  `;
  return html;
}

module.exports = { createNonGstReceiptHTML };
