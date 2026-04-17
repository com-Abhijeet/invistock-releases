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
  DialogTitle,
  IconButton,
  TableContainer,
  Stack,
  CircularProgress,
  useTheme,
  MenuItem,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Menu,
  alpha,
  Switch,
  FormControlLabel,
  Divider,
  Tooltip,
} from "@mui/material";
import { useEffect, useRef, useState, Fragment } from "react";
import { getAllProducts } from "../../lib/api/productService";
import { getProductBatches, scanBarcodeItem } from "../../lib/api/batchService";
import type { Product } from "../../lib/types/product";
import type { SaleItemPayload } from "../../lib/types/salesTypes";
import { getShopData } from "../../lib/api/shopService";
import type { ShopSetupForm } from "../../lib/types/shopTypes";
import {
  Plus,
  Trash2,
  ScanBarcode,
  Check,
  MessageSquareText,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";

// --- Types ---
type PriceType = "mrp" | "mop" | "mfw";

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

  // Configuration
  price_type?: string;
  pricing_strategy?: string;

  // Joined fields from Product Master (fallback for UI display)
  base_unit?: string | null;
  return_quantity?: number | null;
};

// --- Conversion Factors & Families ---
const STANDARD_FACTORS: Record<string, number> = {
  kg: 1,
  g: 0.001,
  mg: 0.000001,
  quintal: 100,
  tonne: 1000,
  l: 1,
  ml: 0.001,
  m: 1,
  cm: 0.01,
  mm: 0.001,
  ft: 0.3048,
  in: 0.0254,
  pcs: 1,
  doz: 12,
  gross: 144,
};

const UNIT_GROUPS = [
  ["kg", "g", "mg", "quintal", "tonne"],
  ["l", "ml"],
  ["m", "cm", "mm", "ft", "in"],
  ["pcs", "doz", "gross"],
];

const defaultItem = (): SaleItemRow => ({
  sr_no: "",
  product_id: 0,
  product_name: "",
  rate: 0,
  quantity: 1,
  gst_rate: 0,
  discount: 0,
  price: 0,
  hsn: "",
  tracking_type: "none",
  price_type: "mrp",
  pricing_strategy: "batch_pricing",
  unit: "pcs",
  barcode: "",
  description: "",
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
}: SaleItemSectionProps) {
  const theme = useTheme();
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [barcodeSearchResults, setBarcodeSearchResults] = useState<Product[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [barcodeInputValue, setBarcodeInputValue] = useState("");
  const gridRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [shop, setShop] = useState<ShopSetupForm>();
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(0);
  const [productCache, setProductCache] = useState<{ [id: number]: Product }>(
    {},
  );
  const [globalPriceType, setGlobalPriceType] = useState<PriceType>("mrp");
  const [headerMenuAnchor, setHeaderMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [pendingItemIndex, setPendingItemIndex] = useState<number | null>(null);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [scanningRowIndex, setScanningRowIndex] = useState<number | null>(null);

  const prevItemsLength = useRef(items.length);

  // Caching for Description Visibility
  const [showDescriptionRow, setShowDescriptionRow] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kosh_pos_show_desc") === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("kosh_pos_show_desc", showDescriptionRow.toString());
  }, [showDescriptionRow]);

  const focusInput = (rowIdx: number, field: string) => {
    const key = `${rowIdx}-${field}`;
    const el = gridRefs.current[key];
    if (el) {
      el.focus();
      if (el.tagName === "INPUT") el.select();
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (mode === "view") return;

      // Ctrl + A: Add Row
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        const lastItem = items[items.length - 1];
        if (!lastItem || lastItem.product_id !== 0) {
          onItemsChange([
            ...items,
            { ...defaultItem(), price_type: globalPriceType },
          ]);
          toast.success("New line added");
        } else {
          toast.error("Complete the current row first");
          focusInput(items.length - 1, "product");
        }
      }

      // Ctrl + Backspace: Delete Active Row
      if ((e.ctrlKey || e.metaKey) && e.key === "Backspace") {
        if (activeRowIndex !== null && items[activeRowIndex]) {
          e.preventDefault();
          const newItems = [...items];
          newItems.splice(activeRowIndex, 1);
          onItemsChange(newItems);

          if (newItems.length > 0) {
            setActiveRowIndex(Math.max(0, activeRowIndex - 1));
          } else {
            setActiveRowIndex(null);
          }
          toast.success("Row removed");
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [items, activeRowIndex, mode, globalPriceType, onItemsChange]);

  // Effect for Product Name Search
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
        limit: 5,
        page: 1,
        all: false,
      }).then((data) => {
        setSearchResults(data.records || []);
        setLoading(false);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Effect for Barcode Search List
  useEffect(() => {
    if (barcodeInputValue.trim() === "") {
      setBarcodeSearchResults([]);
      return;
    }
    setBarcodeLoading(true);
    const timer = setTimeout(() => {
      getAllProducts({
        query: barcodeInputValue,
        isActive: 1,
        limit: 10,
        page: 1,
        all: false,
      }).then((data) => {
        setBarcodeSearchResults(data.records || []);
        setBarcodeLoading(false);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [barcodeInputValue]);

  // Auto-focus logic when a new row is added
  useEffect(() => {
    if (mode === "view") return;

    if (items.length > 0) {
      const lastIndex = items.length - 1;

      if (items.length > prevItemsLength.current) {
        setActiveRowIndex(lastIndex);

        // Only trigger auto-focus if it's a completely newly generated blank row
        if (items[lastIndex].product_id === 0) {
          setTimeout(() => {
            focusInput(lastIndex, "product");
          }, 100); // slight delay to allow the new row to render in DOM
        }
      }
    }
    prevItemsLength.current = items.length;
  }, [items.length, mode, items]);

  // Fallback cache logic
  useEffect(() => {
    setProductCache((prev) => {
      const next = { ...prev };
      let modified = false;
      items.forEach((item) => {
        const existing = next[item.product_id];
        if (item.product_id && !existing?.id) {
          next[item.product_id] = {
            ...existing,
            id: item.product_id,
            name:
              item.product_name ||
              existing?.name ||
              `Product #${item.product_id}`,
            hsn: item.hsn || existing?.hsn || "",
            barcode: item.barcode || existing?.barcode || "",
            base_unit:
              existing?.base_unit || item.unit || item.base_unit || "pcs",
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
      finalPrice = shop.inclusive_tax_pricing
        ? amountAfterDiscount
        : amountAfterDiscount + (amountAfterDiscount * gstRate) / 100;
    }
    return parseFloat(finalPrice.toFixed(2));
  };

  const handleProductSelect = async (
    index: number,
    product: Product | null,
  ) => {
    if (!product) return;
    setProductCache((prev) => ({ ...prev, [product.id!]: product }));
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
          product.tracking_type,
        );
        setAvailableBatches(batchData);
      } catch (err) {
        toast.error("Failed to load batches");
      } finally {
        setLoadingBatches(false);
      }
      return;
    }
    addItemToTable(index, product);
  };

  const handleBarcodeScan = async (index: number, code: string) => {
    if (!code) return;
    setScanningRowIndex(index);
    try {
      const result = await scanBarcodeItem(code);
      if (result.product) {
        setProductCache((prev) => ({
          ...prev,
          [result.product.id]: result.product,
        }));
        let batchInfo = null;
        if (result.type === "batch") batchInfo = result.batch;
        else if (result.type === "serial" && result.serial) {
          batchInfo = {
            ...result.batch,
            id: result.serial.id,
            batch_id: result.batch?.id,
            serial_number: result.serial.serial_number,
          };
        }
        addItemToTable(index, result.product, batchInfo, code);
        toast.success(`Found: ${result.product.name}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Item not found");
    } finally {
      setScanningRowIndex(null);
    }
  };

  const addItemToTable = (
    index: number,
    product: Product,
    batchInfo: any = null,
    scannedBarcode: string = "",
  ) => {
    const currentItem = items[index];
    const pType: PriceType =
      (currentItem.price_type as PriceType) || globalPriceType;
    const strategy = currentItem.pricing_strategy || "batch_pricing";
    const bMrp = batchInfo?.mrp ? Number(batchInfo.mrp) : undefined;
    const bMop = batchInfo?.mop ? Number(batchInfo.mop) : undefined;
    const bMfw = batchInfo?.mfw_price ? Number(batchInfo.mfw_price) : undefined;

    let baseRate = 0;
    if (strategy === "batch_pricing") {
      if (pType === "mrp" && bMrp) baseRate = bMrp;
      else if (pType === "mop" && bMop) baseRate = bMop;
      else if (pType === "mfw" && bMfw) baseRate = bMfw;
    }
    if (!baseRate)
      baseRate =
        Number((product as any)[pType]) || Number((product as any).mrp) || 0;

    const defaultUnit = (
      product.base_unit ||
      (product as any).unit ||
      "pcs"
    ).toLowerCase();

    const newItem: SaleItemRow = {
      ...currentItem,
      product_id: product.id!,
      product_name: product.name,
      hsn: product.hsn || currentItem.hsn || "",
      barcode: scannedBarcode || product.barcode || currentItem.barcode || "",
      description: currentItem.description || product.description || "",
      rate: baseRate,
      gst_rate: product.gst_rate ?? 0,
      quantity: 1,
      unit: defaultUnit,
      tracking_type: product.tracking_type,
      batch_id: batchInfo?.id,
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
      if (batchInfo.batch_id) newItem.batch_id = batchInfo.batch_id;
    } else if (product.tracking_type === "batch" && batchInfo) {
      newItem.batch_id = batchInfo.id;
    }

    newItem.price = calculateItemPrice(newItem);
    const updatedItems = [...items];
    updatedItems[index] = newItem;
    onItemsChange(updatedItems);
    setInputValue("");
    setBarcodeInputValue("");
    setBatchModalOpen(false);
    setTimeout(() => focusInput(index, "quantity"), 50);
  };

  const handleBatchSelect = (batch: any) => {
    if (pendingItemIndex !== null && pendingProduct)
      addItemToTable(pendingItemIndex, pendingProduct, batch);
  };

  const handleFieldChange = (
    index: number,
    field: keyof SaleItemRow,
    value: any,
  ) => {
    const updated = [...items];
    const currentItem = updated[index];

    // --- UNIT CONVERSION LOGIC ---
    if (field === "unit") {
      const product = productCache[currentItem.product_id];
      const oldUnit = (
        currentItem.unit ||
        product?.base_unit ||
        "pcs"
      ).toLowerCase();
      const newUnit = (value as string).toLowerCase();

      const oldFactor = STANDARD_FACTORS[oldUnit] || 1;
      const newFactor = STANDARD_FACTORS[newUnit] || 1;

      // Example: rate is ₹100/kg. factor kg=1, g=0.001.
      // user selects 'g', newRate = 100 * (0.001 / 1) = ₹0.1/g
      if (oldFactor !== newFactor) {
        const newRate = currentItem.rate * (newFactor / oldFactor);
        currentItem.rate = Number(newRate.toFixed(4)); // Preserve precision internally
      }
    }

    (currentItem as any)[field] = value;
    currentItem.price = calculateItemPrice(currentItem);
    onItemsChange(updated);
  };

  const handleRemoveRow = (idx: number) => {
    if (mode === "view") return;
    const newItems = [...items];
    newItems.splice(idx, 1);
    onItemsChange(newItems);
  };

  const handleGlobalTypeSelect = (type: PriceType) => {
    if (mode === "view") return;
    setGlobalPriceType(type);
    setHeaderMenuAnchor(null);
    const updatedItems = items.map((item) => {
      const updatedItem = { ...item, price_type: type };
      const product = productCache[item.product_id];
      if (product) {
        let baseRate = 0;
        if (type === "mrp")
          baseRate = item.batch_mrp || (product as any).mrp || 0;
        else if (type === "mop")
          baseRate =
            item.batch_mop || (product as any).mop || (product as any).mrp || 0;
        else if (type === "mfw")
          baseRate =
            item.batch_mfw ||
            (product as any).mfw_price ||
            (product as any).mrp ||
            0;

        // Adjust for current unit factor
        const currentUnit = (
          item.unit ||
          product.base_unit ||
          "pcs"
        ).toLowerCase();
        const baseUnit = (product.base_unit || "pcs").toLowerCase();

        const oldFactor = STANDARD_FACTORS[baseUnit] || 1;
        const newFactor = STANDARD_FACTORS[currentUnit] || 1;

        if (oldFactor !== newFactor) {
          baseRate = baseRate * (newFactor / oldFactor);
        }

        updatedItem.rate = Number(baseRate.toFixed(2));
        updatedItem.price = calculateItemPrice(updatedItem);
      }
      return updatedItem;
    });
    onItemsChange(updatedItems);
    toast.success(`Pricing set to: ${type.toUpperCase()}`);
  };

  const handleGridKeyDown = (
    e: React.KeyboardEvent,
    idx: number,
    field: string,
  ) => {
    if (mode === "view") return;
    const baseFields = [
      "product",
      "barcode",
      "quantity",
      "unit",
      "rate",
      "discount",
    ];
    const fields = showDescriptionRow
      ? [...baseFields, "description"]
      : baseFields;

    const currentIdx = fields.indexOf(field);
    if (e.key === "Enter") {
      e.preventDefault();
      if (currentIdx < fields.length - 1) {
        focusInput(idx, fields[currentIdx + 1]);
      } else {
        if (idx === items.length - 1 && items[idx].product_id !== 0) {
          onItemsChange([
            ...items,
            { ...defaultItem(), price_type: globalPriceType },
          ]);
        } else if (idx < items.length - 1) {
          focusInput(idx + 1, "product");
        }
      }
    } else if (e.key === "ArrowDown" && idx < items.length - 1) {
      e.preventDefault();
      focusInput(idx + 1, field);
    } else if (e.key === "ArrowUp" && idx > 0) {
      e.preventDefault();
      focusInput(idx - 1, field);
    }
  };

  // --- UNIT SELECTION LOGIC ---
  const getUnitsForProduct = (product: Product | undefined) => {
    if (!product) return ["pcs"];
    const base = (
      product.base_unit ||
      (product as any).unit ||
      "pcs"
    ).toLowerCase();

    // Find matching family
    for (const group of UNIT_GROUPS) {
      if (group.includes(base)) {
        const units = new Set(group);
        if (product.secondary_unit)
          units.add(product.secondary_unit.toLowerCase());
        return Array.from(units);
      }
    }

    // Fallback if untracked family
    const units = new Set([base]);
    if (product.secondary_unit) units.add(product.secondary_unit.toLowerCase());
    return Array.from(units);
  };

  // --- Styles ---
  const headerSx = {
    fontWeight: 800,
    color: "text.disabled",
    fontSize: "0.625rem",
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
    py: 1.5,
    borderBottom: `1px solid ${theme.palette.divider}`,
  };

  const fieldBoxSx = (isActive: boolean) => ({
    bgcolor: isActive
      ? alpha(theme.palette.primary.main, 0.04)
      : alpha(theme.palette.action.hover, 0.03),
    border: `1px solid ${isActive ? theme.palette.primary.main : alpha(theme.palette.divider, 0.6)}`,
    borderRadius: "4px",
    px: 1,
    py: 0.5,
    minHeight: 34,
    display: "flex",
    alignItems: "center",
    transition: "all 0.2s",
    "&:hover": { bgcolor: alpha(theme.palette.action.hover, 0.06) },
    "&:focus-within": {
      borderColor: theme.palette.primary.main,
      bgcolor: "#fff",
    },
  });

  const inputSx = {
    "& .MuiInputBase-root": {
      fontSize: "0.875rem",
      fontWeight: 600,
      padding: 0,
    },
    "& .MuiInput-underline:before, & .MuiInput-underline:after": {
      display: "none",
    },
  };

  return (
    <Box
      sx={{
        bgcolor: theme.palette.background.paper,
        borderTop: `1px solid ${theme.palette.divider}`,
        border: `1px solid #ccc`,
      }}
    >
      {/* --- TOP CONFIGURATION BAR --- */}
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: alpha(theme.palette.action.hover, 0.02),
        }}
      >
        <Stack direction="row" spacing={3} alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: "text.disabled",
                textTransform: "uppercase",
              }}
            >
              Price Strategy
            </Typography>
            <Button
              size="small"
              onClick={(e) =>
                mode !== "view" && setHeaderMenuAnchor(e.currentTarget)
              }
              disabled={mode === "view"}
              endIcon={<ChevronDown size={14} />}
              sx={{
                fontWeight: 800,
                fontSize: "0.75rem",
                color: "primary.main",
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.1) },
              }}
            >
              {globalPriceType === "mrp"
                ? "Retail (MRP)"
                : globalPriceType === "mop"
                  ? "Offer (MOP)"
                  : "Wholesale (MFW)"}
            </Button>
          </Stack>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ height: 16, alignSelf: "center" }}
          />

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showDescriptionRow}
                onChange={(e) => setShowDescriptionRow(e.target.checked)}
              />
            }
            label={
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "text.secondary",
                }}
              >
                Item Descriptions
              </Typography>
            }
          />
        </Stack>

        <Typography
          variant="caption"
          sx={{ color: "text.disabled", fontWeight: 700 }}
        >
          {items.length} LINE ITEMS
        </Typography>
      </Box>

      <TableContainer>
        <Table
          size="small"
          sx={{ borderCollapse: "separate", borderSpacing: "0 4px" }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                sx={{ ...headerSx, width: "4%", pl: 2 }}
                align="center"
              >
                #
              </TableCell>
              {!!shop?.hsn_required && (
                <TableCell sx={{ ...headerSx, width: "8%" }}>HSN</TableCell>
              )}
              <TableCell sx={{ ...headerSx, width: "20%" }}>
                PRODUCT SEARCH
              </TableCell>
              <TableCell sx={{ ...headerSx, width: "20%" }}>BARCODE</TableCell>
              <TableCell sx={{ ...headerSx, width: "10%" }}>QTY</TableCell>
              <TableCell sx={{ ...headerSx, width: "8%" }}>UNIT</TableCell>
              <TableCell sx={{ ...headerSx, width: "10%" }}>
                {!!shop?.inclusive_tax_pricing ? "RATE (INC.)" : "RATE"}
              </TableCell>
              {!!shop?.gst_enabled && (
                <TableCell sx={{ ...headerSx, width: "5%" }} align="center">
                  GST
                </TableCell>
              )}
              <TableCell sx={{ ...headerSx, width: "10%" }} align="center">
                DISC%
              </TableCell>
              <TableCell
                sx={{ ...headerSx, width: "12%", pr: 2 }}
                align="right"
              >
                AMOUNT
              </TableCell>
              <TableCell sx={{ ...headerSx, width: "4%" }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, idx) => {
              const product = productCache[item.product_id];
              const isActive = activeRowIndex === idx;
              const allowedUnits = getUnitsForProduct(product);

              // --- RETURN LOGIC CALCULATION ---
              const retQty = item.return_quantity || 0;
              const isFullyReturned = retQty >= (item.quantity || 1);
              const isPartiallyReturned = retQty > 0 && !isFullyReturned;

              return (
                <Fragment key={idx}>
                  <TableRow
                    selected={isActive}
                    onClick={() => setActiveRowIndex(idx)}
                    sx={{
                      "& > td": { border: 0, py: 0.5 },
                      bgcolor: isFullyReturned
                        ? alpha(theme.palette.error.light, 0.08)
                        : isActive
                          ? alpha(theme.palette.primary.main, 0.01)
                          : "transparent",
                    }}
                  >
                    <TableCell
                      align="center"
                      sx={{
                        color: "text.disabled",
                        fontWeight: 800,
                        fontSize: "0.7rem",
                      }}
                    >
                      {idx + 1}
                    </TableCell>
                    {!!shop?.hsn_required && (
                      <TableCell
                        sx={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: "text.secondary",
                        }}
                      >
                        {item.hsn || product?.hsn || "—"}
                      </TableCell>
                    )}

                    {/* Product Selection */}
                    <TableCell>
                      <Box sx={fieldBoxSx(isActive)}>
                        {mode === "view" ? (
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                textDecoration: isFullyReturned
                                  ? "line-through"
                                  : "none",
                                color: isFullyReturned
                                  ? "text.disabled"
                                  : "text.primary",
                              }}
                            >
                              {item.product_name || product?.name}
                            </Typography>
                            {isFullyReturned && (
                              <Chip
                                label="Returned"
                                size="small"
                                color="error"
                                sx={{
                                  height: 16,
                                  fontSize: "0.6rem",
                                  fontWeight: 800,
                                }}
                              />
                            )}
                            {isPartiallyReturned && (
                              <Chip
                                label={`${retQty} Returned`}
                                size="small"
                                color="warning"
                                sx={{
                                  height: 16,
                                  fontSize: "0.6rem",
                                  fontWeight: 800,
                                }}
                              />
                            )}
                            {retQty > 0 && (
                              <Tooltip
                                title={`Original Sold: ${item.quantity} | Returned to Stock: ${retQty}`}
                              >
                                <IconButton size="small" sx={{ p: 0, ml: 0.5 }}>
                                  <RotateCcw
                                    size={12}
                                    color={theme.palette.error.main}
                                  />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        ) : (
                          <Autocomplete
                            fullWidth
                            freeSolo
                            size="small"
                            options={searchResults}
                            disabled={mode !== "new"}
                            getOptionLabel={(opt) =>
                              typeof opt === "string"
                                ? opt
                                : `${opt.name} (${opt.barcode || "No Barcode"})`
                            }
                            value={product || null}
                            loading={loading}
                            onChange={(_, v) =>
                              handleProductSelect(idx, v as Product)
                            }
                            onInputChange={(_, nv) => setInputValue(nv)}
                            onKeyDown={(e) =>
                              handleGridKeyDown(e, idx, "product")
                            }
                            renderOption={(props, option) => (
                              <li {...props}>
                                <Stack>
                                  <Typography variant="body2" fontWeight={700}>
                                    {option.name}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {option.barcode}
                                  </Typography>
                                </Stack>
                              </li>
                            )}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                inputRef={(el) =>
                                  (gridRefs.current[`${idx}-product`] = el)
                                }
                                placeholder="Type name or code..."
                                variant="standard"
                                sx={inputSx}
                              />
                            )}
                          />
                        )}
                      </Box>
                    </TableCell>

                    {/* Barcode Search/Scan */}
                    <TableCell>
                      <Box sx={fieldBoxSx(isActive)}>
                        <Autocomplete
                          fullWidth
                          freeSolo
                          size="small"
                          options={barcodeSearchResults}
                          disabled={mode === "view"}
                          getOptionLabel={(opt) =>
                            typeof opt === "string" ? opt : opt.barcode || ""
                          }
                          value={item.barcode || product?.barcode || ""}
                          loading={barcodeLoading}
                          onInputChange={(_, nv) => {
                            setBarcodeInputValue(nv);
                            handleFieldChange(idx, "barcode", nv);
                          }}
                          onChange={(_, v) =>
                            handleProductSelect(idx, v as Product)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBarcodeScan(idx, item.barcode || "");
                            } else {
                              handleGridKeyDown(e, idx, "barcode");
                            }
                          }}
                          renderOption={(props, option) => (
                            <li {...props}>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                justifyContent="space-between"
                                width="100%"
                              >
                                <Typography
                                  variant="caption"
                                  fontWeight={700}
                                  sx={{ fontFamily: "monospace" }}
                                >
                                  {option.barcode}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {option.name}
                                </Typography>
                              </Stack>
                            </li>
                          )}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              inputRef={(el) =>
                                (gridRefs.current[`${idx}-barcode`] = el)
                              }
                              placeholder="Scan..."
                              variant="standard"
                              sx={{
                                ...inputSx,
                                "& input": {
                                  fontFamily: '"JetBrains Mono", monospace',
                                  fontSize: "0.8rem",
                                },
                              }}
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                  <Stack direction="row" alignItems="center">
                                    {barcodeLoading ||
                                    scanningRowIndex === idx ? (
                                      <CircularProgress size={12} />
                                    ) : (
                                      <ScanBarcode
                                        size={14}
                                        color={theme.palette.text.disabled}
                                      />
                                    )}
                                    {params.InputProps.endAdornment}
                                  </Stack>
                                ),
                              }}
                            />
                          )}
                        />
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box sx={fieldBoxSx(isActive)}>
                        <TextField
                          type="number"
                          fullWidth
                          variant="standard"
                          disabled={mode === "view"}
                          value={item.quantity || ""}
                          sx={{
                            ...inputSx,
                            "& input": {
                              textAlign: "center",
                              textDecoration: isFullyReturned
                                ? "line-through"
                                : "none",
                            },
                          }}
                          inputRef={(el) =>
                            (gridRefs.current[`${idx}-quantity`] = el)
                          }
                          onChange={(e) =>
                            handleFieldChange(
                              idx,
                              "quantity",
                              Number(e.target.value),
                            )
                          }
                          onKeyDown={(e) =>
                            handleGridKeyDown(e, idx, "quantity")
                          }
                        />
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box sx={fieldBoxSx(isActive)}>
                        <TextField
                          select
                          fullWidth
                          variant="standard"
                          disabled={mode === "view" || !product}
                          value={(item.unit || allowedUnits[0]).toLowerCase()}
                          sx={inputSx}
                          inputRef={(el) =>
                            (gridRefs.current[`${idx}-unit`] = el)
                          }
                          onChange={(e) =>
                            handleFieldChange(idx, "unit", e.target.value)
                          }
                          // 👇 ADD THIS LINE TO INTERCEPT THE ENTER KEY
                          onKeyDown={(e) => handleGridKeyDown(e, idx, "unit")}
                        >
                          {allowedUnits.map((u) => (
                            <MenuItem
                              key={u}
                              value={u.toLowerCase()}
                              sx={{ fontSize: "0.8rem" }}
                            >
                              {u}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box sx={fieldBoxSx(isActive)}>
                        <TextField
                          type="number"
                          fullWidth
                          variant="standard"
                          disabled={mode === "view"}
                          value={item.rate || ""}
                          sx={{
                            ...inputSx,
                            "& input": {
                              textDecoration: isFullyReturned
                                ? "line-through"
                                : "none",
                            },
                          }}
                          inputRef={(el) =>
                            (gridRefs.current[`${idx}-rate`] = el)
                          }
                          onChange={(e) =>
                            handleFieldChange(
                              idx,
                              "rate",
                              Number(e.target.value),
                            )
                          }
                          onKeyDown={(e) => handleGridKeyDown(e, idx, "rate")}
                          InputProps={{
                            startAdornment: (
                              <Typography
                                variant="caption"
                                sx={{
                                  mr: 0.5,
                                  color: "text.disabled",
                                  fontWeight: 800,
                                }}
                              >
                                ₹
                              </Typography>
                            ),
                          }}
                        />
                      </Box>
                    </TableCell>

                    {!!shop?.gst_enabled && (
                      <TableCell align="center">
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
                            color: "primary.main",
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                            px: 0.8,
                            py: 0.2,
                            borderRadius: 1,
                          }}
                        >
                          {item.gst_rate}%
                        </Typography>
                      </TableCell>
                    )}

                    <TableCell align="center">
                      <Box sx={{ ...fieldBoxSx(isActive), minWidth: 50 }}>
                        <TextField
                          type="number"
                          fullWidth
                          variant="standard"
                          disabled={mode === "view"}
                          value={item.discount || ""}
                          placeholder="0"
                          sx={{
                            ...inputSx,
                            "& input": { textAlign: "center" },
                          }}
                          inputRef={(el) =>
                            (gridRefs.current[`${idx}-discount`] = el)
                          }
                          onChange={(e) =>
                            handleFieldChange(
                              idx,
                              "discount",
                              Number(e.target.value),
                            )
                          }
                          onKeyDown={(e) =>
                            handleGridKeyDown(e, idx, "discount")
                          }
                        />
                      </Box>
                    </TableCell>

                    <TableCell align="right" sx={{ pr: 2 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 800,
                          color: isFullyReturned
                            ? "text.disabled"
                            : "text.primary",
                          fontFamily: '"JetBrains Mono", monospace',
                          textDecoration: isFullyReturned
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {item.price.toFixed(2)}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <IconButton
                        size="small"
                        disabled={mode === "view"}
                        onClick={() => handleRemoveRow(idx)}
                        sx={{ color: theme.palette.error.light }}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </TableCell>
                  </TableRow>

                  {!!showDescriptionRow && (
                    <TableRow sx={{ "& > td": { pt: 0, pb: 1, border: 0 } }}>
                      <TableCell />
                      {!!shop?.hsn_required && <TableCell />}
                      <TableCell colSpan={8}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            px: 1.5,
                            py: 0.5,
                            ml: 0.5,
                            borderRadius: "0 0 6px 6px",
                            borderLeft: `2px solid ${isActive ? theme.palette.primary.main : alpha(theme.palette.divider, 0.4)}`,
                            bgcolor: alpha(theme.palette.action.hover, 0.01),
                          }}
                        >
                          <MessageSquareText
                            size={12}
                            color={theme.palette.text.disabled}
                          />
                          <TextField
                            fullWidth
                            size="small"
                            variant="standard"
                            disabled={mode === "view"}
                            placeholder="Add serial numbers, warranty notes, or product description..."
                            value={item.description || ""}
                            sx={{
                              ...inputSx,
                              "& .MuiInputBase-root": {
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                fontStyle: "italic",
                                color: "text.secondary",
                              },
                            }}
                            inputRef={(el) =>
                              (gridRefs.current[`${idx}-description`] = el)
                            }
                            onChange={(e) =>
                              handleFieldChange(
                                idx,
                                "description",
                                e.target.value,
                              )
                            }
                            onKeyDown={(e) =>
                              handleGridKeyDown(e, idx, "description")
                            }
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {mode !== "view" && (
        <Box
          sx={{
            p: 1.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Button
            size="small"
            startIcon={<Plus size={16} />}
            onClick={() =>
              onItemsChange([
                ...items,
                { ...defaultItem(), price_type: globalPriceType },
              ])
            }
            sx={{
              fontWeight: 800,
              textTransform: "none",
              color: "primary.main",
              borderRadius: "6px",
            }}
          >
            Add Line Item (Ctrl + A)
          </Button>
          <Typography
            variant="caption"
            sx={{ color: "text.disabled", fontWeight: 700, letterSpacing: 0.5 }}
          >
            USE ENTER TO NAVIGATE • ARROWS TO MOVE
          </Typography>
        </Box>
      )}

      <Menu
        anchorEl={headerMenuAnchor}
        open={Boolean(headerMenuAnchor)}
        onClose={() => setHeaderMenuAnchor(null)}
        PaperProps={{
          sx: {
            minWidth: 200,
            borderRadius: "8px",
            boxShadow: theme.shadows[10],
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="caption" fontWeight={800} color="text.disabled">
            SELECT RATE STRATEGY
          </Typography>
        </Box>
        {[
          { id: "mrp", label: "Retail (MRP)" },
          { id: "mop", label: "Offer (MOP)" },
          { id: "mfw", label: "Wholesale (MFW)" },
        ].map((type) => (
          <MenuItem
            key={type.id}
            selected={globalPriceType === type.id}
            onClick={() => handleGlobalTypeSelect(type.id as PriceType)}
            sx={{ py: 1 }}
          >
            <Stack
              direction="row"
              width="100%"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography
                variant="body2"
                fontWeight={globalPriceType === type.id ? 700 : 500}
              >
                {type.label}
              </Typography>
              {globalPriceType === type.id && (
                <Check size={14} color={theme.palette.primary.main} />
              )}
            </Stack>
          </MenuItem>
        ))}
      </Menu>

      <Dialog
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: "12px", boxShadow: theme.shadows[10] },
        }}
      >
        <DialogTitle
          sx={{ fontWeight: 800, fontSize: "0.9rem", color: "text.secondary" }}
        >
          SELECT BATCH / SERIAL
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {loadingBatches ? (
            <Box p={4} textAlign="center">
              <CircularProgress size={24} />
            </Box>
          ) : (
            <List dense>
              {availableBatches.map((b: any) => (
                <ListItemButton
                  key={b.id}
                  onClick={() => handleBatchSelect(b)}
                  sx={{ py: 1.5 }}
                >
                  <ListItemText
                    primary={b.batch_number || b.serial_number}
                    secondary={`Stock: ${b.quantity} | MRP: ₹${b.mrp}`}
                    primaryTypographyProps={{
                      fontWeight: 800,
                      fontSize: "0.875rem",
                    }}
                    secondaryTypographyProps={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    label="Select"
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 800, fontSize: "0.65rem" }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
