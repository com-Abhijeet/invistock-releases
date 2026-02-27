const { BrowserWindow, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const templates = require("./reportTemplate");

/**
 * Helper to convert JSON data to HTML based on report type
 */
function buildHtmlFromData(type, data, meta) {
  const shopName = meta.shopName;
  const period = meta.period || null;

  switch (type) {
    case "pnl":
      return templates.generatePnLTemplate(data, period, shopName);
    case "stock_summary":
      return templates.generateStockSummaryTemplate(data, period, shopName);
    case "stock":
      return templates.generateStockValuationTemplate(data, shopName);
    case "customer_ledger":
      return templates.generateLedgerTemplate(
        data,
        "Customer Ledger",
        meta.entityName,
        period,
        shopName,
      );
    case "supplier_ledger":
      return templates.generateLedgerTemplate(
        data,
        "Supplier Ledger",
        meta.entityName,
        period,
        shopName,
      );
    case "cash_book":
      return templates.generateLedgerTemplate(
        data,
        "Cash Book",
        "Cash Account",
        period,
        shopName,
      );
    case "bank_book":
      return templates.generateLedgerTemplate(
        data,
        "Bank Book",
        "Bank Account",
        period,
        shopName,
      );
    default:
      return "<h1>Unknown Report Type</h1>";
  }
}

/**
 * Creates a hidden window and processes the PDF/Print
 */
async function processReport(type, data, meta, action) {
  return new Promise(async (resolve) => {
    try {
      const htmlContent = buildHtmlFromData(type, data, meta);

      // Write temp file for loading
      const tempFile = path.join(os.tmpdir(), `report-${Date.now()}.html`);
      fs.writeFileSync(tempFile, htmlContent);

      const win = new BrowserWindow({
        show: false, // Keep hidden!
        width: 800,
        height: 600,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });

      await win.loadFile(tempFile);

      if (action === "pdf") {
        // Export to PDF flow
        const { canceled, filePath } = await dialog.showSaveDialog({
          title: "Save PDF Report",
          defaultPath: `${meta.fileName || "Report"}.pdf`,
          filters: [{ name: "PDF Files", extensions: ["pdf"] }],
        });

        if (canceled || !filePath) {
          win.close();
          return resolve({ success: false, error: "Cancelled by user" });
        }

        const pdfBuffer = await win.webContents.printToPDF({
          printBackground: true,
          pageSize: "A4",
          landscape: false,
          marginsType: 1, // No Margin (handled by CSS)
        });

        fs.writeFileSync(filePath, pdfBuffer);
        resolve({ success: true, filePath });
      } else if (action === "print") {
        // Direct Print Flow
        win.webContents.print(
          { silent: false, printBackground: true },
          (success, err) => {
            if (!success) resolve({ success: false, error: err });
            else resolve({ success: true });
          },
        );
      }

      // Cleanup
      setTimeout(() => {
        if (!win.isDestroyed()) win.close();
        fs.unlink(tempFile, () => {});
      }, 2000);
    } catch (err) {
      console.error("Report generation failed:", err);
      resolve({ success: false, error: err.message });
    }
  });
}

module.exports = { processReport };
