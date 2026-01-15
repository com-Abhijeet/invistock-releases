"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  TextField,
  Box,
  Chip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import toast from "react-hot-toast";
import {
  assignStockToBatch,
  AssignStockPayload,
} from "../../lib/api/batchService";
import { Product } from "../../lib/types/product";

interface AssignBatchModalProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  maxQuantity: number; // Available untracked quantity
  onSuccess: () => void;
}

export default function AssignBatchModal({
  open,
  onClose,
  product,
  maxQuantity,
  onSuccess,
}: AssignBatchModalProps) {
  const [loading, setLoading] = useState(false);
  const [serialInput, setSerialInput] = useState("");

  // Form State typed with Partial<AssignStockPayload> to allow progressive filling
  const [formData, setFormData] = useState<Partial<AssignStockPayload>>({
    productId: product.id,
    quantity: 0,
    batchNumber: "",
    location: "",
    expiryDate: "",
    mfgDate: "",
    mrp: product.mrp || 0,
    mop: product.mop || 0,
    mfwPrice: Number(product.mfw_price) || 0,
    serials: [],
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open && product) {
      setFormData({
        productId: product.id,
        quantity: 0,
        batchNumber: "",
        location: product.storage_location || "",
        expiryDate: "",
        mfgDate: "",
        mrp: product.mrp || 0,
        mop: product.mop || 0,
        mfwPrice: Number(product.mfw_price) || 0,
        serials: [],
      });
      setSerialInput("");
    }
  }, [open, product]);

  const handleChange = (
    field: keyof AssignStockPayload,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSerial = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && serialInput.trim()) {
      e.preventDefault();
      const currentSerials = formData.serials || [];
      const newSerial = serialInput.trim();

      if (currentSerials.includes(newSerial)) {
        toast.error("Duplicate serial number");
        return;
      }

      const newSerials = [...currentSerials, newSerial];
      setFormData((prev) => ({
        ...prev,
        serials: newSerials,
        quantity: newSerials.length, // Auto-update quantity for serial items
      }));
      setSerialInput("");
    }
  };

  const removeSerial = (serialToRemove: string) => {
    const newSerials = (formData.serials || []).filter(
      (s) => s !== serialToRemove
    );
    setFormData((prev) => ({
      ...prev,
      serials: newSerials,
      quantity: newSerials.length,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.batchNumber) {
      toast.error("Batch Number is required");
      return;
    }
    if (!formData.quantity || formData.quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    // Ensure we don't assign more than available
    if (formData.quantity > maxQuantity && maxQuantity > 0) {
      toast.error(
        `Cannot assign more than available untracked stock (${maxQuantity})`
      );
      return;
    }

    // Serial Validation
    if (product.tracking_type === "serial") {
      const serialCount = formData.serials?.length || 0;
      if (serialCount !== formData.quantity) {
        toast.error(
          `Serial count mismatch! Expected: ${formData.quantity}, Added: ${serialCount}`
        );
        return;
      }
    }

    setLoading(true);
    try {
      // Cast to AssignStockPayload because validation passed
      await assignStockToBatch(formData as AssignStockPayload);
      toast.success("Stock assigned to batch successfully");
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to assign stock");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign Untracked Stock to Batch</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} pt={1}>
          <Typography variant="body2" color="text.secondary">
            You are converting <b>untracked</b> inventory into a{" "}
            <b>tracked batch</b>. This will NOT change the total stock quantity
            of the product.
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Batch Number"
                fullWidth
                size="small"
                value={formData.batchNumber || ""}
                onChange={(e) => handleChange("batchNumber", e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Quantity to Assign"
                type="number"
                fullWidth
                size="small"
                value={formData.quantity || ""}
                onChange={(e) =>
                  handleChange("quantity", Number(e.target.value))
                }
                disabled={product.tracking_type === "serial"}
                helperText={
                  product.tracking_type === "serial"
                    ? "Determined by serial count"
                    : `Max Available: ${maxQuantity}`
                }
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Expiry Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
                value={formData.expiryDate || ""}
                onChange={(e) => handleChange("expiryDate", e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Location"
                fullWidth
                size="small"
                value={formData.location || ""}
                onChange={(e) => handleChange("location", e.target.value)}
              />
            </Grid>

            {/* Pricing Section */}
            <Grid item xs={12}>
              <Typography
                variant="caption"
                fontWeight={600}
                color="text.secondary"
              >
                BATCH PRICING (Optional Override)
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="MRP"
                type="number"
                fullWidth
                size="small"
                value={formData.mrp || ""}
                onChange={(e) => handleChange("mrp", Number(e.target.value))}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="MOP (Offer)"
                type="number"
                fullWidth
                size="small"
                value={formData.mop || ""}
                onChange={(e) => handleChange("mop", Number(e.target.value))}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="MFW (Wholesale)"
                type="number"
                fullWidth
                size="small"
                value={formData.mfwPrice || ""}
                onChange={(e) =>
                  handleChange("mfwPrice", Number(e.target.value))
                }
              />
            </Grid>
          </Grid>

          {/* Serial Number Input */}
          {product.tracking_type === "serial" && (
            <Box
              sx={{
                border: "1px solid #eee",
                p: 2,
                borderRadius: 2,
                bgcolor: "#fafafa",
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Add Serial Numbers ({formData.serials?.length || 0})
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Type serial and press Enter"
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                onKeyDown={handleAddSerial}
              />
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  mt: 1,
                  maxHeight: 100,
                  overflowY: "auto",
                }}
              >
                {formData.serials?.map((sn: string) => (
                  <Chip
                    key={sn}
                    label={sn}
                    size="small"
                    onDelete={() => removeSerial(sn)}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? "Assigning..." : "Confirm Assignment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
