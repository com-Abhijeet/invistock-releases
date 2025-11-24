"use client";
import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import StatisticCard from "../StatisticCard";
import { BarChart3, Users, ShoppingBag, AlertCircle } from "lucide-react";
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
    const fm = await fetchFinancialMetrics(apiParams);
    const om = await fetchOrderMetrics(apiParams);

    setFinancial(fm);
    setOrder(om);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const currency = (val: number | null | undefined) =>
    val ? `₹${val.toLocaleString("en-IN")}` : "₹0";

  // ... rest of the JSX is unchanged
  return (
    <Box
      display="flex"
      gap={1}
      justifyContent="space-between"
      sx={{
        overflowX: { xs: "auto", md: "visible" },
        mt: 1,
        pb: { xs: 1, md: 0 },
      }}
    >
      {[
        {
          title: "Total Sales",
          value: loading ? "..." : currency(financial?.totalSales),
          icon: <BarChart3 />,
        },
        {
          title: "Paid Amount",
          value: loading ? "..." : currency(financial?.totalPaid),
          icon: <ShoppingBag />,
        },
        {
          title: "Outstanding",
          value: loading ? "..." : currency(financial?.outstanding),
          icon: <AlertCircle />,
        },
        {
          title: "Avg. Sale",
          value: loading ? "..." : currency(financial?.avgSale),
          icon: <BarChart3 />,
        },
        {
          title: "No. of Sales",
          value: loading ? "..." : order?.salesCount ?? 0,
          icon: <ShoppingBag />,
        },
        {
          title: "Pending Sales",
          value: loading ? "..." : order?.pendingCount ?? 0,
          icon: <AlertCircle />,
        },
        {
          title: "Repeat Customers",
          value: loading ? "..." : order?.repeatCustomers ?? 0,
          icon: <Users />,
        },
      ].map((stat, index) => (
        <Box
          key={index}
          sx={{ flex: "1 1 0", minWidth: { xs: "120px", sm: "140px" } }}
        >
          <StatisticCard
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
          />
        </Box>
      ))}
    </Box>
  );
};

export default SalesStatistics;
