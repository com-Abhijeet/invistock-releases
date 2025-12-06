"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Chip,
  Typography,
  CircularProgress,
  Button,
  Paper,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { TrendingUp, AlertTriangle, Info } from "lucide-react"; // ✅ Changed icon
import toast from "react-hot-toast";

import DashboardHeader from "../components/DashboardHeader";
import DataTable from "../components/DataTable";

import { getPredictiveRestock, RestockItem } from "../lib/api/analyticsService";
import SmartRestockInfoModal from "../components/analytics/SmartRestockInfoModal";
import { DataCard } from "../components/DataCard";

export default function SmartRestockPage() {
  const [items, setItems] = useState<RestockItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [infoOpen, setInfoOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getPredictiveRestock();
      setItems(data);
    } catch (error) {
      toast.error("Failed to analyze sales data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Calculations ---
  const totalInvestment = items.reduce(
    (sum, item) => sum + item.estimatedCost,
    0
  );
  const criticalCount = items.filter((i) => i.status === "critical").length;

  const columns = [
    { key: "name", label: "Product" },
    {
      key: "current_stock",
      label: "In Hand",
      align: "center" as const,
      format: (val: number) => <Typography fontWeight="bold">{val}</Typography>,
    },
    {
      key: "dailyVelocity",
      label: "Sales/Day",
      align: "center" as const,
      format: (val: number) => (
        <Chip label={val} size="small" color="default" />
      ),
    },
    {
      key: "daysRemaining",
      label: "Days Left",
      align: "center" as const,
      format: (val: number) => {
        if (val <= 7)
          return (
            <Chip
              label={`${val} Days`}
              color="error"
              size="small"
              icon={<AlertTriangle size={12} />}
            />
          );
        if (val <= 15)
          return <Chip label={`${val} Days`} color="warning" size="small" />;
        return <Chip label={`${val} Days`} color="success" size="small" />;
      },
    },
    {
      key: "suggestedOrder",
      label: "Buy Qty",
      align: "center" as const,
      format: (val: number) => (
        <Typography color="primary.main" fontWeight="bold">
          +{val}
        </Typography>
      ),
    },
    {
      key: "estimatedCost",
      label: "Est. Cost",
      align: "right" as const,
      format: (val: number) => `₹${val.toLocaleString("en-IN")}`,
    },
  ];

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        bgcolor: "#fff",
        borderTopLeftRadius: "36px",
        borderBottomLeftRadius: "36px",
        minHeight: "100vh",
      }}
    >
      <DashboardHeader
        title="Smart Reorder & Forecasting"
        showSearch={false}
        showDateFilters={false}
        // ✅ Updated Action to Info Button
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

      {loading ? (
        <Box display="flex" justifyContent="center" mt={10}>
          <CircularProgress />
        </Box>
      ) : (
        <Box mt={2}>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={4}>
              <DataCard
                title="Capital Required"
                value={`₹${totalInvestment.toLocaleString("en-IN")}`}
                icon={<TrendingUp />}
                color="primary.main"
                subtext="To restock for 30 days"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <DataCard
                title="Critical Stockouts"
                value={criticalCount}
                icon={<AlertTriangle />}
                color="error.main"
                subtext="Will run out in < 7 days"
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
                  borderRadius: 2,
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight="bold"
                  >
                    INSIGHT
                  </Typography>
                  <Typography variant="body2" mt={0.5}>
                    Forecast based on your last <b>30 days</b> of sales
                    velocity.
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          <Typography
            variant="h6"
            gutterBottom
            fontWeight={600}
            sx={{ mt: 4, mb: 2 }}
          >
            Restock Recommendations
          </Typography>

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

      {/* ✅ Render Info Modal */}
      <SmartRestockInfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
    </Box>
  );
}
