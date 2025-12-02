const { app } = require("electron");
const path = require("path");
const fs = require("fs");

// --- 1. PORTABLE/CLIENT MODE DETECTION ---
const exeDir = path.dirname(app.getPath("exe"));
const isPortable = fs.existsSync(path.join(exeDir, "portable.dat"));
const isClientMode = fs.existsSync(path.join(exeDir, "client.dat")); // ✅ Check for client mode
// const isClientMode = true;
// --- 2. DETERMINE THE USER DATA PATH ---
// If in portable or client mode, set the data path to a local 'userData' folder.
// Otherwise, use Electron's default 'roaming/appData' path.
const useLocalUserData = isPortable || isClientMode;
const userDataPath = useLocalUserData
  ? path.join(exeDir, "userData")
  : app.getPath("userData");

// --- 3. EXPORT THE CONFIGURATION OBJECT ---
// This object is the single source of truth for the entire application.
const config = {
  isDev: !app.isPackaged,
  isPortable,
  isClientMode, // ✅ Export the new mode
  paths: {
    userData: userDataPath,
    database: path.join(userDataPath, "database.db"),
    logs: path.join(userDataPath, "logs"),
    images: path.join(userDataPath, "images"),
  },
  logLevel: "info",
};

// Log the configuration on startup for easy debugging
// console.log("App Config Loaded:", JSON.stringify(config, null, 2));

module.exports = config;
