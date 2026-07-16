import express from "express";
import * as tallyController from "../controllers/tallyController.mjs";

const router = express.Router();

router.get("/config", tallyController.getConfigs);
router.post("/config", tallyController.saveConfigs);
router.get("/logs", tallyController.getLogs);
router.get("/ping", tallyController.pingTally);
router.post("/sync", tallyController.syncData);
router.post("/sync-base-configs", tallyController.syncBaseConfigs);
router.post("/reset-sync", tallyController.resetSync);

export default router;
