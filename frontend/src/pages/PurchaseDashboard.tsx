"use client";

import { useEffect, useState, useCallback } from "react";
import { Box } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import PurchaseStatistics from "../components/purchase/PurchaseStatisticsSection";
import PurchaseTrendChart from "../components/purchase/PurchaseTrendChart";
import PurchaseCategoryPieChart from "../components/purchase/PurchaseCategoryPieChart";
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

const getInitialFilters = (): DashboardFilter => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31);

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
  const [activeFilters, setActiveFilters] =
    useState<DashboardFilter>(getInitialFilters);

  const [summary, setSummary] = useState<PurchaseSummary | null>(null);
  const [trend, setTrend] = useState<MonthlyStat[] | null>(null);
  const [kpi, setKpi] = useState<PurchaseKPI | null>(null);

  // ✅ ADDED: Stability wrapper
  const handleFilterChange = useCallback((newFilters: DashboardFilter) => {
    setActiveFilters((prev) => {
      if (
        prev.filter === newFilters.filter &&
        prev.from === newFilters.from &&
        prev.to === newFilters.to
      ) {
        return prev;
      }
      return newFilters;
    });
  }, []);

  const fetchAll = useCallback(async () => {
    const [summaryData, trendData, kpiData] = await Promise.all([
      fetchPurchaseSummary(activeFilters),
      fetchPurchaseTrend(activeFilters),
      fetchPurchaseStats(),
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
        height: "calc(100vh - 64px)",
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <DashboardHeader
        title="Purchase Analytics"
        showSearch={false}
        showDateFilters={true}
        onFilterChange={handleFilterChange} // ✅ Use the wrapper
        onRefresh={fetchAll}
        initialFilter="year"
      />

      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          pb: 2,
        }}
      >
        <PurchaseStatistics summary={summary} kpi={kpi} />

        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <Grid container spacing={2} sx={{ flexGrow: 1, height: "100%" }}>
            <Grid
              item
              xs={12}
              lg={8}
              sx={{ display: "flex", flexDirection: "column", height: "100%" }}
            >
              <Box
                sx={{
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: "12px",
                  p: 3,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "300px",
                }}
              >
                <PurchaseTrendChart trend={trend} filters={activeFilters} />
              </Box>
            </Grid>

            <Grid
              item
              xs={12}
              lg={4}
              sx={{ display: "flex", flexDirection: "column", height: "100%" }}
            >
              <Box
                sx={{
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: "12px",
                  p: 3,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "300px",
                }}
              >
                <PurchaseCategoryPieChart />
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};

export default PurchaseDashboard;
