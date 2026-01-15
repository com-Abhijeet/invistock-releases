"use client";

import { useState, useEffect } from "react";
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
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Chip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  AdjustStockPayload,
  adjustStock,
  STOCK_ADJUSTMENT_CATEGORIES,
} from "../../lib/api/inventoryService";
import { getProductBatches } from "../../lib/api/batchService";
import { api } from "../../lib/api/api";
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
  const [adjustment, setAdjustment] = useState<string>("");
  const [category, setCategory] = useState("Stocktaking Correction");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  // Tracking Logic
  const [trackingType, setTrackingType] = useState<"none" | "batch" | "serial">(
    "none"
  );
  const [batches, setBatches] = useState<any[]>([]);
  const [serials, setSerials] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | "">("");
  const [selectedSerialId, setSelectedSerialId] = useState<number | "">("");
  const [isUnknownBatch, setIsUnknownBatch] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);

  // Fetch full product details (to get tracking type) and batches on open
  useEffect(() => {
    if (open && productId) {
      const init = async () => {
        setFetchLoading(true);
        try {
          // 1. Get Tracking Type
          const prodRes = await api.get(`/api/products/${productId}`);
          const pType = prodRes.data.data.tracking_type || "none";
          setTrackingType(pType);

          // 2. Get Batches/Serials if tracked
          if (pType !== "none") {
            const batchRes = await getProductBatches(productId, pType);
            if (pType === "serial") {
              setSerials(batchRes); // returns list of serial objects
            } else {
              setBatches(batchRes); // returns list of batch objects
            }
          }
        } catch (err) {
          console.error("Failed to load product details", err);
        } finally {
          setFetchLoading(false);
        }
      };
      init();
    }
  }, [open, productId]);

  const adjustmentNum = Number(adjustment);
  const newStockLevel =
    currentStock + (isNaN(adjustmentNum) ? 0 : adjustmentNum);
  const isNegative = adjustmentNum < 0;

  // Auto-set batch if serial selected
  useEffect(() => {
    if (trackingType === "serial" && selectedSerialId) {
      const serial = serials.find((s) => s.id === selectedSerialId);
      if (serial) {
        setSelectedBatchId(serial.batch_id);
      }
    }
  }, [selectedSerialId, serials, trackingType]);

  const handleSubmit = async () => {
    if (!adjustment || adjustmentNum === 0) {
      return toast.error("Please enter a valid adjustment quantity.");
    }

    // Validation for tracked items (Only for Loss)
    if (isNegative && trackingType !== "none" && !isUnknownBatch) {
      if (trackingType === "batch" && !selectedBatchId) {
        return toast.error("Please select a batch or check 'Unknown Batch'.");
      }
      if (trackingType === "serial" && !selectedSerialId) {
        return toast.error("Please select a serial or check 'Unknown Batch'.");
      }
    }

    setLoading(true);
    try {
      // Construct payload with optional batch/serial IDs
      const payload: AdjustStockPayload & {
        batchId?: number;
        serialId?: number;
      } = {
        productId,
        adjustment: adjustmentNum,
        category,
        reason,
        batchId: selectedBatchId ? Number(selectedBatchId) : undefined,
        serialId: selectedSerialId ? Number(selectedSerialId) : undefined,
      };

      // If "Unknown Batch" is checked, remove IDs so backend treats as general loss
      if (isUnknownBatch) {
        delete payload.batchId;
        delete payload.serialId;
      }

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
    setSelectedBatchId("");
    setSelectedSerialId("");
    setIsUnknownBatch(false);
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
          {trackingType !== "none" && (
            <Chip
              label={`${trackingType.toUpperCase()} TRACKED`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mt: 0.5 }}
            />
          )}
        </Box>

        {fetchLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress size={24} />
          </Box>
        ) : (
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

              {/* Tracked Item Logic (Only visible for Negative Adjustments usually, or adding to existing batch) */}
              {trackingType !== "none" && isNegative && (
                <Grid item xs={12}>
                  <Box
                    p={2}
                    border="1px dashed #ccc"
                    borderRadius={2}
                    bgcolor="#fff"
                  >
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      color="text.secondary"
                      gutterBottom
                    >
                      SPECIFY LOSS SOURCE
                    </Typography>

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isUnknownBatch}
                          onChange={(e) => setIsUnknownBatch(e.target.checked)}
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2">
                          Unknown Batch / General Loss
                        </Typography>
                      }
                    />

                    {!isUnknownBatch && (
                      <Stack spacing={2} mt={1}>
                        {trackingType === "batch" && (
                          <FormField label="Select Batch">
                            <TextField
                              select
                              fullWidth
                              size="small"
                              value={selectedBatchId}
                              onChange={(e) =>
                                setSelectedBatchId(Number(e.target.value))
                              }
                            >
                              {batches.map((b) => (
                                <MenuItem key={b.id} value={b.id}>
                                  {b.batch_number} (Qty: {b.quantity})
                                </MenuItem>
                              ))}
                            </TextField>
                          </FormField>
                        )}

                        {trackingType === "serial" && (
                          <FormField label="Select Serial">
                            <TextField
                              select
                              fullWidth
                              size="small"
                              value={selectedSerialId}
                              onChange={(e) =>
                                setSelectedSerialId(Number(e.target.value))
                              }
                            >
                              {serials.map((s) => (
                                <MenuItem key={s.id} value={s.id}>
                                  {s.serial_number}
                                </MenuItem>
                              ))}
                            </TextField>
                          </FormField>
                        )}
                      </Stack>
                    )}
                  </Box>
                </Grid>
              )}

              {/* Positive Adjustment for Tracked Items */}
              {trackingType !== "none" && !isNegative && adjustment && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    You are adding general stock. To assign this to a specific
                    batch, use the "Assign to Batch" feature in the Batches tab
                    later.
                  </Alert>
                </Grid>
              )}

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
        )}
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
