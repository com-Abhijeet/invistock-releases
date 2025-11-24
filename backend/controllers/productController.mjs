import * as productService from "../services/productService.mjs";
import { sendResponse } from "../utils/response.mjs";
import * as ProductRepo from "../repositories/productRepository.mjs";

export const createProduct = async (req, res) => {
  try {
    const product = await productService.create(req.body);
    sendResponse(res, 201, "Product created", product);
  } catch (error) {
    console.error(
      `[BACKEND] - PRODUCT CONTROLLER - ERROR IN GETTING ALL PRODUCTS CONTROLLER ${error}`
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * @description Controller to handle the GET /api/products request with filtering and pagination.
 * @route GET /api/products?page=1&limit=10&query=search&isActive=true
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 */
export const getProducts = async (req, res) => {
  try {
    // 1. Pass all query filters directly to the service layer
    console.log("original request url : ", req.originalUrl);
    const products = await productService.getAllProducts(req.query);

    // 2. Send a successful JSON response
    res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      data: products,
    });
  } catch (error) {
    console.error(
      `[BACKEND] - PRODUCT CONTROLLER - ERROR IN GETTING ALL PRODUCTS CONTROLLER ${error}`
    );

    res.status(500).json({
      success: false,
      message: "Failed to retrieve products.",
      error: "An internal server error occurred.",
    });
  }
};

export const getProduct = async (req, res) => {
  const product = await productService.getById(req.params.id);
  if (!product) return sendResponse(res, 404, "Product not found");
  sendResponse(res, 200, "Product found", product);
};

export async function getProductHistoryController(req, res) {
  try {
    const { id } = req.params;
    const data = productService.getProductHistoryById(Number(id));
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(
      `[BACKEND] - PRODUCT CONTROLLER - ERROR IN GETTING PRODUCT HISTORY CONTROLLER ${error}`
    );
    res.status(500).json({ success: false, error: error.message });
  }
}

export const updateProduct = async (req, res) => {
  try {
    const existing = await productService.getById(req.params.id);
    if (!existing) return sendResponse(res, 404, "Product not found");
    const updated = await productService.update(req.params.id, req.body);
    sendResponse(res, 200, "Product updated", updated);
  } catch (error) {
    console.error(
      `[BACKEND] - PRODUCT CONTROLLER - ERROR IN GETTING UPDATING PRODUCT CONTROLLER ${error}`
    );
    return res.status(500).json({ message: "Error in updating product" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const existing = await productService.getById(req.params.id);
    if (!existing) return sendResponse(res, 404, "Product not found");
    productService.remove(req.params.id);
    sendResponse(res, 200, "Product deleted");
  } catch (error) {
    console.error(
      `[BACKEND] - PRODUCT CONTROLLER - ERROR IN DELETING PRODUCT CONTROLLER ${error}`
    );
    sendResponse(res, 500, "Internal Server Error");
  }
};

/**
 * @description Controller to handle bulk importing of products from an Excel file.
 * @route POST /api/products/import
 */
export const importProducts = async (req, res) => {
  const { filePath, mappings } = req.body;
  if (!filePath || !mappings) {
    return res.status(400).json({
      success: false,
      message: "File path and mappings are required.",
    });
  }
  try {
    const result = await productService.importProducts(filePath, mappings);
    res.status(200).json({
      success: true,
      message: `${result.count} products imported successfully.`,
      data: result,
    });
  } catch (error) {
    console.error(
      `[BACKEND] - PRODUCT CONTROLLER - ERROR IN IMPORTING ALL PRODUCTS CONTROLLER ${error}`
    );
    res.status(500).json({ success: false, message: error.message });
  }
};

// This controller is now updated to accept query parameters
export async function getNextProductCodeController(req, res) {
  try {
    const { categoryCode, subcategoryCode } = req.query;
    if (!categoryCode || !subcategoryCode) {
      return res.status(400).json({
        success: false,
        error:
          "categoryCode and subcategoryCode query parameters are required.",
      });
    }

    const nextCode = ProductRepo.getNextProductCode(
      categoryCode,
      subcategoryCode
    );
    res.status(200).json({ success: true, code: nextCode });
  } catch (error) {
    console.error(
      `[BACKEND] - PRODUCT CONTROLLER - ERROR IN GETTING PRODUCT CODE CONTROLLER ${error}`
    );
    res.status(500).json({ success: false, error: error.message });
  }
}

// This controller remains unchanged
export async function getNextBarcodeController(req, res) {
  try {
    const nextBarcode = ProductRepo.getNextBarcode();
    res.status(200).json({ success: true, barcode: String(nextBarcode) });
  } catch (error) {
    console.error(
      `[BACKEND] - PRODUCT CONTROLLER - ERROR IN GETTING PRODUCT BARCODE CONTROLLER ${error}`
    );
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getLowStockProductsController(req, res) {
  try {
    const products = ProductRepo.getLowStockProducts();
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getLowStockCountController(req, res) {
  try {
    const count = ProductRepo.getLowStockCount();
    res.status(200).json({ success: true, data: count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Controller for the mobile product view.
 * Handles filtering by query, category, and subcategory.
 */
export async function getProductsForMobileController(req, res) {
  try {
    // Parse query params from the request
    const options = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      query: req.query.query || "",
      category: req.query.category ? Number(req.query.category) : null,
      subcategory: req.query.subcategory ? Number(req.query.subcategory) : null,
      isActive:
        req.query.isActive !== undefined ? Number(req.query.isActive) : 1,
    };

    const data = ProductRepo.getProductsForMobile(options);
    res.status(200).json(data); // Send back { records, totalRecords }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
