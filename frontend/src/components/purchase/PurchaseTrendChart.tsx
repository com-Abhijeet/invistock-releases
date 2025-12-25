"use client";
import {
  ResponsiveContainer,
  BarChart,
  YAxis,
  XAxis,
  Tooltip,
  CartesianGrid,
  Bar,
} from "recharts";
import { Box, CircularProgress } from "@mui/material";
import { format } from "date-fns";
import type { MonthlyStat } from "../../lib/types/purchaseStatsTypes";
import type { DashboardFilter } from "../../lib/types/inventoryDashboardTypes";
import theme from "../../../theme";

interface Props {
  trend: MonthlyStat[] | null;
  filters: DashboardFilter;
}

const generateCompleteData = (
  trend: MonthlyStat[],
  filters: DashboardFilter
): MonthlyStat[] => {
  const filled: MonthlyStat[] = [];

  if (filters.filter === "year") {
    const months = Array.from({ length: 12 }, (_, i) => i);
    months.forEach((m) => {
      const monthKey = String(m + 1).padStart(2, "0");
      const entry = trend.find((t) => t.period.endsWith(`-${monthKey}`));
      filled.push({
        period: format(new Date(2000, m), "MMM"), // Short month name
        total: entry ? entry.total : 0,
      });
    });
  } else if (filters.filter === "month") {
    const daysInMonth = 31;
    for (let i = 1; i <= daysInMonth; i++) {
      const dayKey = String(i).padStart(2, "0");
      const entry = trend.find((t) => t.period.endsWith(`-${dayKey}`));
      filled.push({
        period: String(i),
        total: entry ? entry.total : 0,
      });
    }
  } else {
    return trend;
  }

  return filled;
};

const PurchaseTrendChart = ({ trend, filters }: Props) => {
  const loading = trend === null;
  const processedData =
    !loading && trend ? generateCompleteData(trend, filters) : [];

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box fontSize="0.95rem" fontWeight={600} mb={2}>
        Purchase Trend ({filters.filter === "month" ? "Daily" : "Monthly"})
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100%"
          >
            <CircularProgress size={28} />
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={processedData}
              margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />

              <XAxis
                dataKey="period"
                tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                axisLine={{ stroke: theme.palette.divider }}
                tickLine={false}
              />

              <YAxis
                tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) =>
                  `₹${val >= 1000 ? `${val / 1000}k` : val}`
                }
              />

              <Tooltip
                contentStyle={{
                  background: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  fontSize: "0.85rem",
                }}
                labelStyle={{
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  marginBottom: 4,
                }}
                formatter={(value: number) => [
                  `₹ ${value.toLocaleString()}`,
                  "Amount",
                ]}
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
              />
              <Bar
                dataKey="total"
                fill={theme.palette.primary.main}
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Box>
  );
};

export default PurchaseTrendChart;
