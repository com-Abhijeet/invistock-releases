const { BrowserWindow } = require("electron");
const { printWindowManager } = require("./printWindowManager.js"); // ⚡ OPTIMIZED

/**
 * Creates a hidden browser window and prints its HTML content.
 * @param {string} htmlContent - The HTML to print.
 * @param {object} printOptions - Options for the webContents.print() method.
 */
async function printNonGstReceipt(htmlContent, printOptions = {}) {
  // ⚡ OPTIMIZED: Reuse window from manager
  const receiptWindow = printWindowManager.getWindow("receipt", {
    show: true,
    width: 302, // Approx 80mm in pixels
    height: 600,
  });

  return new Promise((resolve, reject) => {
    receiptWindow.webContents.once("did-finish-load", () => {
      receiptWindow.webContents.print(printOptions, (success, error) => {
        if (!success) {
          console.error("Non-GST receipt print failed:", error);
          reject(new Error("Print failed"));
        } else {
          resolve();
        }
        // ⚡ OPTIMIZED: Recycle window instead of closing
        setTimeout(() => {
          printWindowManager.recycleWindow("receipt");
        }, 300);
      });
    });

    receiptWindow
      .loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`,
      )
      .catch(reject);
  });
}

module.exports = { printNonGstReceipt };
