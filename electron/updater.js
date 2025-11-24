const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const { ipcMain } = require("electron");

// 1. Configure Logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";

// 2. Configuration
// Automatically download updates in the background (true is recommended)
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow = null;

function sendStatusToWindow(channel, text) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, text);
  }
}

function initializeUpdater(win) {
  mainWindow = win;

  // --- Event Listeners ---

  // 1. Checking for updates
  autoUpdater.on("checking-for-update", () => {
    log.info("Checking for update...");
    // Optional: sendStatusToWindow('update-message', 'Checking for updates...');
  });

  // 2. Update Available
  autoUpdater.on("update-available", (info) => {
    log.info("Update available.");
    sendStatusToWindow("update-available", info);
  });

  // 3. Update Not Available
  autoUpdater.on("update-not-available", (info) => {
    log.info("Update not available.");
    // Optional: sendStatusToWindow('update-not-available', info);
  });

  // 4. Error
  autoUpdater.on("error", (err) => {
    log.error("Error in auto-updater. " + err);
    sendStatusToWindow("update-error", err.toString());
  });

  // 5. Download Progress
  autoUpdater.on("download-progress", (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + " - Downloaded " + progressObj.percent + "%";
    log.info(log_message);
    sendStatusToWindow("update-progress", progressObj);
  });

  // 6. Update Downloaded (Ready to Install)
  autoUpdater.on("update-downloaded", (info) => {
    log.info("Update downloaded");
    sendStatusToWindow("update-downloaded", info);
  });

  // --- IPC Handlers ---

  // Allow frontend to manually check for updates (e.g. from Settings page)
  ipcMain.handle("check-for-updates", () => {
    autoUpdater.checkForUpdatesAndNotify();
  });

  // Allow frontend to trigger the restart
  ipcMain.handle("restart-app", () => {
    autoUpdater.quitAndInstall();
  });

  // --- Initial Check ---
  // Check for updates immediately on startup
  try {
    autoUpdater.checkForUpdatesAndNotify();
  } catch (e) {
    console.error("Failed to check for updates:", e);
  }
}

module.exports = { initializeUpdater };
