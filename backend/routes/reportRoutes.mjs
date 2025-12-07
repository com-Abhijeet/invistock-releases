import { Router } from "express";
import { getDayBookController } from "../controllers/daybookController.mjs";

const router = Router();

router.get("/daybook", getDayBookController);

export default router;
