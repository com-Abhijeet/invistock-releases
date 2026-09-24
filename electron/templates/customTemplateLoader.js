/**
 * customTemplateLoader.js
 * Utility to locate and load custom templates from custom_templates/ folder.
 */

const fs = require("fs");
const path = require("path");

function ensureCustomTemplateDirectories() {
  try {
    let appDataDir = "";
    try {
      const { app } = require("electron");
      appDataDir = app ? app.getPath("userData") : "";
    } catch (e) {}

    const targetBase =
      appDataDir ||
      (process.env.APPDATA ? path.join(process.env.APPDATA, "kosh") : "");

    if (!targetBase) return;

    const invDir = path.join(targetBase, "custom_templates", "invoices");
    const barDir = path.join(targetBase, "custom_templates", "barcodes");
    const lblDir = path.join(targetBase, "custom_templates", "labels");

    if (!fs.existsSync(invDir)) fs.mkdirSync(invDir, { recursive: true });
    if (!fs.existsSync(barDir)) fs.mkdirSync(barDir, { recursive: true });
    if (!fs.existsSync(lblDir)) fs.mkdirSync(lblDir, { recursive: true });
  } catch (err) {
    console.error("Failed to ensure custom template directories:", err);
  }
}

function getCustomFolderTemplateContent(type) {
  ensureCustomTemplateDirectories();

  const folderNames = type === "invoice" ? ["invoices"] : ["barcodes", "labels"];
  const ext = type === "invoice" || type === "label_html" ? ".html" : ".prn";
  const rootDir = process.cwd();

  let appDataDir = "";
  try {
    const { app } = require("electron");
    appDataDir = app ? app.getPath("userData") : "";
  } catch (e) {}

  const baseDirs = [
    appDataDir ? path.join(appDataDir, "custom_templates") : null,
    process.env.APPDATA
      ? path.join(process.env.APPDATA, "kosh", "custom_templates")
      : null,
    path.join(rootDir, "custom_templates"),
  ].filter(Boolean);

  for (const baseDir of baseDirs) {
    for (const folderName of folderNames) {
      const dirPath = path.join(baseDir, folderName);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(ext));
        if (files.length > 0) {
          const filePath = path.join(dirPath, files[0]);
          console.log(`📁 Loaded custom ${type} template from folder:`, filePath);
          return fs.readFileSync(filePath, "utf-8");
        }
      }
    }
  }
  return null;
}

module.exports = {
  ensureCustomTemplateDirectories,
  getCustomFolderTemplateContent,
};
