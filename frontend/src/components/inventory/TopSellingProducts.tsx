import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from "recharts";
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { getTopProducts } from "../../lib/api/inventoryDashboardService";
import type {
  DashboardFilter,
  TopProduct,
} from "../../lib/types/inventoryDashboardTypes";
import { formatIndianNumber } from "../../utils/formatNumber";

export default function TopSellingProducts({
  filters,
}: {
  filters: DashboardFilter;
}) {
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [metric, setMetric] = useState<"qty" | "revenue">("qty");

  useEffect(() => {
    getTopProducts(filters).then(setProducts);
  }, [filters]);

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Typography fontWeight={600}>Top Selling Products</Typography>
        <ToggleButtonGroup
          value={metric}
          exclusive
          onChange={(_, val) => val && setMetric(val)}
          size="small"
        >
          <ToggleButton value="qty">Qty</ToggleButton>
          <ToggleButton value="revenue">Revenue</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          layout="vertical"
          data={products}
          margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            tickFormatter={(val) => formatIndianNumber(Number(val))}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={130}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(val: number) =>
              metric === "revenue"
                ? `₹${formatIndianNumber(val)}`
                : `${formatIndianNumber(val)} units`
            }
          />
          <Bar
            dataKey={metric}
            fill={metric === "revenue" ? "#7e57c2" : "#1976d2"}
            radius={[4, 4, 4, 4]}
          >
            <LabelList
              dataKey={metric}
              position="right"
              formatter={(label) => {
                if (typeof label !== "number") return label;
                return metric === "revenue"
                  ? `₹${formatIndianNumber(label)}`
                  : formatIndianNumber(label);
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
