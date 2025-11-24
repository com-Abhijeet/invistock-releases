import * as supplierService from "../services/supplierService.mjs";

/**
 * @description Creates a new supplier.
 * @route POST /api/supplier
 * @access Private
 * @param {object} req - Express request object, containing the supplier data in `req.body`.
 * @param {object} res - Express response object.
 */
export async function createSupplierController(req, res) {
  try {
    const result = await supplierService.createSupplierService(req.body);

    res
      .status(201)
      .json({ message: "Supplier created successfully", data: result });
  } catch (err) {
    console.error("Error in createSupplierController:", err.message);

    // ✅ Send a specific status code if the service layer provides one, otherwise default to 500.
    const statusCode = err.statusCode || 500;
    const message =
      err.message ||
      "An unexpected error occurred while creating the supplier.";

    res.status(statusCode).json({ message });
  }
}

export async function getSuppliersController(req, res) {
  try {
    const data = await supplierService.listSuppliers();
    res.status(200).json({ message: "suppliers fetched successfully", data });
  } catch (err) {
    res.status(500).json({ message: "error", message: err.message });
  }
}

export async function getSupplierByIdController(req, res) {
  try {
    const data = supplierService.getSupplier(Number(req.params.id));
    res.status(200).json({ message: "success", data });
  } catch (err) {
    res.status(404).json({ message: "error", message: err.message });
  }
}

export async function updateSupplierController(req, res) {
  try {
    const data = supplierService.editSupplier(Number(req.params.id), req.body);
    res.status(200).json({ message: "success", ...data });
  } catch (err) {
    res.status(400).json({ message: "error", message: err.message });
  }
}

export async function deleteSupplierController(req, res) {
  try {
    const data = supplierService.removeSupplier(Number(req.params.id));
    res.status(200).json({ message: "success", ...data });
  } catch (err) {
    res.status(404).json({ message: "error", message: err.message });
  }
}
