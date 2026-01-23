const { BrowserWindow } = require("electron");
const bwipjs = require("bwip-js");
const fs = require("fs");
const path = require("path");
const os = require("os");

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
      },
    );
  });
};

// =======================================================
// BULK PRINT (UPDATED)
// =======================================================

async function printBulkLabels(items, shop) {
  try {
    const printerWidth = shop.label_printer_width_mm || 58;

    console.log("🖨️ Bulk label print started. Items:", items.length);

    // ===================================================
    // PRE-GENERATE BARCODES (unique only)
    // ===================================================

    const barcodeImageMap = new Map();

    for (const item of items) {
      const code =
        item.customBarcode || item.barcode || item.product_code || "0000";

      item._finalCode = code;

      if (!barcodeImageMap.has(code)) {
        const img = await generateBarcodeBase64(code);
        barcodeImageMap.set(code, img);
      }
    }

    // ===================================================
    // GENERATE ALL LABEL HTML
    // ===================================================

    let allContent = "";

    const { style } = createLabelHTML({}, shop, "", printerWidth);

    for (const item of items) {
      const code = item._finalCode;
      const barcodeImg = barcodeImageMap.get(code);

      // quantity × copies
      const totalCount =
        Number(item.quantity || 1) *
          Number(item.printQuantity || 1) *
          Number(item.copies || 1) || 1;

      const { content } = createLabelHTML(
        item,
        shop,
        barcodeImg,
        printerWidth,
        undefined,
        code,
      );

      for (let i = 0; i < totalCount; i++) {
        allContent += content;
      }
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          ${style}
          <style>
            body {
              margin: 0;
              padding: 0;
              background: white;
              -webkit-print-color-adjust: exact;
            }
            @page { margin: 0; size: auto; }
          </style>
        </head>
        <body>${allContent}</body>
      </html>
    `;

    // ===================================================
    // TEMP FILE (fix scaling + dialog reliability)
    // ===================================================

    const tempFile = path.join(os.tmpdir(), `bulk-labels-${Date.now()}.html`);
    fs.writeFileSync(tempFile, fullHtml);

    // ===================================================
    // PRINT SETTINGS
    // ===================================================

    let isSilent = Boolean(shop.silent_printing);
    let printerName = shop.label_printer_name?.trim();

    // Force dialog for PDF printers
    if (printerName?.toLowerCase().includes("pdf")) {
      isSilent = false;
      printerName = undefined;
    }

    // ===================================================
    // WINDOW (PREVIEW ALWAYS VISIBLE)
    // ===================================================

    const win = new BrowserWindow({
      show: true, // preview visible
      width: 600,
      height: 700,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // ===================================================
    // LOAD FILE (await instead of did-finish-load)
    // ===================================================

    await win.loadFile(tempFile);

    // ===================================================
    // WAIT FOR IMAGES (barcodes)
    // ===================================================

    await win.webContents.executeJavaScript(`
      new Promise(resolve => {
        const imgs = [...document.images];
        if (!imgs.length) resolve();
        let done = 0;
        imgs.forEach(img => {
          if (img.complete) done++;
          else img.onload = img.onerror = () => {
            done++;
            if (done === imgs.length) resolve();
          };
        });
        if (done === imgs.length) resolve();
      });
    `);

    // ===================================================
    // PRINT (ONE SINGLE JOB)
    // ===================================================

    const options = {
      silent: isSilent,
      printBackground: true,
      deviceName: isSilent ? printerName : undefined,
    };

    win.webContents.print(options, (success, err) => {
      if (!success) console.error("❌ Bulk print failed:", err);

      setTimeout(
        () => {
          if (!win.isDestroyed()) win.close();
          fs.unlink(tempFile, () => {});
        },
        isSilent ? 400 : 2000,
      );
    });
  } catch (err) {
    console.error("❌ Bulk label print crashed:", err);
  }
}

module.exports = { printBulkLabels };
