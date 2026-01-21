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
      },
    );
  });
};

/**
 * Handles the Custom Label Print flow.
 * Allows overriding barcode, template, and injecting a custom price code.
 */
const createCustomPrintWindow = async (payload) => {
  const { product, shop, copies, customBarcode, customPriceCode, templateId } =
    payload;

  if (!product || !shop) {
    console.error("❌ Missing data for custom label printing.");
    return;
  }

  // 1. Determine Barcode (User Input > Product Barcode > Product Code)
  const code =
    customBarcode || product.barcode || product.product_code || "0000";

  console.log(`🖨️ Generating Custom Label for code: ${code}`);

  // 2. Generate Barcode Image
  let barcodeBase64 = "";
  try {
    barcodeBase64 = await generateBarcodeBase64(code);
  } catch (error) {
    console.error("Error generating barcode image:", error);
  }

  // 3. Prepare Settings
  const printerWidth = shop.label_printer_width_mm || 50;
  // Use selected template or fallback to shop default
  const selectedTemplate =
    templateId || shop.label_template_id || "lbl_standard";

  // 4. Inject Custom Data into Product Object
  // This ensures templates that check for 'custom_price_code' or 'custom_field' can render it
  const productWithCustomData = {
    ...product,
    custom_price_code: customPriceCode,
    // Overwrite barcode in the object for template rendering if needed
    barcode: code,
  };

  // 5. Generate HTML
  const { style, content } = createLabelHTML(
    productWithCustomData,
    shop,
    barcodeBase64,
    printerWidth,
    selectedTemplate,
  );

  const fullHtml = `<html><head><title>Custom Label Print</title>${style}</head><body>${content}</body></html>`;

  // 6. Create Hidden Window & Print
  const win = new BrowserWindow({
    show: false, // Keep hidden unless debugging
    width: 400,
    height: 400,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  await win.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(fullHtml),
  );

  win.webContents.on("did-finish-load", () => {
    let isSilent = Boolean(shop.silent_printing);
    const printerName =
      shop.label_printer_name && shop.label_printer_name.trim() !== ""
        ? shop.label_printer_name
        : undefined;

    // Force non-silent for PDF printers
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

    if (!isSilent) {
      win.show();
    }

    win.webContents.print(printerOptions, (success, errorType) => {
      if (!success) {
        console.error("❌ Custom Label print failed:", errorType);
      }
      // Cleanup
      setTimeout(() => {
        win.close();
      }, 1000);
    });
  });
};

module.exports = { createCustomPrintWindow };
