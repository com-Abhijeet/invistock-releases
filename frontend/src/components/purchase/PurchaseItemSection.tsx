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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Collapse,
} from "@mui/material";
import {
  Trash2,
  ScanBarcode,
  Settings,
  Layers,
  Keyboard,
  AlertCircle,
  ListOrdered,
  Wand2,
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

  // Modal State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Bulk Serial Modal State
  const [serialModalOpen, setSerialModalOpen] = useState(false);
  const [serialRowIndex, setSerialRowIndex] = useState<number | null>(null);
  const [serialInputText, setSerialInputText] = useState("");

  // Auto-Generate State
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [genPrefix, setGenPrefix] = useState("");
  const [genStartNum, setGenStartNum] = useState<number | "">(1);
  const [genCount, setGenCount] = useState<number | "">(10);

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
        const fields = ["quantity", "unit", "rate", "margin", "mrp"];
        const currentIdx = fields.indexOf(field);
        if (currentIdx < fields.length - 1) {
          focusInput(rowIndex, fields[currentIdx + 1]);
        } else if (rowIndex < items.length - 1) {
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
      const updated = [...items];
      const editedItem = newItems[0];
      updated[editingItemIndex] = {
        ...updated[editingItemIndex],
        ...editedItem,
        price: calculatePrice(editedItem),
      };
      onItemsChange(updated);
    } else {
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

  // --- BULK SERIAL MODAL HANDLERS ---
  const handleOpenSerialModal = (idx: number) => {
    const item = items[idx];
    const product = products.find((p) => p.id === item.product_id);

    setSerialRowIndex(idx);
    const currentSerials = item.serial_numbers || [];
    setSerialInputText(currentSerials.join("\n"));

    // Set smart defaults for auto-gen
    setGenPrefix(product?.product_code ? `${product.product_code}-` : "SN-");
    setGenCount(item.quantity > 0 ? item.quantity : 10);
    setGenStartNum(1);
    setShowAutoGenerate(false);

    setSerialModalOpen(true);
  };

  const handleSaveSerials = () => {
    if (serialRowIndex === null) return;

    // Parse using newline or comma, remove empty spaces
    const serialsArray = serialInputText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    // Deduplicate array (prevents duplicate scans)
    const uniqueSerials = Array.from(new Set(serialsArray));

    const updated = [...items];
    updated[serialRowIndex].serial_numbers = uniqueSerials;

    // Auto-sync quantity to exact amount of serials
    updated[serialRowIndex].quantity = uniqueSerials.length;
    updated[serialRowIndex].price = calculatePrice(updated[serialRowIndex]);

    onItemsChange(updated);
    setSerialModalOpen(false);
    setSerialRowIndex(null);
  };

  const handleAutoGenerateSerials = () => {
    const count = Number(genCount) || 0;
    const start = Number(genStartNum) || 1;
    if (count <= 0) return;

    const newSerials: string[] = [];
    for (let i = 0; i < count; i++) {
      const numStr = String(start + i).padStart(4, "0");
      newSerials.push(`${genPrefix}${numStr}`);
    }

    setSerialInputText((prev) => {
      const existing = prev.trim() ? prev.trim() + "\n" : "";
      return existing + newSerials.join("\n");
    });

    setShowAutoGenerate(false); // hide panel after generation
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

  // Get current detected count for the modal preview
  const currentModalSerialCount = serialInputText
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean).length;

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

              const isSerialTracked = product?.tracking_type === "serial";
              const serialCount = item.serial_numbers?.length || 0;
              const needsSerials = isSerialTracked && serialCount === 0;
              const quantityMismatch =
                isSerialTracked && serialCount !== item.quantity;

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
                    <Box display="flex" gap={1} alignItems="center" mt={0.5}>
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
                      {isSerialTracked && (
                        <Tooltip
                          title={
                            needsSerials
                              ? "No serials added!"
                              : quantityMismatch
                                ? `Quantity mismatch: ${item.quantity} vs ${serialCount} serials`
                                : "Serial tracked"
                          }
                        >
                          <AlertCircle
                            size={14}
                            color={
                              needsSerials || quantityMismatch ? "red" : "gray"
                            }
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>

                  <TableCell sx={{ p: 1 }}>
                    <Box display="flex" flexDirection="column" gap={1}>
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

                      {isSerialTracked && (
                        <Button
                          size="small"
                          variant={
                            needsSerials || quantityMismatch
                              ? "contained"
                              : "outlined"
                          }
                          color={
                            needsSerials || quantityMismatch
                              ? "error"
                              : "success"
                          }
                          onClick={() => handleOpenSerialModal(idx)}
                          startIcon={<ListOrdered size={14} />}
                          sx={{ fontSize: "0.7rem", py: 0.5 }}
                        >
                          {serialCount > 0
                            ? `${serialCount} Serials`
                            : "Add Serials"}
                        </Button>
                      )}
                    </Box>
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
                      // Make readonly if serial tracked so users use the modal to dictate quantity
                      InputProps={{
                        disableUnderline: true,
                        readOnly: readOnly || isSerialTracked,
                      }}
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

      {/* BULK SERIAL ENTRY MODAL */}
      <Dialog
        open={serialModalOpen}
        onClose={() => setSerialModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            fontWeight: "bold",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Bulk Serial Entry</span>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Wand2 size={16} />}
            onClick={() => setShowAutoGenerate(!showAutoGenerate)}
            color={showAutoGenerate ? "primary" : "inherit"}
          >
            Auto-Generate
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          <Collapse in={showAutoGenerate}>
            <Box
              sx={{
                p: 2,
                mb: 2,
                bgcolor: "action.hover",
                borderRadius: 1,
                border: "1px dashed",
                borderColor: "divider",
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Generate Sequential Serials
              </Typography>
              <Typography variant="caption" color="text.secondary" paragraph>
                Useful if manufacturer doesn't provide barcodes. Generate them
                here, print barcode labels later, and scan them at checkout.
              </Typography>
              <Box display="flex" gap={2} alignItems="center">
                <TextField
                  label="Prefix"
                  size="small"
                  value={genPrefix}
                  onChange={(e) => setGenPrefix(e.target.value)}
                  sx={{ width: 120 }}
                />
                <TextField
                  label="Start Num"
                  size="small"
                  type="number"
                  value={genStartNum}
                  onChange={(e) => setGenStartNum(Number(e.target.value) || "")}
                  sx={{ width: 100 }}
                />
                <TextField
                  label="Quantity"
                  size="small"
                  type="number"
                  value={genCount}
                  onChange={(e) => setGenCount(Number(e.target.value) || "")}
                  sx={{ width: 100 }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAutoGenerateSerials}
                  disabled={!genCount || genCount <= 0}
                >
                  Generate
                </Button>
              </Box>
            </Box>
          </Collapse>

          <Alert severity="info" sx={{ mb: 2 }}>
            Paste scanned serials below (separated by <strong>newlines</strong>{" "}
            or <strong>commas</strong>).
          </Alert>

          <TextField
            multiline
            rows={10}
            fullWidth
            variant="outlined"
            placeholder="e.g. SN-001&#10;SN-002&#10;SN-003"
            value={serialInputText}
            onChange={(e) => setSerialInputText(e.target.value)}
            InputProps={{
              sx: { fontFamily: "monospace", fontSize: "0.85rem" },
            }}
          />

          <Box
            mt={2}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="body2" color="text.secondary">
              Duplicate serials will be automatically ignored.
            </Typography>
            <Chip
              label={`${currentModalSerialCount} Serials Detected`}
              color={currentModalSerialCount > 0 ? "success" : "default"}
              sx={{ fontWeight: "bold" }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSerialModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveSerials}
            disabled={
              currentModalSerialCount === 0 &&
              items[serialRowIndex!]?.quantity > 0
            }
          >
            Save & Sync Quantity
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseItemSection;
