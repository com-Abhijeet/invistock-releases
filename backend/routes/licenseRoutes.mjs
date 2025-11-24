import { Router } from "express";
import {
  getLicenseStatusController,
  saveLicenseController,
} from "../controllers/licenseController.mjs";

const router = Router();

// GET route for the frontend to check the current license status
router.get("/status", getLicenseStatusController);

// POST route for the frontend to submit a new license key
router.post("/activate", saveLicenseController);

export default router;
