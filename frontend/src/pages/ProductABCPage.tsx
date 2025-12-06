"use client";

import { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Paper,
  Chip,
  Typography,
  Button,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { TrendingUp, Package, AlertCircle, Info } from "lucide-react";
import toast from "react-hot-toast";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

import DashboardHeader from "../components/DashboardHeader";
import DataTable from "../components/DataTable";

import { getABCAnalysis, ABCProduct } from "../lib/api/analyticsService";
import { DataCard } from "../components/DataCard";
import ProductABCInfoModal from "../components/analytics/ProductABCInfoModal"; // ✅ Import Modal

export default function ProductABCPage() {
  const [items, setItems] = useState<ABCProduct[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false); // ✅ Modal State

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getABCAnalysis(365);
      setItems(res.report);
      setStats(res.stats);
    } catch (error) {
      toast.error("Failed to load ABC analysis.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { key: "name", label: "Product" },
    { key: "product_code", label: "Code" },
    {
      key: "classification",
      label: "Class",
      align: "center" as const,
      format: (val: string) => {
        let color: any = "default";
        if (val === "A") color = "success"; // High Value
        if (val === "B") color = "warning"; // Medium
        if (val === "C") color = "error"; // Low
        return (
          <Chip
            label={`Class ${val}`}
            size="small"
            color={color}
            variant="filled"
            sx={{ fontWeight: "bold" }}
          />
        );
      },
    },
    {
      key: "total_revenue",
      label: "Annual Revenue",
      align: "right" as const,
      format: (val: number) => `₹${val.toLocaleString("en-IN")}`,
    },
    {
      key: "share",
      label: "Revenue Share",
      align: "right" as const,
      format: (val: string) => `${val}%`,
    },
    {
      key: "current_stock",
      label: "Stock Qty",
      align: "center" as const,
      format: (val: number) => <strong>{val}</strong>,
    },
  ];

  // Chart Data Preparation
  const chartData = stats
    ? [
        { name: "Class A (High Value)", value: stats.A.revenue },
        { name: "Class B (Medium Value)", value: stats.B.revenue },
        { name: "Class C (Low Value)", value: stats.C.revenue },
      ]
    : [];

  const COLORS = ["#2e7d32", "#ed6c02", "#d32f2f"]; // Green, Orange, Red

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        backgroundColor: "#fff",
        borderTopLeftRadius: "36px",
        borderBottomLeftRadius: "36px",
        minHeight: "100vh",
      }}
    >
      <DashboardHeader
        title="Product ABC Analysis"
        showSearch={false}
        showDateFilters={false}
        // ✅ Add Info Button
        actions={
          <Button
            variant="outlined"
            startIcon={<Info size={18} />}
            onClick={() => setInfoOpen(true)}
            sx={{
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            How this works?
          </Button>
        }
      />

      {loading || !stats ? (
        <Box display="flex" justifyContent="center" mt={10}>
          <CircularProgress />
        </Box>
      ) : (
        <Box mt={2}>
          <Grid container spacing={3} mb={3}>
            {/* Stats Cards */}
            <Grid item xs={12} md={8}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <DataCard
                    title="Class A Items"
                    value={stats.A.count}
                    icon={<TrendingUp />}
                    color="success.main"
                    subtext="Generates 80% of Revenue"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <DataCard
                    title="Class B Items"
                    value={stats.B.count}
                    icon={<Package />}
                    color="warning.main"
                    subtext="Generates 15% of Revenue"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <DataCard
                    title="Class C Items"
                    value={stats.C.count}
                    icon={<AlertCircle />}
                    color="error.main"
                    subtext="Generates 5% of Revenue"
                  />
                </Grid>
              </Grid>

              {/* Explanation Box */}
              <Paper
                variant="outlined"
                sx={{ mt: 3, p: 2, bgcolor: "grey.50" }}
              >
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Quick Summary
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You have <strong>{stats.A.count}</strong> high-value products
                  driving your business. Ensure these are always in stock.
                  Meanwhile, <strong>{stats.C.count}</strong> products are slow
                  movers; consider a clearance sale.
                </Typography>
              </Paper>
            </Grid>

            {/* Chart */}
            <Grid item xs={12} md={4}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  align="center"
                  gutterBottom
                >
                  Revenue Distribution
                </Typography>
                <Box height={300} width="100%">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={chartData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        // Removed label to keep it clean
                      >
                        {chartData.map((_entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) =>
                          `₹${val.toLocaleString("en-IN")}`
                        }
                      />
                      <Legend verticalAlign="top" height={24} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Table */}
          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <DataTable
              rows={items}
              columns={columns}
              loading={loading}
              total={items.length}
              page={0}
              rowsPerPage={10}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
            />
          </Paper>
        </Box>
      )}

      {/* ✅ Render Modal */}
      <ProductABCInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </Box>
  );
}
