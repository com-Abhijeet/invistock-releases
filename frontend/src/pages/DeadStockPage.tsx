"use client";

import { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Typography,
  Paper,
  Chip,
  MenuItem,
  TextField,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { AlertTriangle, Banknote, CalendarClock } from "lucide-react";
import toast from "react-hot-toast";

import DashboardHeader from "../components/DashboardHeader";
import DataTable from "../components/DataTable";

import { getDeadStockReport, DeadStockItem } from "../lib/api/analyticsService";
import { DataCard } from "../components/DataCard";

export default function DeadStockPage() {
  const [items, setItems] = useState<DeadStockItem[]>([]);
  const [summary, setSummary] = useState({
    totalCapitalStuck: 0,
    totalItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(180); // Default 6 Months

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getDeadStockReport(days);
      setItems(data.report);
      setSummary(data.summary);
      // console.log(data);
    } catch (error) {
      toast.error("Failed to load dead stock data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days]);

  const columns = [
    { key: "name", label: "Product" },
    { key: "category_name", label: "Category" },
    {
      key: "last_sold_date",
      label: "Last Sold",
      format: (val: string) =>
        val ? (
          new Date(val).toLocaleDateString("en-IN")
        ) : (
          <Chip
            label="Never Sold"
            size="small"
            color="error"
            variant="outlined"
          />
        ),
    },
    {
      key: "current_stock",
      label: "Stock Qty",
      align: "right" as const,
      format: (val: number) => <strong>{val}</strong>,
    },
    {
      key: "unit_cost",
      label: "Unit Cost",
      align: "right" as const,
      format: (val: number) => `₹${val?.toLocaleString("en-IN")}`,
    },
    {
      key: "capital_stuck",
      label: "Capital Stuck",
      align: "right" as const,
      format: (val: number) => (
        <Typography fontWeight="bold" color="error.main">
          ₹{val?.toLocaleString("en-IN")}
        </Typography>
      ),
    },
  ];

  return (
    <Box
      p={2}
      pt={3}
      sx={{ bgcolor: "#fff", borderTopLeftRadius: 36, minHeight: "100vh" }}
    >
      <DashboardHeader
        title="Dead Stock Analysis"
        showSearch={false}
        showDateFilters={false}
        actions={
          <TextField
            select
            size="small"
            label="Inactivity Period"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value={90}>Over 3 Months (90 Days)</MenuItem>
            <MenuItem value={180}>Over 6 Months (180 Days)</MenuItem>
            <MenuItem value={365}>Over 1 Year (365 Days)</MenuItem>
          </TextField>
        }
      />

      {loading ? (
        <Box display="flex" justifyContent="center" mt={10}>
          <CircularProgress />
        </Box>
      ) : (
        <Box mt={2}>
          {/* Summary Cards */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={4}>
              <DataCard
                title="Total Capital Stuck"
                value={`₹${summary.totalCapitalStuck.toLocaleString("en-IN")}`}
                icon={<Banknote />}
                color="error.main"
                subtext="Money tied up in non-moving items"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <DataCard
                title="Dead Items Count"
                value={summary.totalItems}
                icon={<AlertTriangle />}
                color="warning.main"
                subtext={`Products with 0 sales in ${days} days`}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <CalendarClock
                  size={32}
                  color="#666"
                  style={{ marginRight: 16 }}
                />
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Recommendation
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Consider running a clearance sale (20-50% off) on these
                    items to recover capital.
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          <DataTable
            rows={items}
            columns={columns}
            loading={loading}
            total={items.length}
            page={0}
            rowsPerPage={items.length}
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
          />
        </Box>
      )}
    </Box>
  );
}
