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
  const code = product.barcode || product.product_code;
  const barcodeBase64 = await generateBarcodeBase64(code);

  // 2. Get Width from Settings
  const printerWidth = shop.label_printer_width_mm || 58;

  // 3. Generate HTML
  const { style, content } = createLabelHTML(
    product,
    shop,
    barcodeBase64,
    printerWidth
  );

  const fullHtml = `<html><head><title>Label Print</title>${style}</head><body>${content}</body></html>`;

  // 4. Create Window - VISIBLE temporarily to ensure dialogs attach correctly
  // Hiding the window completely often suppresses print dialogs on Windows
  const win = new BrowserWindow({
    show: true,
    width: 400,
    height: 600,
    title: "Label Printer",
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
    const printerName =
      shop.label_printer_name && shop.label_printer_name.trim() !== ""
        ? shop.label_printer_name
        : undefined;

    // FIX: PDF Printers typically fail in silent mode because they can't ask for a filename.
    // We FORCE the system dialog to appear if a PDF printer is selected or detected.
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

    // If we are showing the dialog (silent: false), we usually need the window to be somewhat 'active' logic-wise.
    // However, Electron can print from background.
    // If you are still not seeing a dialog, setting silent to ALWAYS false here for testing might reveal if settings are stuck.

    // Attempt print
    win.webContents.print(printerOptions, (success, errorType) => {
      if (!success) {
        console.error("❌ Label print failed:", errorType);
      }
      // Delay closing slightly to ensure OS handoff, especially for PDF drivers
      setTimeout(() => {
        win.close();
      }, 500);
    });
  });
};

module.exports = { createPrintWindow };
