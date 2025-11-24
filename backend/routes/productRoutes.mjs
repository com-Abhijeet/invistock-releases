import express from "express";
import * as controller from "../controllers/productController.mjs";
import { validateRequest } from "../middlewares/validateRequest.mjs";
import { productSchema } from "../validations/productSchema.mjs";

const router = express.Router();

// --- Core Routes ---
router.post("/", validateRequest(productSchema), controller.createProduct);
router.get("/", controller.getProducts);

// --- ✅ SPECIFIC ROUTES (Must come BEFORE dynamic /:id routes) ---
router.get("/mobile-view", controller.getProductsForMobileController);
router.get("/next-barcode", controller.getNextBarcodeController);
router.get("/next-code", controller.getNextProductCodeController);
router.get("/low-stock/count", controller.getLowStockCountController);
router.get("/low-stock/list", controller.getLowStockProductsController);

// --- Dynamic Routes (Must come AFTER specific routes) ---
router.get("/:id", controller.getProduct);
router.get("/:id/history", controller.getProductHistoryController);
router.put(
  "/update/:id",
  validateRequest(productSchema),
  controller.updateProduct
);
router.delete("/:id", controller.deleteProduct);

// --- Other Routes ---
router.post("/import", controller.importProducts);

export default router;
