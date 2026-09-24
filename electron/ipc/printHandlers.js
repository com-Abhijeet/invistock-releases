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
// ✅ Import Supplier Repository and Template
const {
  getSupplierLedger,
} = require("../../backend/repositories/supplierRepository.mjs");
const { createSupplierLedgerHTML } = require("../supplierLedgerTemplate.js");
const { processReport } = require("../reports/reportPrintHandler.js");
const {
  createTransactionReceiptHTML,
} = require("../transactionPrintTemplate.js");
const { printCheck } = require("../checkPrinter.js");

const {
  ensureCustomTemplateDirectories,
  getCustomFolderTemplateContent,
} = require("../templates/customTemplateLoader.js");

function registerPrintHandlers(ipcMain, { mainWindow } = {}) {
  ipcMain.handle("print-bulk-labels", async (event, items) => {
    try {
      const shop = await getShop();
      if (!shop) throw new Error("Shop settings not found");

      let localSettings = {};
      try {
        if (shop.app_print_settings) {
          localSettings = JSON.parse(shop.app_print_settings);
        }
      } catch (e) {}

      const folderPrnTemplate = getCustomFolderTemplateContent("barcode");
      const prnContent = folderPrnTemplate || localSettings.custom_prn_template_content;
      const usePrn = folderPrnTemplate || localSettings.use_custom_prn_template;

      if (usePrn && prnContent) {
        const { renderPRNLabels } = require("../templates/prnLabelEngine.js");
        const { sendRawToPrinter } = require("../utils/rawPrinter.js");
        const rawPrnOutput = renderPRNLabels(
          prnContent,
          items,
          shop,
          {
            multiUp: localSettings.label_multi_up || 1,
            cipherKey: localSettings.cipher_key || "MONEYTALKS",
          },
        );
        console.log("🖨️ Custom .PRN barcode generated:", rawPrnOutput.slice(0, 100));
        const printerName = shop.label_printer_name?.trim();
        const rawResult = await sendRawToPrinter(printerName, rawPrnOutput);
        return rawResult;
      }

      await printBulkLabels(items, shop, shop.label_printer_width_mm);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.on("print-label", async (event, payload) => {
    try {
      const targetName =
        payload?.product?.name || payload?.items?.[0]?.product?.name || "Label";
      console.log("🖨️ Printing label for product:", targetName);
      await createPrintWindow(payload);
    } catch (err) {
      console.error("❌ Label printing failed:", err);
    }
  });

  ipcMain.on("print-invoice", async (event, payload) => {
    try {
      console.log("🖨️ Printing invoice for sale:", payload?.sale?.reference_no);
      const folderTemplate = getCustomFolderTemplateContent("invoice");
      const customInvoiceTemplate =
        folderTemplate ||
        payload?.localSettings?.custom_invoice_template_content;
      const useCustomTemplate =
        folderTemplate ||
        payload?.localSettings?.use_custom_invoice_template;

      if (customInvoiceTemplate && useCustomTemplate) {
        const {
          renderCustomInvoiceHTML,
        } = require("../templates/invoiceHandlebarsEngine.js");
        const renderedHtml = renderCustomInvoiceHTML(
          customInvoiceTemplate,
          payload,
        );
        const { printCustomInvoice } = require("../invoicePrinter.js");
        await printCustomInvoice(renderedHtml, payload);
        return;
      }

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
          "Shop settings not found. Cannot print 'From' address.",
        );
      const html = await createShippingLabelHTML(
        shop,
        saleData,
        shop.invoice_printer_width_mm,
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

        // ✅ FIX: Attach listener BEFORE loading the URL so did-finish-load fires reliably
        win.webContents.on("did-finish-load", () => {
          win.webContents.print({ silent: false }, (success, error) => {
            if (!success) console.error("Ledger print failed:", error);
            win.close();
          });
        });

        await win.loadURL(
          `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`,
        );
        return { success: true };
      } catch (error) {
        console.error("Failed to print customer ledger:", error);
        return {
          success: false,
          error: error.message || "An unknown error occurred.",
        };
      }
    },
  );

  // ✅ New Handler for Supplier Ledger
  ipcMain.handle(
    "print-supplier-ledger",
    async (event, { supplierId, filters }) => {
      try {
        const shop = await getShop();
        const { supplier, ledger } = getSupplierLedger(supplierId, filters);
        const htmlContent = createSupplierLedgerHTML(shop, supplier, ledger);
        const win = new BrowserWindow({ show: true });

        // ✅ FIX: Attach listener BEFORE loading the URL so did-finish-load fires reliably
        win.webContents.on("did-finish-load", () => {
          win.webContents.print({ silent: false }, (success, error) => {
            if (!success) console.error("Supplier ledger print failed:", error);
            win.close();
          });
        });

        await win.loadURL(
          `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`,
        );
        return { success: true };
      } catch (error) {
        console.error("Failed to print supplier ledger:", error);
        return {
          success: false,
          error: error.message || "An unknown error occurred.",
        };
      }
    },
  );

  ipcMain.handle("process-report", async (event, type, data, meta, action) => {
    return await processReport(type, data, meta, action);
  });

  ipcMain.handle("print-transaction", async (event, payload) => {
    try {
      const shop = await getShop();
      if (!shop) throw new Error("Shop settings not found");

      const htmlContent = createTransactionReceiptHTML({ shop, ...payload });
      const win = new BrowserWindow({ show: true });

      // ✅ FIX: Attach listener BEFORE loading the URL
      win.webContents.on("did-finish-load", () => {
        // Force silent: false so the user can select their A4/A5 printer vs Thermal printer
        win.webContents.print({ silent: false }, (success, error) => {
          if (!success) console.error("Transaction print failed:", error);
          win.close();
        });
      });

      await win.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`,
      );
      return { success: true };
    } catch (error) {
      console.error("Failed to print transaction:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("print-check", async (event, payload) => {
    try {
      await printCheck(payload);
      return { success: true };
    } catch (error) {
      console.error("Failed to print check:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerPrintHandlers };
