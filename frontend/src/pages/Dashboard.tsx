"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  useTheme,
  Stack,
  Button,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Store,
  Package,
  Wallet,
  CreditCard,
  DollarSign,
  Activity,
  AlertTriangle,
  ShoppingCart,
  BarChart3,
  Calendar,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { api } from "../lib/api/api";
import DashboardHeader from "../components/DashboardHeader";
import { DashboardFilter } from "../lib/types/inventoryDashboardTypes";
import { DataCard as StatCard } from "../components/DataCard";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [filters, setFilters] = useState<DashboardFilter>({
    filter: "month",
    from: "",
    to: "",
  });
  const theme = useTheme();

  // ✅ LIFETIME LOGIC: From 2025-01-01 to Today
  const handleLifetimeClick = () => {
    const today = new Date().toISOString().split("T")[0];
    const startOfLifetime = "2025-01-01";

    setFilters({
      filter: "custom", // We use 'custom' so the API respects the dates provided below
      from: startOfLifetime,
      to: today,
    });
  };

  // Helper to check if Lifetime is currently active (for styling the button)
  const isLifetimeActive =
    filters.from === "2025-01-01" && filters.filter === "custom";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/dashboard/summary", { params: filters });
      setStats(res.data.data.stats);
      setCharts(res.data.data.charts);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (val: number) =>
    `₹${(val || 0).toLocaleString("en-IN")}`;
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        bgcolor: "#f8f9fa",
        minHeight: "100vh",
        borderTopLeftRadius: 36,
        borderTopRightRadius: 0,
      }}
    >
      {/* ✅ Header is now outside the loading check, so it never unmounts */}
      <DashboardHeader
        title="Executive Dashboard"
        showSearch={false}
        onFilterChange={setFilters}
        onRefresh={fetchData}
        initialFilter="month"
        actions={
          <Button
            variant={isLifetimeActive ? "contained" : "outlined"}
            color="primary"
            size="small"
            onClick={handleLifetimeClick}
            startIcon={<Calendar size={16} />}
            sx={{
              borderRadius: 4,
              textTransform: "none",
              borderColor: isLifetimeActive
                ? "primary.main"
                : "rgba(0,0,0,0.12)",
              color: isLifetimeActive ? "white" : "text.secondary",
            }}
          >
            Lifetime (since 2025)
          </Button>
        }
      />
      {loading || !stats ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="60vh" // Adjust height to fit below header
        >
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* --- ROW 1: KEY FINANCIALS (PROFITABILITY) --- */}
          <Grid container spacing={2} mb={3} mt={1}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Revenue"
                value={formatCurrency(stats.revenue)}
                subtext={`${stats.invoiceCount} Invoices Generated`}
                icon={<DollarSign size={20} />}
                color={theme.palette.primary.main}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Cost of Goods (COGS)"
                value={formatCurrency(stats.cogs)}
                subtext="Direct Product Cost"
                icon={<Package size={20} />}
                color={theme.palette.warning.main}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Operational Expenses"
                value={formatCurrency(stats.expenses)}
                subtext="Rent, Bills, Salaries"
                icon={<TrendingDown size={20} />}
                color={theme.palette.error.main}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Net Profit"
                value={formatCurrency(stats.netProfit)}
                subtext={`Profit Margin: ${stats.margin}%`}
                icon={<TrendingUp size={20} />}
                color={
                  stats.netProfit >= 0
                    ? theme.palette.success.main
                    : theme.palette.error.main
                }
              />
            </Grid>
          </Grid>

          <Grid container spacing={3} mb={3}>
            {/* --- ROW 2: CHART (70%) --- */}
            <Grid item xs={12} md={8}>
              <Paper
                variant="outlined"
                sx={{ p: 3, height: 400, borderRadius: 2 }}
              >
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Revenue vs Profit Trend
                </Typography>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.financialTrend}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={theme.palette.primary.main}
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor={theme.palette.primary.main}
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorProf"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={theme.palette.success.main}
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor={theme.palette.success.main}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      fontSize={11}
                      tickFormatter={(val) =>
                        new Date(val).getDate().toString()
                      }
                    />
                    <YAxis fontSize={11} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke={theme.palette.primary.main}
                      fill="url(#colorRev)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      name="Est. Profit"
                      stroke={theme.palette.success.main}
                      fill="url(#colorProf)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* --- ROW 2: CASH FLOW (30%) --- */}
            <Grid item xs={12} md={4}>
              <Stack spacing={2} height="100%">
                <StatCard
                  title="Money In (Received)"
                  value={formatCurrency(stats.moneyIn)}
                  icon={<Wallet size={20} />}
                  color="green"
                />
                <StatCard
                  title="Money Out (Paid)"
                  value={formatCurrency(stats.moneyOut)}
                  icon={<CreditCard size={20} />}
                  color="red"
                />
                <StatCard
                  title="Net Cash Flow"
                  value={formatCurrency(stats.netCashFlow)}
                  subtext="Actual Cash Movement"
                  icon={<Activity size={20} />}
                  color="blue"
                />
              </Stack>
            </Grid>
          </Grid>

          {/* --- ROW 3: ACCOUNTS & DEBTS --- */}
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 1, textTransform: "uppercase" }}
          >
            Accounts & Inventory Health
          </Typography>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} md={2}>
              <StatCard
                title="Receivables"
                value={formatCurrency(stats.receivables)}
                subtext="Pending from Customers"
                icon={<Users size={18} />}
                color="orange"
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <StatCard
                title="Payables"
                value={formatCurrency(stats.payables)}
                subtext="Owed to Suppliers"
                icon={<Store size={18} />}
                color="red"
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <StatCard
                title="Stock (Cost)"
                value={formatCurrency(stats.stockCost)}
                subtext="Asset Value"
                icon={<Package size={18} />}
                color="blue"
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <StatCard
                title="Stock (MRP)"
                value={formatCurrency(stats.stockMrp)}
                subtext="Potential Revenue"
                icon={<BarChart3 size={18} />}
                color="purple"
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <StatCard
                title="Low Stock"
                value={stats.lowStock}
                subtext="Items below threshold"
                icon={<AlertTriangle size={18} />}
                color="error.main"
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <StatCard
                title="Avg Order Val"
                value={formatCurrency(stats.avgOrderValue)}
                subtext="Per Invoice"
                icon={<ShoppingCart size={18} />}
                color="teal"
              />
            </Grid>
          </Grid>

          {/* --- ROW 4: SECONDARY CHARTS --- */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 2, height: 300 }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  align="center"
                >
                  Payment Methods
                </Typography>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={charts.paymentModes}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {charts.paymentModes.map((_entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 2, height: 300 }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  align="center"
                >
                  Top Categories (Revenue)
                </Typography>
                <ResponsiveContainer>
                  <BarChart
                    data={charts.categoryPerformance}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      style={{ fontSize: "11px" }}
                    />
                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                    <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                      {charts.categoryPerformance.map(
                        (_entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        )
                      )}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 2, height: 300 }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  align="center"
                >
                  Inventory Value by Category
                </Typography>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={charts.stockDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    >
                      {charts.stockDistribution.map(
                        (_entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        )
                      )}
                    </Pie>
                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
