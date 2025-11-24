const { BrowserWindow } = require("electron");

/**
 * Creates a hidden browser window and prints its HTML content.
 * @param {string} htmlContent - The HTML to print.
 * @param {object} printOptions - Options for the webContents.print() method.
 */
async function printShippingLabel(htmlContent, printOptions = {}) {
  const labelWindow = new BrowserWindow({
    show: true,
    width: 400,
    height: 600,
  });

  await labelWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
  );

  return new Promise((resolve, reject) => {
    labelWindow.webContents.on("did-finish-load", () => {
      labelWindow.webContents.print(printOptions, (success, error) => {
        if (!success) {
          console.error("Shipping label print failed:", error);
          reject(new Error("Print failed"));
        } else {
          resolve();
        }
        labelWindow.close();
      });
    });
  });
}

module.exports = { printShippingLabel };
