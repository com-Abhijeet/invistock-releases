import crypto from "crypto";
import { getLicenseInfo } from "../repositories/licenseRepository.mjs";

// ✅ Embed your public key directly into the application code.
// Copy the multi-line content of your public.key file and paste it here.
const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAm8ECfDUprjSK7ao8HjdG
it/sXyubVPuVoldheMpYnDTRe15kVrHyiepjM/vJmsYK5H7HLqEDEfJk6hvDCGFq
4XRPEQKw0uloUOQmt8Wn5CPwCWxoBABJoAPIhDcqKWJSYvP8Qp+WwXlsTwwjoa9X
b6dXOGA1MtboYmgb1g2OXROWb2wXnRv3EZbzxBU/ZjOgrSpTlWD1kmFvQi+USRYa
s+k5KV+vNZTw8uIv+MGQGWxP89UDRdLbKRuGuGUjG7eN8/TUDRlBeKdwW0bK2Lke
cav/k9ZgGx3/FGnbEz8WdBUGDAr9AOrbc3s4loM2w8iIHyolxWGNnL2kLsDxTqIE
iQIDAQAB
-----END PUBLIC KEY-----`;

/**
 * Parses a DDMMYY date string into a Date object.
 */
function parseDate(dateStr) {
  const day = parseInt(dateStr.substring(0, 2), 10);
  const month = parseInt(dateStr.substring(2, 4), 10) - 1; // Month is 0-indexed
  const year = parseInt(`20${dateStr.substring(4, 6)}`, 10);
  return new Date(year, month, day);
}

/**
 * Validates a license key and checks its expiry.
 * @param {string} licenseKey The base64 license key from the user.
 * @returns {{status: 'valid'|'invalid'|'expired'|'grace_period', message: string, data?: object}}
 */
export function validateLicense(licenseKey) {
  try {
    const decoded = Buffer.from(licenseKey, "base64").toString("utf8");
    const [payload, signature] = decoded.split(".");

    if (!payload || !signature) {
      return { status: "invalid", message: "Invalid license format." };
    }

    // 1. Verify the signature's authenticity
    const verifier = crypto.createVerify("sha256");
    verifier.update(payload);
    if (!verifier.verify(publicKey, signature, "base64")) {
      return {
        status: "invalid",
        message: "License key is not authentic or has been tampered with.",
      };
    }

    // 2. If authentic, parse the payload and check dates
    const [startDateStr, info1, info2, expiryDateStr] = payload.split("-");
    const startDate = parseDate(startDateStr);
    const expiryDate = parseDate(expiryDateStr);
    const now = new Date();

    // Set times to compare dates accurately
    startDate.setHours(0, 0, 0, 0);
    expiryDate.setHours(23, 59, 59, 999); // License is valid for the whole day
    now.setHours(12, 0, 0, 0); // Mid-day to avoid timezone issues

    if (now < startDate) {
      return {
        status: "invalid",
        message: `License not yet active. Starts on ${startDate.toLocaleDateString()}.`,
      };
    }

    if (now > expiryDate) {
      // License has expired, check for grace period
      const gracePeriodEndDate = new Date(expiryDate);
      gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + 15);

      if (now < gracePeriodEndDate) {
        const daysLeft = Math.ceil(
          (gracePeriodEndDate - now) / (1000 * 60 * 60 * 24)
        );
        return {
          status: "grace_period",
          message: `License expired! You are in a grace period. ${daysLeft} days remaining.`,
          data: { expiryDate, gracePeriodEndDate },
        };
      } else {
        return {
          status: "expired",
          message: `License and grace period have expired.`,
        };
      }
    }

    // 3. Success!
    return {
      status: "valid",
      message: "License is valid.",
      data: { startDate, expiryDate, info1, info2 },
    };
  } catch (error) {
    return { status: "invalid", message: "Failed to read license key." };
  }
}

export function checkAppLicense() {
  const licenseInfo = getLicenseInfo();
  if (!licenseInfo || !licenseInfo.license_key) {
    // No license has been entered yet.
    return {
      status: "unlicensed",
      message: "No license key found. Please enter a key.",
    };
  }

  // Re-validate the key on every startup to check dates
  const licenseStatus = validateLicense(licenseInfo.license_key);

  console.log(
    `[LICENSE] Status: ${licenseStatus.status} - ${licenseStatus.message}`
  );

  // You can now use this status object to control UI features
  return licenseStatus;
}
