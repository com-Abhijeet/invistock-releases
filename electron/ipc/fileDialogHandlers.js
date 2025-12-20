const { dialog, shell, BrowserWindow } = require("electron");
const xlsx = require("xlsx");
const { copyProductImage, copyLogoImage } = require("../handleImageCopy.js");
const { generateExcelReport } = require("../generateExcelReport.js");

function registerFileDialogHandlers(ipcMain, { mainWindow } = {}) {
  ipcMain.handle("open-external-url", async (event, url) => {
    if (!url) return { success: false, error: "No URL provided" };
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error("Failed to open external URL:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("generate-excel-report", async (_event, args) => {
    const { data, fileName, columnMap } = args;
    const result = await generateExcelReport(data, fileName, columnMap);
    return result;
  });

  ipcMain.handle("select-logo", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Select Shop Logo",
      properties: ["openFile"],
      filters: [
        { name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] },
      ],
    });

    if (canceled || filePaths.length === 0) {
      return { success: false };
    }
    const newFileName = await copyLogoImage(filePaths[0]);
    return { success: true, fileName: newFileName };
  });

  ipcMain.handle("copy-product-image", async (event, originalPath) => {
    try {
      const newFileName = await copyProductImage(originalPath);
      return { success: true, fileName: newFileName };
    } catch (error) {
      console.error("Failed to copy product image:", error);
      return {
        success: false,
        error: error.message || "Failed to copy image.",
      };
    }
  });

  ipcMain.handle("dialog:open-image", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Select Product Image",
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp"] }],
    });

    if (canceled || filePaths.length === 0) {
      return null;
    }
    return filePaths[0];
  });

  ipcMain.handle("get-printers", async () => {
    try {
      const printers =
        await BrowserWindow.getAllWindows()[0].webContents.getPrintersAsync();
      return printers;
    } catch (error) {
      console.error("Failed to get printers:", error);
      return [];
    }
  });

  ipcMain.handle("dialog:open-file", async (event, options) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(options);
    if (canceled || filePaths.length === 0) {
      return null;
    }
    return filePaths[0];
  });

  ipcMain.handle("read-excel-file", async (event, filePath) => {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const headers =
        xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: true })[0] || [];

      const dataPreview = xlsx.utils.sheet_to_json(worksheet, {
        range: 5,
        raw: true,
      });

      return { success: true, headers, dataPreview };
    } catch (error) {
      console.error("Failed to read Excel file:", error);
      return { success: false, error: "Could not read the selected file." };
    }
  });
}

module.exports = { registerFileDialogHandlers };
