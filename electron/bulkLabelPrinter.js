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

async function printBulkLabels(items, shop) {
  // 1. Get Width from Settings
  const printerWidth = shop.label_printer_width_mm || 58;

  // 2. Pre-generate barcodes (Optimization)
  const barcodeMap = new Map();
  for (const item of items) {
    if (!barcodeMap.has(item.id)) {
      const code = item.barcode || item.product_code;
      const img = await generateBarcodeBase64(code);
      barcodeMap.set(item.id, img);
    }
  }

  // 3. Generate BIG HTML string
  let allContent = "";

  // We only need the style once
  // We pass dummy data just to get the CSS string
  const { style } = createLabelHTML({}, shop, "", printerWidth);

  for (const item of items) {
    const barcodeImg = barcodeMap.get(item.id);
    const count = item.printQuantity || 1;

    // Generate the HTML for this specific item
    const { content } = createLabelHTML(item, shop, barcodeImg, printerWidth);

    // Repeat it 'count' times
    for (let i = 0; i < count; i++) {
      allContent += content;
    }
  }

  const fullHtml = `<html><head><title>Bulk Labels</title>${style}</head><body>${allContent}</body></html>`;

  // 4. Create Window and Print
  const win = new BrowserWindow({ show: false, width: 400, height: 600 });

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
        deviceName: shop.label_printer_name || undefined,
      },
      (success, err) => {
        if (!success) console.error("Bulk print failed", err);
        win.close();
      }
    );
  });
}

module.exports = { printBulkLabels };
