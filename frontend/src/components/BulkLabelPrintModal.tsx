"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Chip,
  Box,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Printer, X, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { fetchPurchaseItemsForLabels } from "../lib/api/purchaseService";
import { printLabel } from "../lib/printLabel";
import KoshSpinningLoader from "./KoshSpinningLoader";

interface Props {
  open: boolean;
  onClose: () => void;
  purchaseId: number | null;
}

export interface PrintableRow {
  rowId: string;
  itemType: "standard" | "batch" | "variant";
  productId: number;
  productName: string;
  articleNo?: string;
  dim1Value?: string;
  dim2Value?: string;
  batchNumber?: string;
  barcode: string;
  mrp: number;
  quantity: number;
  copiesPerQty: number; // Multiplier
  totalCopies: number;  // Qty * copiesPerQty (editable)
  selected: boolean;
}

export default function BulkLabelPrintModal({
  open,
  onClose,
  purchaseId,
}: Props) {
  const [rows, setRows] = useState<PrintableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);

  // Fetch data when modal opens
  useEffect(() => {
    if (open && purchaseId) {
      setLoading(true);
      fetchPurchaseItemsForLabels(purchaseId)
        .then((data: any[]) => {
          const printableList: PrintableRow[] = [];

          data.forEach((item, itemIdx) => {
            const hasVariants = item.variants && item.variants.length > 0;

            if (hasVariants) {
              // Expand variant rows individually
              item.variants.forEach((v: any, vIdx: number) => {
                const qty = Math.max(1, Number(v.quantity) || Number(item.purchase_quantity) || 1);
                printableList.push({
                  rowId: `var_${v.id || `${itemIdx}_${vIdx}`}`,
                  itemType: "variant",
                  productId: item.product_id,
                  productName: item.name,
                  articleNo: v.article_no || "",
                  dim1Value: v.dim1_value || "",
                  dim2Value: v.dim2_value || "",
                  batchNumber: item.batch_number || "",
                  barcode: v.barcode || v.sku || item.barcode || item.product_code || "0000",
                  mrp: Number(v.mrp) || Number(item.mrp) || 0,
                  quantity: qty,
                  copiesPerQty: 1,
                  totalCopies: qty,
                  selected: true,
                });
              });
            } else if (item.tracking_type === "batch") {
              // Batch item row
              const qty = Math.max(1, Number(item.purchase_quantity) || 1);
              printableList.push({
                rowId: `batch_${item.batch_id || item.purchase_item_id || itemIdx}`,
                itemType: "batch",
                productId: item.product_id,
                productName: item.name,
                articleNo: "",
                dim1Value: "",
                dim2Value: "",
                batchNumber: item.batch_number || "",
                barcode: item.batch_barcode || item.barcode || item.product_code || "0000",
                mrp: Number(item.mrp) || 0,
                quantity: qty,
                copiesPerQty: 1,
                totalCopies: qty,
                selected: true,
              });
            } else {
              // Standard untracked product row
              const qty = Math.max(1, Number(item.purchase_quantity) || 1);
              printableList.push({
                rowId: `std_${item.product_id || itemIdx}`,
                itemType: "standard",
                productId: item.product_id,
                productName: item.name,
                articleNo: "",
                dim1Value: "",
                dim2Value: "",
                batchNumber: "",
                barcode: item.barcode || item.product_code || "0000",
                mrp: Number(item.mrp) || 0,
                quantity: qty,
                copiesPerQty: 1,
                totalCopies: qty,
                selected: true,
              });
            }
          });

          setRows(printableList);
        })
        .catch((err) => {
          console.error(err);
          toast.error("Failed to load purchase items for printing");
        })
        .finally(() => setLoading(false));
    }
  }, [open, purchaseId]);

  // Totals calculations
  const selectedRows = useMemo(() => rows.filter((r) => r.selected), [rows]);

  const summary = useMemo(() => {
    const totalItems = selectedRows.length;
    const totalQty = selectedRows.reduce((sum, r) => sum + r.quantity, 0);
    const grandTotalLabels = selectedRows.reduce(
      (sum, r) => sum + Math.max(0, Number(r.totalCopies) || 0),
      0,
    );
    return { totalItems, totalQty, grandTotalLabels };
  }, [selectedRows]);

  // Handlers
  const handleToggleSelect = (rowId: string) => {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, selected: !r.selected } : r)),
    );
  };

  const handleToggleSelectAll = () => {
    const allSelected = rows.every((r) => r.selected);
    setRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  };

  const handleCopiesPerQtyChange = (rowId: string, val: number) => {
    const mult = Math.max(1, val || 1);
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        return {
          ...r,
          copiesPerQty: mult,
          totalCopies: r.quantity * mult,
        };
      }),
    );
  };

  const handleQuantityChange = (rowId: string, newQty: number) => {
    const qty = Math.max(1, newQty || 1);
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        return {
          ...r,
          quantity: qty,
          totalCopies: qty * r.copiesPerQty,
        };
      }),
    );
  };

  const handleTotalCopiesChange = (rowId: string, newTotal: number) => {
    const total = Math.max(0, newTotal || 0);
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, totalCopies: total } : r)),
    );
  };

  const handleSetAllMultiplier = (mult: number) => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        copiesPerQty: mult,
        totalCopies: r.quantity * mult,
      })),
    );
    toast.success(`Set ${mult}x copies per quantity for all items`);
  };

  const handleResetQty = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        copiesPerQty: 1,
        totalCopies: r.quantity,
      })),
    );
    toast.success("Reset label counts to purchase stock quantity");
  };

  const handlePrint = async () => {
    if (selectedRows.length === 0) {
      toast.error("Please select at least one item to print");
      return;
    }
    if (summary.grandTotalLabels === 0) {
      toast.error("Total copies to print must be greater than 0");
      return;
    }

    setPrinting(true);
    try {
      const labelJobs = selectedRows
        .filter((r) => r.totalCopies > 0)
        .map((r) => ({
          name: r.productName,
          article_no: r.articleNo,
          dim1_value: r.dim1Value,
          dim2_value: r.dim2Value,
          batch_number: r.batchNumber,
          barcode: r.barcode,
          mrp: r.mrp,
          price: r.mrp,
          copies: r.totalCopies,
        }));

      await printLabel(labelJobs);
      toast.success(
        `Sent ${summary.grandTotalLabels} barcode label(s) to printer!`,
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to print labels");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: 24,
          maxHeight: "90vh",
        },
      }}
    >
      {/* Dialog Header */}
      <DialogTitle
        sx={{
          m: 0,
          p: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "flex",
            }}
          >
            <Printer size={22} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
              Bulk & Post-Purchase Barcode Label Printer
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Print standard, batch, or variant barcodes for purchase items
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      {/* Dialog Content */}
      <DialogContent sx={{ p: 2.5, bgcolor: "background.default" }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 8,
            }}
          >
            <KoshSpinningLoader size={48} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading purchase items and barcode specs...
            </Typography>
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ textCenter: "center", py: 6 }}>
            <Typography color="text.secondary">
              No printable items found for this purchase.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2.5}>
            {/* Summary Statistics Banner */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: "background.paper",
                borderColor: "divider",
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
                spacing={2}
              >
                <Stack direction="row" spacing={3} alignItems="center">
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      SELECTED ITEMS
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="primary.main">
                      {summary.totalItems} / {rows.length}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      TOTAL STOCK QTY
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="text.primary">
                      {summary.totalQty} Pcs
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      TOTAL LABELS TO PRINT
                    </Typography>
                    <Typography variant="h5" fontWeight={900} color="secondary.main">
                      {summary.grandTotalLabels}
                    </Typography>
                  </Box>
                </Stack>

                {/* Quick Preset Action Buttons */}
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Tooltip title="Reset to purchase stock quantities (1x multiplier)">
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      onClick={handleResetQty}
                      startIcon={<RotateCcw size={14} />}
                    >
                      1x Qty
                    </Button>
                  </Tooltip>
                  <Tooltip title="Set 2 copies per unit quantity for all items">
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={() => handleSetAllMultiplier(2)}
                    >
                      2x Copies
                    </Button>
                  </Tooltip>
                  <Tooltip title="Set 4 copies per unit quantity for all items">
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={() => handleSetAllMultiplier(4)}
                    >
                      4x Copies
                    </Button>
                  </Tooltip>
                </Stack>
              </Stack>
            </Paper>

            {/* Printable Items Table */}
            <Paper
              variant="outlined"
              sx={{ borderRadius: 2.5, overflow: "hidden", borderColor: "divider" }}
            >
              <Table size="small">
                <TableHead sx={{ bgcolor: "action.hover" }}>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={rows.length > 0 && rows.every((r) => r.selected)}
                        indeterminate={
                          rows.some((r) => r.selected) &&
                          !rows.every((r) => r.selected)
                        }
                        onChange={handleToggleSelectAll}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Item & Specs</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Barcode & Type</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "right" }}>MRP</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "center", width: 90 }}>
                      Qty
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "center", width: 110 }}>
                      Copies/Qty
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "center", width: 110 }}>
                      Total Labels
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    return (
                      <TableRow
                        key={row.rowId}
                        hover
                        selected={row.selected}
                        sx={{
                          opacity: row.selected ? 1 : 0.5,
                          transition: "opacity 0.2s",
                        }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={row.selected}
                            onChange={() => handleToggleSelect(row.rowId)}
                          />
                        </TableCell>

                        {/* Item Name & Specs */}
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {row.productName}
                          </Typography>
                          <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap">
                            {row.articleNo && (
                              <Chip
                                label={`Art: ${row.articleNo}`}
                                size="small"
                                color="secondary"
                                variant="outlined"
                                sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }}
                              />
                            )}
                            {row.dim1Value && (
                              <Chip
                                label={`Size: ${row.dim1Value}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }}
                              />
                            )}
                            {row.dim2Value && (
                              <Chip
                                label={`Color: ${row.dim2Value}`}
                                size="small"
                                color="info"
                                variant="outlined"
                                sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }}
                              />
                            )}
                            {row.batchNumber && (
                              <Chip
                                label={`Batch: ${row.batchNumber}`}
                                size="small"
                                color="default"
                                variant="outlined"
                                sx={{ height: 20, fontSize: "0.7rem" }}
                              />
                            )}
                          </Stack>
                        </TableCell>

                        {/* Barcode & Type Badge */}
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontFamily="monospace"
                            fontWeight={700}
                          >
                            {row.barcode}
                          </Typography>
                          <Chip
                            label={row.itemType.toUpperCase()}
                            size="small"
                            color={
                              row.itemType === "variant"
                                ? "secondary"
                                : row.itemType === "batch"
                                  ? "warning"
                                  : "default"
                            }
                            sx={{ height: 18, fontSize: "0.65rem", fontWeight: 800, mt: 0.3 }}
                          />
                        </TableCell>

                        {/* MRP */}
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          ₹{row.mrp.toFixed(2)}
                        </TableCell>

                        {/* Quantity (Q) */}
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={row.quantity}
                            onChange={(e) =>
                              handleQuantityChange(
                                row.rowId,
                                parseInt(e.target.value) || 1,
                              )
                            }
                            inputProps={{ min: 1, style: { textAlign: "center", padding: "4px 8px" } }}
                            sx={{ width: 65 }}
                          />
                        </TableCell>

                        {/* Copies per Qty Multiplier (C) */}
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={row.copiesPerQty}
                            onChange={(e) =>
                              handleCopiesPerQtyChange(
                                row.rowId,
                                parseInt(e.target.value) || 1,
                              )
                            }
                            inputProps={{ min: 1, style: { textAlign: "center", padding: "4px 8px" } }}
                            sx={{ width: 75 }}
                          />
                        </TableCell>

                        {/* Total Barcodes (T = Q * C, Editable) */}
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={row.totalCopies}
                            onChange={(e) =>
                              handleTotalCopiesChange(
                                row.rowId,
                                parseInt(e.target.value) || 0,
                              )
                            }
                            inputProps={{
                              min: 0,
                              style: {
                                textAlign: "center",
                                fontWeight: 800,
                                color: "#10b981",
                                padding: "4px 8px",
                              },
                            }}
                            sx={{ width: 85 }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        )}
      </DialogContent>

      {/* Dialog Footer Actions */}
      <DialogActions
        sx={{
          p: 2,
          px: 3,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          justifyContent: "space-between",
        }}
      >
        <Button variant="outlined" color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handlePrint}
          disabled={printing || loading || summary.grandTotalLabels === 0}
          startIcon={<Printer size={20} />}
          sx={{ px: 4, fontWeight: 800, borderRadius: 2 }}
        >
          {printing
            ? "Printing..."
            : `PRINT ${summary.grandTotalLabels} LABEL(S)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
