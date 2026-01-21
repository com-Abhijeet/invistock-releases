import {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  getSupplierLedger,
} from "../repositories/supplierRepository.mjs";

/**
 * @description Validates supplier data, checks for duplicates, and creates a new supplier.
 * @param {object} supplierData The raw supplier data from the controller.
 * @param {string} supplierData.name The name of the supplier (required).
 * @param {string} [supplierData.phone] The supplier's phone number (optional, but unique if provided).
 * @param {string} [supplierData.gst_number] The supplier's 15-character GSTIN (optional, but unique if provided).
 * @returns {Promise<object>} The newly created supplier object.
 * @throws {Error} Throws an error with a `statusCode` for validation failures (400) or duplicates (409).
 */
export async function createSupplierService(supplierData) {
  const { name, phone, gst_number } = supplierData;

  // 1. --- Validation ---
  if (!name || !name.trim()) {
    const err = new Error("Supplier name is required.");
    err.statusCode = 400; // Bad Request
    throw err;
  }
  if (gst_number && !/^[0-9A-Z]{15}$/.test(gst_number.trim())) {
    const err = new Error(
      "Invalid GSTIN format. It must be 15 alphanumeric characters.",
    );
    err.statusCode = 400; // Bad Request
    throw err;
  }
  if (phone && !/^\d{10,15}$/.test(phone.trim())) {
    const err = new Error(
      "Invalid phone number format. It must be 10-15 digits.",
    );
    err.statusCode = 400; // Bad Request
    throw err;
  }

  // Create a clean data object to work with and save to the database.
  const normalizedData = {
    ...supplierData,
    name: name.trim(),
    phone: phone ? phone.trim() : null,
    gst_number: gst_number ? gst_number.trim().toUpperCase() : null,
  };

  try {
    // If a phone number is provided, check if it's unique.
    // if (normalizedData.phone) {
    //   const existingByPhone = await supplierRepository.findByPhone(
    //     normalizedData.phone
    //   );
    //   if (existingByPhone) {
    //     const err = new Error(
    //       "A supplier with this phone number already exists."
    //     );
    //     err.statusCode = 409; // Conflict
    //     throw err;
    //   }
    // }

    // If all checks pass, create the new supplier.
    const newSupplier = await createSupplier(normalizedData);
    return newSupplier;
  } catch (error) {
    // Re-throw our custom validation/duplicate errors so the controller can catch them.
    if (error.statusCode) {
      throw error;
    }

    // For any other unexpected errors, log them and throw a generic server error.
    console.error("Error in addSupplier service:", error);
    throw new Error("Failed to add supplier due to a server error.");
  }
}
export async function listSuppliers() {
  return await getAllSuppliers();
}

export function getSupplier(id) {
  const supplier = getSupplierById(id);
  if (!supplier) throw new Error("Supplier not found");
  return supplier;
}

export function editSupplier(id, data) {
  const existing = getSupplierById(id);
  if (!existing) throw new Error("Supplier not found");

  const updated = updateSupplier(id, data);
  if (!updated) throw new Error("Update failed");

  return { message: "Supplier updated successfully" };
}

export function removeSupplier(id) {
  const deleted = deleteSupplier(id);
  if (!deleted) throw new Error("Delete failed or supplier not found");

  return { message: "Supplier deleted successfully" };
}

export const getSupplierLedgerService = async (supplierId, filters) => {
  return getSupplierLedger(supplierId, filters);
};
