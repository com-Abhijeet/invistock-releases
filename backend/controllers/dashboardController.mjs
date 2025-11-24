import * as DashboardRepo from "../repositories/dashboardRepository.mjs";

export async function getDashboardSummary(req, res) {
  try {
    // Extract query parameters
    const { filter, from, to } = req.query;

    // Pass them to the repository
    const stats = DashboardRepo.getDashboardStats({ filter, from, to });
    const charts = DashboardRepo.getDashboardChartData({ filter, from, to });

    res.status(200).json({
      success: true,
      data: { stats, charts },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
