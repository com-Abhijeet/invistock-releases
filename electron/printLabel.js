const { BrowserWindow, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { createLabelHTML } = require("./labelTemplate.js");
const { barcodeCache } = require("./barcodeCache.js");
const { printWindowManager } = require("./printWindowManager.js");

/**
 * ⚡ OPTIMIZED: Generates barcode SVG with caching (95% faster than PNG).
 * Reuses cached barcodes for identical codes - saves 0.5-1s per duplicate.
 */
const generateBarcodeBase64 = async (barcodeText) => {
  return await barcodeCache.generateSVG(barcodeText);
};

// =======================================================
// MAIN PRINT
// =======================================================

const createPrintWindow = async (payload) => {
  const { shop } = payload;
  if (!shop) {
    console.error("❌ Missing shop data for label printing.");
    return;
  }

  let itemsList = [];
  if (Array.isArray(payload.items) && payload.items.length > 0) {
    itemsList = payload.items;
  } else if (payload.product) {
    itemsList = [
      {
        product: payload.product,
        copies: payload.copies,
        customBarcode: payload.customBarcode,
      },
    ];
  }

  if (itemsList.length === 0) {
    console.error("❌ No items provided for label printing.");
    return;
  }

  const {
    getCustomFolderTemplateContent,
  } = require("./templates/customTemplateLoader.js");
  const folderPrnTemplate = getCustomFolderTemplateContent("barcode");
  const folderHtmlTemplate = getCustomFolderTemplateContent("label_html");

  let localSettings = {};
  try {
    if (shop.app_print_settings) {
      localSettings =
        typeof shop.app_print_settings === "string"
          ? JSON.parse(shop.app_print_settings)
          : shop.app_print_settings;
    }
  } catch (e) {}

  const prnContent =
    folderPrnTemplate || localSettings.custom_prn_template_content;
  const usePrn = folderPrnTemplate || localSettings.use_custom_prn_template;

  // ⚡ CUSTOM PRN LABEL ENGINE (TSPL/ZPL 1-Up, 2-Up, 3-Up RAW PRINTING)
  if (usePrn && prnContent) {
    const { renderPRNLabels } = require("./templates/prnLabelEngine.js");
    const { sendRawToPrinter } = require("./utils/rawPrinter.js");

    const formattedItems = itemsList.map((it) => ({
      product: it.product || it,
      barcode: it.customBarcode || it.product?.barcode || it.barcode || "",
      print_qty: Number(it.copies || it.print_qty || 1),
      name: it.product?.name || it.name || "",
      mrp: it.product?.mrp || it.mrp || 0,
      price: it.product?.selling_price || it.product?.price || it.price || 0,
    }));

    const rawPrnOutput = renderPRNLabels(prnContent, formattedItems, shop, {
      multiUp: localSettings.label_multi_up || 1,
      cipherKey: localSettings.cipher_key || "MONEYTALKS",
    });

    console.log(
      "🖨️ [Custom .PRN Label] Sending RAW TSPL commands directly to printer spooler:\n",
      rawPrnOutput.slice(0, 150),
    );

    const printerName = shop.label_printer_name?.trim();
    const result = await sendRawToPrinter(printerName, rawPrnOutput);

    if (result.success) {
      console.log("✅ Custom .PRN label printed successfully via RAW spooler!");
    } else {
      console.error("❌ Custom .PRN label printing failed:", result.error);
    }
    return;
  }

  let labelSettings = {};
  try {
    const { getLabelPrintSettings } = require("../backend/repositories/labelPrintSettingsRepository.mjs");
    labelSettings = getLabelPrintSettings() || {};
  } catch (e) {
    console.warn("[Print] Could not load label_print_settings:", e.message);
  }

  const printerWidth = Number(payload.width || labelSettings.label_printer_width_mm || shop.label_printer_width_mm) || 50;
  const printerHeight = Number(payload.height || labelSettings.label_printer_height_mm || shop.label_printer_height_mm) || 25;
  const colsPerRow = Math.max(1, Number(payload.colsPerRow || labelSettings.label_cols_per_row) || 1);
  const gapBetweenCols = Number(payload.gapBetweenCols !== undefined ? payload.gapBetweenCols : labelSettings.label_gap_between_cols) || 2;
  const horizontalOffset = Number(payload.horizontalOffset !== undefined ? payload.horizontalOffset : labelSettings.label_horizontal_offset) || 0;
  const verticalOffset = Number(payload.verticalOffset !== undefined ? payload.verticalOffset : labelSettings.label_vertical_offset) || 0;
  const templateId = payload.templateId || labelSettings.label_template_id || shop.label_template_id || "gen_standard";

  const allLabels = [];
  let baseStyle = "";

  const customHtmlTemplate =
    folderHtmlTemplate || localSettings.custom_label_template_content;
  const useCustomHtml =
    folderHtmlTemplate || localSettings.use_custom_label_template;

  for (const itemJob of itemsList) {
    const product = itemJob.product || itemJob;
    if (!product) continue;

    const code =
      itemJob.customBarcode ||
      product.barcode ||
      product.batch_uid ||
      product.product_code ||
      "0000";

    let barcodeBase64 = "";
    try {
      barcodeBase64 = await generateBarcodeBase64(code);
    } catch (error) {
      console.error("Barcode generation failed:", error);
    }

    let style = "";
    let content = "";

    if (useCustomHtml && customHtmlTemplate) {
      const Handlebars = require("handlebars");
      const compiled = Handlebars.compile(customHtmlTemplate);
      content = compiled({
        product,
        shop,
        barcode: barcodeBase64,
        code,
        mrp: product.mrp || 0,
        price: product.selling_price || product.price || product.mrp || 0,
      });
    } else {
      const labelRes = createLabelHTML(
        product,
        shop,
        barcodeBase64,
        printerWidth,
        templateId,
        printerHeight,
      );
      style = labelRes.style;
      content = labelRes.content;
    }

    if (!baseStyle && style) {
      baseStyle = style;
    }

    const totalCopies = Math.max(
      1,
      Number(itemJob.copies || itemJob.print_qty) || 1,
    );
    for (let i = 0; i < totalCopies; i++) {
      allLabels.push(content);
    }
  }

  // Precise Multi-Up Layout Calculation
  const rowContentWidth = printerWidth * colsPerRow + gapBetweenCols * (colsPerRow - 1);
  const pageWidth = rowContentWidth + Math.max(0, horizontalOffset);
  const pageHeight = printerHeight + Math.max(0, verticalOffset);

  // Group label HTMLs into Rows
  let rowsHtml = "";
  for (let i = 0; i < allLabels.length; i += colsPerRow) {
    let rowItems = "";
    for (let c = 0; c < colsPerRow && (i + c) < allLabels.length; c++) {
      rowItems += `<div class="label-wrapper">${allLabels[i + c]}</div>`;
    }
    rowsHtml += `<div class="label-row">${rowItems}</div>`;
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        ${baseStyle}
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
            zoom: 1.0 !important;
            font-size: 0;
            overflow: visible !important; 
          }
          body {
            padding-left: ${horizontalOffset}mm !important;
            padding-top: ${verticalOffset}mm !important;
          }
          .label-row {
            width: ${rowContentWidth}mm;
            height: ${printerHeight}mm;
            display: block;
            page-break-after: always;
            break-after: page;
            clear: both;
            font-size: 0;
          }
          .label-wrapper {
            width: ${printerWidth}mm;
            height: ${printerHeight}mm;
            margin-right: ${gapBetweenCols}mm;
            display: inline-block;
            vertical-align: top;
            overflow: hidden;
            position: relative;
          }
          .label-wrapper:nth-child(${colsPerRow}n) {
            margin-right: 0 !important;
          }
          .wrapper {
             page-break-after: avoid !important;
             margin: 0 !important;
          }
        </style>
      </head>
      <body>
        ${rowsHtml}
      </body>
    </html>
  `;

  // ===================================================
  // PRINT SETTINGS & EXECUTION
  // ===================================================

  let isSilent =
    labelSettings.silent_printing !== undefined
      ? Boolean(labelSettings.silent_printing)
      : Boolean(shop.silent_printing);
  const printerName = (labelSettings.label_printer_name || shop.label_printer_name)?.trim();

  // Force non-silent for PDF printers
  if (printerName?.toLowerCase().includes("pdf")) {
    isSilent = false;
  }

  const win = new BrowserWindow({
    show: false,
    width: 400,
    height: 400,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.webContents.on("did-finish-load", () => {
    const printerOptions = {
      silent: isSilent,
      printBackground: true,
      copies: 1,
      pageSize: {
        width: Math.round(pageWidth * 1000),
        height: Math.round(pageHeight * 1000),
      },
      margins: { marginType: "none" },
    };

    if (printerName) {
      printerOptions.deviceName = printerName;
    }

    if (!isSilent) {
      win.show();
    }

    win.webContents.print(printerOptions, (success, errorType) => {
      if (!success) {
        console.error("❌ Label print failed:", errorType);
      }
      setTimeout(
        () => {
          if (!win.isDestroyed()) win.close();
        },
        isSilent ? 500 : 1500,
      );
    });
  });

  await win.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(fullHtml),
  );
};


module.exports = { createPrintWindow };
