import { Router } from "express";
import * as Controller from "../controllers/employeeSalesController.mjs";

const router = Router();

router.post("/", Controller.createEmployeeSale);
router.get("/", Controller.getAllEmployeeSales);
router.get("/:id", Controller.getEmployeeSaleById);
router.get("/employee/:employeeId", Controller.getEmployeeSalesByEmployeeId);
router.put("/:id", Controller.updateEmployeeSale);
router.delete("/:id", Controller.deleteEmployeeSale);

export default router;
