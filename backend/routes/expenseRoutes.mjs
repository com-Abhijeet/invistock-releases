import { Router } from "express";
import * as controller from "../controllers/expenseController.mjs";

const router = Router();

router.post("/", controller.createExpense);
router.put("/:id", controller.updateExpense);
router.delete("/:id", controller.deleteExpense);
router.get("/", controller.getExpenses);
router.get("/stats", controller.getExpenseStats); // Call this for dashboard widgets

export default router;
