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

const createPrintWindow = async (payload) => {
  const { product, shop, copies } = payload;
  if (!product || !shop) {
    console.error("❌ Missing data for label printing.");
    return;
  }

  // 1. Generate Barcode
  const code = product.barcode || product.product_code || "0000";
  const barcodeBase64 = await generateBarcodeBase64(code);

  // 2. Get Settings
  const printerWidth = shop.label_printer_width_mm || 50;
  const templateId = shop.label_template_id || "lbl_standard";

  // 3. Generate HTML
  const { style, content } = createLabelHTML(
    product,
    shop,
    barcodeBase64,
    printerWidth,
    templateId
  );

  const fullHtml = `<html><head><title>Label Print</title>${style}</head><body>${content}</body></html>`;

  // 4. Create Window
  const win = new BrowserWindow({
    show: false, // hidden
    width: 400,
    height: 400,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  await win.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(fullHtml)
  );

  win.webContents.on("did-finish-load", () => {
    let isSilent = Boolean(shop.silent_printing);
    const printerName =
      shop.label_printer_name && shop.label_printer_name.trim() !== ""
        ? shop.label_printer_name
        : undefined;

    if (printerName && printerName.toLowerCase().includes("pdf")) {
      isSilent = false;
    }

    const printerOptions = {
      silent: isSilent,
      printBackground: true,
      copies: copies > 0 ? copies : 1,
    };

    if (printerName) {
      printerOptions.deviceName = printerName;
    }

    // Attempt print
    win.webContents.print(printerOptions, (success, errorType) => {
      if (!success) {
        console.error("❌ Label print failed:", errorType);
      }
      setTimeout(() => {
        win.close();
      }, 1000);
    });
  });
};

module.exports = { createPrintWindow };
