"use client";

import { useEffect, useState, useCallback } from "react";
import { Box, CircularProgress, Chip, Typography } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  ClipboardList,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

import DashboardHeader from "../components/DashboardHeader";
import DataTable from "../components/DataTable";
import { DataCard as StatisticCard } from "../components/DataCard";
import {
  getStockAdjustments,
  getStockAdjustmentStats,
  StockAdjustmentRow,
  AdjustmentStats,
} from "../lib/api/inventoryService";
import { DashboardFilter } from "../lib/types/inventoryDashboardTypes";

export default function StockAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<StockAdjustmentRow[]>([]);
  const [stats, setStats] = useState<AdjustmentStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [filters, setFilters] = useState<DashboardFilter>({
    filter: "month",
    from: "",
    to: "",
  });

  // ✅ FIX 1: fetchData takes filters as an argument
  const fetchData = useCallback(async (currentFilters: DashboardFilter) => {
    setLoading(true);
    try {
      const [listData, statsData] = await Promise.all([
        getStockAdjustments(currentFilters.from, currentFilters.to),
        getStockAdjustmentStats(currentFilters.from, currentFilters.to),
      ]);
      setAdjustments(listData);
      setStats(statsData);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load adjustment data.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ FIX 2: Only re-run when filter VALUES change
  useEffect(() => {
    // Only fetch if we have valid dates or if it's 'all' time (empty strings)
    // Our DashboardHeader handles setting the dates correctly
    fetchData(filters);
  }, [fetchData, filters.filter, filters.from, filters.to]);

  // ✅ FIX 3: Handler to prevent loop
  const handleFilterChange = (newFilters: DashboardFilter) => {
    setFilters((prev) => {
      if (
        prev.filter === newFilters.filter &&
        prev.from === newFilters.from &&
        prev.to === newFilters.to
      ) {
        return prev;
      }
      return newFilters;
    });
  };

  // Table Columns (Unchanged)
  const columns = [
    {
      key: "created_at",
      label: "Date",
      format: (val: string) =>
        new Date(val).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    { key: "product_name", label: "Product" },
    {
      key: "category",
      label: "Reason Category",
      format: (val: string) => {
        let color: "default" | "error" | "warning" | "success" = "default";
        if (val === "Damaged" || val === "Theft") color = "error";
        if (val === "Stocktaking") color = "warning";
        if (val.includes("Found")) color = "success";
        return (
          <Chip label={val} size="small" color={color} variant="outlined" />
        );
      },
    },
    { key: "old_quantity", label: "Old Qty", align: "right" as const },
    {
      key: "adjustment",
      label: "Change",
      align: "right" as const,
      format: (val: number) => (
        <Typography
          fontWeight="bold"
          color={val > 0 ? "success.main" : "error.main"}
        >
          {val > 0 ? `+${val}` : val}
        </Typography>
      ),
    },
    {
      key: "new_quantity",
      label: "New Qty",
      align: "right" as const,
      format: (val: number) => <strong>{val}</strong>,
    },
    { key: "reason", label: "Note / Details" },
    { key: "adjusted_by", label: "By" },
  ];

  const getTopReason = () => {
    if (!stats || !stats.breakdown.length) return "None";
    const sorted = [...stats.breakdown].sort(
      (a, b) => Math.abs(b.quantity_change) - Math.abs(a.quantity_change)
    );
    return `${sorted[0].category} (${sorted[0].count})`;
  };

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        backgroundColor: "#fff",

        minHeight: "100vh",
      }}
    >
      <DashboardHeader
        title="Stock Adjustments"
        showSearch={false}
        showDateFilters={true}
        // ✅ Use the new handler
        onFilterChange={handleFilterChange}
        // ✅ Manual refresh passes current filters
        onRefresh={() => fetchData(filters)}
      />

      {loading || !stats ? (
        <Box display="flex" justifyContent="center" my={5}>
          <CircularProgress />
        </Box>
      ) : (
        <Box mt={3}>
          {/* --- STATS CARDS --- */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <StatisticCard
                title="Net Stock Change"
                value={
                  stats.totalQty > 0 ? `+${stats.totalQty}` : stats.totalQty
                }
                icon={stats.totalQty >= 0 ? <TrendingUp /> : <TrendingDown />}
                color={stats.totalQty >= 0 ? "success.main" : "error.main"}
                subtext="Total quantity added/removed"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatisticCard
                title="Total Adjustments"
                value={adjustments.length}
                icon={<ClipboardList />}
                color="primary.main"
                subtext="Number of correction events"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
              <StatisticCard
                title="Primary Adjustment Reason"
                value={getTopReason()}
                icon={<AlertTriangle />}
                color="warning.main"
                subtext="Most frequent cause for stock change"
              />
            </Grid>
          </Grid>

          {/* --- DATA TABLE --- */}
          <DataTable
            rows={adjustments}
            columns={columns}
            loading={loading}
            total={adjustments.length}
            page={0}
            rowsPerPage={adjustments.length} // Show all for simplicity
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
            // remove pagination if not needed or implement server-side later
          />
        </Box>
      )}
    </Box>
  );
}
