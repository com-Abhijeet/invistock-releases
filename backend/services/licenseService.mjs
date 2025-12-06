import crypto from "crypto";
import { getLicenseInfo } from "../repositories/licenseRepository.mjs";
import machineId from "node-machine-id";
const { machineIdSync } = machineId;

// ✅ Embed your public key directly into the application code.
const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAm8ECfDUprjSK7ao8HjdG
it/sXyubVPuVoldheMpYnDTRe15kVrHyiepjM/vJmsYK5H7HLqEDEfJk6hvDCGFq
4XRPEQKw0uloUOQmt8Wn5CPwCWxoBABJoAPIhDcqKWJSYvP8Qp+WwXlsTwwjoa9X
b6dXOGA1MtboYmgb1g2OXROWb2wXnRv3EZbzxBU/ZjOgrSpTlWD1kmFvQi+USRYa
s+k5KV+vNZTw8uIv+MGQGWxP89UDRdLbKRuGuGUjG7eN8/TUDRlBeKdwW0bK2Lke
cav/k9ZgGx3/FGnbEz8WdBUGDAr9AOrbc3s4loM2w8iIHyolxWGNnL2kLsDxTqIE
iQIDAQAB
-----END PUBLIC KEY-----`;

function parseDate(dateStr) {
  const day = parseInt(dateStr.substring(0, 2), 10);
  const month = parseInt(dateStr.substring(2, 4), 10) - 1;
  const year = parseInt(`20${dateStr.substring(4, 6)}`, 10);
  return new Date(year, month, day);
}

export function validateLicense(licenseKey) {
  try {
    const decoded = Buffer.from(licenseKey, "base64").toString("utf8");
    const [payload, signature] = decoded.split(".");

    if (!payload || !signature) {
      return { status: "invalid", message: "Invalid license format." };
    }

    // 1. Verify Signature
    const verifier = crypto.createVerify("sha256");
    verifier.update(payload);
    if (!verifier.verify(publicKey, signature, "base64")) {
      return { status: "invalid", message: "License key is tampered." };
    }

    // 2. Parse Payload
    // Expected: Start-Info1-Info2-Expiry-HardwareID
    const parts = payload.split("-");

    // Legacy support check (optional, or force invalid if you want to strictly enforce new keys)
    if (parts.length < 5) {
      return {
        status: "invalid",
        message: "Old license format. Please request a new key.",
      };
    }

    const [startDateStr, info1, info2, expiryDateStr, licenseHardwareId] =
      parts;

    // ---------------------------------------------------------
    // ✅ 3. MACHINE ID CHECK (Node-Locking)
    // ---------------------------------------------------------
    const currentMachineId = machineIdSync();
    if (licenseHardwareId !== currentMachineId) {
      console.warn(
        `[LICENSE] Machine ID Mismatch! License: ${licenseHardwareId}, Actual: ${currentMachineId}`
      );
      return {
        status: "invalid",
        message:
          "This license is not valid for this computer. Machine ID mismatch.",
      };
    }

    // ---------------------------------------------------------
    // ✅ 4. DATE VALIDATION
    // ---------------------------------------------------------
    // Note: Removed the 10-minute timestamp check as requested.
    const startDate = parseDate(startDateStr);
    const expiryDate = parseDate(expiryDateStr);
    const now = new Date();

    startDate.setHours(0, 0, 0, 0);
    expiryDate.setHours(23, 59, 59, 999);
    now.setHours(12, 0, 0, 0);

    if (now < startDate) {
      return { status: "invalid", message: `License not yet active.` };
    }

    if (now > expiryDate) {
      const gracePeriodEndDate = new Date(expiryDate);
      gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + 15);

      if (now < gracePeriodEndDate) {
        const daysLeft = Math.ceil(
          (gracePeriodEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          status: "grace_period",
          message: `License expired! Grace period active (${daysLeft} days left).`,
          data: { expiryDate },
        };
      } else {
        return { status: "expired", message: "License expired." };
      }
    }

    return {
      status: "valid",
      message: "License is valid.",
      data: { startDate, expiryDate, info1, info2 },
    };
  } catch (error) {
    return { status: "invalid", message: "Failed to read license key." };
  }
}

// Check on startup
export function checkAppLicense() {
  const licenseInfo = getLicenseInfo();
  if (!licenseInfo || !licenseInfo.license_key) {
    return { status: "unlicensed", message: "No license key found." };
  }
  const status = validateLicense(licenseInfo.license_key);
  console.log(`[LICENSE] Startup Check: ${status.status}`);
  return status;
}
