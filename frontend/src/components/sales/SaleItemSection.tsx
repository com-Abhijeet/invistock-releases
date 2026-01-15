/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import {
  Autocomplete,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  IconButton,
  TableContainer,
  Tooltip,
  Stack,
  CircularProgress,
  useTheme,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  Menu,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { getAllProducts } from "../../lib/api/productService";
import { getProductBatches } from "../../lib/api/batchService";
import type { Product } from "../../lib/types/product";
import type { SaleItemPayload } from "../../lib/types/salesTypes";
import { getShopData } from "../../lib/api/shopService";
import type { ShopSetupForm } from "../../lib/types/shopTypes";
import {
  Eye,
  Plus,
  Trash2,
  Package,
  ScanBarcode,
  Settings2,
  Check,
  ListFilter,
} from "lucide-react";
import toast from "react-hot-toast";

// --- Types ---
type PriceType = "mrp" | "mop" | "mfw";
// type BatchPricingStrategy = "product_default" | "batch_pricing";

// Using a local type alias based on SaleItemPayload (Default Sale Item)
// We add UI-specific fields loosely to prevent type conflicts with the base Payload
type SaleItemRow = SaleItemPayload & {
  tracking_type?: string;
  batch_id?: number;
  serial_id?: number;
  batch_number?: string;
  serial_number?: string;

  // Pricing snapshots
  batch_mrp?: number;
  batch_mop?: number;
  batch_mfw?: number;

  // Configuration (typed loosely as string in definition to avoid overlap errors, but casted in logic)
  price_type?: string;
  pricing_strategy?: string;
};

const defaultItem = (): SaleItemRow => ({
  sr_no: "",
  product_id: 0,
  rate: 0,
  quantity: 1,
  gst_rate: 0,
  discount: 0,
  price: 0,
  hsn: "",
  tracking_type: "none",
  price_type: "mrp",
  pricing_strategy: "batch_pricing",
});

interface SaleItemSectionProps {
  items: SaleItemRow[];
  onItemsChange: (items: SaleItemRow[]) => void;
  mode: "new" | "view";
  onOpenOverview: (productId: string) => void;
  isOverviewOpen?: boolean;
  onCloseOverview?: () => void;
}

export default function SaleItemSection({
  items,
  onItemsChange,
  mode,
  onOpenOverview,
  isOverviewOpen,
  onCloseOverview,
}: SaleItemSectionProps) {
  const theme = useTheme();
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const autocompleteRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [error, setError] = useState<string | null>(null);
  const [shop, setShop] = useState<ShopSetupForm>();
  const [_hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(0);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(0); // New: Track active row for shortcuts
  const [productCache, setProductCache] = useState<{ [id: number]: Product }>(
    {}
  );

  // --- Global Rate Settings State ---
  const [globalPriceType, setGlobalPriceType] = useState<PriceType>("mrp");
  const [headerMenuAnchor, setHeaderMenuAnchor] = useState<null | HTMLElement>(
    null
  );

  // --- Row Settings Menu State ---
  const [rowMenuAnchor, setRowMenuAnchor] = useState<{
    idx: number;
    el: HTMLElement;
  } | null>(null);

  // --- Batch Modal State ---
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [pendingItemIndex, setPendingItemIndex] = useState<number | null>(null);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (inputValue.trim() === "") {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      getAllProducts({
        query: inputValue,
        isActive: 1,
        limit: 20,
        page: 1,
        all: false,
      }).then((data) => {
        setSearchResults(data.records || []);
        setLoading(false);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [inputValue]);

  useEffect(() => {
    if (items.length > 0 && mode !== "view") {
      const lastIndex = items.length - 1;
      setEditingRowIndex(lastIndex);
      setActiveRowIndex(lastIndex); // Auto-activate new row
      setTimeout(() => autocompleteRefs.current[lastIndex]?.focus(), 100);
    }
  }, [items.length, mode]);

  // --- FIX: Hydrate Cache from Items (for Draft Restoration) ---
  useEffect(() => {
    setProductCache((prev) => {
      const next = { ...prev };
      let modified = false;
      items.forEach((item) => {
        // If we have a product_id and name, but it's not in cache
        if (item.product_id && !next[item.product_id] && item.product_name) {
          next[item.product_id] = {
            id: item.product_id,
            name: item.product_name,
            hsn: item.hsn,
          } as Product;
          modified = true;
        }
      });
      return modified ? next : prev;
    });
  }, [items]);

  useEffect(() => {
    getShopData().then((res) => setShop(res!));
  }, []);

  // Global Shortcuts Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Alt + P: Open Product Overview
      if (e.altKey && (e.code === "KeyP" || e.key.toLowerCase() === "p")) {
        e.preventDefault();
        e.stopPropagation();
        if (isOverviewOpen && onCloseOverview) {
          onCloseOverview();
          return;
        }
        if (!isOverviewOpen) {
          const targetIndex =
            editingRowIndex !== null ? editingRowIndex : items.length - 1;
          if (targetIndex >= 0 && items[targetIndex]) {
            const currentItem = items[targetIndex];
            if (currentItem.product_id) {
              onOpenOverview(currentItem.product_id.toString());
            } else {
              toast.error("Please select a product first");
            }
          }
        }
      }

      // 2. Ctrl + A: Add New Item
      if ((e.ctrlKey || e.metaKey) && (e.code === "KeyA" || e.key.toLowerCase() === "a")) {
        e.preventDefault();
        e.stopPropagation();
        
        // Inline Add Logic to access latest state
        if (
          items.length === 0 ||
          items[items.length - 1].product_id !== 0
        ) {
          const newItem = { ...defaultItem(), price_type: globalPriceType };
          onItemsChange([...items, newItem]);
          // Focus is handled by the items.length useEffect
        } else {
          toast.error("Complete the empty row first");
        }
      }

      // 3. Ctrl + Delete: Remove Active Row
      if ((e.ctrlKey || e.metaKey) && (e.code === "Delete" || e.code === "Backspace")) {
        if (activeRowIndex !== null && items[activeRowIndex] && mode !== 'view') {
          e.preventDefault();
          e.stopPropagation();
          
          const newItems = [...items];
          newItems.splice(activeRowIndex, 1);
          newItems.forEach((item, index) => {
            item.sr_no = (index + 1).toString();
          });
          onItemsChange(newItems);
          
          // Adjust active index
          if (newItems.length > 0) {
            setActiveRowIndex(Math.min(activeRowIndex, newItems.length - 1));
          } else {
            setActiveRowIndex(null);
          }
          toast.success("Row removed");
        }
      }
    };
    
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [items, editingRowIndex, activeRowIndex, isOverviewOpen, onCloseOverview, onOpenOverview, globalPriceType, onItemsChange, mode]);

  const calculateItemPrice = (item: SaleItemRow) => {
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

  const getProductPrice = (product: Product, type: PriceType) => {
    const p = product as any;
    let val = Number(p[type]);
    if ((!val || val === 0) && type === "mfw") {
      val = Number(p.mfw_price);
    }
    if ((!val || val === 0) && type === "mop") {
      val = Number(p.mop_price);
    }
    if (val && val > 0) return val;
    return Number(p.mrp) || 0;
  };

  const handleGlobalTypeSelect = (type: PriceType) => {
    setGlobalPriceType(type);
    setHeaderMenuAnchor(null);

    // Update all EMPTY rows to reflect this new default preference.
    const updatedItems = items.map((item) => {
      if (!item.product_id || item.product_id === 0) {
        return { ...item, price_type: type };
      }
      return item;
    });
    onItemsChange(updatedItems);
    toast.success(`Default Rate set to: ${type.toUpperCase()}`);
  };

  const handleRowSettingChange = (
    index: number,
    setting: "type" | "strategy",
    value: string
  ) => {
    const updatedItems = [...items];
    const item = updatedItems[index];
    const product = productCache[item.product_id];

    if (setting === "type") item.price_type = value;
    if (setting === "strategy") item.pricing_strategy = value;

    // Recalculate Rate
    if (product) {
      let newRate = 0;
      const strategy = item.pricing_strategy || "batch_pricing";
      const pType = (item.price_type as PriceType) || "mrp";

      // 1. Try Batch Price
      if (
        strategy === "batch_pricing" &&
        (item.tracking_type === "batch" || item.tracking_type === "serial")
      ) {
        if (pType === "mrp" && item.batch_mrp) newRate = item.batch_mrp;
        else if (pType === "mop" && item.batch_mop) newRate = item.batch_mop;
        else if (pType === "mfw" && item.batch_mfw) newRate = item.batch_mfw;
      }

      // 2. Fallback to Product Default
      if (!newRate) {
        newRate = getProductPrice(product, pType);
      }
      item.rate = newRate;
      item.price = calculateItemPrice(item);
    }

    onItemsChange(updatedItems);
    setRowMenuAnchor(null);
    toast.success("Updated item pricing");
  };

  const handleAddRow = (currentItems: SaleItemRow[]) => {
    if (
      currentItems.length === 0 ||
      currentItems[currentItems.length - 1].product_id !== 0
    ) {
      return [
        ...currentItems,
        { ...defaultItem(), price_type: globalPriceType },
      ];
    }
    return currentItems;
  };

  const handleProductSelect = async (
    index: number,
    product: Product | null
  ) => {
    if (!product) return;
    setProductCache((prev) => ({ ...prev, [product.id!]: product }));

    // Check if product is tracked
    if (
      product.tracking_type === "batch" ||
      product.tracking_type === "serial"
    ) {
      setPendingItemIndex(index);
      setPendingProduct(product);
      setLoadingBatches(true);
      setBatchModalOpen(true);
      try {
        const batchData = await getProductBatches(
          product.id!,
          product.tracking_type
        );
        setAvailableBatches(batchData);
      } catch (err) {
        toast.error("Failed to load batches");
      } finally {
        setLoadingBatches(false);
      }
      return; 
    }

    // Standard Non-Tracked Product Logic
    addItemToTable(index, product);
  };

  const addItemToTable = (
    index: number,
    product: Product,
    batchInfo: any = null
  ) => {
    const currentItem = items[index];
    const pType: PriceType =
      (currentItem.price_type as PriceType) || globalPriceType;

    const strategy = currentItem.pricing_strategy || "batch_pricing";

    const bMrp = batchInfo?.mrp ? Number(batchInfo.mrp) : undefined;
    const bMop = batchInfo?.mop ? Number(batchInfo.mop) : undefined;
    const bMfw = batchInfo?.mfw_price ? Number(batchInfo.mfw_price) : undefined;

    let finalRate = 0;

    if (strategy === "batch_pricing") {
      if (pType === "mrp" && bMrp) finalRate = bMrp;
      else if (pType === "mop" && bMop) finalRate = bMop;
      else if (pType === "mfw" && bMfw) finalRate = bMfw;
    }

    if (!finalRate) {
      finalRate = getProductPrice(product, pType);
    }

    const newItem: SaleItemRow = {
      ...currentItem,
      product_id: product.id!,
      product_name: product.name,
      rate: finalRate,
      gst_rate: product.gst_rate ?? 0,
      quantity: 1, 

      tracking_type: product.tracking_type,
      batch_id: batchInfo?.id, 
      serial_id: undefined,
      batch_number: batchInfo?.batch_number,
      serial_number: batchInfo?.serial_number,

      batch_mrp: bMrp,
      batch_mop: bMop,
      batch_mfw: bMfw,

      price_type: pType,
      pricing_strategy: strategy,
    };

    if (product.tracking_type === "serial" && batchInfo) {
      newItem.serial_id = batchInfo.id;
      newItem.batch_id = batchInfo.batch_id; 
    }

    const price = calculateItemPrice(newItem);
    const finalItem = { ...newItem, price };

    const updatedItems = [...items];
    updatedItems[index] = finalItem;

    onItemsChange(updatedItems);
    setInputValue("");
    setBatchModalOpen(false);
  };

  const handleBatchSelect = (batch: any) => {
    if (pendingItemIndex !== null && pendingProduct) {
      addItemToTable(pendingItemIndex, pendingProduct, batch);
    }
  };

  const handleFieldChange = (
    index: number,
    field: keyof SaleItemRow,
    value: any
  ) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    updated[index].price = calculateItemPrice(updated[index]);
    onItemsChange(updated);
  };

  const handleRemoveRow = (idx: number) => {
    const newItems = [...items];
    newItems.splice(idx, 1);
    newItems.forEach((item, index) => {
      item.sr_no = (index + 1).toString();
    });
    onItemsChange(newItems);
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
              {shop?.hsn_required && (
                <TableCell sx={{ ...headerSx, width: "8%" }}>HSN</TableCell>
              )}
              <TableCell sx={{ ...headerSx, width: "30%" }}>PRODUCT</TableCell>
              <TableCell sx={{ ...headerSx, width: "15%", p: 0.5 }}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography
                    variant="inherit"
                    sx={{ fontSize: "inherit", fontWeight: "inherit" }}
                  >
                    {shop?.inclusive_tax_pricing ? "RATE (Inc.)" : "RATE"}
                  </Typography>
                  {mode !== "view" && (
                    <Tooltip title={`Default: ${globalPriceType.toUpperCase()}`}>
                      <IconButton
                        size="small"
                        onClick={(e) => setHeaderMenuAnchor(e.currentTarget)}
                        sx={{
                          p: 0.5,
                          color:
                            globalPriceType === "mrp"
                              ? "text.disabled"
                              : "primary.main",
                        }}
                      >
                        <ListFilter size={14} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </TableCell>
              <TableCell sx={{ ...headerSx, width: "8%" }}>QTY</TableCell>
              {shop?.gst_enabled && (
                <TableCell sx={headerSx} align="center">
                  GST
                </TableCell>
              )}
              {shop?.show_discount_column && (
                <TableCell sx={headerSx} align="center">
                  DISC%
                </TableCell>
              )}
              <TableCell sx={{ ...headerSx, width: "12%" }} align="right">
                AMOUNT
              </TableCell>
              <TableCell sx={{ ...headerSx, width: "5%" }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, idx) => {
              const product = productCache[item.product_id];
              const isSerial = item.tracking_type === "serial";

              return (
                <TableRow
                  key={idx}
                  hover
                  selected={activeRowIndex === idx}
                  onMouseEnter={() => setHoveredRowIndex(idx)}
                  onMouseLeave={() => setHoveredRowIndex(null)}
                  onClick={() => setActiveRowIndex(idx)}
                  sx={{
                    '&.Mui-selected': { backgroundColor: 'rgba(25, 118, 210, 0.04)' },
                    '&.Mui-selected:hover': { backgroundColor: 'rgba(25, 118, 210, 0.08)' },
                  }}
                >
                  <TableCell
                    align="center"
                    sx={{
                      borderBottom: "1px dashed #eee",
                      color: "text.secondary",
                    }}
                  >
                    {idx + 1}
                  </TableCell>
                  {shop?.hsn_required && (
                    <TableCell
                      sx={{
                        borderBottom: "1px dashed #eee",
                        fontSize: "0.85rem",
                        color: "text.secondary",
                      }}
                    >
                      {product?.hsn || "—"}
                    </TableCell>
                  )}

                  <TableCell sx={{ p: 1, borderBottom: "1px dashed #eee" }}>
                    {editingRowIndex === idx && mode !== "view" ? (
                      <Autocomplete
                        options={searchResults}
                        getOptionLabel={(opt) =>
                          typeof opt === "string"
                            ? opt
                            : `${opt.name} (${opt.barcode || ""})`
                        }
                        value={product || null}
                        inputValue={editingRowIndex === idx ? inputValue : ""}
                        loading={loading}
                        filterOptions={(x) => x}
                        onChange={(_, v) =>
                          handleProductSelect(idx, v as Product)
                        }
                        onInputChange={(_, newValue) => setInputValue(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            inputRef={(el) =>
                              (autocompleteRefs.current[idx] = el)
                            }
                            placeholder="Scan or Search..."
                            variant="standard"
                            onFocus={() => setActiveRowIndex(idx)}
                            InputProps={{
                              ...params.InputProps,
                              disableUnderline: true,
                              sx: { fontSize: "0.95rem" },
                              endAdornment: (
                                <>
                                  {loading ? (
                                    <CircularProgress size={16} />
                                  ) : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                      />
                    ) : (
                      <Box
                        onClick={() => {
                          setEditingRowIndex(idx);
                          setActiveRowIndex(idx);
                        }}
                        sx={{ cursor: "pointer" }}
                      >
                        <Typography variant="body2" fontWeight={500}>
                          {item.product_name || "Select Product"}
                        </Typography>
                        {(item.batch_number || item.serial_number) && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            {isSerial ? (
                              <ScanBarcode size={12} />
                            ) : (
                              <Package size={12} />
                            )}
                            {isSerial
                              ? `SN: ${item.serial_number}`
                              : `Batch: ${item.batch_number}`}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </TableCell>

                  <TableCell sx={{ p: 1, borderBottom: "1px dashed #eee" }}>
                    <TextField
                      type="number"
                      variant="standard"
                      fullWidth
                      disabled={mode === "view"}
                      value={item.rate ?? ""}
                      onFocus={() => setActiveRowIndex(idx)}
                      onChange={(e) =>
                        handleFieldChange(idx, "rate", Number(e.target.value))
                      }
                      InputProps={{
                        disableUnderline: true,
                        sx: { fontSize: "0.95rem" },
                        // ROW LEVEL SETTINGS TRIGGER
                        startAdornment: mode !== "view" &&
                          item.product_id > 0 && (
                            <Tooltip
                              title={`${(
                                item.price_type || "MRP"
                              ).toUpperCase()} | ${
                                item.pricing_strategy === "batch_pricing"
                                  ? "Batch"
                                  : "Default"
                              }`}
                            >
                              <IconButton
                                size="small"
                                onClick={(e) =>
                                  setRowMenuAnchor({ idx, el: e.currentTarget })
                                }
                                sx={{
                                  mr: 0.5,
                                  p: 0.5,
                                  color:
                                    item.pricing_strategy === "batch_pricing"
                                      ? "primary.main"
                                      : "action.active",
                                }}
                              >
                                <Settings2 size={14} />
                              </IconButton>
                            </Tooltip>
                          ),
                      }}
                    />
                  </TableCell>

                  <TableCell sx={{ p: 1, borderBottom: "1px dashed #eee" }}>
                    <TextField
                      type="number"
                      variant="standard"
                      fullWidth
                      disabled={mode === "view" || isSerial}
                      value={item.quantity ?? ""}
                      onFocus={() => setActiveRowIndex(idx)}
                      onChange={(e) =>
                        handleFieldChange(
                          idx,
                          "quantity",
                          Number(e.target.value)
                        )
                      }
                      InputProps={{
                        disableUnderline: true,
                        style: { fontWeight: "bold", fontSize: "0.95rem" },
                      }}
                    />
                  </TableCell>

                  {shop?.gst_enabled && (
                    <TableCell
                      align="center"
                      sx={{ borderBottom: "1px dashed #eee" }}
                    >
                      <Typography variant="caption" fontWeight={600}>
                        {item.gst_rate || 0} %
                      </Typography>
                    </TableCell>
                  )}

                  {shop?.show_discount_column && (
                    <TableCell
                      sx={{ p: 1, borderBottom: "1px dashed #eee" }}
                      align="center"
                    >
                      <TextField
                        type="number"
                        variant="standard"
                        fullWidth
                        disabled={mode === "view"}
                        value={item.discount ?? ""}
                        onFocus={() => setActiveRowIndex(idx)}
                        onChange={(e) =>
                          handleFieldChange(
                            idx,
                            "discount",
                            Number(e.target.value)
                          )
                        }
                        inputProps={{ style: { textAlign: "center" } }}
                        InputProps={{
                          disableUnderline: true,
                          sx: { fontSize: "0.95rem" },
                        }}
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
                    <Stack direction="row" spacing={0} justifyContent="center">
                      {product && (
                        <Tooltip title="Details (Alt + P)">
                          <IconButton
                            size="small"
                            onClick={() =>
                              onOpenOverview(product.id?.toString() ?? "0")
                            }
                            sx={{ color: theme.palette.action.active }}
                          >
                            <Eye size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {mode !== "view" && (
                        <Tooltip title="Remove Row (Ctrl + Del)">
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveRow(idx)}
                            sx={{ color: theme.palette.error.main }}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {mode !== "view" && (
        <Box sx={{ p: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button
            onClick={() => onItemsChange(handleAddRow(items))}
            size="small"
            variant="text"
            startIcon={<Plus size={16} />}
            sx={{ color: "text.secondary", fontWeight: 600 }}
          >
            <span style={{ textDecoration: 'underline' }}>A</span>dd Another Item
          </Button>
        </Box>
      )}

      {/* --- BATCH SELECTION MODAL --- */}
      <Dialog
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Select{" "}
          {pendingProduct?.tracking_type === "serial"
            ? "Serial Number"
            : "Batch"}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {loadingBatches ? (
            <Box p={3} textAlign="center">
              <CircularProgress />
            </Box>
          ) : availableBatches.length === 0 ? (
            <Box p={3} textAlign="center">
              <Typography color="error">No stock available.</Typography>
            </Box>
          ) : (
            <List>
              {availableBatches.map((b: any) => (
                <ListItem key={b.id} disablePadding divider>
                  <ListItemButton onClick={() => handleBatchSelect(b)}>
                    <ListItemText
                      primary={
                        <Stack direction="row" justifyContent="space-between">
                          <Typography fontWeight={600}>
                            {pendingProduct?.tracking_type === "serial"
                              ? b.serial_number
                              : b.batch_number}
                          </Typography>
                          <Chip
                            label={
                              pendingProduct?.tracking_type === "serial"
                                ? "1 Qty"
                                : `${b.quantity} Qty`
                            }
                            size="small"
                            color={b.quantity < 5 ? "warning" : "success"}
                            variant="outlined"
                          />
                        </Stack>
                      }
                      secondary={
                        pendingProduct?.tracking_type === "batch"
                          ? `Exp: ${b.expiry_date || "N/A"} | MRP: ₹${b.mrp}`
                          : `Batch: ${b.batch_number} | Status: Available`
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchModalOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!error} onClose={() => setError(null)}>
        <DialogTitle>Error</DialogTitle>
        <DialogContent>{error}</DialogContent>
        <DialogActions>
          <Button onClick={() => setError(null)}>OK</Button>
        </DialogActions>
      </Dialog>

      {/* --- GLOBAL HEADER MENU --- */}
      <Menu
        anchorEl={headerMenuAnchor}
        open={Boolean(headerMenuAnchor)}
        onClose={() => setHeaderMenuAnchor(null)}
        PaperProps={{ sx: { minWidth: 200 } }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: "1px solid #eee" }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            SET DEFAULT RATE
          </Typography>
        </Box>
        <MenuItem
          dense
          selected={globalPriceType === "mrp"}
          onClick={() => handleGlobalTypeSelect("mrp")}
        >
          <Stack direction="row" width="100%" justifyContent="space-between">
            <Typography variant="body2">Retail (MRP)</Typography>
            {globalPriceType === "mrp" && (
              <Check size={14} color={theme.palette.primary.main} />
            )}
          </Stack>
        </MenuItem>
        <MenuItem
          dense
          selected={globalPriceType === "mop"}
          onClick={() => handleGlobalTypeSelect("mop")}
        >
          <Stack direction="row" width="100%" justifyContent="space-between">
            <Typography variant="body2">Offer (MOP)</Typography>
            {globalPriceType === "mop" && (
              <Check size={14} color={theme.palette.primary.main} />
            )}
          </Stack>
        </MenuItem>
        <MenuItem
          dense
          selected={globalPriceType === "mfw"}
          onClick={() => handleGlobalTypeSelect("mfw")}
        >
          <Stack direction="row" width="100%" justifyContent="space-between">
            <Typography variant="body2">Wholesale</Typography>
            {globalPriceType === "mfw" && (
              <Check size={14} color={theme.palette.primary.main} />
            )}
          </Stack>
        </MenuItem>
      </Menu>

      {/* --- Row Settings Menu --- */}
      <Menu
        anchorEl={rowMenuAnchor?.el}
        open={Boolean(rowMenuAnchor)}
        onClose={() => setRowMenuAnchor(null)}
        PaperProps={{ sx: { minWidth: 200 } }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: "1px solid #eee" }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            PRICE TYPE
          </Typography>
        </Box>
        <MenuItem
          dense
          selected={items[rowMenuAnchor?.idx || 0]?.price_type === "mrp"}
          onClick={() =>
            handleRowSettingChange(rowMenuAnchor!.idx, "type", "mrp")
          }
        >
          <Stack direction="row" width="100%" justifyContent="space-between">
            <Typography variant="body2">Retail (MRP)</Typography>
            {items[rowMenuAnchor?.idx || 0]?.price_type === "mrp" && (
              <Check size={14} color={theme.palette.primary.main} />
            )}
          </Stack>
        </MenuItem>
        <MenuItem
          dense
          selected={items[rowMenuAnchor?.idx || 0]?.price_type === "mop"}
          onClick={() =>
            handleRowSettingChange(rowMenuAnchor!.idx, "type", "mop")
          }
        >
          <Stack direction="row" width="100%" justifyContent="space-between">
            <Typography variant="body2">Offer (MOP)</Typography>
            {items[rowMenuAnchor?.idx || 0]?.price_type === "mop" && (
              <Check size={14} color={theme.palette.primary.main} />
            )}
          </Stack>
        </MenuItem>
        <MenuItem
          dense
          selected={items[rowMenuAnchor?.idx || 0]?.price_type === "mfw"}
          onClick={() =>
            handleRowSettingChange(rowMenuAnchor!.idx, "type", "mfw")
          }
        >
          <Stack direction="row" width="100%" justifyContent="space-between">
            <Typography variant="body2">Wholesale</Typography>
            {items[rowMenuAnchor?.idx || 0]?.price_type === "mfw" && (
              <Check size={14} color={theme.palette.primary.main} />
            )}
          </Stack>
        </MenuItem>

        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: "1px solid #eee",
            mt: 1,
            borderTop: "1px solid #eee",
          }}
        >
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            PRICING STRATEGY
          </Typography>
        </Box>
        <MenuItem
          dense
          selected={
            items[rowMenuAnchor?.idx || 0]?.pricing_strategy === "batch_pricing"
          }
          onClick={() =>
            handleRowSettingChange(
              rowMenuAnchor!.idx,
              "strategy",
              "batch_pricing"
            )
          }
        >
          <Stack direction="row" width="100%" justifyContent="space-between">
            <Typography variant="body2">Batch Priority</Typography>
            {items[rowMenuAnchor?.idx || 0]?.pricing_strategy ===
              "batch_pricing" && (
              <Check size={14} color={theme.palette.primary.main} />
            )}
          </Stack>
        </MenuItem>
        <MenuItem
          dense
          selected={
            items[rowMenuAnchor?.idx || 0]?.pricing_strategy ===
            "product_default"
          }
          onClick={() =>
            handleRowSettingChange(
              rowMenuAnchor!.idx,
              "strategy",
              "product_default"
            )
          }
        >
          <Stack direction="row" width="100%" justifyContent="space-between">
            <Typography variant="body2">Product Default</Typography>
            {items[rowMenuAnchor?.idx || 0]?.pricing_strategy ===
              "product_default" && (
              <Check size={14} color={theme.palette.primary.main} />
            )}
          </Stack>
        </MenuItem>
      </Menu>
    </Box>
  );
}