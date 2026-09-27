import express from "express";
import {
  getBatchVariants,
  getProductVariants,
  getAllVariants,
  getVariantById,
  updateVariant,
  printVariantLabels,
} from "../controllers/variantController.mjs";

const router = express.Router();

router.get("/batch/:batchId", getBatchVariants);
router.get("/product/:productId", getProductVariants);
router.get("/", getAllVariants);
router.get("/:id", getVariantById);
router.put("/:id", updateVariant);
router.post("/print-labels", printVariantLabels);

export default router;
