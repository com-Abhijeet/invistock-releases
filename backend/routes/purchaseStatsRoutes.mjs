import express from "express";
import * as purchaseController from "../controllers/purchaseController.mjs";

const purchaseStatsRoutes = express.Router();

// 📊 Purchase Summary (total, paid, unpaid, monthly trend)
purchaseStatsRoutes.get("/summary", purchaseController.getPurchaseSummary);

// 🏆 Top suppliers by amount and quantity
purchaseStatsRoutes.get("/top-suppliers", purchaseController.getTopSuppliers);

// 🧾 Category-wise spend
purchaseStatsRoutes.get("/category-spend", purchaseController.getCategorySpend);

// 📅 Daily vs Monthly breakdown
purchaseStatsRoutes.get(
  "/daily-vs-monthly",
  purchaseController.getPurchaseTrend
);

// 📈 Enterprise purchase stats
purchaseStatsRoutes.get("/stats", purchaseController.getPurchaseStats);

export default purchaseStatsRoutes;
