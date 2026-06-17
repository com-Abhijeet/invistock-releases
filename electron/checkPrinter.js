const { BrowserWindow } = require("electron");
const { createCheckHTML } = require("./checkTemplate");

async function printCheck(data) {
  const htmlContent = createCheckHTML(data);

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  await new Promise((resolve, reject) => {
    win.webContents.on("did-finish-load", () => {
      win.webContents.print(
        {
          silent: false, // User needs to select printer and tray
          printBackground: false,
          margins: { marginType: "none" }, // Crucial for precision
        },
        (success, errorType) => {
          if (!success) {
            console.error("❌ Check print failed:", errorType);
            reject(new Error(errorType || "Print failed"));
          } else {
            resolve();
          }
          win.close();
        },
      );
    });

    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)
      .catch((error) => {
        win.close();
        reject(error);
      });
  });
}

module.exports = { printCheck };
