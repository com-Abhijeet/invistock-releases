"use client";

import { useEffect, useState } from "react";
import { getFastMovingProducts } from "../../lib/api/inventoryDashboardService";
import type {
  DashboardFilter,
  MovingProduct,
} from "../../lib/types/inventoryDashboardTypes";
import { Box, Typography, List, ListItem, Divider } from "@mui/material";

// Helper function to format numbers
const formatNumber = (num: number | undefined): string => {
  if (num === undefined) {
    return "0";
  }
  if (num >= 10000000) {
    return (num / 10000000).toFixed(2) + " Cr";
  }
  if (num >= 100000) {
    return (num / 100000).toFixed(2) + " L";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + " K";
  }
  return num.toString();
};

export default function FastMovingProducts({
  filters,
}: {
  filters: DashboardFilter;
}) {
  const [products, setProducts] = useState<MovingProduct[]>([]);

  useEffect(() => {
    getFastMovingProducts(filters).then(setProducts);
  }, [filters]);

  return (
    <Box>
      <Typography
        fontWeight={600}
        variant="body1"
        sx={{
          mb: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          pb: 0.5,
        }}
      >
        Fast Moving Products
      </Typography>
      <List dense sx={{ maxHeight: 200, overflow: "auto", py: 0 }}>
        {products.map((p, i) => (
          <Box key={p.id || i}>
            <ListItem disablePadding sx={{ py: 0.5 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  gap: 1,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, flexShrink: 0 }}
                >
                  {i + 1}.
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    flexGrow: 1,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}
                >
                  {p.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ flexShrink: 0, minWidth: 60, textAlign: "right" }}
                >
                  Qty: {p.qty_sold}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    flexShrink: 0,
                    minWidth: 80,
                    textAlign: "right",
                    fontWeight: 600,
                  }}
                >
                  ₹{formatNumber(p.revenue)}
                </Typography>
              </Box>
            </ListItem>
            {i < products.length - 1 && <Divider component="li" />}
          </Box>
        ))}
      </List>
    </Box>
  );
}
