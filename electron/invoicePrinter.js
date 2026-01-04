const { BrowserWindow } = require("electron");
const QRCode = require("qrcode");
const { getTemplate } = require("./ipc/templateManager.js"); // ✅ Import Template Manager
const { getMarathiName } = require("./transliterationService.js");

async function printInvoice(payload) {
  const { sale, shop, copies = 1 } = payload;
  if (!sale || !shop) {
    console.error("❌ Missing sale or shop data for invoice printing.");
    return;
  }

  // 1. Generate QR Code
  if (shop?.upi_id && shop?.upi_banking_name) {
    const upiUrl = `upi://pay?pa=${encodeURIComponent(
      shop.upi_id
    )}&pn=${encodeURIComponent(
      shop.upi_banking_name
    )}&am=${sale.total_amount.toFixed(2)}&cu=INR`;
    shop.generated_upi_qr = await QRCode.toDataURL(upiUrl);
  } else {
    shop.generated_upi_qr = null;
  }

  // 2. Prepare Data (Transliteration, etc.)
  // We enhance sale.items with Marathi names so templates don't need to be async
  const enhancedItems = await Promise.all(
    sale.items.map(async (item) => {
      const marathiName = await getMarathiName(item.product_name || "");
      return { ...item, marathi_name: marathiName };
    })
  );

  const enhancedSale = { ...sale, items: enhancedItems };

  // 3. Create Hidden Window
  const printWin = new BrowserWindow({
    width: 900,
    height: 1000,
    show: !Boolean(shop.silent_printing),
    title: "Invoice Print",
  });

  printWin.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": ["img-src 'self' data:"],
        },
      });
    }
  );

  // 4. Generate HTML using Template Manager
  // Use shop.invoice_template_id if set, else default
  const templateId = shop.invoice_template_id || "a4_standard";

  const htmlContent = getTemplate(templateId, { sale: enhancedSale, shop });

  printWin.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent)
  );

  printWin.webContents.on("did-finish-load", () => {
    printWin.webContents.print(
      {
        silent: Boolean(shop.silent_printing),
        printBackground: true,
        deviceName: shop.invoice_printer_name || undefined,
        copies: copies > 0 ? copies : 1,
      },
      (success, errorType) => {
        if (!success) console.error("❌ Invoice print failed:", errorType);
        printWin.close();
      }
    );
  });
}

module.exports = { printInvoice };
