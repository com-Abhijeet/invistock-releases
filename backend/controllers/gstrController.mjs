import * as gstrService from "../services/gstrService.mjs";

/**
 * Helper to validate query parameters before sending to service
 */
function validateRequestParams(req, res) {
  const { periodType, year, month, quarter } = req.query;

  if (!periodType || !year) {
    return res.status(400).json({
      message: "Query parameters 'periodType' and 'year' are required.",
    });
  }
  if (periodType === "month" && !month) {
    return res.status(400).json({
      message:
        "Query parameter 'month' is required when periodType is 'month'.",
    });
  }
  if (periodType === "quarter" && !quarter) {
    return res.status(400).json({
      message:
        "Query parameter 'quarter' is required when periodType is 'quarter'.",
    });
  }

  return { isValid: true, params: { periodType, year, month, quarter } };
}

/**
 * @description Handles the API request to generate a GSTR-1 report for a given period.
 * @route GET /api/reports/gstr1
 * @access Private
 */
export async function getGstr1ReportController(req, res) {
  try {
    const { isValid, params } = validateRequestParams(req, res);
    if (!isValid) return;

    const reportData = await gstrService.getGstr1ReportService(params);

    res.status(200).json({
      message: "GSTR-1 report data generated successfully",
      data: reportData,
    });
  } catch (error) {
    console.error("Error in getGstr1ReportController:", error.message);
    const statusCode = error.statusCode || 500;
    res
      .status(statusCode)
      .json({ message: error.message || "An unexpected error occurred." });
  }
}

/**
 * @description Handles the API request to generate a GSTR-2 report for a given period.
 * @route GET /api/reports/gstr2
 * @access Private
 */
export async function getGstr2ReportController(req, res) {
  try {
    const { isValid, params } = validateRequestParams(req, res);
    if (!isValid) return;

    const reportData = await gstrService.getGstr2ReportService(params);

    res.status(200).json({
      message: "GSTR-2 report data generated successfully",
      data: reportData,
    });
  } catch (error) {
    console.error("Error in getGstr2ReportController:", error.message);
    const statusCode = error.statusCode || 500;
    res
      .status(statusCode)
      .json({ message: error.message || "An unexpected error occurred." });
  }
}

/**
 * @description Handles the API request to generate a GSTR-3B report for a given period.
 * @route GET /api/reports/gstr3b
 * @access Private
 */
export async function getGstr3bReportController(req, res) {
  try {
    const { isValid, params } = validateRequestParams(req, res);
    if (!isValid) return;

    const reportData = await gstrService.getGstr3bReportService(params);

    res.status(200).json({
      message: "GSTR-3B report data generated successfully",
      data: reportData,
    });
  } catch (error) {
    console.error("Error in getGstr3bReportController:", error);
    const statusCode = error.statusCode || 500;
    res
      .status(statusCode)
      .json({ message: error.message || "An unexpected error occurred." });
  }
}
