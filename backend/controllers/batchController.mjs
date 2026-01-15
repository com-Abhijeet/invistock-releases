import * as BatchService from "../services/batchService.mjs";
import * as BatchRepo from "../repositories/batchRepository.mjs";

export function getProductBatchSuggestions(req, res) {
  try {
    const { productId } = req.params;
    const { trackingType } = req.query;

    if (trackingType === "serial") {
      const serials = BatchService.getSerialsForProduct(Number(productId));
      return res.json({ status: "success", data: serials });
    } else {
      const batches = BatchService.getBatchesForProduct(Number(productId));
      return res.json({ status: "success", data: batches });
    }
  } catch (error) {
    console.error("[BATCH CONTROLLER] Error getting suggestions:", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function traceSerialNumber(req, res) {
  try {
    const { serialNumber } = req.params;
    const history = BatchService.traceSerial(serialNumber);

    if (!history) {
      return res
        .status(404)
        .json({ status: "error", error: "Serial number not found." });
    }

    res.json({ status: "success", data: history });
  } catch (error) {
    console.error("[BATCH CONTROLLER] Error tracing serial:", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function traceBatchNumber(req, res) {
  try {
    const { batchNumber } = req.params;
    const history = BatchRepo.findBatchDetails(batchNumber);

    if (!history) {
      return res
        .status(404)
        .json({ status: "error", error: "Batch number not found." });
    }

    res.json({ status: "success", data: history });
  } catch (error) {
    console.error("[BATCH CONTROLLER] Error tracing batch:", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

// --- NEW ENDPOINTS ---

/**
 * POST /api/batches/assign-stock
 * Assigns existing stock to a batch.
 */
export function assignStock(req, res) {
  try {
    const data = req.body;
    if (!data.productId || !data.batchNumber || !data.quantity) {
      return res
        .status(400)
        .json({ status: "error", error: "Missing required fields" });
    }

    const result = BatchService.assignUntrackedStock(data);
    res.json({ status: "success", data: result });
  } catch (error) {
    console.error("[BATCH CONTROLLER] Assign Stock Error:", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

/**
 * POST /api/batches/print-data
 * Returns formatted print payloads (barcodes, labels) for the requested scope.
 */
export async function getPrintData(req, res) {
  try {
    const { scope, productId, batchId, serialIds, copies } = req.body;

    if (!scope || !productId) {
      return res
        .status(400)
        .json({ status: "error", error: "Missing scope or productId" });
    }

    const printJobs = await BatchService.generatePrintPayload({
      scope,
      productId,
      batchId,
      serialIds,
      copies,
    });

    res.json({ status: "success", data: printJobs });
  } catch (error) {
    console.error("[BATCH CONTROLLER] Print Error:", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

/**
 * GET /api/batches/scan/:code
 * Resolves a scanned barcode to a Product (and optionally Batch/Serial).
 */
export async function scanBarcode(req, res) {
  try {
    const { code } = req.params;
    const result = await BatchService.scanBarcode(code);
    res.json({ status: "success", data: result });
  } catch (error) {
    // 404 for not found to allow frontend to handle gracefully (e.g. show "Not Found" toast)
    if (error.message === "Item not found") {
      return res.status(404).json({ status: "error", error: "Item not found" });
    }
    console.error("[BATCH CONTROLLER] Scan Error:", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

/**
 * GET /api/batches/analytics/:productId
 */
export function getBatchAnalytics(req, res) {
  try {
    const { productId } = req.params;
    const analytics = BatchService.getBatchAnalyticsForProduct(
      Number(productId)
    );
    res.json({ status: "success", data: analytics });
  } catch (error) {
    console.error("[BATCH CONTROLLER] Error getting analytics:", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}
