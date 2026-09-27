import express from "express";
import * as controller from "../controllers/attributePresetController.mjs";

const router = express.Router();

router.get("/", controller.getAllPresetsController);
router.get("/:id", controller.getPresetByIdController);
router.post("/", controller.createPresetController);
router.put("/:id", controller.updatePresetController);
router.delete("/:id", controller.deletePresetController);

export default router;
