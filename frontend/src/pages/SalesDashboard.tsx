"use client";

import { useState, useCallback } from "react";
import { Box } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import DashboardHeader from "../components/DashboardHeader";
import type { DashboardFilter } from "../lib/types/inventoryDashboardTypes";
import SalesCategoryPieChart from "../components/sales/SalesCategoryPieChart";
import SalesStatistics from "../components/sales/SalesStatistics";
import SalesTrendChart from "../components/sales/SalesTrendChart";
import theme from "../../theme";

// ✅ ADDED: Proper initialization logic
const getInitialFilters = (): DashboardFilter => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    from: formatDate(start),
    to: formatDate(end),
    filter: "month",
  };
};

const SalesDashboard = () => {
  // ✅ FIXED: Initialize with valid dates, not empty strings
  const [activeFilters, setActiveFilters] =
    useState<DashboardFilter>(getInitialFilters);

  const [refreshKey, setRefreshKey] = useState(0);

  // ✅ ADDED: Stability wrapper to prevent infinite loops/redundant fetches
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

  const finalFilters = {
    from: activeFilters.from,
    to: activeFilters.to,
    filter: activeFilters.filter || "month",
    query: "",
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

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
        title="Sales Analytics"
        showSearch={false}
        showDateFilters={true}
        onRefresh={handleRefresh}
        onFilterChange={handleFilterChange} // ✅ Use the wrapper
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
        <SalesStatistics filters={finalFilters} key={`stats-${refreshKey}`} />

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
                <SalesTrendChart
                  filters={finalFilters}
                  key={`trend-${refreshKey}`}
                />
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
                <SalesCategoryPieChart
                  filters={finalFilters}
                  key={`pie-${refreshKey}`}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};

export default SalesDashboard;
