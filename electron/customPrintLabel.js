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

    // Precise Width Calculation: (LabelWidth * Cols) + (Gap * (Cols - 1))
    const rowContentWidth =
      config.width * config.colsPerRow +
      config.gapBetweenCols * (config.colsPerRow - 1);
    const pageWidth = rowContentWidth + config.horizontalOffset;
    const pageHeight = config.height + config.verticalOffset;

    const totalCopies = Math.max(1, Number(copies) || 1);

    // Group labels into Rows
    let rowsHtml = "";
    let currentLabelCount = 0;

    while (currentLabelCount < totalCopies) {
      let rowItems = "";
      for (let c = 0; c < config.colsPerRow; c++) {
        if (currentLabelCount < totalCopies) {
          rowItems += `<div class="label-wrapper">${labelHTML}</div>`;
          currentLabelCount++;
        }
      }
      rowsHtml += `<div class="label-row">${rowItems}</div>`;
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
        zoom: 1.0 !important;
        font-size: 0; 
      }

      body {
        display: block;
        padding-left: ${config.horizontalOffset}mm !important;
        padding-top: ${config.verticalOffset}mm !important;
      }

      .label-row {
        width: ${rowContentWidth}mm;
        height: ${config.height}mm;
        display: block;
        page-break-after: always;
        break-after: page;
        clear: both;
        font-size: 0; /* Kill inline-block gaps */
      }

      .label-wrapper {
        width: ${config.width}mm;
        height: ${config.height}mm;
        margin-right: ${config.gapBetweenCols}mm;
        display: inline-block;
        vertical-align: top;
        overflow: hidden;
        position: relative;
      }

      /* CRITICAL FIX: Remove margin from the last label in each row */
      .label-wrapper:nth-child(${config.colsPerRow}n) {
        margin-right: 0 !important;
      }
    </style>
  </head>
  <body>${rowsHtml}</body>
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

    const tempFile = path.join(os.tmpdir(), `custom-label-${Date.now()}.html`);
    fs.writeFileSync(tempFile, html);

    const win = new BrowserWindow({
      show: true,
      width: 500,
      height: 700,
      autoHideMenuBar: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    await win.loadFile(tempFile);

    // Wait for images
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
