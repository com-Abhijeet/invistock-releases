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
  const { product, shop, copies, customBarcode } = payload;

  if (!product || !shop) {
    console.error("❌ Missing data for label printing.");
    return;
  }

  // 1. Determine the Barcode to Print
  // PRIORITY: specific 'customBarcode' (Batch/Serial) > 'product.barcode' > 'product_code'
  const code =
    customBarcode || product.barcode || product.product_code || "0000";

  console.log(`🖨️ Generating label for code: ${code}`);

  // 2. Generate Barcode Image
  let barcodeBase64 = "";
  try {
    barcodeBase64 = await generateBarcodeBase64(code);
  } catch (error) {
    console.error("Error generating barcode image:", error);
  }

  // 3. Get Settings
  const printerWidth = shop.label_printer_width_mm || 50;
  const templateId = shop.label_template_id || "lbl_standard";

  // 4. Generate HTML
  const { style, content } = createLabelHTML(
    product,
    shop,
    barcodeBase64,
    printerWidth,
    templateId,
    code // Pass specific code (e.g., Batch UID) for display
  );

  const fullHtml = `<html><head><title>Label Print</title>${style}</head><body>${content}</body></html>`;

  // 5. Create Window (Initially Hidden)
  const win = new BrowserWindow({
    show: true,
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

    // Force non-silent for PDF printers (they require file save dialogs)
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

    // FIX: If printing is interactive (e.g. PDF or manual selection),
    // the window MUST be visible for the dialog to appear.
    if (!isSilent) {
      win.show();
    }

    // Attempt print
    win.webContents.print(printerOptions, (success, errorType) => {
      if (!success) {
        console.error("❌ Label print failed:", errorType);
      }
      // Close window after print dialog is done or print is sent
      setTimeout(() => {
        win.close();
      }, 1000);
    });
  });
};

module.exports = { createPrintWindow };
