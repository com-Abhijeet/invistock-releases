import express from "express";
import {
  getLabelPrintSettingsController,
  updateLabelPrintSettingsController,
} from "../controllers/labelPrintSettingsController.mjs";

const router = express.Router();

router.get("/", getLabelPrintSettingsController);
router.put("/", updateLabelPrintSettingsController);

export default router;
