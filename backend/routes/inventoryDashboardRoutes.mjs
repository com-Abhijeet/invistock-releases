import express from "express";
import {
  getTopProductsController,
  getCategorySalesController,
  getFastMovingController,
  getSlowMovingController,
  getTotalStockSummaryController,
  getInventoryHealthMetricsController,
} from "../controllers/inventoryDashboardController.mjs";

const inventoryDashboardRoutes = express.Router();

inventoryDashboardRoutes.get("/top-products", getTopProductsController);
inventoryDashboardRoutes.get("/category-sales", getCategorySalesController);
inventoryDashboardRoutes.get("/fast-moving", getFastMovingController);
inventoryDashboardRoutes.get("/slow-moving", getSlowMovingController);
inventoryDashboardRoutes.get("/total-stock", getTotalStockSummaryController);
inventoryDashboardRoutes.get("/health-metrics", getInventoryHealthMetricsController);

export default inventoryDashboardRoutes;
