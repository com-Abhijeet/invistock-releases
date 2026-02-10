import * as salesService from "../services/salesService.mjs";

/**
 * @description Creates a new sale with its items.
 * @route POST /api/sales
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @returns {object} Response with the new sale data.
 */
export const createSaleController = async (req, res) => {
  try {
    const saleData = req.body;

    if (!saleData || !saleData.items || saleData.items.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Missing sale data or items in the request body.",
      });
    }

    const newSale = await salesService.createSaleWithItems(saleData);

    return res.status(201).json({
      status: "success",
      message: "Sale created successfully.",
      data: newSale,
    });
  } catch (error) {
    console.error("Error in createSaleController:", error.message);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to create sale.",
    });
  }
};

/**
 * @description Updates an existing sale.
 * @route PUT /api/sales/:id
 */
export const updateSaleController = async (req, res) => {
  try {
    const saleId = parseInt(req.params.id);
    const saleData = req.body;

    if (isNaN(saleId) || saleId <= 0) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid Sale ID." });
    }

    if (!saleData || !saleData.items || saleData.items.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Missing sale data or items in the request body.",
      });
    }

    const updatedSale = await salesService.updateSaleWithItemsService(
      saleId,
      saleData,
    );

    return res.status(200).json({
      status: "success",
      message: "Sale updated successfully.",
      data: updatedSale,
    });
  } catch (error) {
    console.error("Error in updateSaleController:", error.message);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to update sale.",
    });
  }
};

/**
 * @description Gets a paginated list of sales.
 * @route GET /api/sales/
 * @param {object} req - Express request object (query: page, limit).
 * @param {object} res - Express response object.
 * @returns {object} Paginated sales data.
 */
export const getSalesPaginatedController = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "10");

    const result = await salesService.getSalesPaginated(page, limit);

    return res.status(200).json({
      status: "success",
      message: "Sales fetched successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Error in getSalesPaginatedController:", error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * @description Gets a sale by its ID, including all items.
 * @route GET /api/sales/:id
 * @param {object} req - Express request object (params: id).
 * @param {object} res - Express response object.
 * @returns {object} Response with sale details.
 */
export const getSaleByIdController = async (req, res) => {
  try {
    const saleId = parseInt(req.params.id);
    if (isNaN(saleId) || saleId <= 0) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid Sale ID." });
    }

    const sale = await salesService.getSaleWithItemsByIdService(saleId);
    if (!sale) {
      return res
        .status(404)
        .json({ status: "error", message: "Sale not found." });
    }

    return res.status(200).json({
      status: "success",
      message: "Sale details fetched successfully.",
      data: sale,
    });
  } catch (error) {
    console.error("Error in getSaleByIdController:", error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * @description Deletes a sale by its ID.
 * @route DELETE /api/sales/:id
 * @param {object} req - Express request object (params: id).
 * @param {object} res - Express response object.
 * @returns {object} Response confirming deletion.
 */
export const deleteSaleByIdController = async (req, res) => {
  try {
    const saleId = parseInt(req.params.id);
    if (isNaN(saleId) || saleId <= 0) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid Sale ID." });
    }

    const result = await salesService.deleteSaleById(saleId);

    return res.status(200).json({
      status: "success",
      message: "Sale deleted successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Error in deleteSaleByIdController:", error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * @description Gets a summary of sales data.
 * @route GET /api/sales/summary
 * @param {object} req - Express request object (query: start_date, end_date).
 * @param {object} res - Express response object.
 * @returns {object} Response with sales summary data.
 */
export const getSalesSummaryController = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const result = await salesService.getSalesSummary(start_date, end_date);

    return res.status(200).json({
      status: "success",
      message: "Sales summary fetched.",
      data: result,
    });
  } catch (error) {
    console.error("Error in getSalesSummaryController:", error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * Handles the Sales Return / Credit Note request.
 * POST /api/sales/return
 */
export function processSalesReturnController(req, res) {
  try {
    const { saleId, returnItems, note } = req.body;

    const result = salesService.processSalesReturnService({
      saleId,
      returnItems,
      note,
    });

    res.status(200).json({
      success: true,
      message: "Return processed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Sales Return Error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * @description Updates the status of a sale.
 * @route PUT /api/sales/:id/status
 * @param {object} req - Express request object (params: id, body: status).
 * @param {object} res - Express response object.
 * @returns {object} Response with the update result.
 */
export const updateSaleStatusController = async (req, res) => {
  try {
    const saleId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(saleId) || saleId <= 0 || !status) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid Sale ID or status." });
    }

    const result = await salesService.updateSaleStatusService(saleId, status);

    // Check if any rows were affected
    if (result.changes === 0) {
      return res.status(404).json({
        status: "error",
        message: "Sale not found or status is the same.",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Sale status updated successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Error in updateSaleStatusController:", error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * @description Gets sales for a specific customer.
 * @route GET /api/sales/customer/:customer_id
 * @param {object} req - Express request object (params: customer_id, query: page, limit, all).
 * @param {object} res - Express response object.
 * @returns {object} Response with customer sales data.
 */
export const getCustomerSalesController = async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const filters = req.query;

    if (isNaN(customerId) || customerId <= 0) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid Customer ID." });
    }

    const sales = await salesService.getCustomerSales(customerId, filters);

    return res.status(200).json({
      status: "success",
      message: "Customer sales fetched.",
      data: sales,
    });
  } catch (error) {
    console.error("Error in getCustomerSalesController:", error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * @description Searches for sales by reference number.
 * @route GET /api/sales/search
 * @param {object} req - Express request object (query: q).
 * @param {object} res - Express response object.
 * @returns {object} Response with matching sales data.
 */
export const searchSalesByReferenceController = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== "string" || q.length < 2) {
      return res.status(400).json({
        status: "error",
        message:
          "Query parameter 'q' is required and must be at least 2 characters.",
      });
    }

    const result = await salesService.searchSalesByReference(q);

    return res.status(200).json({
      status: "success",
      message: "Sales matched.",
      data: result,
    });
  } catch (error) {
    console.error("Error in searchSalesByReferenceController:", error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/* ------------------------------------- STATS CONTROLLERS ------------------------------------- */

/**
 * @description Gets sales trend data.
 * @route GET /api/sales/stats/trend
 * @param {object} req - Express request object (query: filter, year, start_date, end_date).
 * @param {object} res - Express response object.
 * @returns {object} Sales trend data.
 */
export async function getSalesTrendController(req, res) {
  try {
    const data = await salesService.getSalesTrend(req.query);
    return res.status(200).json({ status: "success", data });
  } catch (err) {
    console.error("Error in getSalesTrendController:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
}

/**
 * @description Gets financial metrics for sales.
 * @route GET /api/sales/stats/financial
 * @param {object} req - Express request object (query: filter, year, start_date, end_date).
 * @param {object} res - Express response object.
 * @returns {object} Financial metrics data.
 */
export async function getFinancialMetricsController(req, res) {
  try {
    const metrics = await salesService.getFinancialMetrics(req.query);
    return res.status(200).json({ status: "success", data: metrics });
  } catch (err) {
    console.error("Error in getFinancialMetricsController:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
}

/**
 * @description Gets order-related metrics.
 * @route GET /api/sales/stats/orders
 * @param {object} req - Express request object (query: filter, year, start_date, end_date).
 * @param {object} res - Express response object.
 * @returns {object} Order metrics data.
 */
export async function getOrderMetricsController(req, res) {
  try {
    const metrics = await salesService.getOrderMetrics(req.query);
    return res.status(200).json({ status: "success", data: metrics });
  } catch (err) {
    console.error("Error in getOrderMetricsController:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
}

/**
 * @description Gets a list of top customers by sales.
 * @route GET /api/sales/stats/top-customers
 * @param {object} req - Express request object (query: filter, year, start_date, end_date, limit).
 * @param {object} res - Express response object.
 * @returns {object} Top customers data.
 */
export async function getTopCustomersController(req, res) {
  try {
    const data = await salesService.getTopCustomers(req.query);
    return res.status(200).json({ status: "success", data });
  } catch (err) {
    console.error("Error in getTopCustomersController:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
}

/**
 * @description Gets a list of top-selling products.
 * @route GET /api/sales/stats/top-products
 * @param {object} req - Express request object (query: filter, year, start_date, end_date, limit).
 * @param {object} res - Express response object.
 * @returns {object} Top products data.
 */
export async function getTopProductsController(req, res) {
  try {
    const data = await salesService.getTopProducts(req.query);
    return res.status(200).json({ status: "success", data });
  } catch (err) {
    console.error("Error in getTopProductsController:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
}

/**
 * @description Gets revenue data grouped by category.
 * @route GET /api/sales/stats/category-revenue
 * @param {object} req - Express request object (query: filter, year, start_date, end_date).
 * @param {object} res - Express response object.
 * @returns {object} Category revenue data.
 */
export async function getCategoryRevenueController(req, res) {
  try {
    const data = await salesService.getCategoryRevenue(req.query);
    return res.status(200).json({ status: "success", data });
  } catch (err) {
    console.error("Error in getCategoryRevenueController:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
}

/**
 * @description Gets sales breakdown by payment mode.
 * @route GET /api/sales/stats/payment-mode-breakdown
 * @param {object} req - Express request object (query: filter, year, start_date, end_date).
 * @param {object} res - Express response object.
 * @returns {object} Payment mode breakdown data.
 */
export async function getPaymentModeBreakdownController(req, res) {
  try {
    const data = await salesService.getPaymentModeBreakdown(req.query);
    return res.status(200).json({ status: "success", data });
  } catch (err) {
    console.error("Error in getPaymentModeBreakdownController:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
}

/**
 * @description Gets outstanding credit sales.
 * @route GET /api/sales/stats/credit-sales
 * @param {object} req - Express request object (query: filter, year, start_date, end_date).
 * @param {object} res - Express response object.
 * @returns {object} Credit sales data.
 */
export async function getCreditSalesController(req, res) {
  try {
    const data = await salesService.getCreditSales(req.query);
    return res.status(200).json({ status: "success", data });
  } catch (err) {
    console.error("Error in getCreditSalesController:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
}

/**
 * @description Gets the day with the highest sales revenue.
 * @route GET /api/sales/stats/best-day
 * @param {object} req - Express request object (query: filter, year, start_date, end_date).
 * @param {object} res - Express response object.
 * @returns {object} Data for the best sales day.
 */
export async function getBestSalesDayController(req, res) {
  try {
    const data = await salesService.getBestSalesDay(req.query);
    return res.status(200).json({ status: "success", data });
  } catch (err) {
    console.error("Error in getBestSalesDayController:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
}

/**
 * @description Gets sales table data with pagination.
 * @route GET /api/sales/stats/table
 * @param {object} req - Express request object (query: page, limit, ...filters).
 * @param {object} res - Express response object.
 * @returns {object} Paginated sales table data.
 */
export async function getSalesTableController(req, res) {
  try {
    const { page, limit } = req.query;

    const data = await salesService.getSalesTable({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      ...req.query,
    });

    return res.status(200).json({
      status: "success",
      records: data.records,
      totalRecords: data.totalRecords,
    });
  } catch (err) {
    console.error("Error in getSalesTableController:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
}

/*
 *
 *
 *
 *
 */

export async function getCustomerSalesKPIController(req, res) {
  try {
    const customerId = req.params.id;
    const data = await salesService.fetchCustomerSalesKPIService(customerId);
    return res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (error) {
    console.error("Error in getSalesTableController:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
}
