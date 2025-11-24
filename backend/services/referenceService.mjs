import { generateReference } from "../repositories/referenceRepository.mjs";

/**
 * @description Service layer function to generate a new, GST-compliant reference number.
 * @param {'S' | 'P'} type - The type of document ('S' for Sale, 'P' for Purchase).
 * @returns {string} The newly generated sequential reference number for the current financial year.
 * @throws {Error} Throws an error if the underlying repository function fails.
 */
export function generateReferenceService(type) {
  try {
    // Call the new, robust function that handles the financial year logic
    const newReference = generateReference(type);
    return newReference;
  } catch (error) {
    console.error(
      `Error in generateReferenceService for type '${type}':`,
      error.message
    );
  }
}
