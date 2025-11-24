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
import { fetchCategorySpend } from "../../lib/api/purchaseStatsService";
import type { CategorySpend } from "../../lib/types/purchaseStatsTypes";

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

export default function PurchaseCategoryPieChart() {
  const [data, setData] = useState<CategorySpend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpend = async () => {
      try {
        const result = await fetchCategorySpend();
        setData(result || []);
      } catch (error) {
        console.error("Failed to fetch category spend:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSpend();
  }, []);

  return (
    <Box
      //   elevation={1}
      sx={{
        borderRadius: "12px",
        border: "ActiveBorder",
        // boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
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
          Category-wise Spend
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
        ) : data.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No purchase category data available.
          </Typography>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                dataKey="total_spend"
                nameKey="category_name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                label={({ name }) => name}
              >
                {data.map((_entry, index) => (
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
