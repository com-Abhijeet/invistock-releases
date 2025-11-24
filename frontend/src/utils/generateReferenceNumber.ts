import axios from "axios";

/**
 * @description Fetches a new, GST-compliant sequential reference number from the backend.
 * @param {'S' | 'P'} type - The type of document ('S' for Sale, 'P' for Purchase).
 * @returns {Promise<string>} The complete reference number (e.g., "INV/2025-26/00001").
 */
export async function generateReference(type: "S" | "P"): Promise<string> {
  try {
    // 1. Call the new backend endpoint with only the 'type' parameter.
    const response = await axios.get(`http://localhost:5000/api/reference/generate`, {
      params: { type },
    });

    // 2. Extract the complete reference number directly from the response.
    const referenceNo = response.data.data.reference_no;
    
    if (!referenceNo) {
      throw new Error("Reference number was not found in the API response.");
    }
    
    // 3. Return the number provided by the backend.
    return referenceNo;

  } catch (error) {
    console.error("❌ Failed to generate reference number:", error);
    throw new Error("Could not generate a reference number from the server.");
  }
}