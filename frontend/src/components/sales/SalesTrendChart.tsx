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
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fetchSalesTrend } from "../../lib/api/salesStatsService";
import type {
  DashboardFilterType,
  ApiFilterParams,
  DashboardFilter,
} from "../../lib/types/inventoryDashboardTypes";
import type { TrendPoint } from "../../lib/types/salesStatsTypes";
import theme from "../../../theme";

interface SalesTrendChartProps {
  filters: DashboardFilter;
}

const generateCompleteData = (
  trend: TrendPoint[],
  filter: DashboardFilterType
): TrendPoint[] => {
  const filled: TrendPoint[] = [];

  if (filter === "year") {
    const months = Array.from({ length: 12 }, (_, i) => i);
    months.forEach((m) => {
      const monthKey = String(m + 1).padStart(2, "0");
      const entry = trend.find((t) => t.period.endsWith(`-${monthKey}`));
      filled.push({
        period: format(new Date(2000, m), "MMM"), // Short month name for vertical bars
        total: entry ? entry.total : 0,
      });
    });
  } else if (filter === "month") {
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

const SalesTrendChart = ({ filters }: SalesTrendChartProps) => {
  const [data, setData] = useState<TrendPoint[] | null>(null);
  const loading = data === null;

  const loadData = async () => {
    const apiParams: ApiFilterParams = {
      filter: filters.filter!,
      startDate: filters.from,
      endDate: filters.to,
      query: filters.query,
    };

    const res = await fetchSalesTrend(apiParams);
    setData(res?.monthly || []);
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const processedData =
    !loading && data
      ? generateCompleteData(data, filters.filter || "month")
      : [];

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box fontSize="0.95rem" fontWeight={600} mb={2}>
        Sales Trend ({filters.filter === "month" ? "Daily" : "Monthly"})
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
            {/* ✅ Removed layout="vertical" for standard column chart */}
            <BarChart
              data={processedData}
              margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />

              {/* ✅ XAxis now handles the Time Period */}
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                axisLine={{ stroke: theme.palette.divider }}
                tickLine={false}
              />

              {/* ✅ YAxis now handles the Revenue Amount */}
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
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                formatter={(value: number) => [
                  `₹ ${value.toLocaleString()}`,
                  "Revenue",
                ]}
              />
              <Bar
                dataKey="total"
                fill={theme.palette.primary.main}
                radius={[4, 4, 0, 0]} // Rounded top corners
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Box>
  );
};

export default SalesTrendChart;
