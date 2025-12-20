const os = require("os");
const { machineIdSync } = require("node-machine-id");

function getLocalIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  Object.values(interfaces).forEach((ifaceList) => {
    ifaceList.forEach((iface) => {
      if (!iface.internal && iface.family === "IPv4") {
        ips.push(iface.address);
      }
    });
  });
  return ips;
}

function registerCoreHandlers(
  ipcMain,
  { getLastKnownServerUrl, getAppMode, mainWindow }
) {
  ipcMain.handle("get-app-mode", () => {
    return getAppMode();
  });

  ipcMain.handle("get-machine-id", () => {
    return machineIdSync();
  });

  ipcMain.handle("get-server-url", () => {
    return getLastKnownServerUrl();
  });

  ipcMain.handle("get-local-ip", () => {
    return getLocalIps();
  });

  ipcMain.on("log", (event, { level, data }) => {
    if (mainWindow && mainWindow.webContents) {
      // Mirror logs to main process console if needed
      console[level] ? console[level](...data) : console.log(...data);
    } else {
      console.log(...data);
    }
  });
}

module.exports = { registerCoreHandlers };
