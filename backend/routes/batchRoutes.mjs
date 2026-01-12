import { Router } from "express";
import {
  getProductBatchSuggestions,
  traceSerialNumber,
  traceBatchNumber,
  getPrintData,
  scanBarcode,
  getBatchAnalytics,
} from "../controllers/batchController.mjs";

const router = Router();

// Existing
router.get("/product/:productId", getProductBatchSuggestions);
router.get("/trace/serial/:serialNumber", traceSerialNumber);
router.get("/trace/batch/:batchNumber", traceBatchNumber);

// New
router.post("/print-data", getPrintData);
router.get("/scan/:code", scanBarcode);
router.get("/analytics/:productId", getBatchAnalytics);

export default router;
