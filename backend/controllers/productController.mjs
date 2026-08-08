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

export async function lookupBarcodeProductController(req, res) {
  try {
    const barcode = String(req.query.barcode || "").replace(/\D/g, "");
    if (!barcode || ![8, 12, 13, 14].includes(barcode.length)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Enter a valid 8, 12, 13, or 14 digit EAN/UPC/GTIN.",
        });
    }

    const barcodeLookupKey = process.env.BARCODE_LOOKUP_API_KEY;
    const lookupTargets = [];
    const gtin = barcode.padStart(14, "0");
    const gs1Text = (value) => {
      if (typeof value === "string" || typeof value === "number") return String(value);
      if (!value || typeof value !== "object") return "";
      if (typeof value.value === "string") return value.value;
      if (typeof value.text === "string") return value.text;
      if (typeof value.name === "string") return value.name;
      if (typeof value.url === "string") return value.url;
      return Object.values(value).find((entry) => typeof entry === "string") || "";
    };
    const gs1LookupUrl = process.env.GS1_LOOKUP_URL;

    // GS1/GS1 DataKart is intentionally configured, rather than scraped. The
    // public Verified by GS1 website is rate-limited; a retailer API endpoint
    // must be supplied by the organisation's GS1 provider.
    if (gs1LookupUrl) {
      lookupTargets.push(
        gs1LookupUrl.includes("{gtin}")
          ? gs1LookupUrl.replace("{gtin}", encodeURIComponent(gtin))
          : `${gs1LookupUrl}${gs1LookupUrl.includes("?") ? "&" : "?"}gtin=${encodeURIComponent(gtin)}`,
      );
    }

    if (barcodeLookupKey) {
      lookupTargets.push(
        `https://api.barcodelookup.com/v3/products?barcode=${encodeURIComponent(barcode)}&formatted=y&key=${encodeURIComponent(barcodeLookupKey)}`,
      );
    }

    lookupTargets.push(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
    );
    lookupTargets.push(
      `https://api.gtin.io/gtin/${encodeURIComponent(barcode)}`,
    );

    let productData = null;

    for (const target of lookupTargets) {
      try {
        const response = await fetch(target, {
          headers: {
            Accept: "application/json",
            ...(target === lookupTargets[0] && gs1LookupUrl && process.env.GS1_API_KEY
              ? { Authorization: `Bearer ${process.env.GS1_API_KEY}` }
              : {}),
          },
        });
        if (!response.ok) continue;

        const payload = await response.json();

        if (target === lookupTargets[0] && gs1LookupUrl) {
          const item =
            payload.product ||
            payload.data?.product ||
            payload.data ||
            payload.products?.[0] ||
            payload;
          const name = gs1Text(
            item.productDescription || item.product_description || item.tradeItemDescription || item.description || item.name,
          );
          if (name) {
            const netContent = gs1Text(item.netContent || item.net_content || item.netContentDescription || item.quantity);
            const rawCategory = gs1Text(item.productCategoryName || item.categoryName || item.category);
            const categoryParts = String(rawCategory)
              .split(/\s*>\s*|\s*,\s*/)
              .filter(Boolean);
            const gpcCode = gs1Text(item.gpcCode || item.gpc_code || item.globalProductCategory);
            const manufacturer = gs1Text(item.manufacturer || item.manufacturerName || item.informationProviderName);
            productData = {
              barcode,
              gtin: gs1Text(item.gtin) || gtin,
              name,
              brand: gs1Text(item.brandName || item.brand_name || item.brand),
              description: [
                manufacturer && `Manufacturer: ${manufacturer}`,
                gpcCode && `GS1 GPC: ${gpcCode}`,
                gs1Text(item.countryOfSale) && `Country of sale: ${gs1Text(item.countryOfSale)}`,
              ]
                .filter(Boolean)
                .join(" • "),
              image_url:
                gs1Text(item.productImageUrl || item.product_image_url || item.imageUrl || item.image),
              size: netContent,
              weight: netContent,
              hsn: gs1Text(item.hsn || item.hsnCode || item.hsn_code),
              // A numeric GPC code is a classification ID, not a category name.
              category: /^\d+$/.test(String(rawCategory)) ? "" : categoryParts[0] || "",
              subcategory: /^\d+$/.test(String(rawCategory))
                ? ""
                : categoryParts.slice(1).join(" > "),
              gpc_code: gpcCode,
              source: "gs1",
            };
            break;
          }
        }

        if (target.includes("barcodelookup")) {
          const item = payload.products?.[0];
          if (item) {
            // A retailer/listing price is not necessarily the printed Indian
            // MRP (and may be in another currency), so do not label it MRP.
            const priceCandidate = item.mrp || null;
            const categoryCandidate =
              item.category || item.category_name || item.product_type || "";
            const categoryParts = String(categoryCandidate)
              .split(/\s*>\s*|\s*,\s*/)
              .map((part) => part.trim())
              .filter(Boolean);
            const manufacturer = item.manufacturer || item.manufacturer_name || "";

            productData = {
              barcode,
              gtin,
              name: item.product_name || item.title || "",
              // Barcode Lookup supplies a manufacturer separately. Use it as a
              // brand only when its brand field is absent, never as the name.
              brand: item.brand || manufacturer || "",
              description:
                item.description ||
                item.comments ||
                (manufacturer ? `Manufacturer: ${manufacturer}` : ""),
              image_url: item.images?.[0] || item.image || "",
              size: item.size || item.weight || "",
              weight: item.weight || item.size || "",
              mrp: priceCandidate
                ? Number(String(priceCandidate).replace(/[^0-9.]/g, "")) || null
                : null,
              gst_rate:
                item.gst_rate || item.gst || item.tax_rate || item.tax || null,
              hsn: item.hsn || item.hsn_code || item.hsn_sac || "",
              category: categoryParts[0] || "",
              subcategory: categoryParts.slice(1).join(" > "),
              source: "barcodelookup",
            };
            break;
          }
        }

        if (
          target.includes("openfoodfacts") &&
          payload.status === 1 &&
          payload.product
        ) {
          const product = payload.product;
          const categoryTags = (product.categories_tags || [])
            .map((tag) => String(tag).replace(/^[a-z]{2}:/, "").replace(/-/g, " "))
            .filter(Boolean);
          productData = {
            barcode,
            gtin,
            name:
              product.product_name ||
              product.product_name_en ||
              product.generic_name ||
              "",
            brand: product.brands || "",
            description:
              [product.generic_name, product.ingredients_text]
                .filter(Boolean)
                .join(" • ") || "",
            image_url: product.image_url || product.image_front_small_url || "",
            size: product.quantity || "",
            weight: product.quantity || "",
            // Open Food Facts is a food-only catalogue. Its taxonomy is
            // multi-valued, so keep the inventory category broad and use the
            // most specific taxonomy tag as the subcategory.
            category: categoryTags.length ? "Food" : "",
            subcategory: categoryTags.at(-1) || "",
            source: "openfoodfacts",
          };
          break;
        }

        if (target.includes("gtin.io") && payload?.gtin) {
          const item = payload;
          const categoryParts = String(item.product?.category || item.category || "")
            .split(/\s*>\s*|\s*,\s*/)
            .map((part) => part.trim())
            .filter(Boolean);
          productData = {
            barcode,
            gtin: item.gtin || gtin,
            name: item.product?.name || item.name || "",
            brand: item.product?.brand || item.brand || "",
            description: item.product?.description || item.description || "",
            image_url: item.product?.image || item.image || "",
            size: item.product?.size || item.size || "",
            weight: item.product?.weight || item.weight || "",
            category: categoryParts[0] || "",
            subcategory: categoryParts.slice(1).join(" > "),
            source: "gtinio",
          };
          break;
        }
      } catch (error) {
        console.error("lookupBarcodeProductController - fetch failed", error);
      }
    }

    if (!productData) {
      return res.status(404).json({
        success: false,
        message: "No product found for that barcode.",
      });
    }

    res.status(200).json({ success: true, data: productData });
  } catch (error) {
    console.error("lookupBarcodeProductController -", error);
    res.status(500).json({ success: false, message: "Barcode lookup failed." });
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
      return res
        .status(400)
        .json({ success: false, message: "Valid product IDs are required" });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Update data is required" });
    }

    const result = await productService.bulkUpdate(productIds, updateData);
    res.status(200).json({
      success: true,
      message: `${result.changes} products updated successfully.`,
      data: result,
    });
  } catch (error) {
    console.error("bulkUpdateProductsController -", error);
    return res
      .status(500)
      .json({ success: false, message: "Error in bulk updating products" });
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
      return res
        .status(400)
        .json({ success: false, message: "No image provided" });
    }

    const requireConfig = createRequire(import.meta.url);
    const config = requireConfig("../../electron/config.js");

    // Extract base64 data and extension
    const matches = base64Image.match(
      /^data:image\/([A-Za-z-+\/]+);base64,(.+)$/,
    );
    if (!matches || matches.length !== 3) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid base64 string" });
    }

    let ext = matches[1].toLowerCase();
    if (ext === "jpeg") ext = "jpg";
    const buffer = Buffer.from(matches[2], "base64");

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
