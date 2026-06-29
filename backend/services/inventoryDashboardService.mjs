import {
  getTopProducts,
  getSalesByCategoryAndSubcategory,
  getFastMovingProducts,
  getSlowMovingProducts,
  getTotalStockSummary,
  getInventoryHealthMetrics,
} from "../repositories/salesStatsRepository.mjs";

export const fetchTopProducts = (filters) => {
  return getTopProducts(filters);
};

export const fetchSalesByCategoryAndSubcategory = (filters) => {
  return getSalesByCategoryAndSubcategory(filters);
};

export const fetchFastMovingProducts = (filters) => {
  return getFastMovingProducts(filters);
};

export const fetchSlowMovingProducts = (filters) => {
  return getSlowMovingProducts(filters);
};

export function fetchTotalStockSummaryService() {
  return getTotalStockSummary();
}

export function fetchInventoryHealthMetricsService() {
  return getInventoryHealthMetrics();
}
