import { Router } from "express";
import {
  getSalesBillingSettings,
  updateSalesBillingSettings,
} from "../controllers/salesBillingSettingsController.mjs";

const router = Router();

router.get("/", getSalesBillingSettings);
router.put("/", updateSalesBillingSettings);

export default router;
