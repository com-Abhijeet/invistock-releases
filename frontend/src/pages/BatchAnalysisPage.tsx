"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
  Stack,
  Card,
  CardContent,
  Tooltip,
  IconButton,
} from "@mui/material";
// Using GridLegacy as per your project pattern
import GridLegacy from "@mui/material/GridLegacy";
import { AlertTriangle, Clock, IndianRupee, HelpCircle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import toast from "react-hot-toast";

import { getBatchAnalytics, BatchAnalytics } from "../lib/api/batchService";
import { fetchProductHistory } from "../lib/api/productService";
import DashboardHeader from "../components/DashboardHeader";
import { Product } from "../lib/types/product";

export default function BatchAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [analytics, setAnalytics] = useState<BatchAnalytics | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // 1. Fetch Product Basic Info
        const historyData = await fetchProductHistory(Number(id));
        setProduct(historyData.productDetails);

        // 2. Fetch Analytics
        const analyticsData = await getBatchAnalytics(Number(id));
        setAnalytics(analyticsData);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load analysis data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        height="50vh"
        alignItems="center"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!product || !analytics) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h6" color="text.secondary">
          Analytics not available.
        </Typography>
        <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  // Calculate Average MRP from trends if not directly provided
  const avgPurchasePrice =
    analytics.priceTrend.reduce((acc, curr) => acc + curr.purchase_price, 0) /
      (analytics.priceTrend.length || 1) || 0;

  return (
    <Box p={3} sx={{ minHeight: "100vh", bgcolor: "#f9fafb" }}>
      <DashboardHeader
        title={`Batch Analysis: ${product.name}`}
        showDateFilters={false}
      />

      <GridLegacy container spacing={3}>
        {/* KPI Cards */}
        <GridLegacy item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent>
              <Stack spacing={1}>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  color="text.secondary"
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <IndianRupee size={20} />
                    <Typography variant="body2" fontWeight={600}>
                      Avg. Purchase Price
                    </Typography>
                  </Box>
                  <Tooltip title="The average cost price (MOP) across all active batches. Useful for tracking cost fluctuations.">
                    <IconButton size="small">
                      <HelpCircle size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  ₹{avgPurchasePrice.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Based on {analytics.priceTrend.length} recent batches
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </GridLegacy>

        <GridLegacy item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent>
              <Stack spacing={1}>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  color="text.secondary"
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <AlertTriangle size={20} color="orange" />
                    <Typography variant="body2" fontWeight={600}>
                      Low Stock Batches
                    </Typography>
                  </Box>
                  <Tooltip title="Number of batches with less than 5 units remaining. Prioritize clearing or restocking these.">
                    <IconButton size="small">
                      <HelpCircle size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {analytics.lowStockCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Batches with &lt; 5 quantity
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </GridLegacy>

        <GridLegacy item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent>
              <Stack spacing={1}>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  color="text.secondary"
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <Clock size={20} />
                    <Typography variant="body2" fontWeight={600}>
                      Inventory Age Risk
                    </Typography>
                  </Box>
                  <Tooltip title="Batches that have been in stock for more than 90 days. High risk of becoming obsolete or expired.">
                    <IconButton size="small">
                      <HelpCircle size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {analytics.ageDistribution.find(
                    (d) => d.age_group === "> 90 Days"
                  )?.count || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Batches older than 90 days
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </GridLegacy>

        {/* Charts Row 1: Trends & Age */}
        <GridLegacy item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 400 }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6" fontWeight={600}>
                Purchase Price Trend
              </Typography>
              <Tooltip title="Historical trend of your purchase price (MOP) for each batch. Helps identify if supplier costs are rising.">
                <IconButton size="small">
                  <HelpCircle size={16} />
                </IconButton>
              </Tooltip>
            </Box>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.priceTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="batch_number" fontSize={12} />
                <YAxis fontSize={12} />
                <RechartsTooltip
                  formatter={(value: number) => [`₹${value}`, "Cost Price"]}
                  labelFormatter={(label) => `Batch: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="purchase_price"
                  name="Cost Price"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </GridLegacy>

        <GridLegacy item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 400 }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6" fontWeight={600}>
                Inventory Age
              </Typography>
              <Tooltip title="Distribution of your stock by age (days since purchase). Green is fresh, red is old.">
                <IconButton size="small">
                  <HelpCircle size={16} />
                </IconButton>
              </Tooltip>
            </Box>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.ageDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="age_group"
                  width={100}
                  fontSize={12}
                  fontWeight={500}
                />
                <RechartsTooltip cursor={{ fill: "transparent" }} />
                <Bar
                  dataKey="count"
                  name="Batches"
                  fill="#10b981"
                  radius={[0, 4, 4, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </GridLegacy>

        {/* Charts Row 2: Supplier Performance */}
        <GridLegacy item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={3}
            >
              <Typography variant="h6" fontWeight={600}>
                Supplier Performance
              </Typography>
              <Tooltip title="Compare your suppliers based on how many batches you buy vs. the average cost they offer.">
                <IconButton size="small">
                  <HelpCircle size={16} />
                </IconButton>
              </Tooltip>
            </Box>
            <GridLegacy container spacing={4}>
              {/* Supplier Volume Chart */}
              <GridLegacy item xs={12} md={6} sx={{ height: 300 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  align="center"
                  mb={1}
                >
                  Batch Volume by Supplier
                </Typography>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.supplierPerformance}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="supplier_name" fontSize={12} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <RechartsTooltip />
                    <Bar
                      dataKey="batch_count"
                      name="Batches Supplied"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                      barSize={50}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </GridLegacy>

              {/* Supplier Cost Chart */}
              <GridLegacy item xs={12} md={6} sx={{ height: 300 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  align="center"
                  mb={1}
                >
                  Avg. Cost by Supplier
                </Typography>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.supplierPerformance}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="supplier_name" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(val) => `₹${val}`} />
                    <RechartsTooltip
                      formatter={(val: number) => `₹${val.toFixed(2)}`}
                    />
                    <Bar
                      dataKey="avg_purchase_price"
                      name="Avg Cost"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                      barSize={50}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </GridLegacy>
            </GridLegacy>
          </Paper>
        </GridLegacy>
      </GridLegacy>
    </Box>
  );
}
