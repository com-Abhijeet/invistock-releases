const { BrowserWindow } = require("electron");
const bwipjs = require("bwip-js");
const { createLabelHTML } = require("./labelTemplate.js"); // ✅ Import the template

/**
 * Generates the barcode image as a Base64 data URL.
 */
const generateBarcodeBase64 = async (barcodeText) => {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: "code128",
        text: barcodeText,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: "center",
      },
      (err, png) => {
        if (err) reject(err);
        else resolve(`data:image/png;base64,${png.toString("base64")}`);
      }
    );
  });
};

const createPrintWindow = async (payload) => {
  const { product, shop, copies } = payload;
  if (!product || !shop) {
    console.error("❌ Missing data for label printing.");
    return;
  }

  // 1. Generate Barcode
  const code = product.barcode || product.product_code;
  const barcodeBase64 = await generateBarcodeBase64(code);

  // 2. Get Width from Settings
  const printerWidth = shop.label_printer_width_mm || 58; // Default to 58mm

  // 3. Generate HTML
  const { style, content } = createLabelHTML(
    product,
    shop,
    barcodeBase64,
    printerWidth
  );

  const fullHtml = `<html><head><title>Label</title>${style}</head><body>${content}</body></html>`;

  // 4. Create Window
  const win = new BrowserWindow({
    show: true,
    width: 400, // Window size doesn't matter for printing
    height: 600,
  });

  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": ["img-src 'self' data:"],
      },
    });
  });

  await win.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(fullHtml)
  );

  win.webContents.on("did-finish-load", () => {
    win.webContents.print(
      {
        silent: Boolean(shop.silent_printing),
        //
        deviceName: shop.label_printer_name || undefined,
        copies: copies > 0 ? copies : 1,
      },
      (success, errorType) => {
        if (!success) console.error("❌ Label print failed:", errorType);
        win.close();
      }
    );
  });
};

module.exports = { createPrintWindow };
