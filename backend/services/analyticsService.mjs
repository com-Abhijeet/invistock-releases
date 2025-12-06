import * as AnalyticsRepo from "../repositories/analyticsRepository.mjs";

export function getPredictiveRestockService() {
  // Defaulting to "Analyze last 30 days" to "Plan for next 30 days"
  return AnalyticsRepo.getReorderRecommendations(30, 30);
}

export function getDeadStockService(days) {
  return AnalyticsRepo.getDeadStockReport(days);
}

export function getCustomerInsightsService(dormantDays) {
  const rawData = AnalyticsRepo.getCustomerAnalytics(dormantDays);

  // We can split the data here for easier consumption by the frontend
  const topCustomers = rawData.slice(0, 50); // Top 50 by revenue
  const dormantCustomers = rawData.filter((c) => c.segment === "Dormant");

  return {
    all: rawData,
    stats: {
      totalCustomers: rawData.length,
      activeCount: rawData.filter((c) => c.segment !== "Dormant").length,
      dormantCount: dormantCustomers.length,
      avgCLV:
        rawData.length > 0
          ? Math.round(
              rawData.reduce((sum, c) => sum + c.total_revenue, 0) /
                rawData.length
            )
          : 0,
    },
  };
}

export function getProductABCService(days) {
  const data = AnalyticsRepo.getProductABCAnalysis(days);

  // Calculate Stats for the Chart
  const stats = {
    A: { count: 0, revenue: 0 },
    B: { count: 0, revenue: 0 },
    C: { count: 0, revenue: 0 },
  };

  data.forEach((p) => {
    stats[p.classification].count++;
    stats[p.classification].revenue += p.total_revenue;
  });

  return { report: data, stats };
}
