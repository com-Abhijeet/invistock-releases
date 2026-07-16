const os = require("os");
const { machineIdSync } = require("node-machine-id");
const Store = require('electron-store');
const store = new Store();

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

  ipcMain.handle("get-store-val", (e, key) => store.get(key));
  ipcMain.handle("set-store-val", (e, key, val) => store.set(key, val));

}

module.exports = { registerCoreHandlers };
