import { Router } from "express";
import * as Controller from "../controllers/salesOrderController.mjs";

const router = Router();

router.post("/push", Controller.createOrder); // API Endpoint for mobile app/push
router.put("/:id", Controller.updateOrder);
router.delete("/:id", Controller.deleteOrder);
router.get("/:id", Controller.getOrderById);
router.get("/", Controller.getAllOrders);

export default router;
