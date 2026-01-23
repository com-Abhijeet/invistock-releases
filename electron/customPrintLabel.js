const { BrowserWindow } = require("electron");
const bwipjs = require("bwip-js");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { customTemplates } = require("./customLabelTemplate.js");
const { getShop } = require("../backend/repositories/shopRepository.mjs");

// =======================================================
// BARCODE
// =======================================================

const generateBarcodeBase64 = async (barcodeText) => {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: "code128",
        text: barcodeText,
        scale: 4,
        height: 12,
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
// MAIN PRINT FUNCTION (FIXED VERSION 1)
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
      showShopName,
      silent: silentOverride,
      width: labelWidth,
    } = payload;

    if (!product) {
      console.error("❌ Invalid product data for custom print.");
      return;
    }

    // ===================================================
    // SHOP SETTINGS
    // ===================================================

    let shopData = {};
    try {
      shopData = await getShop();
    } catch {}

    // ===================================================
    // BARCODE
    // ===================================================

    const codeToEncode =
      barcode || product.barcode || product.product_code || "0000";

    let barcodeImg = "";

    if (showBarcode) {
      barcodeImg = await generateBarcodeBase64(codeToEncode);
    }

    // ===================================================
    // TEMPLATE
    // ===================================================

    const config = {
      showMRP: true,
      showSecretCode,
      showSize,
      showBarcode,
      showShopName,
      templateId,
      width: labelWidth || shopData.label_printer_width_mm || 50,
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

    const contentHTML = renderTemplate(
      itemData,
      config,
      barcodeImg,
      config.width,
      shopData,
    );

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
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
        <body>${contentHTML}</body>
      </html>
    `;

    // ===================================================
    // PRINT SETTINGS
    // ===================================================

    let isSilent =
      silentOverride !== undefined
        ? silentOverride
        : Boolean(shopData.silent_printing);

    let printerName = shopData.label_printer_name?.trim();

    // PDF printers MUST show dialog
    if (printerName?.toLowerCase().includes("pdf")) {
      isSilent = false;
      printerName = undefined;
    }

    const printCopies = Math.max(1, Number(copies) || 1);

    // ===================================================
    // TEMP FILE (keeps layout perfect)
    // ===================================================

    const tempFile = path.join(os.tmpdir(), `label-${Date.now()}.html`);
    fs.writeFileSync(tempFile, html);

    // ===================================================
    // WINDOW
    // ===================================================

    const win = new BrowserWindow({
      show: true, // ALWAYS visible for dialog
      width: 450,
      height: 600,
      autoHideMenuBar: true,
      title: "Label Print",
    });

    // ===================================================
    // LOAD (IMPORTANT: await instead of did-finish-load)
    // ===================================================

    await win.loadFile(tempFile);

    // ===================================================
    // WAIT FOR IMAGES (barcode render)
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
    // PRINT (DIRECT CALL — NOT did-finish-load)
    // ===================================================

    const options = {
      silent: isSilent,
      printBackground: true,
      copies: printCopies,
      deviceName: isSilent ? printerName : undefined,
    };

    win.webContents.print(options, () => {
      setTimeout(
        () => {
          if (!win.isDestroyed()) win.close();
          fs.unlink(tempFile, () => {});
        },
        isSilent ? 400 : 1500,
      );
    });
  } catch (err) {
    console.error("❌ Print handler crashed:", err);
  }
};

module.exports = { createCustomPrintWindow };
