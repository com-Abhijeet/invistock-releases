"use client";

import React, { useState, useEffect, useRef } from "react";
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
  RadioGroup,
  FormControlLabel,
  Radio,
  Tooltip,
  IconButton,
  Chip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  Plus,
  Sparkles,
  Barcode as BarcodeIcon,
  Calendar,
  Layers,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

import { Product } from "../../lib/types/product";
import {
  createManualBatch,
  generateBarcode,
  CreateBatchPayload,
} from "../../lib/api/batchService";
import FastSerialScannerInput from "./FastSerialScannerInput";

interface CreateBatchModalProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  untrackedQuantity?: number;
  onSuccess: () => void;
}

export default function CreateBatchModal({
  open,
  onClose,
  product,
  untrackedQuantity = 0,
  onSuccess,
}: CreateBatchModalProps) {
  const [loading, setLoading] = useState(false);

  // Stock mode: 'new_stock' (increments total product.quantity) vs 'untracked_stock' (converts general stock)
  const [stockMode, setStockMode] = useState<"new_stock" | "untracked_stock">(
    untrackedQuantity > 0 ? "untracked_stock" : "new_stock"
  );

  const [formData, setFormData] = useState<{
    batchNumber: string;
    barcode: string;
    quantity: number;
    expiryDate: string;
    mfgDate: string;
    mrp: number;
    mop: number;
    mfwPrice: number;
    location: string;
    serials: string[];
  }>({
    batchNumber: "",
    barcode: "",
    quantity: 1,
    expiryDate: "",
    mfgDate: "",
    mrp: product?.mrp || 0,
    mop: product?.mop || 0,
    mfwPrice: Number(product?.mfw_price) || 0,
    location: product?.storage_location || "",
    serials: [],
  });

  const batchInputRef = useRef<HTMLInputElement>(null);

  // Initialize form state on open
  useEffect(() => {
    if (open && product) {
      const today = new Date().toISOString().split("T")[0];
      const autoBatchNum = `BAT-${new Date()
        .toISOString()
        .slice(2, 10)
        .replace(/-/g, "")}-${Math.floor(10 + Math.random() * 90)}`;

      setStockMode(untrackedQuantity > 0 ? "untracked_stock" : "new_stock");
      setFormData({
        batchNumber: autoBatchNum,
        barcode: "",
        quantity: 1,
        expiryDate: "",
        mfgDate: today,
        mrp: product.mrp || 0,
        mop: product.mop || 0,
        mfwPrice: Number(product.mfw_price) || 0,
        location: product.storage_location || "Store",
        serials: [],
      });

      // Auto-focus batch number input
      setTimeout(() => {
        if (batchInputRef.current) {
          batchInputRef.current.focus();
          batchInputRef.current.select();
        }
      }, 100);
    }
  }, [open, product, untrackedQuantity]);

  // Global Keyboard Listener (Ctrl+Enter to submit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open && (e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, formData, stockMode]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerateBarcode = async () => {
    try {
      const code = await generateBarcode();
      handleChange("barcode", code);
      toast.success("Generated unique barcode");
    } catch (err) {
      toast.error("Failed to generate barcode");
    }
  };

  // Quick Expiry Date Preset Helper
  const applyExpiryPreset = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    const dateStr = d.toISOString().split("T")[0];
    handleChange("expiryDate", dateStr);
  };

  const handleSubmit = async () => {
    if (!formData.batchNumber.trim()) {
      toast.error("Batch Number is required");
      return;
    }

    const isSerial = product.tracking_type === "serial";
    const finalQuantity = isSerial
      ? formData.serials.length
      : Number(formData.quantity);

    if (finalQuantity <= 0) {
      toast.error(
        isSerial
          ? "Please add at least one serial number"
          : "Quantity must be greater than 0"
      );
      return;
    }

    if (
      stockMode === "untracked_stock" &&
      untrackedQuantity > 0 &&
      finalQuantity > untrackedQuantity
    ) {
      toast.error(
        `Cannot assign more than available untracked stock (${untrackedQuantity})`
      );
      return;
    }

    setLoading(true);
    try {
      const payload: CreateBatchPayload = {
        productId: product.id,
        batchNumber: formData.batchNumber.trim(),
        barcode: formData.barcode.trim() || undefined,
        quantity: finalQuantity,
        expiryDate: formData.expiryDate || undefined,
        mfgDate: formData.mfgDate || undefined,
        mrp: Number(formData.mrp) || 0,
        mop: Number(formData.mop) || 0,
        mfwPrice: Number(formData.mfwPrice) || 0,
        location: formData.location.trim() || undefined,
        serials: isSerial ? formData.serials : undefined,
        increaseProductStock: stockMode === "new_stock",
      };

      await createManualBatch(payload);
      toast.success(
        stockMode === "new_stock"
          ? `Batch created & added ${finalQuantity} units to stock!`
          : `Assigned ${finalQuantity} units to batch!`
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error || "Failed to create batch");
    } finally {
      setLoading(false);
    }
  };

  const isSerialTracked = product.tracking_type === "serial";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: "#f8fafc",
          borderBottom: "1px solid",
          borderColor: "divider",
          pb: 1.5,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Manual Stock Entry
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Product: <b>{product.name}</b> ({product.tracking_type?.toUpperCase()} TRACKED)
            </Typography>
          </Box>
          <Chip
            icon={<Zap size={14} />}
            label="Ctrl+Enter to Save"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5} pt={1}>
          {/* Stock Mode Switch */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: stockMode === "new_stock" ? "primary.50" : "warning.50",
              border: "1px solid",
              borderColor:
                stockMode === "new_stock" ? "primary.200" : "warning.200",
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Stock Source Selection
            </Typography>
            <RadioGroup
              row
              value={stockMode}
              onChange={(e) =>
                setStockMode(e.target.value as "new_stock" | "untracked_stock")
              }
            >
              <FormControlLabel
                value="new_stock"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      🟢 Add New Stock
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Creates batch AND increases total product inventory
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="untracked_stock"
                control={<Radio size="small" />}
                disabled={untrackedQuantity <= 0}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      🟡 Assign Untracked Stock ({untrackedQuantity} Available)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Converts general inventory into tracked batch without double counting
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </Box>

          <Grid container spacing={2}>
            {/* Batch Number */}
            <Grid item xs={12} sm={6}>
              <TextField
                inputRef={batchInputRef}
                label="Batch Number"
                fullWidth
                size="small"
                value={formData.batchNumber}
                onChange={(e) => handleChange("batchNumber", e.target.value)}
                required
                onFocus={(e) => e.target.select()}
              />
            </Grid>

            {/* Barcode with Auto-Generate */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Barcode / UID"
                fullWidth
                size="small"
                value={formData.barcode}
                onChange={(e) => handleChange("barcode", e.target.value)}
                placeholder="Scan or generate..."
                InputProps={{
                  endAdornment: (
                    <Tooltip title="Generate Unique Barcode">
                      <IconButton
                        size="small"
                        onClick={handleGenerateBarcode}
                        color="primary"
                      >
                        <Sparkles size={18} />
                      </IconButton>
                    </Tooltip>
                  ),
                }}
              />
            </Grid>

            {/* Quantity (for batch tracked) */}
            {!isSerialTracked && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Batch Quantity"
                  type="number"
                  fullWidth
                  size="small"
                  value={formData.quantity}
                  onChange={(e) =>
                    handleChange("quantity", Number(e.target.value))
                  }
                  required
                  onFocus={(e) => e.target.select()}
                  helperText={
                    stockMode === "untracked_stock"
                      ? `Max available untracked: ${untrackedQuantity}`
                      : "Units to add to inventory"
                  }
                />
              </Grid>
            )}

            {/* Storage Location */}
            <Grid item xs={12} sm={isSerialTracked ? 6 : 6}>
              <TextField
                label="Storage Location / Shelf"
                fullWidth
                size="small"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="e.g. Aisle 3, Shelf B"
              />
            </Grid>

            {/* Dates & Presets */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Mfg Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
                value={formData.mfgDate}
                onChange={(e) => handleChange("mfgDate", e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Expiry Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
                value={formData.expiryDate}
                onChange={(e) => handleChange("expiryDate", e.target.value)}
              />
              <Stack direction="row" spacing={0.5} mt={0.8} flexWrap="wrap" gap={0.5}>
                <Typography variant="caption" color="text.secondary" alignSelf="center">
                  Quick Expiry:
                </Typography>
                <Chip
                  label="+3M"
                  size="small"
                  variant="outlined"
                  onClick={() => applyExpiryPreset(3)}
                  sx={{ cursor: "pointer", height: 20, fontSize: "0.7rem" }}
                />
                <Chip
                  label="+6M"
                  size="small"
                  variant="outlined"
                  onClick={() => applyExpiryPreset(6)}
                  sx={{ cursor: "pointer", height: 20, fontSize: "0.7rem" }}
                />
                <Chip
                  label="+1Y"
                  size="small"
                  variant="outlined"
                  onClick={() => applyExpiryPreset(12)}
                  sx={{ cursor: "pointer", height: 20, fontSize: "0.7rem" }}
                />
                <Chip
                  label="+2Y"
                  size="small"
                  variant="outlined"
                  onClick={() => applyExpiryPreset(24)}
                  sx={{ cursor: "pointer", height: 20, fontSize: "0.7rem" }}
                />
              </Stack>
            </Grid>

            {/* Pricing Overrides */}
            <Grid item xs={12}>
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
              >
                Batch Pricing (Defaulted from master product)
              </Typography>
            </Grid>

            <Grid item xs={4}>
              <TextField
                label="MRP (₹)"
                type="number"
                fullWidth
                size="small"
                value={formData.mrp}
                onChange={(e) => handleChange("mrp", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                label="MOP / Selling (₹)"
                type="number"
                fullWidth
                size="small"
                value={formData.mop}
                onChange={(e) => handleChange("mop", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                label="MFW / Wholesale (₹)"
                type="number"
                fullWidth
                size="small"
                value={formData.mfwPrice}
                onChange={(e) =>
                  handleChange("mfwPrice", Number(e.target.value))
                }
                onFocus={(e) => e.target.select()}
              />
            </Grid>
          </Grid>

          {/* Serial Number Scanner (For serial tracked products) */}
          {isSerialTracked && (
            <FastSerialScannerInput
              serials={formData.serials}
              onChange={(newSerials) => handleChange("serials", newSerials)}
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: "#f8fafc" }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          startIcon={<Plus size={18} />}
          disabled={loading}
          sx={{ px: 3, fontWeight: 700 }}
        >
          {loading ? "Saving..." : "Save Stock Entry (Ctrl+Enter)"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
