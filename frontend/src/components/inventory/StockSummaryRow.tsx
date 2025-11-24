"use client";

import {
  Box,
  Typography,
  Divider,
  Card,
  CardContent,
  Tooltip,
} from "@mui/material";
import { useEffect, useState } from "react";
import { getTotalStockSummary } from "../../lib/api/inventoryDashboardService";
import type {
  TotalStockSummaryResponse,
  StockByCategory,
} from "../../lib/types/inventoryDashboardTypes";

// 👇 Format large numbers like 1.2K, 5.3L, 10.5Cr
function formatShortNumber(value: number): string {
  if (value >= 1e7) return (value / 1e7)?.toFixed(1) + "Cr";
  if (value >= 1e5) return (value / 1e5)?.toFixed(1) + "L";
  if (value >= 1e3) return (value / 1e3)?.toFixed(1) + "K";
  return value?.toFixed(0);
}

export default function StockSummaryRow() {
  const [data, setData] = useState<TotalStockSummaryResponse | null>(null);

  useEffect(() => {
    getTotalStockSummary().then(setData).catch(console.error);
  }, []);

  if (!data) return null;

  const { overall, byCategory } = data;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "stretch",
        gap: 2,
        p: 2,
        overflowX: "auto",
        whiteSpace: "nowrap",
      }}
    >
      {/* 🔹 Total Stock Summary Card */}
      <Tooltip
        title={`Quantity: ${overall.total_quantity} units | Value: ₹${
          overall.total_value?.toLocaleString() || 0
        }`}
        arrow
      >
        <Card
          sx={{
            width: 180,
            flexShrink: 0,
            borderLeft: "4px solid #1976d2",
            cursor: "help",
          }}
        >
          <CardContent>
            <Typography fontSize="1.5rem" fontWeight={700} color="primary">
              ₹{formatShortNumber(overall.total_value)}
            </Typography>
            <Typography fontSize="0.9rem" fontWeight={600}>
              Total Stock
            </Typography>
            <Typography fontSize="0.75rem" color="text.secondary">
              In Stock
            </Typography>
          </CardContent>
        </Card>
      </Tooltip>

      {/* 🔹 Vertical Divider */}
      <Divider orientation="vertical" flexItem />

      {/* 🔹 Category Cards - Horizontal Scroll */}
      <Box
        sx={{
          display: "flex",
          gap: 1.5,
          overflowX: "auto",
          py: 1,
        }}
      >
        {byCategory.map((cat: StockByCategory, index) => (
          <Tooltip
            key={index}
            arrow
            title={`Category: ${cat.category || "Uncategorized"} | Quantity: ${
              cat.total_quantity
            } | Value: ₹${cat.total_value?.toLocaleString() || 0}`}
          >
            <Card
              sx={{
                width: 160,
                flexShrink: 0,
                background: "#f9f9f9",
                borderLeft: "4px solid #7e57c2",
                cursor: "help",
              }}
            >
              <CardContent>
                <Typography
                  fontSize="1.3rem"
                  fontWeight={700}
                  color="secondary"
                >
                  ₹{formatShortNumber(cat.total_value)}
                </Typography>
                <Typography fontSize="0.85rem" fontWeight={600}>
                  {cat.category || "Uncategorized"}
                </Typography>
                <Typography fontSize="0.75rem" color="text.secondary">
                  In Stock
                </Typography>
              </CardContent>
            </Card>
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
}
