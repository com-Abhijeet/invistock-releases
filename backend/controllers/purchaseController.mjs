import * as purchaseService from "../services/purchaseService.mjs";
import * as PurchaseRepo from "../repositories/purchaseRepository.mjs";

// 🔹 Create a new purchase
export async function createPurchase(req, res) {
  const result = await purchaseService.createPurchase(req.body);
  res.status(201).json({
    status: "success",
    message: "Purchase created successfully",
    data: result,
  });
}

// 🔹 Get a single purchase by ID
export async function getPurchaseById(req, res) {
  const result = await purchaseService.getPurchaseById(req.params.id);
  if (!result) {
    return res
      .status(404)
      .json({ status: "error", message: "Purchase not found" });
  }
  res.json({ status: "success", data: result });
}

/**
 * @description Gets a paginated list of purchases for a specific supplier, with optional filters.
 * @route GET /api/suppliers/:id/purchases
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @returns {object} Response with a paginated list of purchases.
 */
export async function getPurchasesBySupplierIdController(req, res) {
  try {
    const supplierId = parseInt(req.params.id);
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "10");
    const filters = {
      page,
      limit,
      query: req.query.query || null,
      filter: req.query.filter || null,
      year: req.query.year || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
    };

    if (isNaN(supplierId) || supplierId <= 0) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid supplier ID." });
    }

    const result = await purchaseService.getPurchasesBySupplierIdService(
      supplierId,
      filters
    );
    return res.status(200).json({ status: "success", data: result });
  } catch (error) {
    console.error(
      "Error in getPurchasesBySupplierIdController:",
      error.message
    );
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch supplier purchases.",
    });
  }
}

export async function getPurchaseItemsForLabelsController(req, res) {
  try {
    const { id } = req.params;
    const items = PurchaseRepo.getPurchaseItemsForLabels(Number(id));
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// 🔹 Update a purchase by ID
export async function updatePurchase(req, res) {
  await purchaseService.updatePurchase(req.params.id, req.body);
  res.json({ status: "success", message: "Purchase updated" });
}

// 🔹 Delete a purchase by ID
export async function deletePurchase(req, res) {
  await purchaseService.deletePurchase(req.params.id);
  res.json({ status: "success", message: "Purchase deleted" });
}

// 🔹 Get all purchases with filters & pagination
export async function getAllPurchases(req, res) {
  const result = await purchaseService.getAllPurchases(req.query);

  res.json({ status: "success", data: result });
}

export async function getPurchaseSummary(req, res) {
  try {
    const data = await purchaseService.getPurchaseSummaryService(req.query);
    res.status(200).json({ status: "success", data });
  } catch (err) {
    console.error("Error in getPurchaseSummary:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}

export async function getTopSuppliers(req, res) {
  try {
    const data = await purchaseService.getTopSuppliersService(req.query);
    res.status(200).json({ status: "success", data });
  } catch (err) {
    console.error("Error in getTopSuppliers:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}

export async function getCategorySpend(req, res) {
  try {
    const data = await purchaseService.getCategorySpendService(req.query);
    res.status(200).json({ status: "success", data });
  } catch (err) {
    console.error("Error in getCategorySpend:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}

export async function getPurchaseTrend(req, res) {
  try {
    const data = await purchaseService.getPurchaseSummaryService(req.query); // reused from summary
    res.status(200).json({ status: "success", data });
  } catch (err) {
    console.error("Error in getPurchaseTrend:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}

export async function getPurchaseStats(req, res) {
  try {
    const data = await purchaseService.getPurchaseStatsService();
    res.status(200).json({ status: "success", data });
  } catch (err) {
    console.error("Error in getPurchaseStats:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}
