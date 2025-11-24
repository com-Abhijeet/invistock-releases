"use client";

import { useEffect, useState } from "react";
import { Box, CardContent, Typography, CircularProgress } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { fetchCategoryRevenue } from "../../lib/api/salesStatsService";
import type {
  SalesFilter,
  CategoryRevenue,
} from "../../lib/types/salesStatsTypes";

const COLORS = [
  "#1976d2",
  "#7e57c2",
  "#ff7043",
  "#26a69a",
  "#ec407a",
  "#ffa726",
  "#66bb6a",
  "#ab47bc",
];

interface Props {
  filters: SalesFilter;
}

export default function SalesCategoryPieChart({ filters }: Props) {
  const [data, setData] = useState<CategoryRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRevenue = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchCategoryRevenue(filters);

        if (!Array.isArray(result)) {
          setData([]);
          setError("Unexpected data format.");

          return;
        }


        setData(result);
      } catch (error) {
        console.error("Failed to fetch category revenue:", error);
        setData([]);
        setError("Failed to load category revenue.");
      } finally {
        setLoading(false);
      }
    };

    fetchRevenue();
  }, [filters]);

  const filterLabelMap = {
    today: "today",
    month: "this month",
    year: "this year",
    custom: "this range",
  };

  return (
    <Box
      sx={{
        borderRadius: "12px",
        // border: "1px solid #ddd",
        backgroundColor: "#fff",
        height: "100%",
      }}
    >
      <CardContent>
        <Typography
          variant="subtitle2"
          fontWeight={600}
          sx={{ mb: 1, fontSize: "0.95rem" }}
        >
          Category-wise Sales Revenue
        </Typography>

        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            my={5}
          >
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : data.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Not enough sales data for {filterLabelMap[filters.filter]}.
          </Typography>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                dataKey="total_revenue"
                nameKey="category_name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                label={({ name }) => name}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `₹${value.toLocaleString()}`}
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                iconSize={10}
                wrapperStyle={{ fontSize: "0.75rem" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Box>
  );
}
