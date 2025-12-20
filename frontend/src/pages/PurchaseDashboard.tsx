"use client";

import { useEffect, useState, useCallback } from "react";
import { Box } from "@mui/material";
import PurchaseStatistics from "../components/purchase/PurchaseStatisticsSection";
import PurchaseTrendChart from "../components/purchase/PurchaseTrendChart";
import PurchaseCategoryPieChart from "../components/purchase/PurchaseCategoryPieChart";
import PurchaseTable from "../components/purchase/PurchaseTable";
import DashboardHeader from "../components/DashboardHeader";
import type { DashboardFilter } from "../lib/types/inventoryDashboardTypes";
import {
  fetchPurchaseStats,
  fetchPurchaseSummary,
  fetchPurchaseTrend,
} from "../lib/api/purchaseStatsService";
import type {
  PurchaseKPI,
  PurchaseSummary,
  MonthlyStat,
} from "../lib/types/purchaseStatsTypes";
import theme from "../../theme";

// ✅ Helper to get the initial state for the DashboardHeader
const getInitialFilters = (): DashboardFilter => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1); // Default to start of the year
  const end = new Date(now.getFullYear(), 11, 31); // Default to end of the year

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    from: formatDate(start),
    to: formatDate(end),
    filter: "year",
  };
};

const PurchaseDashboard = () => {
  // ✅ State is now managed by a single, universal filter object
  const [activeFilters, setActiveFilters] =
    useState<DashboardFilter>(getInitialFilters);

  // State for the page's data
  const [summary, setSummary] = useState<PurchaseSummary | null>(null);
  const [trend, setTrend] = useState<MonthlyStat[] | null>(null);
  const [kpi, setKpi] = useState<PurchaseKPI | null>(null);

  const fetchAll = useCallback(async () => {
    // The activeFilters object is now passed directly to the API services
    const [summaryData, trendData, kpiData] = await Promise.all([
      fetchPurchaseSummary(activeFilters),
      fetchPurchaseTrend(activeFilters),
      fetchPurchaseStats(), // This API call doesn't use filters
    ]);
    setSummary(summaryData);
    setTrend(trendData);
    setKpi(kpiData);
  }, [activeFilters]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        backgroundColor: theme.palette.background.default,
      }}
    >
      {/* ✅ DashboardHeader is now connected directly to the state setter */}
      <DashboardHeader
        title="Purchase Dashboard"
        showSearch={false}
        showDateFilters={true}
        onFilterChange={setActiveFilters}
        onRefresh={fetchAll}
        initialFilter="year"
      />

      <Box
        sx={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          p: 2.5,
          mb: 3,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <PurchaseStatistics summary={summary} kpi={kpi} />

        <Box display="flex" gap={2.5} flexWrap="wrap" mt={3}>
          <Box flex={1} minWidth={{ xs: "100%", md: 400 }}>
            {/* ✅ Child components now receive the universal filters and necessary data */}
            <PurchaseTrendChart trend={trend} filters={activeFilters} />
          </Box>
          <Box flex={1} minWidth={{ xs: "100%", md: 400 }}>
            <PurchaseCategoryPieChart /*filter={activeFilters}*/ />
          </Box>
        </Box>
      </Box>

      {/* ✅ The table also receives the universal filter object */}
      <PurchaseTable filters={activeFilters} />
    </Box>
  );
};

export default PurchaseDashboard;
