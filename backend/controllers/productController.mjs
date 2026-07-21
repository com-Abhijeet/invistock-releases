import * as productService from "../services/productService.mjs";
import { sendResponse } from "../utils/response.mjs";
import * as ProductRepo from "../repositories/productRepository.mjs";

export const createProduct = async (req, res) => {
  try {
    const product = await productService.create(req.body);
    sendResponse(res, 201, "Product created", product);
  } catch (error) {
    console.error("createProduct -", error);
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
    console.error("getProducts -", error);

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
    console.error("getProductHistoryController -", error);
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
    console.error("updateProduct -", error);
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
    console.error("deleteProduct -", error);
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
    console.error("importProducts -", error);
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
      subcategoryCode,
    );
    res.status(200).json({ success: true, code: nextCode });
  } catch (error) {
    console.error("getNextProductCodeController -", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// This controller remains unchanged
export async function getNextBarcodeController(req, res) {
  try {
    const nextBarcode = ProductRepo.getNextBarcode();
    res.status(200).json({ success: true, barcode: String(nextBarcode) });
  } catch (error) {
    console.error("getNextBarcodeController -", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getLowStockProductsController(req, res) {
  try {
    const products = ProductRepo.getLowStockProducts();
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error("getLowStockProductsController -", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getLowStockCountController(req, res) {
  try {
    const count = ProductRepo.getLowStockCount();
    res.status(200).json({ success: true, data: count });
  } catch (error) {
    console.error("getLowStockCountController -", error);
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
    console.error("getProductsForMobileController -", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export const getMissingBatchesProductsController = async (req, res) => {
  try {
    const data = await productService.getMissingBatchesProducts();
    return res.status(200).json(data);
  } catch (error) {
    console.error("getMissingBatchesProductsController -", error);
  }
};

export const bulkUpdateProductsController = async (req, res) => {
  try {
    const { productIds, updateData } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: "Valid product IDs are required" });
    }
    
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "Update data is required" });
    }
    
    const result = await productService.bulkUpdate(productIds, updateData);
    res.status(200).json({
      success: true,
      message: `${result.changes} products updated successfully.`,
      data: result,
    });
  } catch (error) {
    console.error("bulkUpdateProductsController -", error);
    return res.status(500).json({ success: false, message: "Error in bulk updating products" });
  }
};

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createRequire } from "module";

export const uploadProductImageController = async (req, res) => {
  try {
    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ success: false, message: "No image provided" });
    }

    const requireConfig = createRequire(import.meta.url);
    const config = requireConfig("../../electron/config.js");
    
    // Extract base64 data and extension
    const matches = base64Image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, message: "Invalid base64 string" });
    }

    let ext = matches[1].toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    const buffer = Buffer.from(matches[2], 'base64');
    
    const fileName = `product_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const targetDir = path.join(config.userDataPath, "images", "products");
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const targetPath = path.join(targetDir, fileName);
    fs.writeFileSync(targetPath, buffer);
    
    res.status(200).json({ success: true, data: fileName });
  } catch (error) {
    console.error("uploadProductImageController -", error);
    res.status(500).json({ success: false, message: "Failed to upload image" });
  }
};
