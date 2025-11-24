import * as productRepo from "../repositories/productRepository.mjs"; // Adjust path as needed
import xlsx from "xlsx";
export const create = async (data) => {
  try {
    // Create product
    const product = await productRepo.createProduct(data);
    return product;
  } catch (err) {
    throw new Error(err.message || "Failed to create product");
  }
};

/**
 * @description Retrieves a paginated and filtered list of products.
 * @param {object} [filters={}] - The filter and pagination options.
 * @param {string|number} [filters.page=1] - The page number.
 * @param {string|number} [filters.limit=10] - The number of items per page.
 * @param {string} [filters.query=""] - The search query.
 * @param {boolean} [filters.isActive] - The active status of the products.
 * @param {boolean} [filters.all=false] - Whether to fetch all products without pagination.
 * @returns {Promise<object>} The paginated list of products.
 */
export async function getAllProducts(filters) {
  try {
    // Sanitize and provide default values
    const params = {
      page: parseInt(filters.page) || 1,
      limit: parseInt(filters.limit) || 10,
      query: filters.query || "",
      isActive: filters.isActive,
      all: filters.all === "true",
    };

    const products = productRepo.getAllProducts(params);
    return products;
  } catch (error) {
    console.error("Error in getAllProducts service:", error.message);
    throw new Error("Failed to retrieve products from the database.");
  }
}
export const getById = (id) => productRepo.getProductById(id);
export const getProductHistoryById = (id) => productRepo.getProductHistory(id);
export const update = (id, data) => productRepo.updateProduct(id, data);
export const remove = (id) => productRepo.deleteProduct(id);

/**
 * @description Reads an Excel file, applies column mappings, and bulk inserts the data.
 * @param {string} filePath - The path to the Excel file.
 * @param {object} mappings - The user-defined column mappings.
 * @returns {Promise<object>} The result of the import operation.
 */
export async function importProducts(filePath, mappings) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, {
      raw: true,
      rawNumbers: true,
    });

    // ✅ Define all fields required by the 'bulkInsertProducts' repository function
    const dbFields = [
      "name",
      "product_code",
      "mrp",
      "mop",
      "gst_rate",
      "quantity",
      "hsn",
      "brand",
      "mfw_price",
      "low_stock_threshold",
      "size",
      "weight",
    ];

    const productsToInsert = data.map((row) => {
      const newProduct = {};

      // 1. Map data from the excel row to our database schema based on user's choices
      for (const dbField in mappings) {
        const excelHeader = mappings[dbField];
        if (excelHeader && row[excelHeader] !== undefined) {
          newProduct[dbField] = row[excelHeader];
        }
      }

      // ✅ 2. Ensure all required fields have a default value if they weren't mapped
      dbFields.forEach((field) => {
        if (newProduct[field] === undefined) {
          // Use 0 for numbers and null for strings
          if (["mrp", "mop", "gst_rate", "quantity"].includes(field)) {
            newProduct[field] = 0;
          } else {
            newProduct[field] = null;
          }
        }
      });

      return newProduct;
    });

    const result = await productRepo.bulkInsertProducts(productsToInsert);
    return { success: true, count: result.changes };
  } catch (error) {
    console.error("Error in importProducts service:", error.message);
    throw new Error("Failed to process and import products.");
  }
}
