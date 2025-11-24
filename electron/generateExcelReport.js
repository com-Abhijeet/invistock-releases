// electron/utils/generateExcelReport.js
const XLSX = require("xlsx");
const { dialog } = require("electron");
const fs = require("fs");

function generateExcelReport(data, defaultFileName, columnMap = null) {
  return new Promise(async (resolve) => {
    if (!Array.isArray(data) || data.length === 0) {
      return resolve({ success: false, error: "No data to export." });
    }

    // Optional column mapping: { keyInData: "Label in Excel" }
    const formattedData = columnMap
      ? data.map((row) => {
          const formatted = {};
          for (const key in columnMap) {
            formatted[columnMap[key]] = row[key] ?? "";
          }
          return formatted;
        })
      : data;

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Save Excel Report",
      defaultPath: `${defaultFileName}.xlsx`,
      filters: [
        { name: "Excel Files", extensions: ["xlsx"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (canceled || !filePath) {
      return resolve({ success: false, error: "Save cancelled by user" });
    }

    try {
      fs.writeFileSync(filePath, buffer);
      return resolve({ success: true, filePath });
    } catch (err) {
      return resolve({ success: false, error: err });
    }
  });
}

module.exports = { generateExcelReport };
