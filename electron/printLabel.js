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
// MAIN PRINT
// =======================================================

const createPrintWindow = async (payload) => {
  const { product, shop, copies, customBarcode } = payload;

  if (!product || !shop) {
    console.error("❌ Missing data for label printing.");
    return;
  }

  // ===================================================
  // BARCODE
  // ===================================================

  const code =
    customBarcode || product.barcode || product.product_code || "0000";

  console.log(`🖨️ Generating label for code: ${code}`);

  let barcodeBase64 = "";
  try {
    barcodeBase64 = await generateBarcodeBase64(code);
  } catch (error) {
    console.error("Barcode generation failed:", error);
  }

  // ===================================================
  // TEMPLATE
  // ===================================================

  const printerWidth = shop.label_printer_width_mm || 50;
  const templateId = shop.label_template_id || "lbl_standard";

  const { style, content } = createLabelHTML(
    product,
    shop,
    barcodeBase64,
    printerWidth,
    templateId,
    code,
  );

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
      <body>${content}</body>
    </html>
  `;

  // ===================================================
  // PRINT SETTINGS
  // ===================================================

  let isSilent = Boolean(shop.silent_printing);
  let printerName = shop.label_printer_name?.trim();

  // PDF printers MUST show dialog
  if (printerName?.toLowerCase().includes("pdf")) {
    isSilent = false;
    printerName = undefined;
  }

  const printCopies = Math.max(1, Number(copies) || 1);

  // ===================================================
  // TEMP FILE (fixes scaling + dialog issues)
  // ===================================================

  const tempFile = path.join(os.tmpdir(), `label-${Date.now()}.html`);
  fs.writeFileSync(tempFile, fullHtml);

  // ===================================================
  // WINDOW (VISIBLE)
  // ===================================================

  const win = new BrowserWindow({
    show: true,
    width: 450,
    height: 500,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // ===================================================
  // LOAD (await instead of did-finish-load)
  // ===================================================

  await win.loadFile(tempFile);

  // ===================================================
  // WAIT FOR IMAGES
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
  // PRINT
  // ===================================================

  const options = {
    silent: isSilent,
    printBackground: true,
    copies: printCopies,
    deviceName: isSilent ? printerName : undefined,
  };

  win.webContents.print(options, (success, errorType) => {
    if (!success) {
      console.error("❌ Label print failed:", errorType);
    }

    setTimeout(
      () => {
        if (!win.isDestroyed()) win.close();
        fs.unlink(tempFile, () => {});
      },
      isSilent ? 400 : 1500,
    );
  });
};

module.exports = { createPrintWindow };
