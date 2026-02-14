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
  Typography,
  Chip,
  Switch,
  FormControlLabel,
  InputAdornment,
  CircularProgress,
  IconButton,
  Tooltip,
  createFilterOptions,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  ScanBarcode,
  Calculator,
  Keyboard,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ArrowDown,
} from "lucide-react";
import type { Product } from "../../lib/types/product";
import type { PurchaseItem } from "../../lib/types/purchaseTypes";
import {
  generateBarcode,
  checkBarcodeExists,
} from "../../lib/api/batchService";
import toast from "react-hot-toast";

// Extended Item Type used locally
export interface ExtendedPurchaseItem extends PurchaseItem {
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
}

interface Props {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onAddItems: (items: ExtendedPurchaseItem[]) => void;
  editItem?: ExtendedPurchaseItem | null;
}

const filter = createFilterOptions<Product>();

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
    margin: 0,
    mrp: 0,
    mop: 0,
    mfw_price: "",
    barcode: "",
    gst_rate: 0,
  });

  const [distributeQty, setDistributeQty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [barcodeStatus, setBarcodeStatus] = useState<
    "idle" | "checking" | "available" | "duplicate"
  >("idle");

  // Selection & Navigation State
  const [inputValue, setInputValue] = useState("");
  const [highlightedOption, setHighlightedOption] = useState<Product | null>(
    null,
  );

  // Refs
  const productInputRef = useRef<HTMLInputElement>(null);
  const rateInputRef = useRef<HTMLInputElement>(null);
  const visibleOptionsRef = useRef<Product[]>([]);

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
          margin: editItem.margin || 0,
          mrp: editItem.mrp || 0,
          mop: editItem.mop || 0,
          mfw_price: editItem.mfw_price || "",
          barcode: editItem.barcode || "",
          gst_rate: editItem.gst_rate || 0,
        });
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
          margin: 0,
          mrp: 0,
          mop: 0,
          mfw_price: "",
          barcode: "",
          gst_rate: 0,
        });
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
      const itemPromises = selectedProducts.map(async (prod) => {
        let qty = formData.quantity;
        if (distributeQty && selectedProducts.length > 0) {
          qty = parseFloat(
            (formData.quantity / selectedProducts.length).toFixed(2),
          );
        }

        let itemBarcode = formData.barcode;
        if (!editItem) {
          if (prod.tracking_type === "none") {
            itemBarcode = prod.barcode || "";
          } else {
            itemBarcode = await generateBarcode();
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
          unit: prod.base_unit || "pcs",
          tracking_type: prod.tracking_type || "none",
          batch_number: formData.batch_number,
          expiry_date: formData.expiry_date,
          mfg_date: formData.mfg_date,
          location: formData.location,
          mrp: formData.mrp,
          margin: formData.margin,
          mop: formData.mop,
          mfw_price: formData.mfw_price,
          barcode: itemBarcode,
          serial_numbers: [],
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
        }));
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
  const handleAutocompleteKeyDown = (e: React.KeyboardEvent) => {
    if (!highlightedOption && e.shiftKey) return;

    // 1. Shift + ArrowDown: Select the *Next* item (Expand Selection Downwards)
    if (e.shiftKey && e.key === "ArrowDown") {
      // Don't prevent default, let MUI highlight move visually
      // Logic: If highlighted item is index N, add item at index N+1 to selection
      const currentIndex = visibleOptionsRef.current.findIndex(
        (p) => p.id === highlightedOption?.id,
      );

      if (
        currentIndex !== -1 &&
        currentIndex < visibleOptionsRef.current.length - 1
      ) {
        const nextItem = visibleOptionsRef.current[currentIndex + 1];

        // Add to selection if not present
        if (nextItem && !selectedProducts.some((p) => p.id === nextItem.id)) {
          setSelectedProducts((prev) => [...prev, nextItem]);
        }
      }
      return;
    }

    // 2. Shift + ArrowUp: Deselect the *Current* highlighted item (Contract Selection)
    if (e.shiftKey && e.key === "ArrowUp") {
      // Logic: Deselect the currently highlighted item before moving up
      if (highlightedOption) {
        setSelectedProducts((prev) =>
          prev.filter((p) => p.id !== highlightedOption.id),
        );
      }
      return;
    }

    // 3. Enter Key: Confirm selection and move focus if input is cleared/ready
    if (e.key === "Enter") {
      const val = (e.target as HTMLInputElement).value;

      // If selection exists and input is empty, Enter confirms and moves focus
      if (selectedProducts.length > 0 && val === "") {
        e.preventDefault();
        e.stopPropagation();
        rateInputRef.current?.focus();
      }
      // If input has text, default MUI behavior applies (selects highlighted item and clears input)
    }
  };

  const hasTrackedItems = selectedProducts.some(
    (p) => p.tracking_type !== "none",
  );

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
          {editItem ? "Edit Batch Details" : "Bulk Add Products"}
          {!editItem && (
            <Chip
              label="Persistent Mode"
              size="small"
              color="success"
              variant="outlined"
            />
          )}
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <Chip
            icon={<ArrowDown size={14} />}
            label="Shift+↓: Bulk Select"
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
              multiple={!editItem}
              options={products}
              autoHighlight
              disableCloseOnSelect={!editItem}
              getOptionLabel={(option) => `${option.name}`}
              value={editItem ? selectedProducts[0] || null : selectedProducts}
              inputValue={inputValue}
              onInputChange={(_, newInputValue) => {
                // Prevent clearing text when selecting via mouse/keyboard if unwanted
                // Standard behavior is OK, but for Shift+Down we keep text via logic below
                setInputValue(newInputValue);
              }}
              onChange={(_, newValue) => {
                if (editItem) {
                  setSelectedProducts(newValue ? [newValue as Product] : []);
                } else {
                  setSelectedProducts((newValue as Product[]) || []);
                }
              }}
              // Track Highlighted Option for Explorer-style Logic
              onHighlightChange={(e, option) => {
                setHighlightedOption(option);
              }}
              // Capture visible options for keyboard navigation context
              filterOptions={(options, params) => {
                const filtered = filter(options, params);
                visibleOptionsRef.current = filtered;
                return filtered;
              }}
              disabled={!!editItem || loading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={productInputRef}
                  label={editItem ? "Product" : "Select Products"}
                  placeholder="Search products..."
                  onKeyDown={handleAutocompleteKeyDown}
                  helperText={
                    !editItem &&
                    "Shift+↓ selects next. Shift+↑ deselects current. Enter confirms."
                  }
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
              label="MRP (Calculated)"
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

          {/* Quantity & Barcode */}
          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center" gap={1}>
              <TextField
                label={
                  distributeQty ? "Total Quantity" : "Quantity Per Product"
                }
                type="number"
                fullWidth
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: Number(e.target.value) })
                }
              />
              {!editItem && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={distributeQty}
                      onChange={(e) => setDistributeQty(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="caption">
                      Distribute <br /> Total
                    </Typography>
                  }
                />
              )}
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            {editItem ? (
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
            ) : (
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  border: "1px dashed #ccc",
                  borderRadius: 1,
                  px: 2,
                  bgcolor: "action.hover",
                }}
              >
                <Box display="flex" alignItems="center" mb={0.5}>
                  <ScanBarcode
                    size={20}
                    style={{ opacity: 0.5, marginRight: 8 }}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight="bold"
                  >
                    Barcode Handling:
                  </Typography>
                </Box>
                {selectedProducts.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    Select products to see status.
                  </Typography>
                ) : hasTrackedItems ? (
                  <Typography variant="caption" color="primary">
                    Unique batch barcodes will be auto-generated for tracked
                    items.
                  </Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Using existing master barcodes (Non-tracked items).
                  </Typography>
                )}
              </Box>
            )}
          </Grid>
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
          {loading
            ? "Processing..."
            : editItem
              ? "Update Item"
              : `Add ${selectedProducts.length} Item(s)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
