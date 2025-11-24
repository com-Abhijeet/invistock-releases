import { Router } from "express";
import {
  createNonGstSaleController,
  getNonGstSaleByIdController,
  getNonGstSalesController,
} from "../controllers/nonGstSalesController.mjs";

const router = Router();

router.post("/", createNonGstSaleController);
router.get("/:id", getNonGstSaleByIdController);
router.get("/", getNonGstSalesController);

export default router;
