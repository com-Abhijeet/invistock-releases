"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
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
import { getAllProducts } from "../../lib/api/productService";
import { getUnitsForProduct } from "../../lib/services/unitService";
import KeyboardNavForm from "../common/KeyboardNavForm";
import AutoSuggestInput, { AutoSuggestOption } from "../common/AutoSuggestInput";
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

interface FormDataState {
  batch_number: string;
  expiry_date: string;
  mfg_date: string;
  location: string;
  rate: number | "";
  quantity: number | "";
  unit: string;
  margin: number | "";
  mrp: number | "";
  mop: number | "";
  mfw_price: string;
  barcode: string;
  gst_rate: number | "";
  serial_numbers: string;
}

const initialFormData: FormDataState = {
  batch_number: "",
  expiry_date: "",
  mfg_date: "",
  location: "",
  rate: "",
  quantity: 1,
  unit: "",
  margin: "",
  mrp: "",
  mop: "",
  mfw_price: "",
  barcode: "",
  gst_rate: "",
  serial_numbers: "",
};

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
  const [formData, setFormData] = useState<FormDataState>(initialFormData);
  const [productsList, setProductsList] = useState<Product[]>(products);

  useEffect(() => {
    setProductsList(products);
  }, [products]);

  const productOptions: AutoSuggestOption[] = useMemo(() => {
    return productsList.map((p) => ({
      ...p,
      id: p.id,
      name: p.name,
      code: p.product_code || p.barcode || "",
      group: (p as any).category_name || "",
    }));
  }, [productsList]);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  const handleProductSearch = (query: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!query || query.trim().length === 0) {
      setProductsList(products);
      return;
    }
    searchTimerRef.current = setTimeout(() => {
      getAllProducts({
        page: 1,
        limit: 100,
        query: query.trim(),
        all: false,
      }).then((data) => {
        const records = data?.records || [];
        if (records.length > 0) {
          setProductsList((prev) => {
            const map = new Map<number, Product>();
            prev.forEach((p) => {
              if (p.id) map.set(p.id, p);
            });
            records.forEach((p: Product) => {
              if (p.id) map.set(p.id, p);
            });
            return Array.from(map.values());
          });
        }
      });
    }, 150);
  };

  const [mrpGap, setMrpGap] = useState<number | "">(0);
  const [loading, setLoading] = useState(false);
  const [barcodeStatus, setBarcodeStatus] = useState<
    "idle" | "checking" | "available" | "duplicate"
  >("idle");

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
          rate: editItem.rate !== undefined && editItem.rate !== null ? editItem.rate : "",
          quantity: editItem.quantity ?? 1,
          unit: editItem.unit || "",
          margin: editItem.margin !== undefined && editItem.margin !== null ? editItem.margin : "",
          mrp: editItem.mrp !== undefined && editItem.mrp !== null ? editItem.mrp : "",
          mop: editItem.mop !== undefined && editItem.mop !== null ? editItem.mop : "",
          mfw_price: editItem.mfw_price || "",
          barcode: editItem.barcode || "",
          gst_rate: editItem.gst_rate !== undefined && editItem.gst_rate !== null ? editItem.gst_rate : "",
          serial_numbers: editItem.serial_numbers?.join("\n") || "",
        });
        setMrpGap(0);
        if (editItem.barcode) checkBarcode(editItem.barcode, true);
      } else {
        // Add Mode
        setSelectedProducts([]);
        setFormData(initialFormData);
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
  const handleRateChange = (valStr: string) => {
    if (valStr === "") {
      setFormData((prev) => ({
        ...prev,
        rate: "",
        margin: prev.mrp !== "" && Number(prev.mrp) > 0 ? "" : prev.margin,
      }));
      return;
    }
    const rate = Number(valStr);
    if (isNaN(rate)) {
      setFormData((prev) => ({ ...prev, rate: "" }));
      return;
    }
    setFormData((prev) => {
      const mrpNum = prev.mrp !== "" ? Number(prev.mrp) : null;
      const marginNum = prev.margin !== "" ? Number(prev.margin) : null;

      // 1. Anchor to MRP if MRP is already present (defaulted from product or entered by user)
      if (mrpNum !== null && mrpNum > 0) {
        if (rate > 0) {
          const margin = ((mrpNum - rate) / rate) * 100;
          return { ...prev, rate, margin: parseFloat(margin.toFixed(2)) };
        } else {
          return { ...prev, rate, margin: "" };
        }
      }

      // 2. If MRP is not present but Margin is, calculate MRP from rate & margin
      if (marginNum !== null && marginNum !== 0) {
        if (rate > 0) {
          const mrp = rate + (rate * marginNum) / 100;
          return { ...prev, rate, mrp: parseFloat(mrp.toFixed(2)) };
        }
      }

      return { ...prev, rate };
    });
  };

  const handleMarginChange = (valStr: string) => {
    if (valStr === "") {
      setFormData((prev) => ({ ...prev, margin: "" }));
      return;
    }
    const margin = Number(valStr);
    if (isNaN(margin)) {
      setFormData((prev) => ({ ...prev, margin: "" }));
      return;
    }
    setFormData((prev) => {
      const rate = prev.rate !== "" ? Number(prev.rate) : 0;
      if (rate > 0) {
        const mrp = rate + (rate * margin) / 100;
        return { ...prev, margin, mrp: parseFloat(mrp.toFixed(2)) };
      }
      return { ...prev, margin };
    });
  };

  const handleMrpChange = (valStr: string) => {
    if (valStr === "") {
      setFormData((prev) => ({ ...prev, mrp: "" }));
      return;
    }
    const mrp = Number(valStr);
    if (isNaN(mrp)) {
      setFormData((prev) => ({ ...prev, mrp: "" }));
      return;
    }
    setFormData((prev) => {
      const rate = prev.rate !== "" ? Number(prev.rate) : 0;
      let margin: number | "" = prev.margin;
      if (rate > 0) {
        margin = parseFloat((((mrp - rate) / rate) * 100).toFixed(2));
      }
      return { ...prev, mrp, margin };
    });
  };

  // --- SUBMIT ---
  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Please select a product first");
      return;
    }

    if (editItem && barcodeStatus === "duplicate") {
      toast.error("Barcode already exists! Please regenerate or change.");
      return;
    }

    setLoading(true);
    try {
      const itemPromises = selectedProducts.map(async (prod, index) => {
        const qty = formData.quantity !== "" ? Number(formData.quantity) : 1;

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
          (formData.mrp !== "" ? Number(formData.mrp) : 0) +
          index * (Number(mrpGap) || 0);
        const currentRate = formData.rate !== "" ? Number(formData.rate) : 0;

        let currentMargin = formData.margin !== "" ? Number(formData.margin) : 0;
        if (!editItem && Number(mrpGap) > 0) {
          if (currentRate > 0 && currentMrp > 0) {
            currentMargin = ((currentMrp - currentRate) / currentRate) * 100;
          }
        }

        const gstRate =
          formData.gst_rate !== ""
            ? Number(formData.gst_rate)
            : prod.gst_rate || 0;
        const basePrice = currentRate * qty;
        const gstAmount = (basePrice * gstRate) / 100;
        const finalPrice = basePrice + gstAmount;

        return {
          sr_no: 0,
          product_id: prod.id!,
          quantity: qty,
          rate: currentRate,
          gst_rate: gstRate,
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
          mop: formData.mop !== "" ? Number(formData.mop) : 0,
          mfw_price: formData.mfw_price,
          barcode: itemBarcode,
          serial_numbers: serialNumbers,
        } as ExtendedPurchaseItem;
      });

      const newItems = await Promise.all(itemPromises);
      onAddItems(newItems);

      if (!editItem) {
        setSelectedProducts([]);
        setFormData(initialFormData);
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
      <KeyboardNavForm
        onSave={handleSubmit}
        component="div"
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
        }}
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
              <AutoSuggestInput
                id="purchase-batch-product-input"
                label="Select Product *"
                value={selectedProducts[0]?.id || null}
                options={productOptions}
                placeholder="Type name, barcode, or product code..."
                disabled={loading}
                allowCreate={false}
                variant="outlined"
                inputRef={(el) => {
                  (productInputRef as any).current = el;
                }}
                onSearch={handleProductSearch}
                onChange={(val) => {
                  const prod =
                    productsList.find((p) => p.id === val) ||
                    products.find((p) => p.id === val) ||
                    null;
                  setSelectedProducts(prod ? [prod] : []);
                  if (prod) {
                    setFormData((prev) => ({
                      ...prev,
                      gst_rate:
                        prod.gst_rate !== undefined && prod.gst_rate !== null
                          ? prod.gst_rate
                          : "",
                      mrp: prod.mrp ? Number(prod.mrp) : "",
                      unit: prod.base_unit || prev.unit || "pcs",
                      rate: "",
                      margin: "",
                      mop: "",
                      mfw_price: "",
                    }));
                  } else {
                    setFormData((prev) => ({
                      ...prev,
                      gst_rate: "",
                      mrp: "",
                      rate: "",
                      margin: "",
                      mop: "",
                      mfw_price: "",
                    }));
                  }
                }}
                onNext={() => {
                  setTimeout(() => {
                    rateInputRef.current?.focus();
                    rateInputRef.current?.select();
                  }, 50);
                }}
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
                onChange={(e) => handleRateChange(e.target.value)}
                onFocus={(e) => e.target.select()}
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
                onChange={(e) => handleMarginChange(e.target.value)}
                onFocus={(e) => e.target.select()}
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
                onChange={(e) => handleMrpChange(e.target.value)}
                onFocus={(e) => e.target.select()}
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
                  setFormData({
                    ...formData,
                    mop: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                onFocus={(e) => e.target.select()}
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
                onFocus={(e) => e.target.select()}
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
                  setFormData({
                    ...formData,
                    gst_rate:
                      e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                onFocus={(e) => e.target.select()}
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
                onFocus={(e) => e.target.select()}
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
                    setFormData({
                      ...formData,
                      quantity:
                        e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                  onFocus={(e) => e.target.select()}
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
                onFocus={(e) => e.target.select()}
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
                            tabIndex={-1}
                            data-nav-skip="true"
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
          <Button
            onClick={onClose}
            color="inherit"
            disabled={loading}
            tabIndex={-1}
            data-nav-skip="true"
          >
            {editItem ? "Cancel" : "Exit"}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            data-save="true"
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
      </KeyboardNavForm>
    </Dialog>
  );
}
