const { ipcMain, app } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Path to store manual connection config in User Data
const configPath = path.join(app.getPath("userData"), "connection-config.json");

function getDetailedNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const results = [];

  Object.entries(interfaces).forEach(([name, ifaceList]) => {
    ifaceList.forEach((iface) => {
      // Filter out internal (localhost) and non-IPv4
      if (!iface.internal && iface.family === "IPv4") {
        results.push({
          name: name,
          address: iface.address,
          type:
            name.toLowerCase().includes("wi-fi") ||
            name.toLowerCase().includes("wlan")
              ? "WiFi"
              : "Ethernet",
        });
      }
    });
  });
  return results;
}

function registerConnectionHandlers(ipcMain, mainWindow) {
  // Save Manual Connection String
  ipcMain.handle("set-manual-server", async (event, url) => {
    try {
      if (!url) {
        // If empty, delete the file to revert to auto-discovery
        if (fs.existsSync(configPath)) {
          fs.unlinkSync(configPath);
        }
        return { success: true };
      }

      let cleanUrl = url.trim();
      // Ensure protocol exists
      if (!cleanUrl.startsWith("http")) {
        cleanUrl = `http://${cleanUrl}`;
      }
      // Remove trailing slash for consistency
      cleanUrl = cleanUrl.replace(/\/$/, "");

      fs.writeFileSync(configPath, JSON.stringify({ manualUrl: cleanUrl }));
      return { success: true };
    } catch (error) {
      console.error("Failed to save connection config:", error);
      return { success: false, error: error.message };
    }
  });

  // Get Manual Connection String
  ipcMain.handle("get-manual-server", async () => {
    try {
      if (fs.existsSync(configPath)) {
        const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        return data.manualUrl || null;
      }
      return null;
    } catch (error) {
      return null;
    }
  });

  // Get Detailed Network Info
  ipcMain.handle("get-network-details", () => {
    return getDetailedNetworkInterfaces();
  });

  // Cloud Sync Handlers
  ipcMain.handle("connect-cloud-sync", async (event, businessId) => {
    try {
      const { connectCloudSync } = await import("../../backend/services/cloudSyncClient.mjs");
      connectCloudSync(businessId);
      return { success: true };
    } catch (error) {
      console.error("Failed to connect cloud sync:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("disconnect-cloud-sync", async (event) => {
    try {
      const { disconnectCloudSync } = await import("../../backend/services/cloudSyncClient.mjs");
      disconnectCloudSync();
      return { success: true };
    } catch (error) {
      console.error("Failed to disconnect cloud sync:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-cloud-sync-status", async () => {
    try {
      const { getCloudSyncStatus } = await import("../../backend/services/cloudSyncClient.mjs");
      return getCloudSyncStatus();
    } catch (error) {
      return false;
    }
  });

  // Setup emitter once
  import("../../backend/services/cloudSyncClient.mjs").then(({ cloudSyncEmitter }) => {
    cloudSyncEmitter.on("status-changed", (status) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("cloud-sync-status-changed", status);
      }
    });
  }).catch(console.error);
}

// Helper to read config synchronously (for main.js initialization)
function loadManualConfigSync() {
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      return data.manualUrl || null;
    }
  } catch (e) {
    console.error("Could not read manual connection config", e);
  }
  return null;
}

module.exports = { registerConnectionHandlers, loadManualConfigSync };
