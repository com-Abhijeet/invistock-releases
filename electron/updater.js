const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const { ipcMain, app } = require("electron");
const path = require("path");
const fs = require("fs");

// 1. Configure Logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";

// 2. Configuration
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function getAppVersion() {
  if (!app.isPackaged) {
    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(__dirname, "../package.json"), "utf8")
      );
      return packageJson.version;
    } catch (e) {
      return app.getVersion();
    }
  }
  return app.getVersion();
}

// Force dev updates if needed
if (!app.isPackaged) {
  autoUpdater.forceDevUpdateConfig = true;
}

let mainWindow = null;

function sendStatusToWindow(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// --- Event Listeners (Global) ---

autoUpdater.on("checking-for-update", () => {
  log.info("Checking for update...");
});

autoUpdater.on("update-available", (info) => {
  log.info("Update available.");
  sendStatusToWindow("update-available", info);
});

autoUpdater.on("update-not-available", (info) => {
  log.info("Update not available.");
  sendStatusToWindow("update-not-available");
});

autoUpdater.on("error", (err) => {
  log.error("Error in auto-updater. " + err);
  sendStatusToWindow("update-error", err.toString());
});

autoUpdater.on("download-progress", (progressObj) => {
  sendStatusToWindow("update-progress", progressObj);
});

autoUpdater.on("update-downloaded", (info) => {
  log.info("Update downloaded");
  sendStatusToWindow("update-downloaded", info);
});

// ✅ FIX: Move IPC Handlers OUTSIDE initializeUpdater
// They should only be registered once when the app starts.

ipcMain.handle("check-for-updates", () => {
  autoUpdater.checkForUpdates();
});

ipcMain.handle("restart-app", () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle("get-app-version", () => {
  return getAppVersion();
});

function initializeUpdater(win) {
  // Only update the window reference
  mainWindow = win;

  // Initial Check
  try {
    autoUpdater.checkForUpdates();
  } catch (e) {
    console.error("Failed to check for updates:", e);
  }
}

module.exports = { initializeUpdater };
