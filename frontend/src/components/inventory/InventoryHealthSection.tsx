"use client";

import { useEffect, useState } from "react";
import { Box, Typography, Card, CardContent, CircularProgress } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { AlertCircle, Clock, Activity } from "lucide-react";
import theme from "../../../theme";
import { getInventoryHealthMetrics } from "../../lib/api/inventoryDashboardService";
import type { InventoryHealthMetrics } from "../../lib/types/inventoryDashboardTypes";
import { DataCard } from "../DataCard";

export default function InventoryHealthSection() {
  const [data, setData] = useState<InventoryHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInventoryHealthMetrics()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  const currency = (val: number | undefined) => (val ? `₹${val.toLocaleString("en-IN")}` : "₹0");

  const cards = [
    {
      title: "Expired Batches",
      value: data?.expiredCount || 0,
      icon: <AlertCircle size={24} />,
      color: theme.palette.error.main,
    },
    {
      title: "Expiring in 30 Days",
      value: data?.expiringSoonCount || 0,
      icon: <Clock size={24} />,
      color: theme.palette.warning.main,
    },
    {
      title: "30-Day Sales Volume",
      value: currency(data?.monthlySalesVolume),
      icon: <Activity size={24} />,
      color: theme.palette.success.main,
    },
  ];

  return (
    <Box mt={2}>
      <Grid container spacing={2}>
        {cards.map((card, index) => (
          <Grid item xs={12} md={4} key={index}>
            <DataCard
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
