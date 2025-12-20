const crypto = require("crypto");
const { machineIdSync } = require("node-machine-id");

// NOTE: ElectronStore removed. Storage is now handled by licenseRepository.mjs (SQLite).

// ✅ YOUR PUBLIC KEY (Same as backend)
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

function validateClientKey(licenseKey) {
  try {
    if (!licenseKey) {
      return { status: "invalid", message: "No key provided." };
    }

    const decoded = Buffer.from(licenseKey, "base64").toString("utf8");
    const [payload, signature] = decoded.split(".");

    if (!payload || !signature)
      return { status: "invalid", message: "Invalid format" };

    const verifier = crypto.createVerify("sha256");
    verifier.update(payload);
    if (!verifier.verify(publicKey, signature, "base64")) {
      return { status: "invalid", message: "Tampered key." };
    }

    const parts = payload.split("-");
    if (parts.length < 5) return { status: "invalid", message: "Old format." };

    const [startDateStr, info1, info2, expiryDateStr, licenseHardwareId] =
      parts;

    // 1. Strict Machine ID Check
    const currentMachineId = machineIdSync();
    if (licenseHardwareId !== currentMachineId) {
      return {
        status: "invalid",
        message: "This key is for a different machine.",
      };
    }

    // 2. Date Check
    const startDate = parseDate(startDateStr);
    const expiryDate = parseDate(expiryDateStr);
    const now = new Date();

    // Normalize Times
    startDate.setHours(0, 0, 0, 0);
    expiryDate.setHours(23, 59, 59, 999);
    now.setHours(12, 0, 0, 0);

    if (now < startDate) {
      return { status: "invalid", message: "License not yet active." };
    }

    if (now > expiryDate) {
      // 3. Grace Period Logic (Matches License Service)
      const gracePeriodEndDate = new Date(expiryDate);
      gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + 15);

      if (now < gracePeriodEndDate) {
        const daysLeft = Math.ceil(
          (gracePeriodEndDate - now) / (1000 * 60 * 60 * 24)
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

    return { status: "valid", message: "Active", data: { expiryDate } };
  } catch (e) {
    console.error("Validation error:", e);
    return { status: "invalid", message: "Read error." };
  }
}

// Export only validation logic
module.exports = { validateClientKey };
