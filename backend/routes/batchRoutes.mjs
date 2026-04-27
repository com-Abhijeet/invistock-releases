import { Router } from "express";
import {
  getProductBatchSuggestions,
  traceSerialNumber,
  traceBatchNumber,
  getPrintData,
  scanBarcode,
  getBatchAnalytics,
  assignStock,
  checkBarcode,
  generateBarcode,
  getNotifications,
  getFullReport,
  bulkCreateBatches,
  bulkUntrackProducts,
} from "../controllers/batchController.mjs";

const router = Router();

router.get("/product/:productId", getProductBatchSuggestions);
router.get("/trace/serial/:serialNumber", traceSerialNumber);
router.get("/trace/batch/:batchNumber", traceBatchNumber);

// Bulk Operations
router.post("/bulk-create", bulkCreateBatches);
router.post("/bulk-untrack", bulkUntrackProducts);

// New
router.post("/assign-stock", assignStock);
router.post("/print-data", getPrintData);
router.get("/scan/:code", scanBarcode);
router.get("/analytics/:productId", getBatchAnalytics);

// Barcode Management
router.get("/check-barcode/:code", checkBarcode);
router.get("/generate-barcode", generateBarcode);

// Endpoint 1: Immediate Notification (<= 7 days)
// e.g., GET /api/expiry/notifications
router.get("/expiry/notifications", getNotifications);

// Endpoint 2: Broader Categorized View
// e.g., GET /api/expiry/report
router.get("/expiry/report", getFullReport);

export default router;
