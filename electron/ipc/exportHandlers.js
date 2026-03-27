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
const { getShop } = require("../../backend/repositories/shopRepository.mjs");
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

        let finalPath = filePath;
        if (finalPath.toLowerCase().endsWith(".xlsx")) {
          finalPath = finalPath.slice(0, -5);
        }

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

        // Fetch Shop config to determine Tax Calculations & Interstate status
        const shop = await getShop();
        const inclusiveTax = shop?.inclusive_tax_pricing === 1;
        const shopState = shop?.state || "";

        // Data Sanitization & Strict GST Mathematics
        const salesData = rawSalesData.map((row) => {
          const cleanRow = {};

          // Clean strings for Excel
          for (const key in row) {
            let val = row[key];
            if (val === null || val === undefined) {
              cleanRow[key] = "";
            } else if (typeof val === "string") {
              cleanRow[key] = val.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, "");
            } else if (typeof val === "number" && isNaN(val)) {
              cleanRow[key] = 0;
            } else {
              cleanRow[key] = val;
            }
          }

          if (exportType === "item") {
            const qty = Number(row.quantity) || 0;
            const retQty = Number(row.return_quantity) || 0;
            const netQty = qty - retQty;

            const rate = Number(row.rate) || 0;
            const discPct = Number(row.item_discount_percentage) || 0;
            const gstPct = Number(row.gst_rate) || 0;

            // Calculate base per-unit values
            const discountedRate = rate * (1 - discPct / 100);
            let unitTaxable, unitGst;

            if (inclusiveTax) {
              unitTaxable = discountedRate / (1 + gstPct / 100);
              unitGst = discountedRate - unitTaxable;
            } else {
              unitTaxable = discountedRate;
              unitGst = discountedRate * (gstPct / 100);
            }

            const isInterstate =
              shopState &&
              row.customer_state &&
              shopState.toLowerCase() !== row.customer_state.toLowerCase();

            // 1. ORIGINAL VALUES (Before Return)
            cleanRow.original_quantity = qty;
            cleanRow.original_taxable = Number((unitTaxable * qty).toFixed(2));
            cleanRow.original_gst = Number((unitGst * qty).toFixed(2));
            cleanRow.original_total = Number(
              ((unitTaxable + unitGst) * qty).toFixed(2),
            );

            // 2. RETURNED VALUES (Credit Note Impact)
            cleanRow.returned_quantity = retQty;
            cleanRow.returned_taxable = Number(
              (unitTaxable * retQty).toFixed(2),
            );
            cleanRow.returned_gst = Number((unitGst * retQty).toFixed(2));
            cleanRow.returned_total = Number(
              ((unitTaxable + unitGst) * retQty).toFixed(2),
            );

            // 3. NET VALUES (Actual realization after returns)
            cleanRow.net_quantity = netQty;
            cleanRow.net_taxable = Number((unitTaxable * netQty).toFixed(2));
            cleanRow.net_gst = Number((unitGst * netQty).toFixed(2));
            cleanRow.net_total = Number(
              ((unitTaxable + unitGst) * netQty).toFixed(2),
            );

            // CGST / SGST / IGST Breakup on NET Value
            if (isInterstate) {
              cleanRow.net_igst = cleanRow.net_gst;
              cleanRow.net_cgst = 0;
              cleanRow.net_sgst = 0;
            } else {
              cleanRow.net_igst = 0;
              cleanRow.net_cgst = Number((cleanRow.net_gst / 2).toFixed(2));
              cleanRow.net_sgst = Number((cleanRow.net_gst / 2).toFixed(2));
            }
          } else {
            // Header Export Logic
            const subtotal = Number(row.subtotal) || 0;
            const returnedAmt = Number(row.returned_amount) || 0;
            const billDisc = Number(row.bill_discount_percentage) || 0;

            cleanRow.bill_discount_amount = Number(
              (subtotal * (billDisc / 100)).toFixed(2),
            );
            cleanRow.original_grand_total = Number(row.bill_grand_total) || 0;

            const returnDisc = returnedAmt * (billDisc / 100);
            cleanRow.returned_grand_total = Number(
              (returnedAmt - returnDisc).toFixed(2),
            );
            cleanRow.net_grand_total = Number(
              (
                cleanRow.original_grand_total - cleanRow.returned_grand_total
              ).toFixed(2),
            );
          }

          return cleanRow;
        });

        let columnMap = {};

        if (exportType === "header") {
          columnMap = {
            reference_no: "Invoice No",
            invoice_date: "Date",
            customer_name: "Customer Name",
            customer_phone: "Phone",
            customer_state: "State of Supply",
            gstin: "GSTIN",
            subtotal: "Original Subtotal",
            bill_discount_amount: "Bill Discount",
            original_grand_total: "Original Grand Total",
            returned_grand_total: "Returned Amount",
            net_grand_total: "Net Grand Total (After Return)",
            paid_amount: "Paid Amount",
            payment_mode: "Payment Mode",
            status: "Status",
          };
        } else {
          columnMap = {
            reference_no: "Invoice No",
            invoice_date: "Date",
            customer_name: "Customer",
            customer_state: "State of Supply",
            gstin: "GSTIN",
            product_name: "Product",
            hsn: "HSN",
            rate: "Rate",
            gst_rate: "GST %",

            original_quantity: "Original Qty",
            original_taxable: "Original Taxable (₹)",
            original_gst: "Original GST (₹)",
            original_total: "Original Total (₹)",

            returned_quantity: "Returned Qty",
            returned_taxable: "Returned Taxable (₹)",
            returned_gst: "Returned GST (₹)",
            returned_total: "Returned Total (₹)",

            net_quantity: "Net Qty",
            net_taxable: "Net Taxable (₹)",
            net_cgst: "Net CGST (₹)",
            net_sgst: "Net SGST (₹)",
            net_igst: "Net IGST (₹)",
            net_total: "Net Final Total (₹)",

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
