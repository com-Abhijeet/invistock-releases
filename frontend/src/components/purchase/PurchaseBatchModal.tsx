"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Box,
  Chip,
  InputAdornment,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  ScanBarcode,
  Calculator,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import type { Product } from "../../lib/types/product";
import type { PurchaseItem } from "../../lib/types/purchaseTypes";
import {
  generateBarcode,
  checkBarcodeExists,
} from "../../lib/api/batchService";
import { getUnitsForProduct } from "../../lib/services/unitService";
import toast from "react-hot-toast";

// Extended Item Type used locally
export interface ExtendedPurchaseItem extends PurchaseItem {
  product_name?: string;
  tracking_type?: "none" | "batch" | "serial";
  batch_number?: string;
  expiry_date?: string;
  mfg_date?: string;
  mrp?: number;
  mop?: number;
  mfw_price?: string;
  location?: string;
  serial_numbers?: string[];
  unit?: string;
  margin?: number;
  barcode?: string;
  return_quantity?: number;
  net_price?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onAddItems: (items: ExtendedPurchaseItem[]) => void;
  editItem?: ExtendedPurchaseItem | null;
}

const generateBatchNumber = (productId?: number) => {
  const stamp = Date.now().toString().slice(-6);
  return productId ? `${productId}-${stamp}` : `BT-${stamp}`;
};

export default function PurchaseBatchModal({
  open,
  onClose,
  products,
  onAddItems,
  editItem,
}: Props) {
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    batch_number: "",
    expiry_date: "",
    mfg_date: "",
    location: "",
    rate: 0,
    quantity: 1,
    unit: "",
    margin: 0,
    mrp: 0,
    mop: 0,
    mfw_price: "",
    barcode: "",
    gst_rate: 0,
    serial_numbers: "",
  });

  const [mrpGap, setMrpGap] = useState<number | "">(0);
  const [loading, setLoading] = useState(false);
  const [barcodeStatus, setBarcodeStatus] = useState<
    "idle" | "checking" | "available" | "duplicate"
  >("idle");

  // Selection & Navigation State
  const [inputValue, setInputValue] = useState("");

  // Refs
  const productInputRef = useRef<HTMLInputElement>(null);
  const rateInputRef = useRef<HTMLInputElement>(null);

  // Initialize form
  useEffect(() => {
    if (open) {
      if (editItem) {
        // Edit Mode
        const product = products.find((p) => p.id === editItem.product_id);
        setSelectedProducts(product ? [product] : []);
        setFormData({
          batch_number: editItem.batch_number || "",
          expiry_date: editItem.expiry_date || "",
          mfg_date: editItem.mfg_date || "",
          location: editItem.location || "",
          rate: editItem.rate || 0,
          quantity: editItem.quantity || 1,
          unit: editItem.unit || "",
          margin: editItem.margin || 0,
          mrp: editItem.mrp || 0,
          mop: editItem.mop || 0,
          mfw_price: editItem.mfw_price || "",
          barcode: editItem.barcode || "",
          gst_rate: editItem.gst_rate || 0,
          serial_numbers: editItem.serial_numbers?.join("\n") || "",
        });
        setMrpGap(0);
        if (editItem.barcode) checkBarcode(editItem.barcode, true);
      } else {
        // Bulk Mode
        setSelectedProducts([]);
        setInputValue("");
        setFormData({
          batch_number: "",
          expiry_date: "",
          mfg_date: "",
          location: "",
          rate: 0,
          quantity: 1,
          unit: "",
          margin: 0,
          mrp: 0,
          mop: 0,
          mfw_price: "",
          barcode: "",
          gst_rate: 0,
          serial_numbers: "",
        });
        setMrpGap(0);
        setBarcodeStatus("idle");
      }
      setTimeout(() => {
        productInputRef.current?.focus();
      }, 100);
    }
  }, [open, editItem, products]);

  // --- BARCODE LOGIC ---
  const checkBarcode = async (code: string, isInitialLoad = false) => {
    if (!code) {
      setBarcodeStatus("idle");
      return;
    }
    if (editItem && code === editItem.barcode && isInitialLoad) {
      setBarcodeStatus("available");
      return;
    }
    // Assume valid if user typed same barcode as current item in edit mode
    if (editItem && code === editItem.barcode) {
      setBarcodeStatus("available");
      return;
    }

    setBarcodeStatus("checking");
    const exists = await checkBarcodeExists(code);
    setBarcodeStatus(exists ? "duplicate" : "available");
  };

  const handleManualBarcodeChange = (val: string) => {
    setFormData((prev) => ({ ...prev, barcode: val }));
    const timeoutId = setTimeout(() => checkBarcode(val), 500);
    return () => clearTimeout(timeoutId);
  };

  const handleGenerateSingleBarcode = async () => {
    const prod = selectedProducts[0];
    if (prod && prod.tracking_type === "none") {
      toast.error("Cannot generate batch barcode for non-tracked product");
      return;
    }
    setBarcodeStatus("checking");
    const code = await generateBarcode();
    setFormData((prev) => ({ ...prev, barcode: code }));
    setBarcodeStatus("available");
  };

  // --- CALCULATION LOGIC ---
  const handleRateChange = (val: number) => {
    const rate = val;
    const margin = formData.margin;
    const mrp = rate + (rate * margin) / 100;
    setFormData((prev) => ({ ...prev, rate, mrp: parseFloat(mrp.toFixed(2)) }));
  };

  const handleMarginChange = (val: number) => {
    const margin = val;
    const rate = formData.rate;
    const mrp = rate + (rate * margin) / 100;
    setFormData((prev) => ({
      ...prev,
      margin,
      mrp: parseFloat(mrp.toFixed(2)),
    }));
  };

  const handleMrpChange = (val: number) => {
    const mrp = val;
    const rate = formData.rate;
    let margin = 0;
    if (rate > 0) {
      margin = ((mrp - rate) / rate) * 100;
    }
    setFormData((prev) => ({
      ...prev,
      mrp,
      margin: parseFloat(margin.toFixed(2)),
    }));
  };

  // --- SUBMIT ---
  const handleSubmit = async () => {
    if (selectedProducts.length === 0) return;

    if (editItem && barcodeStatus === "duplicate") {
      toast.error("Barcode already exists! Please regenerate or change.");
      return;
    }

    setLoading(true);
    try {
      const itemPromises = selectedProducts.map(async (prod, index) => {
        const qty = formData.quantity;

        let itemBarcode = formData.barcode || "";
        if (!editItem) {
          if (prod.tracking_type === "none") {
            itemBarcode = prod.barcode || "";
          } else if (!itemBarcode) {
            itemBarcode = await generateBarcode();
          }
        }

        const generatedBatchNumber =
          formData.batch_number || generateBatchNumber(prod.id);
        const serialNumbers = formData.serial_numbers
          .split(/\r?\n|,/)
          .map((value) => value.trim())
          .filter(Boolean);

        // Apply MRP Increment Gap logic
        const currentMrp =
          (Number(formData.mrp) || 0) + index * (Number(mrpGap) || 0);
        const currentRate = Number(formData.rate) || 0;

        let currentMargin = formData.margin;
        if (!editItem && Number(mrpGap) > 0) {
          if (currentRate > 0 && currentMrp > 0) {
            currentMargin = ((currentMrp - currentRate) / currentRate) * 100;
          }
        }

        const basePrice = formData.rate * qty;
        const gstAmount =
          (basePrice * (formData.gst_rate || prod.gst_rate || 0)) / 100;
        const finalPrice = basePrice + gstAmount;

        return {
          sr_no: 0,
          product_id: prod.id!,
          quantity: qty,
          rate: formData.rate,
          gst_rate: formData.gst_rate || prod.gst_rate || 0,
          discount: 0,
          price: finalPrice,
          unit: formData.unit || prod.base_unit || "pcs",
          tracking_type: prod.tracking_type || "none",
          batch_number: generatedBatchNumber,
          expiry_date: formData.expiry_date,
          mfg_date: formData.mfg_date,
          location: formData.location,
          mrp: parseFloat(currentMrp.toFixed(2)),
          margin: parseFloat(currentMargin.toFixed(2)),
          mop: formData.mop,
          mfw_price: formData.mfw_price,
          barcode: itemBarcode,
          serial_numbers: serialNumbers,
        } as ExtendedPurchaseItem;
      });

      const newItems = await Promise.all(itemPromises);
      onAddItems(newItems);

      if (!editItem) {
        setSelectedProducts([]);
        setInputValue("");
        setFormData((prev) => ({
          ...prev,
          rate: 0,
          margin: 0,
          mrp: 0,
          mop: 0,
          quantity: 1,
          barcode: "",
          serial_numbers: "",
        }));
        setMrpGap(0);
        setBarcodeStatus("idle");
        setTimeout(() => {
          productInputRef.current?.focus();
        }, 50);

        const generatedCount = newItems.filter(
          (i) => i.tracking_type !== "none",
        ).length;
        if (generatedCount > 0) {
          toast.success(
            `Added items. Generated ${generatedCount} new batch barcodes.`,
          );
        } else {
          toast.success(
            `Added ${newItems.length} items using master barcodes.`,
          );
        }
      } else {
        onClose();
        toast.success("Item updated");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to process items. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- KEYBOARD HANDLING ---
  // The handleAutocompleteKeyDown has been removed because it was unused

  const availableUnits =
    selectedProducts.length === 1
      ? getUnitsForProduct(selectedProducts[0])
      : selectedProducts.length > 1
        ? selectedProducts.reduce((acc, p, idx) => {
            const u = getUnitsForProduct(p);
            if (idx === 0) return u;
            return acc.filter((x) => u.includes(x));
          }, [] as string[])
        : ["pcs"];

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason !== "backdropClick" || !loading) {
          onClose();
        }
      }}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle
        sx={{
          fontWeight: "bold",
          display: "flex",
          gap: 2,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          {editItem ? "Edit Batch Details" : "Add Product Entry"}
          {!editItem && (
            <Chip
              label="Single product"
              size="small"
              color="success"
              variant="outlined"
            />
          )}
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <Chip
            icon={<ScanBarcode size={14} />}
            label="Editable barcode"
            size="small"
            variant="outlined"
            sx={{ opacity: 0.7 }}
          />
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* Product Selection */}
          <Grid item xs={12}>
            <Autocomplete
              options={products}
              autoHighlight
              getOptionLabel={(option) =>
                `${option.name} (${option.product_code})`
              }
              value={selectedProducts[0] || null}
              inputValue={inputValue}
              onInputChange={(_, newInputValue) => {
                setInputValue(newInputValue);
              }}
              onChange={(_, newValue) => {
                setSelectedProducts(newValue ? [newValue as Product] : []);
              }}
              disabled={loading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Product"
                  autoFocus
                  inputRef={productInputRef}
                />
              )}
            />
          </Grid>

          {/* Core Pricing & Margin */}
          <Grid item xs={12} sm={4}>
            <TextField
              inputRef={rateInputRef}
              label="Purchase Rate (Cost)"
              type="number"
              fullWidth
              value={formData.rate}
              onChange={(e) => handleRateChange(Number(e.target.value))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">₹</InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Margin (%)"
              type="number"
              fullWidth
              value={formData.margin}
              onChange={(e) => handleMarginChange(Number(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label={!editItem ? "Base MRP (Item 1)" : "MRP (Calculated)"}
              type="number"
              fullWidth
              value={formData.mrp}
              onChange={(e) => handleMrpChange(Number(e.target.value))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">₹</InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Secondary Prices */}
          <Grid item xs={6} sm={3}>
            <TextField
              label="MOP"
              type="number"
              fullWidth
              size="small"
              value={formData.mop}
              onChange={(e) =>
                setFormData({ ...formData, mop: Number(e.target.value) })
              }
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              label="MFW Price"
              fullWidth
              size="small"
              value={formData.mfw_price}
              onChange={(e) =>
                setFormData({ ...formData, mfw_price: e.target.value })
              }
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              label="GST Rate %"
              type="number"
              fullWidth
              size="small"
              value={formData.gst_rate}
              onChange={(e) =>
                setFormData({ ...formData, gst_rate: Number(e.target.value) })
              }
            />
          </Grid>

          {/* Batch Info */}
          <Grid item xs={6} sm={3}>
            <TextField
              label="Batch Number"
              fullWidth
              size="small"
              value={formData.batch_number}
              onChange={(e) =>
                setFormData({ ...formData, batch_number: e.target.value })
              }
            />
          </Grid>

          {/* Dates */}
          <Grid item xs={6}>
            <TextField
              label="Expiry Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={formData.expiry_date}
              onChange={(e) =>
                setFormData({ ...formData, expiry_date: e.target.value })
              }
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Mfg Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={formData.mfg_date}
              onChange={(e) =>
                setFormData({ ...formData, mfg_date: e.target.value })
              }
            />
          </Grid>

          {/* Quantity, Unit & Barcode */}
          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center" gap={1}>
              <TextField
                label="Quantity"
                type="number"
                fullWidth
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: Number(e.target.value) })
                }
              />
              <TextField
                select
                label="Unit"
                fullWidth
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                SelectProps={{ native: true }}
                disabled={availableUnits.length === 0}
                InputLabelProps={{ shrink: true }}
              >
                <option value="" disabled>
                  Base
                </option>
                {availableUnits.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </TextField>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Barcode"
              fullWidth
              value={formData.barcode}
              onChange={(e) => handleManualBarcodeChange(e.target.value)}
              error={barcodeStatus === "duplicate"}
              helperText={
                barcodeStatus === "duplicate"
                  ? "Barcode already exists"
                  : barcodeStatus === "available"
                    ? "Available"
                    : ""
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ScanBarcode size={18} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    {barcodeStatus === "checking" && (
                      <CircularProgress size={16} />
                    )}
                    {barcodeStatus === "available" && (
                      <CheckCircle size={16} color="green" />
                    )}
                    {barcodeStatus === "duplicate" && (
                      <AlertCircle size={16} color="red" />
                    )}
                    <Tooltip title="Generate New Barcode">
                      <span>
                        <IconButton
                          onClick={handleGenerateSingleBarcode}
                          size="small"
                          sx={{ ml: 1 }}
                          disabled={
                            selectedProducts[0]?.tracking_type === "none"
                          }
                        >
                          <RefreshCw size={16} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {selectedProducts[0]?.tracking_type === "serial" && (
            <Grid item xs={12}>
              <TextField
                label="Serial Numbers"
                fullWidth
                multiline
                minRows={3}
                value={formData.serial_numbers}
                onChange={(e) =>
                  setFormData({ ...formData, serial_numbers: e.target.value })
                }
                placeholder="Enter one serial number per line or comma-separated"
                helperText="These will be attached to the batch when saved."
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          {editItem ? "Cancel" : "Exit"}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            (selectedProducts.length === 0 ||
              loading ||
              (editItem && barcodeStatus === "duplicate")) ??
            false
          }
          startIcon={
            loading ? (
              <CircularProgress size={18} color="inherit" />
            ) : editItem ? null : (
              <Calculator size={18} />
            )
          }
        >
          {loading ? "Processing..." : editItem ? "Update Item" : "Add Item"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
