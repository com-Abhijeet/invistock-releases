"use client";
import { Box } from "@mui/material";
import StatisticCard from "../StatisticCard";
import { BarChart3, AlertCircle, ShoppingBag, User } from "lucide-react";
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

const cardStyle = {
  flex: "1 1 180px", // Responsive flex grow and shrink
  minWidth: "180px",
  maxWidth: "220px",
};

const PurchaseStatistics = ({ summary, kpi }: Props) => {
  // ... (imports and other code)

  return (
    <Box
      display="flex"
      flexWrap="wrap"
      gap={2}
      sx={{
        mt: 1,
        pb: { xs: 1, md: 0 },
      }}
    >
      {summary && (
        <>
          <Box sx={cardStyle}>
            <StatisticCard
              title="Total Purchase"
              value={currency(summary.total_amount) || "₹0"}
              icon={<BarChart3 />}
            />
          </Box>
          <Box sx={cardStyle}>
            <StatisticCard
              title="Paid"
              value={currency(summary.paid_amount) || "₹0"}
              icon={<ShoppingBag />}
            />
          </Box>
          <Box sx={cardStyle}>
            <StatisticCard
              title="Unpaid"
              value={currency(summary.unpaid_amount) || "₹0"}
              icon={<AlertCircle />}
            />
          </Box>
        </>
      )}
      {kpi && (
        <>
          <Box sx={cardStyle}>
            <StatisticCard
              title="Avg Purchase"
              value={`₹${kpi.avg_purchase_value?.toFixed(0) ?? "0"}`}
              icon={<BarChart3 />}
            />
          </Box>
          <Box sx={cardStyle}>
            <StatisticCard
              title="Max Purchase"
              value={`₹${kpi.max_purchase?.toFixed(0) ?? "0"}`}
              icon={<BarChart3 />}
            />
          </Box>
          <Box sx={cardStyle}>
            <StatisticCard
              title="Top Supplier"
              value={kpi.top_supplier?.supplier_name || "No supplier found"}
              icon={<User />}
            />
          </Box>
        </>
      )}
    </Box>
  );
};

export default PurchaseStatistics;
