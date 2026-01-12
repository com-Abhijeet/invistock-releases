/**
 * Generates a unique internal Batch UID.
 *
 * Format: BAT-<productId>-<Incremental-batch-4-digit>
 * Example: BAT-101-0005
 *
 * @param {number} productId
 * @param {number} sequenceNumber - The incremental count for this product's batches (e.g. 1, 2, 5).
 * @returns {string} The unique batch UID
 */
export function generateBatchUid(productId, sequenceNumber) {
  // Ensure sequence is at least 0 if undefined, though it should be passed.
  const seq = sequenceNumber || 0;
  // Pad with leading zeros to 4 digits (e.g., 1 -> "0001")
  const paddedSeq = String(seq).padStart(4, "0");
  return `BAT-${productId}-${paddedSeq}`;
}

/**
 * Validates if a scanned code is a Batch UID.
 * @param {string} code
 * @returns {boolean}
 */
export function isBatchUid(code) {
  return code && code.startsWith("BAT-");
}
