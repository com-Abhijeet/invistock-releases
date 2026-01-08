import { Router } from "express";
import {
  createNonGstSaleController,
  getNonGstSaleByIdController,
  getNonGstSalesController,
  getUniqueProductNamesController,
} from "../controllers/nonGstSalesController.mjs";

const router = Router();

// Place specific routes before parameterized routes (like /:id) to avoid conflicts
router.get("/unique-products", getUniqueProductNamesController);

router.post("/", createNonGstSaleController);
router.get("/:id", getNonGstSaleByIdController);
router.get("/", getNonGstSalesController);

export default router;
