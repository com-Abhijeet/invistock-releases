import * as customerController from "../controllers/customerController.mjs";
import { Router } from "express";
import { customerSchema } from "../validations/customerSchema.mjs";
import { validateRequest } from "../middlewares/validateRequest.mjs";

const customerRoutes = Router();

// --- 1. Specific Static Routes (MUST be first) ---

// This must be before /:id so "financials" isn't treated as an ID
customerRoutes.get("/financials", customerController.getCustomersFinancials);

// This must also be before /:id
customerRoutes.get(
  "/overdue-summary",
  customerController.getCustomerOverdueSummaryController
);

customerRoutes.post("/import", customerController.importCustomersController);

// --- 2. General Root Routes ---
customerRoutes.post(
  "/",
  validateRequest(customerSchema),
  customerController.createCustomer
);

customerRoutes.get("/", customerController.getAllCustomersController);

// --- 3. Dynamic Parameter Routes (MUST be last) ---

// This acts as a catch-all for anything after /api/customers/
customerRoutes.get("/:id", customerController.getCustomerById);

// Note: Ensure your frontend isn't confusing :id and :phoneNumber usage,
// as /:id will catch phone numbers too if they are just appended to the URL.
customerRoutes.get(
  "/phone/:phoneNumber",
  customerController.getCustomerByPhone
);

customerRoutes.put("/:id", customerController.updateCustomer);

customerRoutes.delete("/:id", customerController.deleteCustomer);

customerRoutes.get("/:id/ledger", customerController.getCustomerLedger);

export default customerRoutes;
