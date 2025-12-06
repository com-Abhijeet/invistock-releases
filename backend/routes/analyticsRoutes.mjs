import { Router } from "express";
import {
  getPredictiveRestock,
  getDeadStock,
  getCustomerInsights,
  getProductABC,
} from "../controllers/analyticsController.mjs";

const router = Router();
router.get("/restock-prediction", getPredictiveRestock);
router.get("/dead-stock", getDeadStock);
router.get("/customer-insights", getCustomerInsights);
router.get("/abc-analysis", getProductABC);

export default router;
