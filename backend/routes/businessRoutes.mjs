import { Router } from "express";
import {
  getBusiness,
  updateBusiness,
} from "../controllers/businessController.mjs";

const router = Router();

// GET /api/business
router.get("/", getBusiness);

// PUT /api/business (Used for updating the singleton record)
router.put("/", updateBusiness);

export default router;
