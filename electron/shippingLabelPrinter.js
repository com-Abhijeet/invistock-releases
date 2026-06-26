const { BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { printWindowManager } = require("./printWindowManager.js"); // ⚡ OPTIMIZED

/**
 * Prints shipping label with preview + reliable dialog.
 * Uses temp file + await load (stable on Windows).
 */
async function printShippingLabel(htmlContent, printOptions = {}) {
  try {
    console.log("📦 Shipping label print started");

    // ===================================================
    // TEMP FILE (fix scaling + dialog reliability)
    // ===================================================

    const tempFile = path.join(
      os.tmpdir(),
      `shipping-label-${Date.now()}.html`,
    );

    const fullHtml = `
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
        <body>${htmlContent}</body>
      </html>
    `;

    fs.writeFileSync(tempFile, fullHtml);

    // ===================================================
    // PRINT SETTINGS
    // ===================================================

    let isSilent = Boolean(printOptions.silent);
    let printerName = printOptions.deviceName?.trim();

    // Force dialog for PDF printers
    if (printerName?.toLowerCase().includes("pdf")) {
      isSilent = false;
      printerName = undefined;
    }

    // ===================================================
    // WINDOW (⚡ OPTIMIZED: Reuse from manager)
    // ===================================================

    const labelWindow = printWindowManager.getWindow("shipping", {
      show: true,
      width: 500,
      height: 650,
    });

    // ===================================================
    // LOAD FILE (await, NOT did-finish-load)
    // ===================================================

    await labelWindow.loadFile(tempFile);

    // ===================================================
    // WAIT FOR IMAGES (if logos etc)
    // ===================================================

    await labelWindow.webContents.executeJavaScript(`
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

    return new Promise((resolve, reject) => {
      labelWindow.webContents.print(
        {
          silent: isSilent,
          deviceName: isSilent ? printerName : undefined,
          printBackground: true,
        },
        (success, error) => {
          if (!success) {
            console.error("❌ Shipping label print failed:", error);
            reject(new Error("Print failed"));
          } else {
            resolve();
          }

          // ⚡ OPTIMIZED: Recycle window instead of closing
          setTimeout(
            () => {
              printWindowManager.recycleWindow("shipping");
              fs.unlink(tempFile, () => {});
            },
            isSilent ? 400 : 1500,
          );
        },
      );
    });
  } catch (err) {
    console.error("❌ Shipping label crash:", err);
    throw err;
  }
}

module.exports = { printShippingLabel };
