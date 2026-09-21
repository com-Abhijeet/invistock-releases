const electron = require("electron");
const app = electron?.app || electron;
const path = require("path");
const fs = require("fs");

let exeDir = process.cwd();
let isPackaged = false;
let defaultUserData = path.join(process.cwd(), "userData");

if (app && typeof app.getPath === "function") {
  try {
    exeDir = path.dirname(app.getPath("exe"));
    defaultUserData = app.getPath("userData");
    isPackaged = app.isPackaged || false;
  } catch (e) {
    exeDir = process.cwd();
  }
}

// --- 1. PORTABLE/CLIENT MODE DETECTION ---
const isPortable = fs.existsSync(path.join(exeDir, "portable.dat"));
const isClientMode = fs.existsSync(path.join(exeDir, "client.dat"));

// --- 2. DETERMINE THE USER DATA PATH ---
const useLocalUserData = isPortable || isClientMode;
const userDataPath = useLocalUserData
  ? path.join(exeDir, "userData")
  : defaultUserData;

// --- 3. EXPORT THE CONFIGURATION OBJECT ---
const config = {
  isDev: !isPackaged,
  isPortable,
  isClientMode,
  paths: {
    userData: userDataPath,
    database: path.join(userDataPath, "database.db"),
    logs: path.join(userDataPath, "logs"),
    images: path.join(userDataPath, "images"),
  },
  logLevel: "info",
};

module.exports = config;
