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
// ✅ Import the new, clarified types
import type {
  DashboardFilterType,
  ApiFilterParams,
  DashboardFilter,
} from "../../lib/types/inventoryDashboardTypes";
import type { TrendPoint } from "../../lib/types/salesStatsTypes";

// ✅ Update props to accept the new filter type
interface SalesTrendChartProps {
  filters: DashboardFilter;
}

const generateCompleteData = (
  trend: TrendPoint[],
  filter: DashboardFilterType
): TrendPoint[] => {
  const filled: TrendPoint[] = [];

  if (filter === "year") {
    const months = Array.from({ length: 12 }, (_, i) => i); // 0 to 11
    months.forEach((m) => {
      const monthKey = String(m + 1).padStart(2, "0");
      const entry = trend.find((t) => t.period.endsWith(`-${monthKey}`));
      filled.push({
        period: format(new Date(2000, m), "MMMM"), // → Jan, Feb...
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

  // useEffect(() => {
  //   console.log("filters", filters);
  // }, [filters]);

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
    <Box>
      <Box fontSize="0.95rem" fontWeight={600} mb={1}>
        Sales Trend by {filters.filter === "month" ? "Day" : "Month"}
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
                width={90}
                interval={0}
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
                formatter={(value: number) => `₹ ${value.toLocaleString()}`}
              />
              <Bar dataKey="total" fill="#1976d2" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Box>
  );
};

export default SalesTrendChart;
