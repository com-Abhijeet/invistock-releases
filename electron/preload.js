const { contextBridge, ipcRenderer } = require("electron");

// Keep a copy of the original console object
const originalConsole = { ...console };

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    send: (channel, data) => {
      const validSendChannels = ["print-label", "print-invoice", "log"];
      if (validSendChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    invoke: (channel, data) => {
      const validInvokeChannels = [
        "license-updated-restart-app",
        "generate-excel-report",
        "select-logo",
        "copy-product-image",
        "dialog:open-image",
        "backup-database",
        "restore-database",
        "get-printers",
        "dialog:open-file",
        "read-excel-file",
        "export-sales-to-excel",
        "export-sales-to-pdfs",
        "export-main-categories",
        "export-all-subcategories",
        "print-shipping-label",
        "print-non-gst-receipt",
        "print-customer-ledger",
        "export-non-gst-sales-to-pdfs",
        "export-non-gst-items-to-excel",
        "print-bulk-labels",

        // WhatsApp & External
        "whatsapp-get-status",
        "whatsapp-send-message",
        "whatsapp-send-invoice-pdf",
        "open-external-url",

        // Auth & Utils
        "login-admin",
        "dialog:open-directory",

        // Google Drive
        "gdrive-status",
        "gdrive-login",

        // ✅ Updater Channels (Must be whitelisted for the helper below to work)
        "check-for-updates",
        "get-app-version",
        "restart-app",
      ];
      if (validInvokeChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, data);
      } else {
        return Promise.reject(`Invalid invoke channel: ${channel}`);
      }
    },
    on: (channel, callback) => {
      const validReceiveChannels = [
        "export-progress",
        "whatsapp-status",
        "gdrive-connected",
        // ✅ Updater Events
        "update-available",
        "update-not-available",
        "update-progress",
        "update-downloaded",
        "update-error",
      ];
      if (validReceiveChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
      }
    },
    removeAllListeners: (channel) => {
      const validReceiveChannels = [
        "export-progress",
        "whatsapp-status",
        "gdrive-connected",
        // ✅ Updater Events
        "update-available",
        "update-not-available",
        "update-progress",
        "update-downloaded",
        "update-error",
      ];
      if (validReceiveChannels.includes(channel)) {
        ipcRenderer.removeAllListeners(channel);
      }
    },
  },

  // --- EXISTING HELPER FUNCTIONS ---
  onSetAppMode: (callback) => {
    ipcRenderer.on("set-app-mode", (event, mode) => callback(mode));
  },
  onSetServerUrl: (callback) => {
    ipcRenderer.on("set-server-url", (event, url) => {
      callback(url);
    });
  },
  getAppMode: () => ipcRenderer.invoke("get-app-mode"),
  getServerUrl: () => ipcRenderer.invoke("get-server-url"),
  getLocalIp: () => ipcRenderer.invoke("get-local-ip"),

  // --- WHATSAPP ---
  openExternalUrl: (url) => ipcRenderer.invoke("open-external-url", url),
  getWhatsAppStatus: () => ipcRenderer.invoke("whatsapp-get-status"),
  sendWhatsAppMessage: (phone, message) =>
    ipcRenderer.invoke("whatsapp-send-message", { phone, message }),
  onWhatsAppUpdate: (callback) =>
    ipcRenderer.on("whatsapp-status", (event, data) => callback(data)),
  sendWhatsAppInvoicePdf: (payload) =>
    ipcRenderer.invoke("whatsapp-send-invoice-pdf", payload),

  // --- AUTH & UTILS ---
  loginAdmin: (password) => ipcRenderer.invoke("login-admin", password),
  selectDirectory: () => ipcRenderer.invoke("dialog:open-directory"),
  getGDriveStatus: () => ipcRenderer.invoke("gdrive-status"),
  loginGDrive: () => ipcRenderer.invoke("gdrive-login"),
  onGDriveConnected: (callback) => ipcRenderer.on("gdrive-connected", callback),

  // ✅ UPDATER NAMESPACE (New)
  updater: {
    checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
    restartApp: () => ipcRenderer.invoke("restart-app"),
    getAppVersion: () => ipcRenderer.invoke("get-app-version"),

    // Listeners
    onUpdateAvailable: (callback) =>
      ipcRenderer.on("update-available", (_event, info) => callback(info)),
    onUpdateNotAvailable: (callback) =>
      ipcRenderer.on("update-not-available", (_event, info) => callback(info)),
    onUpdateError: (callback) =>
      ipcRenderer.on("update-error", (_event, error) => callback(error)),
    onDownloadProgress: (callback) =>
      ipcRenderer.on("update-progress", (_event, progressObj) =>
        callback(progressObj)
      ),
    onUpdateDownloaded: (callback) =>
      ipcRenderer.on("update-downloaded", (_event, info) => callback(info)),

    // Cleanup for updater events
    removeAllListeners: (channel) => {
      const validChannels = [
        "update-available",
        "update-not-available",
        "update-progress",
        "update-downloaded",
        "update-error",
      ];
      if (validChannels.includes(channel)) {
        ipcRenderer.removeAllListeners(channel);
      }
    },
  },
});

window.console = {
  ...originalConsole,
  log: (...args) => {
    originalConsole.log(...args);
    ipcRenderer.send("log", { level: "info", data: args });
  },
  info: (...args) => {
    originalConsole.info(...args);
    ipcRenderer.send("log", { level: "info", data: args });
  },
  warn: (...args) => {
    originalConsole.warn(...args);
    ipcRenderer.send("log", { level: "warn", data: args });
  },
  error: (...args) => {
    originalConsole.error(...args);
    ipcRenderer.send("log", { level: "error", data: args });
  },
};
