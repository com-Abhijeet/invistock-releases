import express from "express";
import * as transactionsController from "../controllers/transactionController.mjs";

const transactionsRoutes = express.Router();

// Get all transactions with filters and pagination
transactionsRoutes.get(
  "/",
  transactionsController.getAllTransactionsController
);

// Get a single transaction by ID
transactionsRoutes.get(
  "/:id",
  transactionsController.getTransactionByIdController
);

// Get all transactions related to a specific sale or purchase ID
transactionsRoutes.get(
  "/related/:id",
  transactionsController.getTransactionsByRelatedIdController
);

// Create a new transaction
transactionsRoutes.post(
  "/",
  transactionsController.createTransactionController
);

// Update an existing transaction
transactionsRoutes.put(
  "/:id",
  transactionsController.updateTransactionController
);

// Soft-delete a transaction by ID
transactionsRoutes.delete(
  "/:id",
  transactionsController.deleteTransactionController
);

// Get a customer's account summary by ID with optional filters
transactionsRoutes.get(
  "/customers/:id/summary",
  transactionsController.getCustomerAccountSummaryController
);

// Get a supplier's account summary by ID with optional filters
transactionsRoutes.get(
  "/suppliers/:id/summary",
  transactionsController.getSupplierAccountSummaryController
);

transactionsRoutes.get(
  "/entity/:id",
  transactionsController.getEntityTransactionsController
);

export default transactionsRoutes;
