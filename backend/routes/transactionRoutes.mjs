import express from "express";
import * as transactionsController from "../controllers/transactionController.mjs";

const transactionsRoutes = express.Router();

// 1. Transaction CRUD
transactionsRoutes.get(
  "/",
  transactionsController.getAllTransactionsController
);
transactionsRoutes.post(
  "/",
  transactionsController.createTransactionController
);
transactionsRoutes.get(
  "/:id",
  transactionsController.getTransactionByIdController
);
transactionsRoutes.put(
  "/:id",
  transactionsController.updateTransactionController
);
transactionsRoutes.delete(
  "/:id",
  transactionsController.deleteTransactionController
);

// 2. Relations (Transactions by Bill ID)
// Use query param ?type=sale or ?type=purchase
transactionsRoutes.get(
  "/related/:id",
  transactionsController.getTransactionsByRelatedIdController
);

// 3. Entity Summaries & Lists
transactionsRoutes.get(
  "/customers/:id/summary",
  transactionsController.getCustomerAccountSummaryController
);
transactionsRoutes.get(
  "/suppliers/:id/summary",
  transactionsController.getSupplierAccountSummaryController
);
transactionsRoutes.get(
  "/entity/:id",
  transactionsController.getEntityTransactionsController
);

export default transactionsRoutes;
