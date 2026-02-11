"use client";

import { useEffect, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
  Chip,
  Stack,
  Tooltip,
  MenuItem,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { Trash2, Plus, ScanBarcode, Settings } from "lucide-react";
import { getAllProducts } from "../../lib/api/productService";
import { getShopData } from "../../lib/api/shopService";
import type { Product } from "../../lib/types/product";
import type { PurchaseItem } from "../../lib/types/purchaseTypes";
import type { ShopSetupForm } from "../../lib/types/shopTypes";
import toast from "react-hot-toast";
import { UNIT_FAMILIES } from "../../lib/services/unitService";

// Extended interface for local state to include batch details
interface ExtendedPurchaseItem extends PurchaseItem {
  tracking_type?: "none" | "batch" | "serial";
  batch_number?: string;
  expiry_date?: string;
  mfg_date?: string;
  mrp?: number;
  mop?: number;
  mfw_price?: string;
  location?: string;
  serial_numbers?: string[];
  unit?: string; // Ensure unit is here
}

interface Props {
  items: ExtendedPurchaseItem[];
  onItemsChange: (items: ExtendedPurchaseItem[]) => void;
  readOnly?: boolean;
}

const defaultItem = (): ExtendedPurchaseItem => ({
  sr_no: 0,
  product_id: 0,
  quantity: 1,
  rate: 0,
  gst_rate: 0,
  discount: 0,
  price: 0,
  tracking_type: "none",
  batch_number: "",
  expiry_date: "",
  location: "",
  serial_numbers: [],
  unit: "pcs",
});

const PurchaseItemSection = ({
  items,
  onItemsChange,
  readOnly = false,
}: Props) => {
  const theme = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [shop, setShop] = useState<ShopSetupForm | null>(null);
  const gridRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [_hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(0);

  // Batch Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [currentModalItemIndex, setCurrentModalItemIndex] = useState<
    number | null
  >(null);
  const [tempBatchData, setTempBatchData] = useState<
    Partial<ExtendedPurchaseItem>
  >({});
  const [serialInput, setSerialInput] = useState("");

  const focusInput = (rowIdx: number, field: string) => {
    const key = `${rowIdx}-${field}`;
    const el = gridRefs.current[key];
    if (el) {
      el.focus();
      if (el.tagName === "INPUT") (el as HTMLInputElement).select();
    }
  };

  useEffect(() => {
    getAllProducts({
      page: 1,
      limit: 100,
      query: "",
      isActive: 0,
      all: true,
    }).then((data) => setProducts(data.records || []));

    getShopData().then((res) => setShop(res));
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return;

      if (
        (e.ctrlKey || e.metaKey) &&
        (e.code === "KeyA" || e.key.toLowerCase() === "a")
      ) {
        e.preventDefault();
        handleAddItem();
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        (e.code === "Delete" || e.code === "Backspace")
      ) {
        if (activeRowIndex !== null && items[activeRowIndex]) {
          e.preventDefault();
          handleRemoveItem(activeRowIndex);
          toast.success("Row removed");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, activeRowIndex, readOnly]);

  const calculatePrice = (item: ExtendedPurchaseItem) => {
    if (!shop) return 0;
    const rate = Number(item.rate) || 0;
    const qty = Number(item.quantity) || 0;
    const gstRate = Number(item.gst_rate) || 0;
    const discountPct = Number(item.discount) || 0;

    const baseAmount = rate * qty;
    const discountAmount = (baseAmount * discountPct) / 100;
    const amountAfterDiscount = baseAmount - discountAmount;

    let finalPrice = amountAfterDiscount;
    if (shop.gst_enabled) {
      if (shop.inclusive_tax_pricing) {
        finalPrice = amountAfterDiscount;
      } else {
        const gstAmount = (amountAfterDiscount * gstRate) / 100;
        finalPrice = amountAfterDiscount + gstAmount;
      }
    }
    return parseFloat(finalPrice.toFixed(2));
  };

  const handleAddItem = () => {
    if (readOnly) return;
    const newItem = defaultItem();
    newItem.sr_no = items.length + 1;
    const newItems = [...items, newItem];
    onItemsChange(newItems);
    setActiveRowIndex(newItems.length - 1);
    setTimeout(() => focusInput(newItems.length - 1, "product"), 50);
  };

  const handleProductSelect = (index: number, product: Product | null) => {
    if (readOnly) return;
    const updated = [...items];
    if (product) {
      updated[index] = {
        ...updated[index],
        product_id: product.id!,
        rate: product.mop,
        gst_rate: product.gst_rate || 0,
        tracking_type: (product as any).tracking_type || "none",
        unit: product.base_unit || "pcs", // Default to base unit
      };
      updated[index].price = calculatePrice(updated[index]);
      onItemsChange(updated);
      // Auto-move to QTY
      setTimeout(() => focusInput(index, "quantity"), 50);
    } else {
      updated[index] = defaultItem();
      onItemsChange(updated);
    }
  };

  const handleFieldChange = (
    index: number,
    field: keyof ExtendedPurchaseItem,
    value: any,
  ) => {
    if (readOnly) return;
    const updated = [...items];
    (updated[index] as any)[field] = value;
    updated[index].price = calculatePrice(updated[index]);
    onItemsChange(updated);
  };

  const handleRemoveItem = (idx: number) => {
    if (readOnly) return;
    const updated = items.filter((_, i) => i !== idx);
    updated.forEach((item, index) => {
      item.sr_no = index + 1;
    });
    onItemsChange(updated);
    if (updated.length > 0) {
      setActiveRowIndex(Math.min(idx, updated.length - 1));
    } else {
      setActiveRowIndex(null);
    }
  };

  const handleGridKeyDown = (
    e: React.KeyboardEvent,
    idx: number,
    field: string,
  ) => {
    if (readOnly) return;
    // Updated navigation order to include 'unit'
    const fields = ["product", "quantity", "unit", "rate", "gst_rate"];
    const activeFields = shop?.gst_enabled
      ? fields
      : fields.filter((f) => f !== "gst_rate");
    const currentIdx = activeFields.indexOf(field);
    const isLastField = currentIdx === activeFields.length - 1;

    if (e.key === "Enter") {
      if (isLastField) {
        e.preventDefault();
        if (idx === items.length - 1) {
          if (items[idx].product_id !== 0) handleAddItem();
        } else {
          focusInput(idx + 1, "product");
        }
      } else {
        if (field !== "product") {
          e.preventDefault();
          focusInput(idx, activeFields[currentIdx + 1]);
        }
      }
    } else if (e.key === "ArrowRight") {
      if (!isLastField) {
        e.preventDefault();
        focusInput(idx, activeFields[currentIdx + 1]);
      }
    } else if (e.key === "ArrowLeft") {
      if (currentIdx > 0) {
        e.preventDefault();
        focusInput(idx, activeFields[currentIdx - 1]);
      }
    } else if (e.key === "ArrowDown") {
      if (idx < items.length - 1) {
        e.preventDefault();
        focusInput(idx + 1, field);
      }
    } else if (e.key === "ArrowUp") {
      if (idx > 0) {
        e.preventDefault();
        focusInput(idx - 1, field);
      }
    }
  };

  // Helper to get allowed units for a product
  const getUnitsForProduct = (product: Product | undefined) => {
    if (!product) return [];

    const units = new Set<string>();

    // Add product specific units
    if (product.base_unit) units.add(product.base_unit);
    if (product.secondary_unit) units.add(product.secondary_unit);

    // Add family units
    const baseFamily = Object.values(UNIT_FAMILIES).find((family) =>
      family.units.some((u) => u.value === product.base_unit),
    );

    if (baseFamily) {
      baseFamily.units.forEach((u) => units.add(u.value));
    }

    // Fallback if no units found
    if (units.size === 0) units.add("pcs");

    return Array.from(units);
  };

  const openBatchModal = (index: number) => {
    if (readOnly) return;
    setCurrentModalItemIndex(index);
    setTempBatchData({ ...items[index] });
    setModalOpen(true);
  };

  const handleSaveBatchData = () => {
    if (currentModalItemIndex !== null) {
      const updated = [...items];
      let finalQty = tempBatchData.quantity || 0;
      if (
        tempBatchData.tracking_type === "serial" &&
        tempBatchData.serial_numbers
      ) {
        finalQty = tempBatchData.serial_numbers.length;
      }
      updated[currentModalItemIndex] = {
        ...updated[currentModalItemIndex],
        ...tempBatchData,
        quantity: finalQty,
      };
      updated[currentModalItemIndex].price = calculatePrice(
        updated[currentModalItemIndex],
      );
      onItemsChange(updated);
    }
    setModalOpen(false);
  };

  const handleAddSerial = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && serialInput.trim()) {
      e.preventDefault();
      const currentSerials = tempBatchData.serial_numbers || [];
      if (!currentSerials.includes(serialInput.trim())) {
        setTempBatchData({
          ...tempBatchData,
          serial_numbers: [...currentSerials, serialInput.trim()],
        });
      }
      setSerialInput("");
    }
  };

  const removeSerial = (serialToRemove: string) => {
    const currentSerials = tempBatchData.serial_numbers || [];
    setTempBatchData({
      ...tempBatchData,
      serial_numbers: currentSerials.filter((s) => s !== serialToRemove),
    });
  };

  const headerSx = {
    fontWeight: 700,
    color: "text.secondary",
    fontSize: "0.75rem",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    borderBottom: `2px solid ${theme.palette.divider}`,
    py: 1.5,
  };

  return (
    <Box overflow="hidden">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerSx, width: "5%" }} align="center">
                #
              </TableCell>
              <TableCell sx={{ ...headerSx, width: "20%" }}>PRODUCT</TableCell>
              <TableCell sx={{ ...headerSx, width: "8%" }} align="center">
                DETAILS
              </TableCell>
              <TableCell sx={{ ...headerSx, width: "8%" }}>QTY</TableCell>
              {/* ✅ NEW UNIT COLUMN */}
              <TableCell sx={{ ...headerSx, width: "10%" }}>UNIT</TableCell>
              <TableCell sx={{ ...headerSx, width: "12%" }}>RATE</TableCell>
              {shop?.gst_enabled && (
                <TableCell sx={{ ...headerSx, width: "8%" }} align="center">
                  GST%
                </TableCell>
              )}
              <TableCell sx={{ ...headerSx, width: "15%" }} align="right">
                AMOUNT
              </TableCell>
              <TableCell sx={{ ...headerSx, width: "5%" }}></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {items?.map((item, idx) => {
              const product = products.find((p) => p.id === item.product_id);
              const hasTracking =
                item.tracking_type && item.tracking_type !== "none";
              const allowedUnits = getUnitsForProduct(product);

              return (
                <TableRow
                  key={idx}
                  hover
                  selected={activeRowIndex === idx}
                  onClick={() => setActiveRowIndex(idx)}
                  onMouseEnter={() => setHoveredRowIndex(idx)}
                  onMouseLeave={() => setHoveredRowIndex(null)}
                  sx={{
                    "&.Mui-selected": {
                      backgroundColor: "rgba(25, 118, 210, 0.04)",
                    },
                  }}
                >
                  <TableCell
                    align="center"
                    sx={{
                      borderBottom: "1px dashed #eee",
                      color: "text.secondary",
                    }}
                  >
                    {item.sr_no}
                  </TableCell>

                  <TableCell sx={{ p: 1, borderBottom: "1px dashed #eee" }}>
                    <Autocomplete
                      disabled={readOnly}
                      options={products}
                      getOptionLabel={(opt) => opt.name}
                      value={product || null}
                      onChange={(_, v) => handleProductSelect(idx, v)}
                      onKeyDown={(e) => handleGridKeyDown(e, idx, "product")}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          inputRef={(el) =>
                            (gridRefs.current[`${idx}-product`] = el)
                          }
                          onFocus={() => setActiveRowIndex(idx)}
                          placeholder="Select Product"
                          variant="standard"
                          InputProps={{
                            ...params.InputProps,
                            disableUnderline: true,
                          }}
                        />
                      )}
                    />
                    {hasTracking && (
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          mt: 0.5,
                        }}
                      >
                        <ScanBarcode size={12} />{" "}
                        {item.tracking_type?.toUpperCase()} TRACKED
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell
                    align="center"
                    sx={{ p: 1, borderBottom: "1px dashed #eee" }}
                  >
                    <Button
                      size="small"
                      variant={hasTracking ? "outlined" : "text"}
                      color={hasTracking ? "primary" : "inherit"}
                      onClick={() => openBatchModal(idx)}
                      onFocus={() => setActiveRowIndex(idx)}
                      startIcon={<Settings size={14} />}
                      disabled={!item.product_id}
                      sx={{ fontSize: "0.7rem", py: 0.5 }}
                    >
                      {hasTracking ? "Batch Info" : "Details"}
                    </Button>
                  </TableCell>

                  <TableCell sx={{ p: 1, borderBottom: "1px dashed #eee" }}>
                    <TextField
                      type="number"
                      variant="standard"
                      fullWidth
                      value={item.quantity}
                      inputRef={(el) =>
                        (gridRefs.current[`${idx}-quantity`] = el)
                      }
                      onFocus={() => {
                        setActiveRowIndex(idx);
                        focusInput(idx, "quantity");
                      }}
                      onKeyDown={(e) => handleGridKeyDown(e, idx, "quantity")}
                      disabled={item.tracking_type === "serial"}
                      onChange={(e) =>
                        handleFieldChange(
                          idx,
                          "quantity",
                          Number(e.target.value),
                        )
                      }
                      InputProps={{
                        disableUnderline: true,
                        readOnly,
                        sx: { fontWeight: "bold" },
                      }}
                      inputProps={{ min: 1 }}
                    />
                  </TableCell>

                  {/* ✅ UNIT DROPDOWN */}
                  <TableCell sx={{ p: 1, borderBottom: "1px dashed #eee" }}>
                    <TextField
                      select
                      variant="standard"
                      fullWidth
                      value={item.unit || ""}
                      inputRef={(el) => (gridRefs.current[`${idx}-unit`] = el)}
                      onChange={(e) =>
                        handleFieldChange(idx, "unit", e.target.value)
                      }
                      onFocus={() => setActiveRowIndex(idx)}
                      onKeyDown={(e) => handleGridKeyDown(e, idx, "unit")}
                      disabled={!product || readOnly}
                      InputProps={{ disableUnderline: true }}
                      SelectProps={{ displayEmpty: true }}
                    >
                      {allowedUnits.map((u) => (
                        <MenuItem key={u} value={u}>
                          {u}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>

                  <TableCell sx={{ p: 1, borderBottom: "1px dashed #eee" }}>
                    <TextField
                      type="number"
                      variant="standard"
                      fullWidth
                      value={item.rate}
                      inputRef={(el) => (gridRefs.current[`${idx}-rate`] = el)}
                      onFocus={() => {
                        setActiveRowIndex(idx);
                        focusInput(idx, "rate");
                      }}
                      onKeyDown={(e) => handleGridKeyDown(e, idx, "rate")}
                      onChange={(e) =>
                        handleFieldChange(idx, "rate", Number(e.target.value))
                      }
                      InputProps={{ disableUnderline: true, readOnly }}
                      inputProps={{ min: 0 }}
                    />
                  </TableCell>

                  {shop?.gst_enabled && (
                    <TableCell
                      sx={{ p: 1, borderBottom: "1px dashed #eee" }}
                      align="center"
                    >
                      <TextField
                        type="number"
                        variant="standard"
                        fullWidth
                        value={item.gst_rate}
                        inputRef={(el) =>
                          (gridRefs.current[`${idx}-gst_rate`] = el)
                        }
                        onFocus={() => {
                          setActiveRowIndex(idx);
                          focusInput(idx, "gst_rate");
                        }}
                        onKeyDown={(e) => handleGridKeyDown(e, idx, "gst_rate")}
                        onChange={(e) =>
                          handleFieldChange(
                            idx,
                            "gst_rate",
                            Number(e.target.value),
                          )
                        }
                        inputProps={{
                          style: { textAlign: "center" },
                          min: 0,
                          max: 100,
                        }}
                        InputProps={{ disableUnderline: true, readOnly }}
                      />
                    </TableCell>
                  )}

                  <TableCell
                    align="right"
                    sx={{ borderBottom: "1px dashed #eee" }}
                  >
                    <Typography
                      fontWeight={700}
                      color="text.primary"
                      fontSize="0.95rem"
                    >
                      {item.price.toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                      })}
                    </Typography>
                  </TableCell>

                  <TableCell
                    align="center"
                    sx={{ borderBottom: "1px dashed #eee" }}
                  >
                    {!readOnly && (
                      <Tooltip title="Remove Row (Ctrl + Del)">
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveItem(idx)}
                          sx={{ color: theme.palette.error.main }}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {!readOnly && (
        <Box sx={{ p: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button
            onClick={handleAddItem}
            size="small"
            variant="text"
            startIcon={<Plus size={16} />}
          >
            <span style={{ textDecoration: "underline" }}>A</span>dd Another
            Line
          </Button>
        </Box>
      )}

      {/* --- BATCH / SERIAL ENTRY MODAL (Unchanged) --- */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Product Details
          {tempBatchData.tracking_type !== "none" && (
            <Typography
              variant="caption"
              sx={{
                ml: 1,
                color: "text.secondary",
                border: "1px solid #ccc",
                px: 1,
                borderRadius: 1,
              }}
            >
              {tempBatchData.tracking_type?.toUpperCase()} MODE
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Batch Number / Lot No"
                  fullWidth
                  size="small"
                  value={tempBatchData.batch_number || ""}
                  onChange={(e) =>
                    setTempBatchData({
                      ...tempBatchData,
                      batch_number: e.target.value,
                    })
                  }
                  placeholder="e.g. B-2025-001"
                  inputProps={{ maxLength: 50 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Storage Location"
                  fullWidth
                  size="small"
                  value={tempBatchData.location || ""}
                  onChange={(e) =>
                    setTempBatchData({
                      ...tempBatchData,
                      location: e.target.value,
                    })
                  }
                  placeholder="e.g. Shelf A, Rack 2"
                  inputProps={{ maxLength: 50 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Expiry Date"
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={tempBatchData.expiry_date || ""}
                  onChange={(e) =>
                    setTempBatchData({
                      ...tempBatchData,
                      expiry_date: e.target.value,
                    })
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
                  value={tempBatchData.mfg_date || ""}
                  onChange={(e) =>
                    setTempBatchData({
                      ...tempBatchData,
                      mfg_date: e.target.value,
                    })
                  }
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="MRP (Per Unit)"
                  type="number"
                  fullWidth
                  size="small"
                  value={tempBatchData.mrp || ""}
                  onChange={(e) =>
                    setTempBatchData({
                      ...tempBatchData,
                      mrp: Number(e.target.value),
                    })
                  }
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="MOP"
                  type="number"
                  fullWidth
                  size="small"
                  value={tempBatchData.mop || ""}
                  onChange={(e) =>
                    setTempBatchData({
                      ...tempBatchData,
                      mop: Number(e.target.value),
                    })
                  }
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="MFW Price"
                  type="number"
                  fullWidth
                  size="small"
                  value={tempBatchData.mfw_price || ""}
                  onChange={(e) =>
                    setTempBatchData({
                      ...tempBatchData,
                      mfw_price: String(e.target.value),
                    })
                  }
                  inputProps={{ min: 0 }}
                />
              </Grid>
            </Grid>
            {tempBatchData.tracking_type === "serial" && (
              <Box
                sx={{
                  border: "1px solid #eee",
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "#fafafa",
                }}
              >
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Serial Numbers ({tempBatchData.serial_numbers?.length || 0})
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Scan or type serial & press Enter"
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                  onKeyDown={handleAddSerial}
                  size="small"
                  sx={{ mb: 2, bgcolor: "white" }}
                  inputProps={{ maxLength: 50 }}
                />
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    maxHeight: 150,
                    overflowY: "auto",
                  }}
                >
                  {tempBatchData.serial_numbers?.map((sn, i) => (
                    <Chip
                      key={i}
                      label={sn}
                      onDelete={() => removeSerial(sn)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                  {(!tempBatchData.serial_numbers ||
                    tempBatchData.serial_numbers.length === 0) && (
                    <Typography variant="caption" color="text.disabled">
                      No serials added yet.
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveBatchData} variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseItemSection;
