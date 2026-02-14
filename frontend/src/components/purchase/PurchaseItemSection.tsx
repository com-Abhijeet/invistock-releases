"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
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
  Tooltip,
  MenuItem,

  Chip,
} from "@mui/material";
import {
  Trash2,

  ScanBarcode,
  Settings,
  Layers,
  Keyboard,
} from "lucide-react";
import { getAllProducts } from "../../lib/api/productService";
import { getShopData } from "../../lib/api/shopService";
import type { Product } from "../../lib/types/product";
import type { ShopSetupForm } from "../../lib/types/shopTypes";
import { UNIT_FAMILIES } from "../../lib/services/unitService";
import PurchaseBatchModal, { ExtendedPurchaseItem } from "./PurchaseBatchModal";

interface Props {
  items: ExtendedPurchaseItem[];
  onItemsChange: (items: ExtendedPurchaseItem[]) => void;
  readOnly?: boolean;
}

const PurchaseItemSection = ({
  items,
  onItemsChange,
  readOnly = false,
}: Props) => {
  const theme = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [shop, setShop] = useState<ShopSetupForm | null>(null);
  const gridRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(0);

  // New Modal State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // --- FOCUS MANAGEMENT ---
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

  // --- KEYBOARD SHORTCUTS & NAVIGATION ---
  useEffect(() => {
    if (readOnly) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl + A : Open Bulk Add
      if (e.ctrlKey && e.key === "a") {
        e.preventDefault();
        handleBulkAdd();
      }

      // Ctrl + Delete : Remove Active Row
      if (e.ctrlKey && e.key === "Delete" && activeRowIndex !== null) {
        e.preventDefault();
        handleRemoveItem(activeRowIndex);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [activeRowIndex, items, readOnly]);

  const handleCellKeyDown = (
    e: React.KeyboardEvent,
    rowIndex: number,
    field: string,
  ) => {
    if (readOnly) return;

    switch (e.key) {
      case "ArrowUp":
        if (rowIndex > 0) {
          e.preventDefault();
          setActiveRowIndex(rowIndex - 1);
          focusInput(rowIndex - 1, field);
        }
        break;
      case "ArrowDown":
        if (rowIndex < items.length - 1) {
          e.preventDefault();
          setActiveRowIndex(rowIndex + 1);
          focusInput(rowIndex + 1, field);
        }
        break;
      case "Enter":
        e.preventDefault();
        // Move to next logical field
        // Order: qty -> unit -> rate -> margin -> mrp -> (next row qty)
        const fields = ["quantity", "unit", "rate", "margin", "mrp"];
        const currentIdx = fields.indexOf(field);
        if (currentIdx < fields.length - 1) {
          focusInput(rowIndex, fields[currentIdx + 1]);
        } else if (rowIndex < items.length - 1) {
          // Move to next row start
          setActiveRowIndex(rowIndex + 1);
          focusInput(rowIndex + 1, "quantity");
        }
        break;
    }
  };

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

  // --- HANDLERS ---
  const handleBulkAdd = () => {
    setEditingItemIndex(null);
    setBatchModalOpen(true);
  };

  const handleEditItemBatch = (index: number) => {
    setEditingItemIndex(index);
    setBatchModalOpen(true);
  };

  const handleModalAddItems = (newItems: ExtendedPurchaseItem[]) => {
    if (editingItemIndex !== null) {
      // Edit Mode
      const updated = [...items];
      const editedItem = newItems[0];
      updated[editingItemIndex] = {
        ...updated[editingItemIndex],
        ...editedItem,
        price: calculatePrice(editedItem),
      };
      onItemsChange(updated);
    } else {
      // Bulk Add Mode
      const formattedItems = newItems.map((item, i) => ({
        ...item,
        sr_no: items.length + i + 1,
        price: calculatePrice(item),
      }));
      onItemsChange([...items, ...formattedItems]);
    }
  };

  const handleRemoveItem = (idx: number) => {
    if (readOnly) return;
    const updated = items.filter((_, i) => i !== idx);
    updated.forEach((item, index) => {
      item.sr_no = index + 1;
    });
    onItemsChange(updated);
    // Adjust active index
    if (updated.length === 0) setActiveRowIndex(null);
    else if (idx >= updated.length) setActiveRowIndex(updated.length - 1);
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

  const getUnitsForProduct = (product: Product | undefined) => {
    if (!product) return [];
    const units = new Set<string>();
    if (product.base_unit) units.add(product.base_unit);
    if (product.secondary_unit) units.add(product.secondary_unit);
    const baseFamily = Object.values(UNIT_FAMILIES).find((family) =>
      family.units.some((u) => u.value === product.base_unit),
    );
    if (baseFamily) {
      baseFamily.units.forEach((u) => units.add(u.value));
    }
    if (units.size === 0) units.add("pcs");
    return Array.from(units);
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
      {!readOnly && (
        <Box
          sx={{
            p: 2,
            display: "flex",
            gap: 2,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box display="flex" gap={2} alignItems="center">
            <Button
              onClick={handleBulkAdd}
              variant="contained"
              color="primary"
              startIcon={<Layers size={18} />}
            >
              Bulk Add Items
            </Button>
            <Typography variant="caption" color="text.secondary">
              Add multiple items with batch info.
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Chip
              label="Ctrl+A: Add"
              size="small"
              variant="outlined"
              icon={<Keyboard size={12} />}
            />
            <Chip
              label="Ctrl+Del: Remove"
              size="small"
              variant="outlined"
              icon={<Keyboard size={12} />}
            />
          </Box>
        </Box>
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerSx, width: "5%" }} align="center">
                #
              </TableCell>
              <TableCell sx={{ ...headerSx, width: "20%" }}>PRODUCT</TableCell>
              <TableCell sx={{ ...headerSx, width: "10%" }}>
                BATCH INFO
              </TableCell>
              <TableCell sx={{ ...headerSx, width: "8%" }}>QTY</TableCell>
              <TableCell sx={{ ...headerSx, width: "8%" }}>UNIT</TableCell>
              <TableCell sx={{ ...headerSx, width: "10%" }}>COST</TableCell>
              <TableCell sx={{ ...headerSx, width: "8%" }}>MARGIN%</TableCell>
              <TableCell sx={{ ...headerSx, width: "10%" }}>MRP</TableCell>
              <TableCell sx={{ ...headerSx, width: "15%" }} align="right">
                AMOUNT
              </TableCell>
              <TableCell sx={{ ...headerSx, width: "5%" }}></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {items?.map((item, idx) => {
              const product = products.find((p) => p.id === item.product_id);
              const allowedUnits = getUnitsForProduct(product);

              return (
                <TableRow
                  key={idx}
                  hover
                  selected={activeRowIndex === idx}
                  onClick={() => setActiveRowIndex(idx)}
                >
                  <TableCell align="center" sx={{ color: "text.secondary" }}>
                    {item.sr_no}
                  </TableCell>

                  <TableCell sx={{ p: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {product?.name || "Unknown Product"}
                    </Typography>
                    {item.tracking_type !== "none" && (
                      <Typography
                        variant="caption"
                        color="primary"
                        display="flex"
                        alignItems="center"
                        gap={0.5}
                      >
                        <ScanBarcode size={10} /> {item.barcode}
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell sx={{ p: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      onClick={() => handleEditItemBatch(idx)}
                      startIcon={<Settings size={14} />}
                      sx={{ fontSize: "0.7rem", py: 0.5 }}
                    >
                      {item.batch_number || "Details"}
                    </Button>
                  </TableCell>

                  <TableCell sx={{ p: 1 }}>
                    <TextField
                      inputRef={(el) =>
                        (gridRefs.current[`${idx}-quantity`] = el)
                      }
                      type="number"
                      variant="standard"
                      fullWidth
                      value={item.quantity}
                      onKeyDown={(e) => handleCellKeyDown(e, idx, "quantity")}
                      onClick={() => setActiveRowIndex(idx)}
                      onChange={(e) =>
                        handleFieldChange(
                          idx,
                          "quantity",
                          Number(e.target.value),
                        )
                      }
                      InputProps={{ disableUnderline: true, readOnly }}
                      inputProps={{ min: 1, style: { fontWeight: "bold" } }}
                    />
                  </TableCell>

                  <TableCell sx={{ p: 1 }}>
                    <TextField
                      inputRef={(el) => (gridRefs.current[`${idx}-unit`] = el)}
                      select
                      variant="standard"
                      fullWidth
                      value={item.unit || ""}
                      onKeyDown={(e) => handleCellKeyDown(e, idx, "unit")}
                      onChange={(e) =>
                        handleFieldChange(idx, "unit", e.target.value)
                      }
                      disabled={!product || readOnly}
                      InputProps={{ disableUnderline: true }}
                    >
                      {allowedUnits.map((u) => (
                        <MenuItem key={u} value={u}>
                          {u}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>

                  <TableCell sx={{ p: 1 }}>
                    <TextField
                      inputRef={(el) => (gridRefs.current[`${idx}-rate`] = el)}
                      type="number"
                      variant="standard"
                      fullWidth
                      value={item.rate}
                      onKeyDown={(e) => handleCellKeyDown(e, idx, "rate")}
                      onChange={(e) =>
                        handleFieldChange(idx, "rate", Number(e.target.value))
                      }
                      InputProps={{ disableUnderline: true, readOnly }}
                    />
                  </TableCell>

                  <TableCell sx={{ p: 1 }}>
                    <TextField
                      inputRef={(el) =>
                        (gridRefs.current[`${idx}-margin`] = el)
                      }
                      type="number"
                      variant="standard"
                      fullWidth
                      value={item.margin}
                      onKeyDown={(e) => handleCellKeyDown(e, idx, "margin")}
                      onChange={(e) => {
                        const margin = Number(e.target.value);
                        const mrp = item.rate + (item.rate * margin) / 100;
                        const updated = [...items];
                        updated[idx] = {
                          ...updated[idx],
                          margin,
                          mrp: parseFloat(mrp.toFixed(2)),
                        };
                        onItemsChange(updated);
                      }}
                      InputProps={{ disableUnderline: true, readOnly }}
                    />
                  </TableCell>

                  <TableCell sx={{ p: 1 }}>
                    <TextField
                      inputRef={(el) => (gridRefs.current[`${idx}-mrp`] = el)}
                      type="number"
                      variant="standard"
                      fullWidth
                      value={item.mrp}
                      onKeyDown={(e) => handleCellKeyDown(e, idx, "mrp")}
                      onChange={(e) => {
                        const mrp = Number(e.target.value);
                        const rate = item.rate;
                        let margin = 0;
                        if (rate > 0) margin = ((mrp - rate) / rate) * 100;
                        const updated = [...items];
                        updated[idx] = {
                          ...updated[idx],
                          mrp,
                          margin: parseFloat(margin.toFixed(2)),
                        };
                        onItemsChange(updated);
                      }}
                      InputProps={{ disableUnderline: true, readOnly }}
                    />
                  </TableCell>

                  <TableCell align="right">
                    <Typography fontWeight={700}>
                      {item.price.toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                      })}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    {!readOnly && (
                      <Tooltip title="Remove (Ctrl+Del)">
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveItem(idx)}
                          color="error"
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

      <PurchaseBatchModal
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        products={products}
        onAddItems={handleModalAddItems}
        editItem={editingItemIndex !== null ? items[editingItemIndex] : null}
      />
    </Box>
  );
};

export default PurchaseItemSection;
