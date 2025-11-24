import * as gstrService from "../services/gstrService.mjs";

/**
 * @description Handles the API request to generate a GSTR-1 report for a given period.
 * @route GET /api/reports/gstr1?periodType=quarter&year=2025&quarter=3
 * @access Private
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
export async function getGstr1ReportController(req, res) {
  try {
    const { periodType, year, month, quarter } = req.query;

    // --- Basic Validation ---
    if (!periodType || !year) {
      return res
        .status(400)
        .json({
          message: "Query parameters 'periodType' and 'year' are required.",
        });
    }
    if (periodType === "month" && !month) {
      return res
        .status(400)
        .json({
          message:
            "Query parameter 'month' is required when periodType is 'month'.",
        });
    }
    if (periodType === "quarter" && !quarter) {
      return res
        .status(400)
        .json({
          message:
            "Query parameter 'quarter' is required when periodType is 'quarter'.",
        });
    }

    // --- Service Call ---
    const reportData = await gstrService.getGstr1ReportService({
      periodType,
      year,
      month,
      quarter,
    });

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
