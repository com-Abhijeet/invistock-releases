const { BrowserWindow, shell } = require("electron");
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

  let barcodeBase64 = "";
  try {
    barcodeBase64 = await generateBarcodeBase64(code);
  } catch (error) {
    console.error("Barcode generation failed:", error);
  }

  // ===================================================
  // TEMPLATE & SIZING
  // ===================================================

  const printerWidth = Number(shop.label_printer_width_mm) || 50;
  const printerHeight = Number(shop.label_printer_height_mm) || 25;
  const templateId = shop.label_template_id || "lbl_standard";

  // Get the core content from the registry
  const { style, content } = createLabelHTML(
    product,
    shop,
    barcodeBase64,
    printerWidth,
    templateId,
    printerHeight,
  );

  // PHYSICAL DUPLICATION FOR COPIES
  // We manually repeat the HTML for each copy to fix PDF/Driver copy bugs
  const totalCopies = Math.max(1, Number(copies) || 1);
  let labelsHtml = "";
  for (let i = 0; i < totalCopies; i++) {
    labelsHtml += `
      <div class="label-page">
        <div class="label-container">
          ${content}
        </div>
      </div>`;
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        ${style}
        <style>
          @page { 
            margin: 0 !important; 
            size: ${printerWidth}mm ${printerHeight}mm !important; 
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
            width: ${printerWidth}mm !important;
            background: white;
            zoom: 1.0 !important;
            font-size: 0;
            overflow: visible !important; 
          }
          .label-page {
            width: ${printerWidth}mm;
            height: ${printerHeight}mm;
            page-break-after: always;
            overflow: hidden;
            display: block;
            position: relative;
            clear: both;
          }
          .label-container {
            position: absolute;
            top: 0;
            left: 0;
            width: ${printerWidth}mm;
            height: ${printerHeight}mm;
            overflow: hidden;
            display: block;
          }
          /* Reset wrapper margins to prevent double-page-break creep */
          .wrapper {
             page-break-after: avoid !important;
             margin: 0 !important;
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
      </body>
    </html>
  `;

  // ===================================================
  // PRINT SETTINGS
  // ===================================================

  let isSilent = Boolean(shop.silent_printing);
  let printerName = shop.label_printer_name?.trim();
  let isPdf = false;

  if (printerName?.toLowerCase().includes("pdf")) {
    isPdf = true;
    isSilent = true; // No dialog for PDF
  }

  const tempFile = path.join(os.tmpdir(), `label-std-${Date.now()}.html`);
  fs.writeFileSync(tempFile, fullHtml);

  const win = new BrowserWindow({
    show: isPdf ? false : !isSilent,
    width: 450,
    height: 500,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  await win.loadFile(tempFile);

  // Wait for images
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

  const options = {
    silent: isSilent,
    printBackground: true,
    copies: 1, // ALWAYS 1, because we physically duplicated the pages in HTML
    deviceName: isSilent ? printerName : undefined,
    pageSize: {
      width: Math.round(printerWidth * 1000),
      height: Math.round(printerHeight * 1000),
    },
    margins: {
      marginType: "none",
    },
  };

  // ===================================================
  // PRINT OR SAVE PDF
  // ===================================================

  if (isPdf) {
    // Save as PDF automatically
    const pdfOptions = {
      marginsType: 0, // none
      printBackground: true,
      pageSize: {
        width: Math.round(printerWidth * 1000),
        height: Math.round(printerHeight * 1000),
      },
    };

    const pdfPath = path.join(os.tmpdir(), `label-${Date.now()}.pdf`);

    win.webContents
      .printToPDF(pdfOptions)
      .then((data) => {
        fs.writeFile(pdfPath, data, (err) => {
          if (err) {
            console.error("❌ PDF save failed:", err);
          } else {
            console.log("✅ PDF saved to:", pdfPath);
            shell.openPath(pdfPath); // Opens the PDF in default viewer
          }
          setTimeout(() => {
            if (!win.isDestroyed()) win.close();
            fs.unlink(tempFile, () => {});
            // Optionally unlink PDF after opening: fs.unlink(pdfPath, () => {});
          }, 1000);
        });
      })
      .catch((err) => {
        console.error("❌ PDF generation failed:", err);
        win.close();
        fs.unlink(tempFile, () => {});
      });
  } else {
    // Print to physical printer
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
  }
};

module.exports = { createPrintWindow };
