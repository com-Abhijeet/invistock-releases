import express from "express";
import * as purchaseController from "../controllers/purchaseController.mjs";
import { validateRequest } from "../middlewares/validateRequest.mjs";
import { purchaseSchema } from "../validations/purchaseSchema.mjs";

const purchaseRoutes = express.Router();

// 🔹 POST /purchases – Create a new purchase
purchaseRoutes.post(
  "/",
  validateRequest(purchaseSchema),
  purchaseController.createPurchase
);
// Get purchases for a specific supplier by ID
purchaseRoutes.get(
  "/supplier/:id",
  purchaseController.getPurchasesBySupplierIdController
);

purchaseRoutes.get(
  "/:id/labels",
  purchaseController.getPurchaseItemsForLabelsController
);
// 🔹 GET /purchases/:id – Get single purchase by ID
purchaseRoutes.get("/:id", purchaseController.getPurchaseById);

// 🔹 PUT /purchases/:id – Update a purchase
purchaseRoutes.put("/:id", purchaseController.updatePurchase);

// 🔹 DELETE /purchases/:id – Delete a purchase
purchaseRoutes.delete("/:id", purchaseController.deletePurchase);

// 🔹 GET /purchases – Get all purchases with filters and pagination
purchaseRoutes.get("/", purchaseController.getAllPurchases);

// 🔹 GET /purchases/summary – Get purchase statistics/summary
purchaseRoutes.get("/summary", purchaseController.getPurchaseSummary);

export default purchaseRoutes;
