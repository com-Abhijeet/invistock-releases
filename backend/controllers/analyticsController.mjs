import {
  getPredictiveRestockService,
  getDeadStockService,
  getCustomerInsightsService,
  getProductABCService,
} from "../services/analyticsService.mjs";

export function getPredictiveRestock(req, res) {
  try {
    const data = getPredictiveRestockService();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.log(
      "[BACKEND] ERROR IN ANALYTICS CONTROLLER : Get predictive stock controller",
      error
    );
    res.status(500).json({ success: false, error: error.message });
  }
}

export function getDeadStock(req, res) {
  try {
    const days = Number(req.query.days) || 180; // Default to 6 months
    const data = getDeadStockService(days);

    // Calculate Summary Stats on the fly
    const totalCapitalStuck = data.reduce(
      (sum, item) => sum + item.capital_stuck,
      0
    );
    const totalItems = data.length;

    res.status(200).json({
      success: true,
      data: {
        report: data,
        summary: { totalCapitalStuck, totalItems },
      },
    });
  } catch (error) {
    console.log(
      "[BACKEND] ERROR IN ANALYTICS CONTROLLER : Get dead stock controller",
      error
    );
    res.status(500).json({ success: false, error: error.message });
  }
}

export function getCustomerInsights(req, res) {
  try {
    const dormantDays = Number(req.query.days) || 90;
    const data = getCustomerInsightsService(dormantDays);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.log(
      "[BACKEND] ERROR IN ANALYTICS CONTROLLER : Get customer insights controller",
      error
    );
    res.status(500).json({ success: false, error: error.message });
  }
}

export function getProductABC(req, res) {
  try {
    const days = Number(req.query.days) || 365;
    const data = getProductABCService(days);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.log(
      "[BACKEND] ERROR IN ANALYTICS CONTROLLER : Get product abc controller",
      error
    );
    res.status(500).json({ success: false, error: error.message });
  }
}
