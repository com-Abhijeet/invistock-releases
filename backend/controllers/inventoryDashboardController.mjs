import * as dashboardService from "../services/inventoryDashboardService.mjs";

export const getTopProductsController = (req, res) => {
  try {
    const data = dashboardService.fetchTopProducts(req.query);
    res
      .status(200)
      .json({ status: "success", message: "Top products fetched", data });
  } catch (error) {
    console.error(
      `[BACKEND] - INVENTORY DASHBOARD CONTROLLER - ERROR IN GETTING TOP PRODUCTS CONTROLLER ${error}`
    );
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch top products" });
  }
};

export const getCategorySalesController = (req, res) => {
  try {
    const data = dashboardService.fetchSalesByCategoryAndSubcategory(req.query);
    res.status(200).json({
      status: "success",
      message: "Category-wise sales fetched",
      data,
    });
  } catch (error) {
    console.error(
      `[BACKEND] - INVENTORY DASHBOARD CONTROLLER - ERROR IN GETTING CATEGORY SALES CONTROLLER ${error}`
    );
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch category sales" });
  }
};

export const getFastMovingController = (req, res) => {
  try {
    const data = dashboardService.fetchFastMovingProducts(req.query);
    res.status(200).json({
      status: "success",
      message: "Fast moving products fetched",
      data,
    });
  } catch (error) {
    console.error(
      `[BACKEND] - INVENTORY DASHBOARD CONTROLLER - ERROR IN GETTING FAST MOVING PRODUCTS CONTROLLER ${error}`
    );
    res.status(500).json({
      status: "error",
      message: "Failed to fetch fast moving products",
    });
  }
};

export const getSlowMovingController = (req, res) => {
  try {
    const data = dashboardService.fetchSlowMovingProducts(req.query);
    res.status(200).json({
      status: "success",
      message: "Slow moving products fetched",
      data,
    });
  } catch (error) {
    console.error(
      `[BACKEND] - INVENTORY DASHBOARD CONTROLLER - ERROR IN GETTING SLOW PRODUCTS CONTROLLER ${error}`
    );
    res.status(500).json({
      status: "error",
      message: "Failed to fetch slow moving products",
    });
  }
};

export const getTotalStockSummaryController = async (req, res) => {
  try {
    const result = await dashboardService.fetchTotalStockSummaryService();

    return res.status(200).json({
      status: "success",
      message: "Total stock summary fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      `[BACKEND] - INVENTORY DASHBOARD CONTROLLER - ERROR IN GETTING TOTAL STOCK SUMMARY CONTROLLER ${error}`
    );
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch total stock summary",
    });
  }
};
