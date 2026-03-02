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
    async (event, { startDate, endDate, exportType = "item" }) => {
      try {
        const typeLabel = exportType === "header" ? "Register" : "Items";
        const { canceled, filePath } = await dialog.showSaveDialog({
          title: `Save Sales ${typeLabel} Report`,
          defaultPath: `Sales-${typeLabel}-${startDate}-to-${endDate}.xlsx`,
          filters: [{ name: "Excel Files", extensions: ["xlsx"] }],
        });

        if (canceled || !filePath)
          return { success: false, message: "Export cancelled." };

        // 1. Fix the ".xlsx.xlsx" double extension issue
        // The dialog adds .xlsx, but generateExcelReport likely adds it again internally.
        let finalPath = filePath;
        if (finalPath.toLowerCase().endsWith(".xlsx")) {
          finalPath = finalPath.slice(0, -5); // Strip the extension before passing
        }

        // 2. Fetch data
        const rawSalesData = getExportableSalesData({
          startDate,
          endDate,
          exportType,
        });

        if (!rawSalesData || rawSalesData.length === 0) {
          return {
            success: false,
            error: "No sales found in the selected period.",
          };
        }

        // 3. Data Sanitization (Fixes "Repair Broken File" in Excel)
        // Excel strictly rejects nulls, NaNs, and certain XML control characters.
        const salesData = rawSalesData.map((row) => {
          const cleanRow = {};
          for (const key in row) {
            let val = row[key];
            if (val === null || val === undefined) {
              cleanRow[key] = ""; // Convert nulls to empty strings
            } else if (typeof val === "string") {
              // Strip invalid XML control characters (often found in notes/descriptions)
              cleanRow[key] = val.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, "");
            } else if (typeof val === "number" && isNaN(val)) {
              cleanRow[key] = 0; // Prevent NaN crashes
            } else {
              cleanRow[key] = val;
            }
          }
          return cleanRow;
        });

        let columnMap = {};

        if (exportType === "header") {
          // Approach 2: Header Export (Sales Register for Accounting)
          columnMap = {
            reference_no: "Invoice No",
            invoice_date: "Date",
            customer_name: "Customer Name",
            customer_phone: "Phone",
            bill_address: "Billing Address",
            city: "City",
            state: "State",
            pincode: "Pincode",
            gstin: "GSTIN",
            subtotal: "Subtotal",
            bill_discount_percentage: "Bill Discount (%)",
            bill_discount_amount: "Bill Discount (Amt)",
            bill_round_off: "Round Off",
            bill_grand_total: "Grand Total",
            paid_amount: "Paid Amount",
            payment_mode: "Payment Mode",
            status: "Status",
            note: "Note",
            employee_id: "Staff ID",
          };
        } else {
          // Approach 1: Item Export (Inventory/Product Analysis)
          columnMap = {
            reference_no: "Invoice No",
            invoice_date: "Date",
            customer_name: "Customer",
            customer_phone: "Phone",
            bill_address: "Billing Address",
            city: "City",
            state: "State",
            pincode: "Pincode",
            gstin: "GSTIN",
            product_name: "Product",
            item_description: "Item Description",
            barcode: "Barcode",
            hsn: "HSN",
            quantity: "Qty",
            unit: "Unit",
            rate: "Rate",
            gst_rate: "GST %",
            item_discount_percentage: "Item Disc %",
            item_total: "Item Total",
            bill_discount_percentage: "Bill Disc %",
            bill_round_off: "Bill Round Off",
            bill_grand_total: "Bill Grand Total",
            payment_mode: "Payment Mode",
            status: "Status",
          };
        }

        const result = await generateExcelReport(
          salesData,
          finalPath,
          columnMap,
        );
        return result;
      } catch (error) {
        console.error("Excel export failed:", error);
        return { success: false, error: "Failed to export Excel file." };
      }
    },
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
            "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent),
          );
          const pdfBuffer = await win.webContents.printToPDF({
            printBackground: true,
          });
          const pdfPath = path.join(
            destFolder,
            `${sale.reference_no.replace(/\//g, "-")}.pdf`,
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
    },
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
        columnMap,
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
        columnMap,
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
            { startDate, endDate },
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
              shop ? shop.invoice_printer_width_mm : undefined,
            );
          await win.loadURL(
            "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent),
          );
          const pdfBuffer = await win.webContents.printToPDF({
            printBackground: true,
          });
          const pdfPath = path.join(
            destFolder,
            `${sale.reference_no.replace(/\//g, "-")}.pdf`,
          );
          await fs.promises.writeFile(pdfPath, pdfBuffer);
          win.close();
        }
        return { success: true, message: `${sales.length} receipts exported.` };
      } catch (error) {
        console.error("Non-GST PDF export failed:", error);
        return { success: false, error: "Failed to export PDF files." };
      }
    },
  );

  ipcMain.handle(
    "export-non-gst-items-to-excel",
    async (event, { startDate, endDate }) => {
      try {
        const items =
          require("../../backend/repositories/nonGstSalesRepository.mjs").getNonGstSaleItemsForExport(
            { startDate, endDate },
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
    },
  );
}

module.exports = { registerExportHandlers };
