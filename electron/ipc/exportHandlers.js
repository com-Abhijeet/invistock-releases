const { dialog, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const {
  getExportableSalesData,
  getSalesForPDFExport,
} = require("../../backend/repositories/salesRepository.mjs");
const {
  getAllCategories,
} = require("../../backend/repositories/categoryRepository.mjs");
const { generateExcelReport } = require("../generateExcelReport.js");
const { createInvoiceHTML } = require("../invoiceTemplate.js");

function registerExportHandlers(ipcMain, { mainWindow } = {}) {
  ipcMain.handle(
    "export-sales-to-excel",
    async (event, { startDate, endDate }) => {
      try {
        const { canceled, filePath } = await dialog.showSaveDialog({
          title: "Save Sales Report",
          defaultPath: `Sales-Report-${startDate}-to-${endDate}.xlsx`,
          filters: [{ name: "Excel Files", extensions: ["xlsx"] }],
        });

        if (canceled || !filePath)
          return { success: false, message: "Export cancelled." };

        const salesData = getExportableSalesData({ startDate, endDate });

        const result = await generateExcelReport(salesData, filePath, {
          reference_no: "Invoice No",
          invoice_date: "Date",
          customer_name: "Customer",
          product_name: "Product",
          quantity: "Qty",
          rate: "Rate",
          price: "Total Price",
        });

        return result;
      } catch (error) {
        console.error("Excel export failed:", error);
        return { success: false, error: "Failed to export Excel file." };
      }
    }
  );

  ipcMain.handle(
    "export-sales-to-pdfs",
    async (event, { startDate, endDate, shop }) => {
      try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
          title: "Select Folder to Save Invoices",
          properties: ["openDirectory"],
        });
        if (canceled || filePaths.length === 0)
          return { success: false, message: "Export cancelled." };
        const destFolder = filePaths[0];

        const sales = getSalesForPDFExport({ startDate, endDate });
        if (sales.length === 0)
          return {
            success: true,
            message: "No sales found in the selected period.",
          };

        for (const [index, sale] of sales.entries()) {
          event.sender.send("export-progress", {
            current: index + 1,
            total: sales.length,
            fileName: sale.reference_no,
          });
          const win = new BrowserWindow({ show: false });
          const htmlContent = createInvoiceHTML({ sale, shop });
          await win.loadURL(
            "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent)
          );
          const pdfBuffer = await win.webContents.printToPDF({
            printBackground: true,
          });
          const pdfPath = path.join(
            destFolder,
            `${sale.reference_no.replace(/\//g, "-")}.pdf`
          );
          await fs.promises.writeFile(pdfPath, pdfBuffer);
          win.close();
        }

        return {
          success: true,
          message: `${sales.length} invoices exported successfully.`,
        };
      } catch (error) {
        console.error("PDF export failed:", error);
        return { success: false, error: "Failed to export PDF files." };
      }
    }
  );

  ipcMain.handle("export-main-categories", async () => {
    try {
      const categoriesData = await getAllCategories();
      const mainCategories = categoriesData.map(({ id, name, code }) => ({
        id,
        name,
        code,
      }));
      const columnMap = {
        id: "Category Id",
        code: "Category Code",
        name: "Category Name",
      };
      const defaultFileName = `main_categories_${
        new Date().toISOString().split("T")[0]
      }`;
      return await generateExcelReport(
        mainCategories,
        defaultFileName,
        columnMap
      );
    } catch (error) {
      console.error("Failed to export main categories:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("export-all-subcategories", async () => {
    try {
      const categoriesData = await getAllCategories();
      const flattenedSubcategories = [];
      for (const category of categoriesData) {
        for (const sub of category.subcategories) {
          flattenedSubcategories.push({
            id: sub.id,
            subcategory_code: sub.code,
            subcategory_name: sub.name,
            parent_category_code: category.code,
            parent_category_name: category.name,
          });
        }
      }
      const columnMap = {
        id: "Subcategory Id",
        subcategory_code: "Subcategory Code",
        subcategory_name: "Subcategory Name",
        parent_category_code: "Parent Category Code",
        parent_category_name: "Parent Category Name",
      };
      const defaultFileName = `subcategories_${
        new Date().toISOString().split("T")[0]
      }`;
      return await generateExcelReport(
        flattenedSubcategories,
        defaultFileName,
        columnMap
      );
    } catch (error) {
      console.error("Failed to export subcategories:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "export-non-gst-sales-to-pdfs",
    async (event, { startDate, endDate }) => {
      try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
          title: "Select Folder to Save Receipts",
          properties: ["openDirectory"],
        });
        if (canceled || filePaths.length === 0)
          return { success: false, message: "Export cancelled." };
        const destFolder = filePaths[0];
        const shop = await (async () => {
          try {
            return require("../../backend/repositories/shopRepository.mjs").getShop();
          } catch {
            return null;
          }
        })();
        const sales =
          require("../../backend/repositories/nonGstSalesRepository.mjs").getNonGstSalesForPDFExport(
            { startDate, endDate }
          );
        if (sales.length === 0)
          return { success: true, message: "No sales found in this period." };
        for (const [index, sale] of sales.entries()) {
          event.sender.send("export-progress", {
            current: index + 1,
            total: sales.length,
            fileName: sale.reference_no,
          });
          const win = new BrowserWindow({ show: false });
          const htmlContent =
            require("../nonGstReceiptTemplate.js").createNonGstReceiptHTML(
              shop,
              sale,
              shop ? shop.invoice_printer_width_mm : undefined
            );
          await win.loadURL(
            "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent)
          );
          const pdfBuffer = await win.webContents.printToPDF({
            printBackground: true,
          });
          const pdfPath = path.join(
            destFolder,
            `${sale.reference_no.replace(/\//g, "-")}.pdf`
          );
          await fs.promises.writeFile(pdfPath, pdfBuffer);
          win.close();
        }
        return { success: true, message: `${sales.length} receipts exported.` };
      } catch (error) {
        console.error("Non-GST PDF export failed:", error);
        return { success: false, error: "Failed to export PDF files." };
      }
    }
  );

  ipcMain.handle(
    "export-non-gst-items-to-excel",
    async (event, { startDate, endDate }) => {
      try {
        const items =
          require("../../backend/repositories/nonGstSalesRepository.mjs").getNonGstSaleItemsForExport(
            { startDate, endDate }
          );
        if (items.length === 0)
          return { success: true, message: "No items found in this period." };
        const columnMap = {
          created_at: "Date",
          reference_no: "Reference No.",
          customer_name: "Customer",
          product_code: "Product Code",
          product_name: "Product Name",
          hsn: "HSN Code",
          quantity: "Quantity",
          rate: "Rate",
          discount: "Discount (%)",
          price: "Total Price",
        };
        const fileName = `Non-GST_Sales_Items_${startDate}_to_${endDate}`;
        return await generateExcelReport(items, fileName, columnMap);
      } catch (error) {
        console.error("Non-GST Excel export failed:", error);
        return { success: false, error: "Failed to export to Excel." };
      }
    }
  );
}

module.exports = { registerExportHandlers };
