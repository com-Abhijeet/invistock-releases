"use client";

import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  CircularProgress,
  useTheme,
  Divider,
} from "@mui/material";
import { useState } from "react";
import type { SalesOrderPayload } from "../../lib/api/salesOrderService";
import {
  createSalesOrder,
  updateSalesOrder,
} from "../../lib/api/salesOrderService";
import { numberToWords } from "../../utils/numberToWords";
import toast from "react-hot-toast";
import { Save } from "lucide-react";

interface Props {
  order: SalesOrderPayload;
  onOrderChange: (updated: SalesOrderPayload) => void;
  onSuccess: () => void;
  mode: "new" | "view" | "edit";
}

export default function SalesOrderSummary({
  order,
  onOrderChange,
  onSuccess,
  mode,
}: Props) {
  const theme = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (order.items.length === 0) {
      toast.error("Please add items to the order");
      return;
    }
    if (!order.customer_name && !order.customer_id) {
      toast.error("Please select or enter a customer");
      return;
    }

    setIsSubmitting(true);
    try {
      if (order.id) {
        await updateSalesOrder(order.id, order);
        toast.success("Order Updated Successfully");
      } else {
        await createSalesOrder(order);
        toast.success("Order Created Successfully");
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: theme.palette.background.default }}>
      {/* 1. Notes */}
      <Box px={3} py={1}>
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={1}
          maxRows={2}
          value={order.note || ""}
          onChange={(e) => onOrderChange({ ...order, note: e.target.value })}
          placeholder="Order remarks (e.g. Delivery by Monday)..."
          variant="standard"
          disabled={mode === "view"}
          InputProps={{
            disableUnderline: true,
            sx: { fontSize: "0.9rem", color: "text.secondary" },
          }}
        />
        <Divider sx={{ mt: 1 }} />
      </Box>

      {/* 2. Footer */}
      <Box sx={{ px: 3, py: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-end"
        >
          {/* Total Display */}
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="baseline" spacing={2}>
              <Typography
                variant="h4"
                fontWeight={800}
                color="text.primary"
                lineHeight={1}
              >
                {order.total_amount.toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                })}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  textTransform: "uppercase",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                Total Amount
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              fontStyle="italic"
              color="text.secondary"
            >
              {numberToWords(order.total_amount)}
            </Typography>
          </Stack>

          {/* Actions */}
          {mode !== "view" && (
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={isSubmitting}
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Save size={18} />
                )
              }
              sx={{ px: 4, borderRadius: 2, fontWeight: 700 }}
            >
              {isSubmitting
                ? "Saving..."
                : order.id
                ? "Update Order"
                : "Create Order"}
            </Button>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
