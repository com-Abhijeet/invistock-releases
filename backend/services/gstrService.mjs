import * as gstrRepository from "../repositories/gstrRepository.mjs";

/**
 * @description Validates the filing period and orchestrates the fetching of GSTR-1 report data.
 * @param {object} params - The period for the report.
 * @param {'month'|'quarter'|'year'} params.periodType - The type of period.
 * @param {string|number} params.year - The year (e.g., 2025).
 * @param {string|number} [params.month] - The month (1-12), required for periodType 'month'.
 * @param {string|number} [params.quarter] - The quarter (1-4), required for periodType 'quarter'.
 * @returns {Promise<object>} The complete GSTR-1 report data.
 * @throws {Error} Throws an error with a status code for validation failures.
 */
export async function getGstr1ReportService({
  periodType,
  year,
  month,
  quarter,
}) {
  // --- Validation ---
  const yearNum = parseInt(year, 10);
  if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
    const err = new Error("Invalid 'year' parameter.");
    err.statusCode = 400;
    throw err;
  }

  if (!["month", "quarter", "year"].includes(periodType)) {
    const err = new Error(
      "Invalid 'periodType'. Must be 'month', 'quarter', or 'year'."
    );
    err.statusCode = 400;
    throw err;
  }

  if (periodType === "month") {
    const monthNum = parseInt(month, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      const err = new Error(
        "Invalid 'month' parameter. It must be a number between 1 and 12."
      );
      err.statusCode = 400;
      throw err;
    }
  }

  if (periodType === "quarter") {
    const quarterNum = parseInt(quarter, 10);
    if (isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
      const err = new Error(
        "Invalid 'quarter' parameter. It must be a number between 1 and 4."
      );
      err.statusCode = 400;
      throw err;
    }
  }

  // --- Data Fetching ---
  try {
    const reportData = await gstrRepository.getGstr1ReportData({
      periodType,
      year: yearNum,
      month: parseInt(month, 10),
      quarter: parseInt(quarter, 10),
    });
    return reportData;
  } catch (error) {
    console.error("Error in GSTR-1 service:", error.message);
    throw new Error("Failed to generate GSTR-1 report due to a server error.");
  }
}
