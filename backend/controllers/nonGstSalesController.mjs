import { createNonGstSaleWithItems } from "../services/nonGstSalesService.mjs";
import * as NonGstRepo from "../repositories/nonGstSalesRepository.mjs";

/**
 * Controller to create a new Non-GST Sale.
 */
export async function createNonGstSaleController(req, res) {
  try {
    // Filter out invalid items.
    // Since we decoupled from products table, we check for product_name instead of product_id
    const payload = {
      ...req.body,
      items: req.body.items.filter(
        (item) => item.product_name && item.product_name.trim() !== ""
      ),
    };

    if (payload.items.length === 0) {
      return res
        .status(400)
        .json({ status: "error", error: "No valid items provided." });
    }

    const sale = createNonGstSaleWithItems(payload);
    res.status(201).json({ status: "success", data: sale });
  } catch (error) {
    console.error(
      `[BACKEND] - NG SALES CONTROLLER - ERROR IN CREATING NG SALES CONTROLLER ${error}`
    );
    res.status(500).json({ status: "error", error: error.message });
  }
}

/**
 * Controller to get a single Non-GST Sale by ID.
 */
export async function getNonGstSaleByIdController(req, res) {
  try {
    const { id } = req.params;
    const sale = NonGstRepo.getNonGstSaleWithItemsById(Number(id));
    if (!sale) {
      return res.status(404).json({ status: "error", error: "Sale not found" });
    }
    res.status(200).json({ status: "success", data: sale });
  } catch (error) {
    console.error(
      `[BACKEND] - NG SALES CONTROLLER - ERROR IN GETTING NG SALE BY ID CONTROLLER ${error}`
    );
    res.status(500).json({ status: "error", error: error.message });
  }
}

/**
 * Controller to get a paginated list of Non-GST Sales.
 */
export async function getNonGstSalesController(req, res) {
  try {
    const { page = 1, limit = 10, query = "" } = req.query;
    const options = {
      page: Number(page),
      limit: Number(limit),
      query: String(query),
    };
    const data = NonGstRepo.getPaginatedNonGstSales(options);
    res.status(200).json(data); // Send back { records, totalRecords }
  } catch (error) {
    console.error(
      `[BACKEND] - NG SALES CONTROLLER - ERROR IN GETTING NG SALES CONTROLLER ${error}`
    );
    res.status(500).json({ status: "error", error: error.message });
  }
}

/**
 * Controller to fetch unique product names for autocomplete suggestions.
 */
export async function getUniqueProductNamesController(req, res) {
  try {
    const names = NonGstRepo.getUniqueProductNames();
    res.status(200).json({ status: "success", data: names });
  } catch (error) {
    console.error(
      `[BACKEND] - NG SALES CONTROLLER - ERROR IN GETTING UNIQUE PRODUCTS ${error}`
    );
    res.status(500).json({ status: "error", error: error.message });
  }
}
