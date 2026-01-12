const { BrowserWindow } = require("electron");
const bwipjs = require("bwip-js");
const { createLabelHTML } = require("./labelTemplate.js");

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

  // 2. Pre-generate barcodes
  // Logic: We must generate unique images for UNIQUE barcode strings.
  // The 'items' array might contain the same product multiple times but with different 'customBarcode' (if we had split rows).
  // For safety, we map by the *barcode string* itself, not the item ID.
  const barcodeImageMap = new Map();

  for (const item of items) {
    // DETERMINE BARCODE STRING
    // Priority: Custom (Batch/Serial) -> Product Barcode -> Product Code -> "0000"
    const codeToPrint =
      item.customBarcode || item.barcode || item.product_code || "0000";

    // Store the determined code on the item for later reference in HTML generation
    item._finalCode = codeToPrint;

    if (!barcodeImageMap.has(codeToPrint)) {
      try {
        const img = await generateBarcodeBase64(codeToPrint);
        barcodeImageMap.set(codeToPrint, img);
      } catch (err) {
        console.error(`Failed to gen barcode for ${codeToPrint}`, err);
      }
    }
  }

  // 3. Generate BIG HTML string
  let allContent = "";

  // Get shared styles
  const { style } = createLabelHTML({}, shop, "", printerWidth);

  for (const item of items) {
    const code = item._finalCode;
    const barcodeImg = barcodeImageMap.get(code);
    const count = item.printQuantity || 1;

    // Generate HTML for this item
    // Pass 'code' as the 6th arg so it appears under the barcode
    const { content } = createLabelHTML(
      item,
      shop,
      barcodeImg,
      printerWidth,
      undefined,
      code
    );

    // Repeat 'count' times
    for (let i = 0; i < count; i++) {
      allContent += content;
    }
  }

  const fullHtml = `<html><head><title>Bulk Labels</title>${style}</head><body>${allContent}</body></html>`;

  // 4. Create Window and Print
  const win = new BrowserWindow({
    show: false, // Hidden by default
    width: 400,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
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
    let isSilent = Boolean(shop.silent_printing);
    const printerName = shop.label_printer_name?.trim();

    // Check for PDF/Interactive printers
    if (printerName && printerName.toLowerCase().includes("pdf")) {
      isSilent = false;
    }

    // Show window if interactive
    if (!isSilent) {
      win.show();
    }

    win.webContents.print(
      {
        silent: isSilent,
        deviceName: printerName || undefined,
        printBackground: true,
      },
      (success, err) => {
        if (!success) console.error("Bulk print failed", err);
        // Close after a delay to ensure print job is sent
        setTimeout(() => {
          win.close();
        }, 2000);
      }
    );
  });
}

module.exports = { printBulkLabels };
