const { BrowserWindow } = require("electron");
const { getShop } = require("../../backend/repositories/shopRepository.mjs");
const { printBulkLabels } = require("../bulkLabelPrinter.js");
const { createPrintWindow } = require("../printLabel.js");
const { printInvoice } = require("../invoicePrinter.js");
const { createShippingLabelHTML } = require("../shippingLabelTemplate.js");
const { printShippingLabel } = require("../shippingLabelPrinter.js");
const { createNonGstReceiptHTML } = require("../nonGstReceiptTemplate.js");
const { printNonGstReceipt } = require("../nonGstPrinter.js");
const {
  getCustomerLedger,
} = require("../../backend/repositories/customerRepository.mjs");
const { createCustomerLedgerHTML } = require("../customerLedgerTemplate.js");

function registerPrintHandlers(ipcMain, { mainWindow } = {}) {
  ipcMain.handle("print-bulk-labels", async (event, items) => {
    try {
      const shop = await getShop();
      if (!shop) throw new Error("Shop settings not found");
      await printBulkLabels(items, shop, shop.label_printer_width_mm);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.on("print-label", async (event, payload) => {
    try {
      console.log("🖨️ Printing label for product:", payload.product.name);
      await createPrintWindow(payload);
    } catch (err) {
      console.error("❌ Label printing failed:", err);
    }
  });

  ipcMain.on("print-invoice", async (event, payload) => {
    try {
      console.log("🖨️ Printing invoice for sale:", payload.sale.reference_no);
      await printInvoice(payload);
    } catch (err) {
      console.error("❌ Invoice printing failed:", err);
    }
  });

  ipcMain.handle("print-shipping-label", async (event, saleData) => {
    try {
      const shop = await getShop();
      if (!shop)
        throw new Error(
          "Shop settings not found. Cannot print 'From' address."
        );
      const html = await createShippingLabelHTML(
        shop,
        saleData,
        shop.invoice_printer_width_mm
      );
      const printOptions = {
        silent: shop.silent_printing === 1,
        deviceName: shop.invoice_printer_name || undefined,
      };
      await printShippingLabel(html, printOptions);
      return { success: true };
    } catch (error) {
      console.error("Failed to print shipping label:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("print-non-gst-receipt", async (event, saleData) => {
    try {
      const shop = await getShop();
      if (!shop) throw new Error("Shop settings not found.");
      const printerWidth = shop.invoice_printer_width_mm || 80;
      const printerName = shop.invoice_printer_name || undefined;
      const html = await createNonGstReceiptHTML(shop, saleData, printerWidth);
      const printOptions = {
        silent: shop.silent_printing === 1,
        deviceName: printerName,
      };
      await printNonGstReceipt(html, printOptions);
      return { success: true };
    } catch (error) {
      console.error("Failed to print non-GST receipt:", error);
      return {
        success: false,
        error: error.message || "An unknown error occurred during printing.",
      };
    }
  });

  ipcMain.handle(
    "print-customer-ledger",
    async (event, { customerId, filters }) => {
      try {
        const shop = await getShop();
        const { customer, ledger } = getCustomerLedger(customerId, filters);
        const htmlContent = createCustomerLedgerHTML(shop, customer, ledger);
        const win = new BrowserWindow({ show: true });
        await win.loadURL(
          `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
        );
        win.webContents.on("did-finish-load", () => {
          win.webContents.print({ silent: false }, (success, error) => {
            if (!success) console.error("Ledger print failed:", error);
            win.close();
          });
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to print customer ledger:", error);
        return {
          success: false,
          error: error.message || "An unknown error occurred.",
        };
      }
    }
  );
}

module.exports = { registerPrintHandlers };
