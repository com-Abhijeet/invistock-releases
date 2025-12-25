/**
 * ===================================================================
 * Main Electron Process (main.js)
 * ===================================================================
 */

// 1. MODULE IMPORTS
// ===============================================================
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  protocol,
  shell,
} = require("electron");

const os = require("os");
const path = require("path");
const fs = require("fs");
const log = require("electron-log");
const logger = require("./logger.js");
const xlsx = require("xlsx");
const { Bonjour } = require("bonjour-service");
const http = require("http");

const {
  getAuthUrl,
  handleAuthCallback,
  uploadBackup,
  isConnected,
} = require("./googleDriveService.js");
const { initializeLicenseHandlers } = require("./ipc/licenseHandlers.js");
const { createPrintWindow } = require("./printWindow.js");
const { printInvoice } = require("./invoicePrinter.js");
const { generateExcelReport } = require("./generateExcelReport.js");
const { createInvoiceHTML } = require("./invoiceTemplate.js");
const { copyProductImage, copyLogoImage } = require("./handleImageCopy.js");
const { createShippingLabelHTML } = require("./shippingLabelTemplate.js");
const { printShippingLabel } = require("./shippingLabelPrinter.js");
const { checkAppLicense } = require("../backend/services/licenseService.mjs");
const { createNonGstReceiptHTML } = require("./nonGstReceiptTemplate.js");
const { printNonGstReceipt } = require("./nonGstPrinter.js");
const { printBulkLabels } = require("./bulkLabelPrinter.js");
const {
  getCustomerLedger,
} = require("../backend/repositories/customerRepository.mjs");
const { createCustomerLedgerHTML } = require("./customerLedgerTemplate.js");
const {
  getNonGstSalesForPDFExport,
  getNonGstSaleItemsForExport,
} = require("../backend/repositories/nonGstSalesRepository.mjs");
const {
  initializeWhatsApp,
  sendWhatsAppMessage,
  getWhatsAppStatus,
  sendWhatsAppPdf,
} = require("./whatsappService");
const { initializeUpdater } = require("./updater.js");
// ✅ Import new Connection Handlers
const {
  registerConnectionHandlers,
  loadManualConfigSync,
} = require("./ipc/connectionHandlers.js");

const config = require("./config.js");
app.disableHardwareAcceleration();

app.commandLine.appendSwitch("ignore-certificate-errors");
app.commandLine.appendSwitch("allow-insecure-localhost", "true");

const dbPath = config.paths.database;
let lastKnownServerUrl = null;
let lastKnownAppMode = config.isClientMode ? "client" : "server";
let mainWindow = null;
let isQuitting = false;

const { startServer, shutdownBackend } = require("../backend/index.mjs");
const {
  getExportableSalesData,
  getSalesForPDFExport,
} = require("../backend/repositories/salesRepository.mjs");
const {
  getAllCategories,
} = require("../backend/repositories/categoryRepository.mjs");
const { machineIdSync } = require("node-machine-id");

function createLicenseWindow() {
  const licenseWin = new BrowserWindow({
    minWidth: 1100,
    minHeight: 700,
    width: 1280,
    height: 800,
    resizable: true,
    autoHideMenuBar: true,
    title: "Activate KOSH",
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  licenseWin.webContents.on("did-finish-load", () => {
    licenseWin.webContents.send("set-app-mode", "server");
  });
  const licenseUrl = config.isDev
    ? "http://localhost:5173/#/license"
    : `file://${path.join(__dirname, "..", "dist", "index.html")}#/license`;
  licenseWin.loadURL(licenseUrl);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: "KOSH - Inventory Management",
    icon: path.join(__dirname, "..", "assets", "icon.ico"),
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.webContents.on("did-finish-load", () => {
    const appMode = config.isClientMode ? "client" : "server";
    mainWindow.webContents.send("set-app-mode", appMode);

    // If we already found a server (manual or bonjour) before window loaded, send it now
    if (lastKnownServerUrl) {
      mainWindow.webContents.send("set-server-url", lastKnownServerUrl);
    }

    [0, 500, 1500, 3000].forEach((delay) =>
      setTimeout(() => {
        if (!mainWindow.isDestroyed())
          mainWindow.webContents.send("set-app-mode", appMode);
      }, delay)
    );
  });

  initializeWhatsApp(mainWindow);
  
  if (config.isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    initializeUpdater(mainWindow);
  });
}

app.whenReady().then(() => {
  console.log("🟢 App is ready. User data path:", app.getPath("userData"));

  // Register license handlers early
  initializeLicenseHandlers();

  if (config.isClientMode) {
    createWindow();

    // ✅ 1. Check for Manual Configuration FIRST
    const manualServer = loadManualConfigSync();

    if (manualServer) {
      console.log("🔵 Using Manual Server URL:", manualServer);
      lastKnownServerUrl = manualServer;

      // Retry sending to window a few times to ensure it receives it after load
      [0, 500, 1500, 3000].forEach((delay) =>
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed())
            mainWindow.webContents.send("set-server-url", manualServer);
        }, delay)
      );
    } else {
      // ✅ 2. Fallback to Bonjour Discovery
      console.log("🔵 Starting Bonjour Discovery...");
      const bonjour = new Bonjour();
      const browser = bonjour.find({ type: "https" }, (service) => {
        if (service.name === "KOSH-Main-Server") {
          const serverUrl = `https://${service.host}:${service.port}`;
          lastKnownServerUrl = serverUrl;
          console.log("🔵 Bonjour discovered server:", serverUrl);

          [0, 500, 1500, 3000].forEach((delay) =>
            setTimeout(() => {
              if (mainWindow && !mainWindow.isDestroyed())
                mainWindow.webContents.send("set-server-url", serverUrl);
            }, delay)
          );
          browser.stop();
        }
      });
    }
  } else {
    // Server Mode Startup
    let serverStarted = false;
    try {
      startServer(dbPath);
      serverStarted = true;
    } catch (err) {
      console.error(
        "[CRITICAL] Backend failed to start (ignoring for fresh install):",
        err
      );
    }

    let licenseStatus = { status: "invalid" };
    try {
      licenseStatus = checkAppLicense();
    } catch (e) {
      console.warn(
        "License check failed (expected on fresh install):",
        e.message
      );
    }

    if (
      serverStarted &&
      (licenseStatus.status === "valid" ||
        licenseStatus.status === "grace_period")
    ) {
      createWindow();
    } else {
      createLicenseWindow();
    }
  }

  // Register grouped IPC handlers (use getters for dynamic values)
  const { registerCoreHandlers } = require("./ipc/coreHandlers.js");
  const { registerGDriveHandlers } = require("./ipc/gdriveHandlers.js");
  const { registerFileDialogHandlers } = require("./ipc/fileDialogHandlers.js");
  const { registerBackupHandlers } = require("./ipc/backupHandlers.js");
  const { registerPrintHandlers } = require("./ipc/printHandlers.js");
  const { registerExportHandlers } = require("./ipc/exportHandlers.js");
  const { registerWhatsAppHandlers } = require("./ipc/whatsappHandlers.js");

  registerCoreHandlers(ipcMain, {
    getLastKnownServerUrl: () => lastKnownServerUrl,
    getAppMode: () => lastKnownAppMode,
    mainWindow,
  });

  // ✅ Register the new Connection Handlers
  registerConnectionHandlers(ipcMain);

  registerGDriveHandlers(ipcMain, { mainWindow });
  registerFileDialogHandlers(ipcMain, { mainWindow });
  registerBackupHandlers(ipcMain, { dbPath, app });
  registerPrintHandlers(ipcMain, { mainWindow });
  registerExportHandlers(ipcMain, { mainWindow });
  registerWhatsAppHandlers(ipcMain);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (!config.isClientMode) {
      try {
        shutdownBackend();
      } catch (e) {
        console.error("[ELECTRON] : ERROR IN SHUTTING DOWN", e);
      }
    }
    app.quit();
  }
});

app.on("before-quit", async (event) => {
  if (isQuitting) {
    return;
  }
  event.preventDefault();
  isQuitting = true;

  if (!config.isClientMode) {
    console.log("--- Application Shutting Down ---");

    try {
      const { isConnected, uploadBackup } = require("./googleDriveService.js");
      if (isConnected()) {
        const date = new Date().toISOString().split("T")[0];
        const backupFileName = `KOSH-Backup-${date}.db`;
        console.log("[GDRIVE] Uploading backup...");
        try {
          await uploadBackup(dbPath, backupFileName);
          console.log("[GDRIVE] Upload complete.");
        } catch (backupError) {
          console.error("[GDRIVE] Upload failed:", backupError.message);
        }
      } else {
        console.log("[GDRIVE] Not connected. Skipping backup.");
      }
      shutdownBackend();
    } catch (error) {
      console.error("[SHUTDOWN] Error during shutdown:", error);
    } finally {
      app.quit();
    }
  } else {
    app.quit();
  }
});

module.exports = {};
