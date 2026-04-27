const { BrowserWindow } = require("electron");
const QRCode = require("qrcode");
const { getTemplate } = require("./ipc/templateManager.js"); // ✅ Import Template Manager

async function printInvoice(payload) {
  const startTime = Date.now();
  const logTime = (msg) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️ [Invoice Print] ${msg} - Elapsed: ${elapsed}s`);
  };

  logTime("Started print job");

  const { sale, shop, copies = 1, localSettings } = payload;
  if (!sale || !shop) {
    console.error("❌ Missing sale or shop data for invoice printing.");
    return;
  }

  // 1. Generate QR Code
  if (shop?.upi_id && shop?.upi_banking_name) {
    const upiUrl = `upi://pay?pa=${encodeURIComponent(
      shop.upi_id,
    )}&pn=${encodeURIComponent(
      shop.upi_banking_name,
    )}&am=${sale.total_amount.toFixed(2)}&cu=INR`;
    shop.generated_upi_qr = await QRCode.toDataURL(upiUrl);
  } else {
    shop.generated_upi_qr = null;
  }
  
  logTime("QR Code processed");

  const enhancedSale = sale;

  // 3. Create Hidden Window
  const printWin = new BrowserWindow({
    width: 900,
    height: 1000,
    show: !Boolean(shop.silent_printing),
    title: "Invoice Print",
  });
  
  logTime("Print Window created");

  printWin.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": ["img-src 'self' data:"],
        },
      });
    },
  );

  // 4. Generate HTML using Template Manager
  // Use shop.invoice_template_id if set, else default
  const templateId = shop.invoice_template_id || "a4_standard";

  const htmlContent = getTemplate(templateId, {
    sale: enhancedSale,
    shop,
    localSettings,
  });
  
  logTime("Template HTML generated");

  printWin.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent),
  );

  printWin.webContents.on("did-finish-load", () => {
    logTime("Window did-finish-load - Calling print() now");
    
    // Store the time when print is called
    const beforePrintTime = Date.now();
    
    printWin.webContents.print(
      {
        silent: Boolean(shop.silent_printing),
        printBackground: false,
        deviceName: shop.invoice_printer_name || undefined,
        copies: copies > 0 ? copies : 1,
      },
      (success, errorType) => {
        const timeInSpooler = ((Date.now() - beforePrintTime) / 1000).toFixed(2);
        logTime(`Print callback fired (Success: ${success}) - Time taken after print dialog: ${timeInSpooler}s`);
        
        if (!success) console.error("❌ Invoice print failed:", errorType);
        printWin.close();
        
        logTime("Total print process finished completely.");
      },
    );
  });
}

module.exports = { printInvoice };
