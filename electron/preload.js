const { contextBridge, ipcRenderer } = require("electron");

// Keep a copy of the original console object
const originalConsole = { ...console };

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    send: (channel, data) => {
      const validSendChannels = ["print-label", "print-invoice"];
      if (validSendChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    invoke: (channel, data) => {
      const validInvokeChannels = [
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
        // ✅ Added WhatsApp & External URL channels
        "whatsapp-get-status",
        "whatsapp-send-message",
        "open-external-url",
        // ✅ Ensure these are present for Auth/Backup features
        "login-admin",
        "dialog:open-directory",
        "gdrive-status",
        "gdrive-login",
        // UPDATE
        "update-available",
        "update-progress",
        "update-downloaded",
        "update-error",
      ];
      if (validInvokeChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, data);
      } else {
        return Promise.reject(`Invalid invoke channel: ${channel}`);
      }
    },
    on: (channel, callback) => {
      // ✅ Added 'whatsapp-status' to whitelist
      const validReceiveChannels = ["export-progress", "whatsapp-status"];
      if (validReceiveChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
      }
    },
    // ✅ ADD THIS CLEANUP METHOD
    removeAllListeners: (channel) => {
      // ✅ Added 'whatsapp-status' to whitelist
      const validReceiveChannels = ["export-progress", "whatsapp-status"];
      if (validReceiveChannels.includes(channel)) {
        ipcRenderer.removeAllListeners(channel);
      }
    },
  },
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

  // ✅ WHATSAPP SPECIFIC FUNCTIONS
  openExternalUrl: (url) => ipcRenderer.invoke("open-external-url", url),
  getWhatsAppStatus: () => ipcRenderer.invoke("whatsapp-get-status"),
  sendWhatsAppMessage: (phone, message) =>
    ipcRenderer.invoke("whatsapp-send-message", { phone, message }),
  onWhatsAppUpdate: (callback) =>
    ipcRenderer.on("whatsapp-status", (event, data) => callback(data)),

  sendWhatsAppInvoicePdf: (payload) =>
    ipcRenderer.invoke("whatsapp-send-invoice-pdf", payload),

  // ✅ AUTH & UTILS (Restored)
  loginAdmin: (password) => ipcRenderer.invoke("login-admin", password),
  selectDirectory: () => ipcRenderer.invoke("dialog:open-directory"),

  getGDriveStatus: () => ipcRenderer.invoke("gdrive-status"),
  loginGDrive: () => ipcRenderer.invoke("gdrive-login"),
  onGDriveConnected: (callback) => ipcRenderer.on("gdrive-connected", callback),

  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  restartApp: () => ipcRenderer.invoke("restart-app"),
});

window.console = {
  ...originalConsole, // Keep original functions like .table, .clear, etc.

  log: (...args) => {
    originalConsole.log(...args); // Keep logging to DevTools
    ipcRenderer.send("log", { level: "info", data: args }); // Send to main process
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
