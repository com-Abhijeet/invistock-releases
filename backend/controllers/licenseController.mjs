import {
  checkAppLicense,
  validateLicense,
} from "../services/licenseService.mjs";
import { saveLicenseInfo } from "../repositories/licenseRepository.mjs";

/**
 * GET /api/license/status
 * Fetches the current license status from the database.
 */
export async function getLicenseStatusController(req, res) {
  try {
    // checkAppLicense already reads the DB and validates the key
    const licenseStatus = await checkAppLicense();
    res.status(200).json(licenseStatus);
  } catch (error) {
    console.error(
      `[BACKEND] - LICENSE CONTROLLER - ERROR IN GETTING LICENSE STATUS ${error}`
    );
    res.status(500).json({
      status: "invalid",
      message: `Error checking license: ${error.message}`,
    });
  }
}

/**
 * POST /api/license/activate
 * Attempts to activate a new license key.
 */
export async function saveLicenseController(req, res) {
  try {
    const { licenseKey } = req.body;
    if (!licenseKey) {
      return res
        .status(400)
        .json({ status: "invalid", message: "License key is required." });
    }

    // 1. Validate the new key
    const validationResult = await validateLicense(licenseKey);

    if (
      validationResult.status === "invalid" ||
      validationResult.status === "expired"
    ) {
      console.log(
        "[backend] - [license controller] - invalid key",
        validationResult
      );
      return res.status(400).json(validationResult);
    }

    // 2. If valid, save it to the database
    saveLicenseInfo({
      licenseKey,
      status: validationResult.status,
      // Use toISOString() for consistent date format
      expiryDate: validationResult.data?.expiryDate.toISOString(),
    });

    // 3. Return the successful result
    res.status(200).json(validationResult);
  } catch (error) {
    console.error(
      `[BACKEND] - LICENSE CONTROLLER - ERROR IN CREATING LICENSE ${error}`
    );
    res.status(500).json({
      status: "invalid",
      message: `Failed to save license: ${error.message}`,
    });
  }
}
