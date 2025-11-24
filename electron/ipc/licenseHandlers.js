const { ipcMain, app } = require("electron");
const {
  checkAppLicense,
} = require("../../backend/services/licenseService.mjs"); // Adjust path if needed

function initializeLicenseHandlers() {
  // This handler is called by main.js on startup.
  ipcMain.handle("check-license-status", () => {
    try {
      return checkAppLicense();
    } catch (error) {
      console.error("[LICENSE CHECK FAILED]", error);
      return { status: "invalid", message: "Could not verify license." };
    }
  });

  // This listener waits for a signal from the frontend after a successful activation.
  ipcMain.on("license-updated-restart-app", () => {
    // Relaunch the application to apply the new license status.
    app.relaunch();
    app.quit();
  });
}

module.exports = { initializeLicenseHandlers };
