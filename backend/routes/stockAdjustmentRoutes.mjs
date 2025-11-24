import { Router } from "express";
import {
  adjustStockController,
  getAdjustmentStatsController,
  getAdjustmentsListController,
} from "../controllers/stockAdjustmentController.mjs";

const router = Router();

router.post("/adjust", adjustStockController);
router.get("/stats", getAdjustmentStatsController);
router.get("/list", getAdjustmentsListController);

export default router;
