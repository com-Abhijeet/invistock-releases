"use client";

import { Box, CircularProgress } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { DataCard } from "../../components/DataCard";
import {
  BarChart3,
  AlertCircle,
  ShoppingBag,
  User,
  TrendingUp,
  CreditCard,
} from "lucide-react";
import theme from "../../../theme";
import type {
  PurchaseKPI,
  PurchaseSummary,
} from "../../lib/types/purchaseStatsTypes";

interface Props {
  summary: PurchaseSummary | null;
  kpi: PurchaseKPI | null;
}

const currency = (val: number | null | undefined) =>
  val ? `₹${val.toLocaleString("en-IN")}` : "₹0";

const PurchaseStatistics = ({ summary, kpi }: Props) => {
  // If data is loading (null), show spinner
  if (!summary || !kpi) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  // --- Row 1: Core Financials (3 cards) ---
  const row1Stats = [
    {
      title: "Total Purchase",
      value: currency(summary.total_amount),
      icon: <BarChart3 size={24} />,
      color: theme.palette.primary.main,
    },
    {
      title: "Total Paid",
      value: currency(summary.paid_amount),
      icon: <ShoppingBag size={24} />,
      color: theme.palette.success.main,
    },
    {
      title: "Total Unpaid",
      value: currency(summary.unpaid_amount),
      icon: <AlertCircle size={24} />,
      color: theme.palette.error.main,
    },
  ];

  // --- Row 2: Operational / Analysis (3 cards) ---
  const row2Stats = [
    {
      title: "Avg. Purchase Value",
      value: currency(kpi.avg_purchase_value),
      icon: <CreditCard size={24} />, // Changed icon for variety
      color: theme.palette.info.main,
    },
    {
      title: "Max Purchase Value",
      value: currency(kpi.max_purchase),
      icon: <TrendingUp size={24} />, // Changed icon for variety
      color: theme.palette.warning.main,
    },
    {
      title: "Top Supplier",
      value: kpi.top_supplier?.supplier_name || "No Data",
      icon: <User size={24} />,
      color: theme.palette.secondary.main,
    },
  ];

  return (
    <Box mb={3}>
      <Grid container spacing={2}>
        {/* Row 1 */}
        {row1Stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} key={`r1-${index}`}>
            <DataCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          </Grid>
        ))}

        {/* Row 2 */}
        {row2Stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} key={`r2-${index}`}>
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

export default PurchaseStatistics;
