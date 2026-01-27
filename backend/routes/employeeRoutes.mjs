import { Router } from "express";
import * as Controller from "../controllers/employeeController.mjs";

const router = Router();

// Stats route should come before /:id to prevent conflict
router.get("/stats", Controller.getEmployeeStats);

router.get("/", Controller.getEmployees);
router.get("/:id", Controller.getEmployeeById);
router.post("/", Controller.createEmployee);
router.put("/:id", Controller.updateEmployee);
router.delete("/:id", Controller.deleteEmployee);

export default router;
