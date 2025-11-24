import * as customerController from "../controllers/customerController.mjs";
import { Router } from "express";
import { customerSchema } from "../validations/customerSchema.mjs";
import { validateRequest } from "../middlewares/validateRequest.mjs";

const customerRoutes = Router();

customerRoutes.post(
  "/",
  validateRequest(customerSchema),
  customerController.createCustomer
);

customerRoutes.get("/", customerController.getAllCustomersController);

customerRoutes.get("/:id", customerController.getCustomerById);
customerRoutes.post("/import", customerController.importCustomersController);
customerRoutes.get("/:phoneNumber", customerController.getCustomerByPhone);

customerRoutes.put("/:id", customerController.updateCustomer);

customerRoutes.delete("/:id", customerController.deleteCustomer);
customerRoutes.get(
  "/overdue-summary",
  customerController.getCustomerOverdueSummaryController
);
export default customerRoutes;
