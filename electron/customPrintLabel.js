const { BrowserWindow } = require("electron");
const bwipjs = require("bwip-js");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { customTemplates } = require("./customLabelTemplate.js");
const { getShop } = require("../backend/repositories/shopRepository.mjs");

// =======================================================
// BARCODE GENERATOR
// =======================================================
const generateBarcodeBase64 = async (barcodeText) => {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: "code128",
        text: barcodeText,
        scale: 3,
        height: 10,
        includetext: false,
      },
      (err, png) => {
        if (err) return reject(err);
        resolve(`data:image/png;base64,${png.toString("base64")}`);
      },
    );
  });
};

// =======================================================
// MAIN PRINT FUNCTION
// =======================================================
const createCustomPrintWindow = async (payload) => {
  try {
    const {
      product,
      copies,
      barcode,
      customPriceCode,
      templateId,
      showSecretCode,
      showSize,
      showBarcode,
      showBarcodeText,
      showShopName,
      rotation,
      silent: silentOverride,
      width: labelWidth,
      height: labelHeight,
      colsPerRow,
      gapBetweenCols,
      horizontalOffset,
      verticalOffset,
    } = payload;

    if (!product) return;

    let shopData = {};
    try {
      shopData = await getShop();
    } catch {}

    const codeToEncode =
      barcode || product.barcode || product.product_code || "0000";
    let barcodeImg = "";
    if (showBarcode) barcodeImg = await generateBarcodeBase64(codeToEncode);

    const config = {
      showSecretCode,
      showSize,
      showBarcode,
      showBarcodeText,
      showShopName,
      rotation: Number(rotation) || 0,
      width: Number(labelWidth) || 50,
      height: Number(labelHeight) || 25,
      colsPerRow: Math.max(1, Number(colsPerRow) || 1),
      gapBetweenCols: Number(gapBetweenCols) || 0,
      horizontalOffset: Number(horizontalOffset) || 0,
      verticalOffset: Number(verticalOffset) || 0,
    };

    const itemData = {
      name: product.name,
      mrp: product.mrp,
      size: product.size,
      custom_price_code: customPriceCode,
      barcode: codeToEncode,
    };

    const renderTemplate =
      customTemplates[templateId] || customTemplates.custom_garment_standard;
    const labelHTML = renderTemplate(
      itemData,
      config,
      barcodeImg,
      config.width,
      shopData,
      config.height,
    );

    const rowWidth =
      config.width * config.colsPerRow +
      config.gapBetweenCols * (config.colsPerRow - 1);
    const pageWidth = rowWidth + config.horizontalOffset;
    // We strictly define pageHeight as the mechanical pitch of the label roll
    const pageHeight = config.height + config.verticalOffset;

    const totalCopies = Math.max(1, Number(copies) || 1);

    let labelsHtml = "";
    for (let i = 0; i < totalCopies; i++) {
      labelsHtml += `<div class="label-wrapper">${labelHTML}</div>`;
      // If we've hit the end of a column row, we force a clear to prevent vertical bleed
      if ((i + 1) % config.colsPerRow === 0) {
        labelsHtml += `<div style="clear: both; width: 100%; height: 0; font-size: 0;"></div>`;
      }
    }

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      @page { 
        margin: 0 !important; 
        size: ${pageWidth}mm ${pageHeight}mm !important; 
      }
      * { 
        box-sizing: border-box; 
        margin: 0; 
        padding: 0; 
        -webkit-print-color-adjust: exact;
      }
      
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: ${pageWidth}mm !important;
        background: white;
        overflow: visible !important;
        /* Prevent Chromium auto-scaling / fit-to-page */
        zoom: 1.0 !important;
        font-size: 0; 
      }

      body {
        display: block; /* Switched back to block for reliable clear-based wrapping */
        padding-left: ${config.horizontalOffset}mm !important;
        padding-top: ${config.verticalOffset}mm !important;
      }

      .label-wrapper {
        width: ${config.width}mm;
        height: ${config.height}mm;
        margin-right: ${config.gapBetweenCols}mm;
        display: inline-block;
        vertical-align: top;
        overflow: hidden;
        /* Ensure the browser treats this as a solid atomic block */
        page-break-inside: avoid;
        break-inside: avoid;
        position: relative;
      }

      /* Clean up the right margin for the last column in every row */
      .label-wrapper:nth-child(${config.colsPerRow}n),
      .label-wrapper:nth-child(${config.colsPerRow}n + 1) {
         /* Selector logic to ensure right-most label doesn't push width */
      }
    </style>
  </head>
  <body>${labelsHtml}</body>
</html>`;

    let isSilent =
      silentOverride !== undefined
        ? silentOverride
        : Boolean(shopData.silent_printing);
    let printerName = shopData.label_printer_name?.trim();
    if (printerName?.toLowerCase().includes("pdf")) {
      isSilent = false;
      printerName = undefined;
    }

    const tempFile = path.join(os.tmpdir(), `label-${Date.now()}.html`);
    fs.writeFileSync(tempFile, html);

    const win = new BrowserWindow({
      show: true,
      width: 500,
      height: 700,
      autoHideMenuBar: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    await win.loadFile(tempFile);

    await win.webContents.executeJavaScript(`
      new Promise(resolve => {
        const imgs = [...document.images];
        if (!imgs.length) return resolve();
        let loaded = 0;
        imgs.forEach(img => {
          if (img.complete) loaded++;
          else img.onload = img.onerror = () => { loaded++; if (loaded === imgs.length) resolve(); };
        });
        if (loaded === imgs.length) resolve();
      });
    `);

    const options = {
      silent: isSilent,
      printBackground: true,
      deviceName: isSilent ? printerName : undefined,
      pageSize: {
        width: Math.round(pageWidth * 1000),
        height: Math.round(pageHeight * 1000),
      },
      margins: { marginType: "none" },
    };

    win.webContents.print(options, (success) => {
      setTimeout(
        () => {
          if (!win.isDestroyed()) win.close();
          fs.unlink(tempFile, () => {});
        },
        isSilent ? 600 : 2500,
      );
    });
  } catch (err) {
    console.error("❌ Print handler crashed:", err);
  }
};

module.exports = { createCustomPrintWindow };
