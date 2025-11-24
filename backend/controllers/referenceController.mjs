import { generateReferenceService } from "../services/referenceService.mjs";

/**
 * @description Generates the next sequential, GST-compliant reference number for a given document type.
 * @route GET /api/reference/generate?type=S
 * @access Private
 * @param {object} req - Express request object. Expects `type` ('S' for Sale or 'P' for Purchase) in query params.
 * @param {object} res - Express response object.
 */
export function generateReferenceController(req, res) {
  try {
    const { type } = req.query;

    // Validate that the 'type' parameter is provided and is valid
    if (!type || !["S", "P"].includes(type.toUpperCase())) {
      return res
        .status(400)
        .json({
          message: "A valid 'type' query parameter ('S' or 'P') is required.",
        });
    }

    // Call the new service function to get the reference number
    const referenceNo = generateReferenceService(type.toUpperCase());

    return res.status(200).json({
      message: "Reference number generated successfully",
      data: { reference_no: referenceNo },
    });
  } catch (error) {
    console.error("❌ Error in generateReferenceController:", error);
    return res
      .status(500)
      .json({
        message: "Internal server error while generating reference number.",
      });
  }
}
