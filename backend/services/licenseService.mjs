import crypto from "crypto";
import machineId from "node-machine-id";
const { machineIdSync } = machineId;
import {
  getLicenseInfo,
  saveLicenseInfo,
} from "../repositories/licenseRepository.mjs";
import pkg from "electron";
const { app } = pkg;

// ✅ Your Public Key
const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAm8ECfDUprjSK7ao8HjdG
it/sXyubVPuVoldheMpYnDTRe15kVrHyiepjM/vJmsYK5H7HLqEDEfJk6hvDCGFq
4XRPEQKw0uloUOQmt8Wn5CPwCWxoBABJoAPIhDcqKWJSYvP8Qp+WwXlsTwwjoa9X
b6dXOGA1MtboYmgb1g2OXROWb2wXnRv3EZbzxBU/ZjOgrSpTlWD1kmFvQi+USRYa
s+k5KV+vNZTw8uIv+MGQGWxP89UDRdLbKRuGuGUjG7eN8/TUDRlBeKdwW0bK2Lke
cav/k9ZgGx3/FGnbEz8WdBUGDAr9AOrbc3s4loM2w8iIHyolxWGNnL2kLsDxTqIE
iQIDAQAB
-----END PUBLIC KEY-----`;

const API_URL = "http://localhost:5001/api/v1/security/validate";

function parseDate(dateStr) {
  const day = parseInt(dateStr.substring(0, 2), 10);
  const month = parseInt(dateStr.substring(2, 4), 10) - 1;
  const year = parseInt(`20${dateStr.substring(4, 6)}`, 10);
  return new Date(year, month, day);
}

/**
 * 1. LOCAL VALIDATION
 */
function validateLocal(licenseKey) {
  try {
    const decoded = Buffer.from(licenseKey, "base64").toString("utf8");
    const [payload, signature] = decoded.split(".");

    if (!payload || !signature) {
      return { status: "invalid", message: "Invalid license format." };
    }

    const verifier = crypto.createVerify("sha256");
    verifier.update(payload);
    if (!verifier.verify(publicKey, signature, "base64")) {
      return { status: "invalid", message: "License key is tampered." };
    }

    const parts = payload.split("-");
    if (parts.length < 5) {
      return { status: "invalid", message: "Old license format." };
    }

    const [startDateStr, info1, info2, expiryDateStr, licenseHardwareId] =
      parts;

    const currentMachineId = machineIdSync();
    if (licenseHardwareId !== currentMachineId) {
      console.log("INVALID MACHINE MATCH LICENSE");
      return {
        status: "invalid",
        message: "This license is not valid for this computer.",
      };
    }

    const startDate = parseDate(startDateStr);
    const expiryDate = parseDate(expiryDateStr);
    const now = new Date();

    startDate.setHours(0, 0, 0, 0);
    expiryDate.setHours(23, 59, 59, 999);
    now.setHours(12, 0, 0, 0);

    if (now < startDate) {
      console.log("INVALID LICENSE DATE");
      return { status: "invalid", message: `License not yet active.` };
    }

    if (now > expiryDate) {
      const gracePeriodEndDate = new Date(expiryDate);
      gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + 1);

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
        console.log("LICENSE EXPIRED");
        return { status: "expired", message: "License expired." };
      }
    }

    return {
      status: "valid",
      message: "License is valid.",
      data: { startDate, expiryDate, info1, info2 },
    };
  } catch (error) {
    console.error("[license service]-Failed local check", error);
    return { status: "invalid", message: "Failed to read license key." };
  }
}

/**
 * 2. ONLINE VALIDATION (UPDATED)
 */
async function verifyOnline(licenseKey) {
  try {
    const machineId = machineIdSync();

    // 2. GET METADATA
    const appVersion = app.getVersion();
    const osInfo = process.platform; // e.g. 'win32', 'darwin'

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        licenseKey,
        machineId,
        // 3. SEND METADATA
        osInfo: osInfo, // Matches backend 'osInfo'
        appVersion: appVersion, // Matches backend 'appVersion'
        platform: osInfo, // (Optional) Keep for legacy if your API uses 'platform'
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (response.ok && data.success) {
      const responsePayload = data.data || {};

      // AUTO-UPDATE DATABASE IF RENEWAL DETECTED
      if (
        responsePayload.latestLicenseKey &&
        responsePayload.latestLicenseKey !== licenseKey
      ) {
        console.log(
          "[LICENSE] 🔄 Renewal Detected! Validating and saving to database..."
        );

        const checkNewKey = validateLocal(responsePayload.latestLicenseKey);

        if (checkNewKey.status === "valid") {
          saveLicenseInfo({
            licenseKey: responsePayload.latestLicenseKey,
            status: "valid",
            expiryDate: checkNewKey.data.expiryDate.toISOString(),
          });
          console.log("[LICENSE] ✅ Database updated with renewed license.");
        } else {
          console.warn(
            "[LICENSE] ⚠️ Renewed key failed local validation:",
            checkNewKey.message
          );
        }
      }

      return { status: "valid", message: "Online verification successful." };
    }

    if (response.status === 403 || response.status === 401) {
      return {
        status: "banned",
        message: data.message || "License revoked or machine banned.",
      };
    }

    throw new Error("Server Error");
  } catch (error) {
    console.error(
      "[backend] - [license Service] [ online verification failed ] ",
      error
    );
    return { status: "network_error", message: error.message };
  }
}
/**
 * 3. HYBRID CHECK
 */
export async function validateLicense(licenseKey) {
  console.log("[LICENSE] Attempting Online Verification...");

  const onlineResult = await verifyOnline(licenseKey);

  if (onlineResult.status === "banned") {
    console.warn("[LICENSE] Blocked by Server:", onlineResult.message);
    return { status: "invalid", message: onlineResult.message };
  }

  if (onlineResult.status === "valid") {
    console.log("[LICENSE] Online Check Passed.");
    return validateLocal(licenseKey);
  }

  console.warn("[LICENSE] Network Error. Falling back to Local Check...");
  return validateLocal(licenseKey);
}

export async function checkAppLicense() {
  const licenseInfo = getLicenseInfo();
  if (!licenseInfo || !licenseInfo.license_key) {
    return { status: "unlicensed", message: "No license key found." };
  }
  return await validateLicense(licenseInfo.license_key);
}
