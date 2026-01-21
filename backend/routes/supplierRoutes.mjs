import express from "express";
import { validateRequest } from "../middlewares/validateRequest.mjs";
import {
  createSupplierSchema,
  updateSupplierSchema,
} from "../validations/supplierSchema.mjs";

import {
  createSupplierController,
  getSuppliersController,
  getSupplierByIdController,
  updateSupplierController,
  deleteSupplierController,
  getSupplierLedger,
} from "../controllers/suppplierController.mjs";

const supplierRoutes = express.Router();

// Specific routes first to avoid ID collision
supplierRoutes.get("/:id/ledger", getSupplierLedger);

supplierRoutes.post(
  "/",
  validateRequest(createSupplierSchema),
  createSupplierController,
);
supplierRoutes.get("/", getSuppliersController);
supplierRoutes.get("/:id", getSupplierByIdController);

supplierRoutes.put(
  "/:id",
  validateRequest(updateSupplierSchema),
  updateSupplierController,
);
supplierRoutes.delete("/:id", deleteSupplierController);

export default supplierRoutes;
