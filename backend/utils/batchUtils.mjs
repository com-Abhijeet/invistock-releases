import db from "../db/db.mjs";

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
 * Generates a guaranteed collision-free, sequential internal Batch UID.
 * Prevents UNIQUE constraint violations caused by deleted batches or multi-item purchase bills.
 *
 * @param {number} productId
 * @param {object} [dbInstance=db]
 * @param {string[]|Set<string>} [exclude=[]]
 * @returns {string} Unique batch UID
 */
export function getNextBatchUid(productId, dbInstance = db, exclude = []) {
  const excludeSet = new Set(
    Array.isArray(exclude) ? exclude : Array.from(exclude || []),
  );
  let maxSeq = 0;

  try {
    const rows = dbInstance
      .prepare(
        "SELECT batch_uid FROM product_batches WHERE product_id = ? AND batch_uid LIKE ?",
      )
      .all(productId, `BAT-${productId}-%`);

    for (const row of rows) {
      if (row?.batch_uid) {
        const parts = String(row.batch_uid).split("-");
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  } catch (e) {
    console.warn("[batchUtils] Failed to query existing batch_uids:", e.message);
  }

  // Account for any UIDs passed in the exclude list (e.g. in multi-item purchase bills)
  for (const ex of excludeSet) {
    if (ex && typeof ex === "string" && ex.startsWith(`BAT-${productId}-`)) {
      const parts = ex.split("-");
      const lastPart = parts[parts.length - 1];
      const num = parseInt(lastPart, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  // Fallback to row count if greater than maxSeq
  try {
    const countRow = dbInstance
      .prepare(
        "SELECT COUNT(*) as count FROM product_batches WHERE product_id = ?",
      )
      .get(productId);
    const count = countRow ? countRow.count : 0;
    if (count > maxSeq) {
      maxSeq = count;
    }
  } catch (e) {}

  let nextSequence = maxSeq + 1;
  let candidateUid = generateBatchUid(productId, nextSequence);

  // Safety check against entire product_batches table to guarantee absolute uniqueness
  try {
    const checkStmt = dbInstance.prepare(
      "SELECT id FROM product_batches WHERE batch_uid = ? LIMIT 1",
    );
    while (excludeSet.has(candidateUid) || checkStmt.get(candidateUid)) {
      nextSequence++;
      candidateUid = generateBatchUid(productId, nextSequence);
    }
  } catch (e) {
    if (excludeSet.has(candidateUid)) {
      candidateUid = `BAT-${productId}-${Date.now().toString().slice(-4)}`;
    }
  }

  return candidateUid;
}

/**
 * Validates if a scanned code is a Batch UID.
 * @param {string} code
 * @returns {boolean}
 */
export function isBatchUid(code) {
  return code && code.startsWith("BAT-");
}

export const calculateDaysLeft = (expiryDateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to midnight

  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
