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

interface Props {
  trend: MonthlyStat[] | null;
  filters: DashboardFilter;
}

const generateCompleteData = (
  trend: MonthlyStat[],
  filter: DashboardFilter
): MonthlyStat[] => {
  const filled: MonthlyStat[] = [];

  if (filter.filter === "year") {
    const months = Array.from({ length: 12 }, (_, i) => i); // 0 to 11
    months.forEach((m) => {
      const monthKey = String(m + 1).padStart(2, "0");
      const entry = trend.find((t) => t.period.endsWith(`-${monthKey}`));
      filled.push({
        period: format(new Date(2000, m), "MMMM"), // Just to get month name
        total: entry ? entry.total : 0,
      });
    });
  } else if (filter.filter === "month") {
    const daysInMonth = 31; // For simplicity, show 1–31 even if month has fewer days
    for (let i = 1; i <= daysInMonth; i++) {
      const dayKey = String(i).padStart(2, "0");
      const entry = trend.find((t) => t.period.endsWith(`-${dayKey}`));
      filled.push({
        period: String(i),
        total: entry ? entry.total : 0,
      });
    }
  } else {
    // custom → use as-is
    return trend;
  }

  return filled;
};

const PurchaseTrendChart = ({ trend, filters }: Props) => {
  const loading = trend === null;
  const processedData =
    !loading && trend ? generateCompleteData(trend, filters) : [];

  return (
    <Box>
      <Box fontSize="0.95rem" fontWeight={600} mb={1}>
        Purchase Trend by {filters.filter === "month" ? "Day" : "Month"}
      </Box>

      <Box height={300} position="relative">
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
              layout="vertical"
              margin={{ left: 30, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <YAxis
                dataKey="period"
                type="category"
                tick={{ fontSize: 12, fill: "#444" }}
                axisLine={{ stroke: "#ccc" }}
                width={90} // Ensure space for long month names
                interval={0} // Force all labels to render
              />

              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: "#444" }}
                axisLine={{ stroke: "#ccc" }}
              />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Bar dataKey="total" fill="#1976d2" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Box>
  );
};

export default PurchaseTrendChart;
