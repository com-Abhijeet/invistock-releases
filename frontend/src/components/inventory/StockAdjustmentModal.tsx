"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Typography,
  Box,
  InputAdornment,
  Alert,
  Paper,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  AdjustStockPayload,
  adjustStock,
  STOCK_ADJUSTMENT_CATEGORIES,
} from "../../lib/api/inventoryService";
import { FormField } from "../FormField";
import toast from "react-hot-toast";
import { Activity, AlertTriangle, ArrowRight } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productName: string;
  productId: number;
  currentStock: number;
}

export default function StockAdjustmentModal({
  open,
  onClose,
  onSuccess,
  productName,
  productId,
  currentStock,
}: Props) {
  const [adjustment, setAdjustment] = useState<string>(""); // String to handle empty state
  const [category, setCategory] = useState("Stocktaking Correction");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const adjustmentNum = Number(adjustment);
  const newStockLevel =
    currentStock + (isNaN(adjustmentNum) ? 0 : adjustmentNum);
  const isNegative = adjustmentNum < 0;

  const handleSubmit = async () => {
    if (!adjustment || adjustmentNum === 0) {
      return toast.error("Please enter a valid adjustment quantity.");
    }

    setLoading(true);
    try {
      const payload: AdjustStockPayload = {
        productId,
        adjustment: adjustmentNum,
        category,
        reason,
      };

      await adjustStock(payload);
      toast.success("Stock updated successfully!");
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to adjust stock.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAdjustment("");
    setCategory("Stocktaking Correction");
    setReason("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Adjust Stock</DialogTitle>
      <DialogContent dividers>
        <Box mb={2}>
          <Typography variant="subtitle2" color="text.secondary">
            Product
          </Typography>
          <Typography variant="h6" fontWeight="bold">
            {productName}
          </Typography>
        </Box>

        <Stack spacing={2}>
          {/* Adjustment Calculation Display */}
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
            >
              <Box textAlign="center">
                <Typography variant="caption">Current</Typography>
                <Typography variant="h6">{currentStock}</Typography>
              </Box>
              {adjustment && (
                <>
                  <Box
                    textAlign="center"
                    color={isNegative ? "error.main" : "success.main"}
                  >
                    <Typography variant="caption">Change</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {isNegative ? "" : "+"}
                      {adjustment}
                    </Typography>
                  </Box>
                  <ArrowRight size={20} color="#888" />
                  <Box textAlign="center">
                    <Typography variant="caption">New Stock</Typography>
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      color="primary.main"
                    >
                      {newStockLevel}
                    </Typography>
                  </Box>
                </>
              )}
            </Stack>
          </Paper>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormField label="Adjustment (+/-)">
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  value={adjustment}
                  onChange={(e) => setAdjustment(e.target.value)}
                  placeholder="-1 or 5"
                  autoFocus
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Activity size={18} />
                      </InputAdornment>
                    ),
                  }}
                />
              </FormField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormField label="Category">
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {STOCK_ADJUSTMENT_CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </TextField>
              </FormField>
            </Grid>
            <Grid item xs={12}>
              <FormField label="Reason / Note (Optional)">
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Box fell during transport"
                />
              </FormField>
            </Grid>
          </Grid>

          {newStockLevel < 0 && (
            <Alert severity="warning" icon={<AlertTriangle size={20} />}>
              Warning: This adjustment will result in negative stock.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color={isNegative ? "error" : "primary"}
          disabled={loading || !adjustment}
        >
          {loading ? "Updating..." : "Update Stock"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
