import { api } from "./api";
// Import the frontend types you created for the report data
import type { Gstr1ReportData } from "../types/gstrTypes";

const BASE_URL = "/api/gst";

// Define the parameters for the API call
export interface GetGstr1ReportParams {
  periodType: "month" | "quarter" | "year";
  year: number;
  month?: number;
  quarter?: number;
}

/**
 * @description Fetches the GSTR-1 report data from the backend for a specified period.
 * @param {GetGstr1ReportParams} params - The parameters defining the report period.
 * @returns {Promise<Gstr1ReportData>} The categorized GSTR-1 report data.
 * @throws {Error} If the API call fails.
 */
export async function getGstr1Report(
  params: GetGstr1ReportParams
): Promise<Gstr1ReportData> {
  try {
    // Axios will automatically build the query string from the params object
    // e.g., /gstr1?periodType=quarter&year=2025&quarter=3
    const response = await api.get(`${BASE_URL}/gstr1`, { params });

    // Return the 'data' object from the API response
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch GSTR-1 report:", error);
    // Throw a new error to be caught by the UI component
    throw new Error("Could not retrieve the GSTR-1 report from the server.");
  }
}
