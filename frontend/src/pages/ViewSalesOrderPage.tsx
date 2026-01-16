"use client";

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Box, Typography, Stack, Chip, Paper } from "@mui/material";

import SalesOrderHeader from "../components/sales-orders/SalesOrderHeader";
import SalesOrderItemSection from "../components/sales-orders/SalesOrderItemSection";
import SalesOrderSummary from "../components/sales-orders/SalesOrderSummary";
import { getSalesOrderById } from "../lib/api/salesOrderService";
import type { SalesOrderPayload } from "../lib/api/salesOrderService";
import theme from "../../theme";
import toast from "react-hot-toast";

const defaultOrder: SalesOrderPayload = {
  status: "pending",
  customer_id: 0,
  total_amount: 0,
  items: [],
  created_by: "",
  reference_no: "",
};

export default function ViewSalesOrderPage() {
  const { id } = useParams();

  const [order, setOrder] = useState<SalesOrderPayload>(defaultOrder);
  const [loading, setLoading] = useState(true);

  // Fetch Order Data
  useEffect(() => {
    if (id) {
      setLoading(true);
      getSalesOrderById(Number(id))
        .then((res) => {
          if (res.data) {
            setOrder(res.data);
          }
        })
        .catch(() => toast.error("Failed to load order"))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <Box p={4} textAlign="center">
        <Typography>Loading Order Details...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px)",
        bgcolor: theme.palette.background.default,
      }}
    >
      {/* --- Top Bar --- */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6" fontWeight={700}>
            Order #{order.reference_no}
          </Typography>
          <Chip
            label={order.status.toUpperCase()}
            color={
              order.status === "completed"
                ? "success"
                : order.status === "cancelled"
                ? "error"
                : "warning"
            }
            size="small"
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      </Paper>

      {/* --- Header Details --- */}
      <Box sx={{ flexShrink: 0 }}>
        <SalesOrderHeader
          order={order}
          options={[]} // No options needed in view mode
          loading={false}
          mode="view"
          customerId={order.customer_id || 0}
          customerName={order.customer_name || ""}
          customerPhone={order.customer_phone || ""}
          // No-op setters for view mode
          setCustomerName={() => {}}
          setCustomerPhone={() => {}}
          setCustomerId={() => {}}
          setQuery={() => {}}
          handleSelectCustomer={() => {}}
          onFieldChange={() => {}}
        />
      </Box>

      {/* --- Items List --- */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", px: 3, py: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          ORDER ITEMS ({order.items.length})
        </Typography>
        <SalesOrderItemSection
          items={order.items}
          onItemsChange={() => {}}
          mode="view"
        />
      </Box>

      {/* --- Summary Footer --- */}
      <Box
        sx={{
          flexShrink: 0,
          bgcolor: "white",
          borderTop: `1px solid ${theme.palette.divider}`,
          zIndex: 10,
        }}
      >
        <SalesOrderSummary
          order={order}
          onOrderChange={() => {}}
          onSuccess={() => {}}
          mode="view"
        />
      </Box>
    </Box>
  );
}
