"use client";
import { useEffect, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { DataCard } from "../../components/DataCard"; // ✅ Updated import
import { BarChart3, Users, ShoppingBag, AlertCircle } from "lucide-react";
import theme from "../../../theme"; // ✅ Import theme for colors
import {
  fetchFinancialMetrics,
  fetchOrderMetrics,
} from "../../lib/api/salesStatsService";
// ✅ Import the new, clarified types
import type {
  ApiFilterParams,
  DashboardFilter,
} from "../../lib/types/inventoryDashboardTypes";
import type {
  FinancialMetrics,
  OrderMetrics,
} from "../../lib/types/salesStatsTypes";

// ✅ Update props to accept the new filter type
interface SalesStatisticsProps {
  filters: DashboardFilter;
}

const SalesStatistics = ({ filters }: SalesStatisticsProps) => {
  const [financial, setFinancial] = useState<FinancialMetrics | null>(null);
  const [order, setOrder] = useState<OrderMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);

    // ✅ ADAPTER LOGIC: Transform the prop into the format needed by the API.
    const apiParams: ApiFilterParams = {
      filter: filters.filter!,
      startDate: filters.from,
      endDate: filters.to,
      query: filters.query,
    };

    // Pass the correctly formatted object to the service functions.
    try {
      const [fm, om] = await Promise.all([
        fetchFinancialMetrics(apiParams),
        fetchOrderMetrics(apiParams),
      ]);
      setFinancial(fm);
      setOrder(om);
      console.log(fm, om);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const currency = (val: number | null | undefined) =>
    val ? `₹${val.toLocaleString("en-IN")}` : "₹0";

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  // Split stats into two logical groups to handle the 7 items creatively
  const financialStats = [
    {
      title: "Total Revenue",
      value: currency(financial?.totalSales),
      icon: <BarChart3 size={24} />,
      color: theme.palette.primary.main,
    },
    {
      title: "Total Paid",
      value: currency(financial?.totalPaid),
      icon: <ShoppingBag size={24} />,
      color: theme.palette.success.main,
    },
    {
      title: "Outstanding",
      value: currency(financial?.outstanding),
      icon: <AlertCircle size={24} />,
      color: theme.palette.warning.main,
    },
    {
      title: "Avg. Sale",
      value: currency(financial?.avgSale),
      icon: <BarChart3 size={24} />,
      color: theme.palette.info.main,
    },
  ];

  const operationalStats = [
    {
      title: "Orders",
      value: order?.salesCount ?? 0,
      icon: <ShoppingBag size={24} />,
      color: theme.palette.text.primary,
    },
    {
      title: "Pending",
      value: order?.pendingCount ?? 0,
      icon: <AlertCircle size={24} />,
      color: theme.palette.error.main,
    },
    {
      title: "Repeat Customers",
      value: order?.repeatCustomers ?? 0,
      icon: <Users size={24} />,
      color: theme.palette.secondary.main,
    },
  ];

  return (
    <Box mb={3}>
      <Grid container spacing={2}>
        {/* Row 1: Financial Metrics (4 items) - Takes full width */}
        {financialStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={`fin-${index}`}>
            <DataCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          </Grid>
        ))}

        {/* Row 2: Operational Metrics (3 items) - Centered or stretched to fill */}
        {operationalStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} key={`op-${index}`}>
            <DataCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default SalesStatistics;
