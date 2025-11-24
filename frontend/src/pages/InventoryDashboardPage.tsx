"use client";

import { useState } from "react";
import { Box } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import TopSellingProducts from "../components/inventory/TopSellingProducts";
import CategoryWiseSales from "../components/inventory/CategoryWiseSales";
import FastMovingProducts from "../components/inventory/FastMovingProducts";
import SlowMovingProducts from "../components/inventory/SlowMovingProducts";
import StockSummaryRow from "../components/inventory/StockSummaryRow";
import DashboardHeader from "../components/DashboardHeader";
// ✅ Import the necessary types
import type {
  DashboardFilter,
  DashboardFilterType,
} from "../lib/types/inventoryDashboardTypes";
import theme from "../../theme";

// ✅ Helper now returns the complete initial filter object
const getInitialFilters = (): DashboardFilter => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: start.toISOString().split("T")[0],
    to: end.toISOString().split("T")[0],
    filter: "month" as DashboardFilterType,
  };
};

export default function InventoryDashboardPage() {
  const [activeFilters, setActiveFilters] =
    useState<DashboardFilter>(getInitialFilters);
  const [searchQuery, setSearchQuery] = useState("");

  const finalFilters: DashboardFilter = {
    ...activeFilters,
    query: searchQuery,
    limit: 30,
  };

  const handleRefresh = () => {
    // console.log("Refreshing data with filters:", finalFilters);
  };

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        backgroundColor: theme.palette.background.default,

        minHeight: "100vh",
      }}
    >
      <DashboardHeader
        title="Inventory Dashboard"
        showSearch={false}
        onSearch={setSearchQuery}
        onRefresh={handleRefresh}
        onFilterChange={setActiveFilters}
        showDateFilters={true}
      />

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12}>
          <StockSummaryRow />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TopSellingProducts filters={finalFilters} />
        </Grid>
        <Grid item xs={12} md={6}>
          <CategoryWiseSales filters={finalFilters} />
        </Grid>
        <Grid item xs={12} md={6}>
          <FastMovingProducts filters={finalFilters} />
        </Grid>
        <Grid item xs={12} md={6}>
          <SlowMovingProducts filters={finalFilters} />
        </Grid>
      </Grid>
    </Box>
  );
}
