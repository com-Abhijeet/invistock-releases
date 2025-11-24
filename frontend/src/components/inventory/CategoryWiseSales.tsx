"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Box, Typography } from "@mui/material";
import { getCategorySales } from "../../lib/api/inventoryDashboardService";
import type {
  CategorySales,
  DashboardFilter,
} from "../../lib/types/inventoryDashboardTypes";
import { formatIndianNumber } from "../../utils/formatNumber";

const COLORS = [
  "#1976d2",
  "#7e57c2",
  "#26a69a",
  "#ffa726",
  "#ec407a",
  "#66bb6a",
  "#ff7043",
  "#ab47bc",
  "#26c6da",
  "#ef5350",
];

export default function CategoryWiseSales({
  filters,
}: {
  filters: DashboardFilter;
}) {
  const [data, setData] = useState<CategorySales[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");

  useEffect(() => {
    getCategorySales(filters).then((res) => {
      setData(res);
      if (res.length > 0) {
        setActiveCategory(res[0].category);
      }
    });
  }, [filters]);

  const activeCategoryObj = data.find((d) => d.category === activeCategory);
  const subcategories = activeCategoryObj?.subcategories || [];

  return (
    <Box>
      <Typography fontWeight={600} mb={1}>
        Category-wise Sales
      </Typography>
      <Box display="flex" gap={2} flexWrap="wrap">
        {/* Left: Pie Chart */}
        <Box flex={1} minWidth={300} height={250}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="category_sales"
                nameKey="category"
                outerRadius={80}
                innerRadius={50}
                cx="50%"
                cy="50%"
                onClick={(entry) => setActiveCategory(entry.category)}
                isAnimationActive={false}
              >
                {data.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    cursor="pointer"
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: number) => `₹${formatIndianNumber(val)}`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>

        {/* Right: Subcategory List Styled */}
        <Box flex={1} minWidth={250}>
          <Typography fontWeight={500} mb={1}>
            {activeCategory} - Subcategories
          </Typography>

          <Box
            display="flex"
            flexDirection="column"
            gap={1}
            maxHeight={250}
            overflow="auto"
          >
            {subcategories.length > 0 ? (
              subcategories.map((item, idx) => (
                <Box
                  key={idx}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  px={2}
                  py={1}
                  borderRadius={2}
                  bgcolor={idx % 2 === 0 ? "#f5f5f5" : "#fafafa"}
                  boxShadow="0 1px 2px rgba(0,0,0,0.05)"
                  fontSize="0.9rem"
                >
                  <Typography width="10%" fontWeight={500}>
                    {idx + 1}.
                  </Typography>
                  <Typography width="60%">{item.subcategory}</Typography>
                  <Typography width="30%" textAlign="right">
                    ₹{formatIndianNumber(item.subcategory_sales || 0)}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No subcategories available.
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
