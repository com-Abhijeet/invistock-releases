import * as gstrRepository from "../repositories/gstrRepository.mjs";
import * as gstr2Repository from "../repositories/gstr2Repository.mjs";
import * as gstr3bRepository from "../repositories/gstr3bRepository.mjs";

/**
 * Shared validation logic for all GSTR reports
 */
function validatePeriodParams(periodType, year, month, quarter) {
  const yearNum = parseInt(year, 10);
  if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
    const err = new Error("Invalid 'year' parameter.");
    err.statusCode = 400;
    throw err;
  }

  if (!["month", "quarter", "year"].includes(periodType)) {
    const err = new Error(
      "Invalid 'periodType'. Must be 'month', 'quarter', or 'year'.",
    );
    err.statusCode = 400;
    throw err;
  }

  let monthNum, quarterNum;

  if (periodType === "month") {
    monthNum = parseInt(month, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      const err = new Error(
        "Invalid 'month' parameter. It must be a number between 1 and 12.",
      );
      err.statusCode = 400;
      throw err;
    }
  }

  if (periodType === "quarter") {
    quarterNum = parseInt(quarter, 10);
    if (isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
      const err = new Error(
        "Invalid 'quarter' parameter. It must be a number between 1 and 4.",
      );
      err.statusCode = 400;
      throw err;
    }
  }

  return { yearNum, monthNum, quarterNum };
}

/**
 * @description Validates the filing period and orchestrates the fetching of GSTR-1 report data.
 */
export async function getGstr1ReportService({
  periodType,
  year,
  month,
  quarter,
}) {
  const { yearNum, monthNum, quarterNum } = validatePeriodParams(
    periodType,
    year,
    month,
    quarter,
  );

  try {
    return await gstrRepository.getGstr1ReportData({
      periodType,
      year: yearNum,
      month: monthNum,
      quarter: quarterNum,
    });
  } catch (error) {
    console.error("Error in GSTR-1 service:", error.message);
    throw new Error("Failed to generate GSTR-1 report due to a server error.");
  }
}

/**
 * @description Validates the filing period and orchestrates the fetching of GSTR-2 report data.
 */
export async function getGstr2ReportService({
  periodType,
  year,
  month,
  quarter,
}) {
  const { yearNum, monthNum, quarterNum } = validatePeriodParams(
    periodType,
    year,
    month,
    quarter,
  );

  try {
    return await gstr2Repository.getGstr2ReportData({
      periodType,
      year: yearNum,
      month: monthNum,
      quarter: quarterNum,
    });
  } catch (error) {
    console.error("Error in GSTR-2 service:", error.message);
    throw new Error("Failed to generate GSTR-2 report due to a server error.");
  }
}

/**
 * @description Validates the filing period and orchestrates the fetching of GSTR-3B report data.
 */
export async function getGstr3bReportService({
  periodType,
  year,
  month,
  quarter,
}) {
  const { yearNum, monthNum, quarterNum } = validatePeriodParams(
    periodType,
    year,
    month,
    quarter,
  );

  try {
    return await gstr3bRepository.getGstr3bReportData({
      periodType,
      year: yearNum,
      month: monthNum,
      quarter: quarterNum,
    });
  } catch (error) {
    console.error("Error in GSTR-3B service:", error.message);
    throw new Error("Failed to generate GSTR-3B report due to a server error.");
  }
}
