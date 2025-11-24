import { api } from "./api";

// This type definition can be shared
export interface LicenseStatus {
  status: "valid" | "invalid" | "expired" | "grace_period" | "unlicensed";
  message: string;
  data?: {
    expiryDate: string;
    gracePeriodEndDate?: string;
  };
}

/**
 * Fetches the current license status from the backend.
 * Calls GET /api/license/status
 */
export async function getLicenseStatus(): Promise<LicenseStatus> {
  const response = await api.get("/api/license/status");
  return response.data;
}

/**
 * Submits a new license key for activation.
 * Calls POST /api/license/activate
 */
export async function activateLicense(
  licenseKey: string
): Promise<LicenseStatus> {
  const response = await api.post("/api/license/activate", { licenseKey });
  return response.data;
}
