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
} from "../controllers/suppplierController.mjs";

const supplierRoutes = express.Router();

supplierRoutes.post(
  "/",
  validateRequest(createSupplierSchema),
  createSupplierController
);
supplierRoutes.get("/", getSuppliersController);
supplierRoutes.get("/:id", getSupplierByIdController);

supplierRoutes.put(
  "/:id",
  validateRequest(updateSupplierSchema),
  updateSupplierController
);
supplierRoutes.delete("/:id", deleteSupplierController);

export default supplierRoutes;
