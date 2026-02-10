import express from "express";
import * as salesController from "../controllers/salesController.mjs";
import { saleSchema } from "../validations/salesSchema.mjs";
import { validateRequest } from "../middlewares/validateRequest.mjs";

const salesRoutes = express.Router();

/* CRUD ROUTES*/
salesRoutes.post(
  "/",
  validateRequest(saleSchema),
  salesController.createSaleController,
);

salesRoutes.post("/return", salesController.processSalesReturnController);

// Added Full Update Route
salesRoutes.put(
  "/:id",
  // validateRequest(saleSchema),
  salesController.updateSaleController,
);

salesRoutes.get("/trend", salesController.getSalesTrendController);
salesRoutes.get(
  "/financial-metrics",
  salesController.getFinancialMetricsController,
);
salesRoutes.get("/order-metrics", salesController.getOrderMetricsController);
salesRoutes.get("/top-customers", salesController.getTopCustomersController);
salesRoutes.get("/top-products", salesController.getTopProductsController);
salesRoutes.get(
  "/category-revenue",
  salesController.getCategoryRevenueController,
);
salesRoutes.get(
  "/payment-mode-breakdown",
  salesController.getPaymentModeBreakdownController,
);
salesRoutes.get("/credit-sales", salesController.getCreditSalesController);
salesRoutes.get("/best-sales-day", salesController.getBestSalesDayController);
salesRoutes.get("/table", salesController.getSalesTableController);

salesRoutes.get("/customer/:id", salesController.getCustomerSalesController);
salesRoutes.get(
  "/customerMetrics/:id",
  salesController.getCustomerSalesKPIController,
);

salesRoutes.get("/", salesController.getSalesPaginatedController);
salesRoutes.get("/:id", salesController.getSaleByIdController);
salesRoutes.delete("/:id", salesController.deleteSaleByIdController);

salesRoutes.get("/summary/stats", salesController.getSalesSummaryController);
salesRoutes.get(
  "/search/ref",
  salesController.searchSalesByReferenceController,
);

export default salesRoutes;
