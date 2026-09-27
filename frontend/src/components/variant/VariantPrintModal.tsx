import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Stack,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { Printer, X } from "lucide-react";
import toast from "react-hot-toast";

import { BatchVariant } from "../../types/variant";
import { getVariantPrintPayload } from "../../lib/api/variantService";
import { printLabel } from "../../lib/printLabel";

interface VariantPrintModalProps {
  open: boolean;
  onClose: () => void;
  variants: BatchVariant[];
  productName?: string;
}

interface PrintableRow {
  variant: BatchVariant;
  copies: number;
}

export default function VariantPrintModal({
  open,
  onClose,
  variants,
  productName = "Product",
}: VariantPrintModalProps) {
  const [printableRows, setPrintableRows] = useState<PrintableRow[]>([]);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (open && variants) {
      // Default copies for each variant is its stock quantity (or 1 if 0)
      const initialized = variants.map((v) => ({
        variant: v,
        copies: v.quantity > 0 ? v.quantity : 1,
      }));
      setPrintableRows(initialized);
    }
  }, [open, variants]);

  const totalLabelsCount = useMemo(() => {
    return printableRows.reduce((sum, r) => sum + (Math.max(1, Number(r.copies) || 1)), 0);
  }, [printableRows]);

  const handleCopiesChange = (variantId: number, newCopies: number) => {
    const val = Math.max(1, newCopies || 1);
    setPrintableRows((prev) =>
      prev.map((r) => (r.variant.id === variantId ? { ...r, copies: val } : r))
    );
  };

  const handleSetAllToOne = () => {
    setPrintableRows((prev) => prev.map((r) => ({ ...r, copies: 1 })));
  };

  const handleResetToStockQty = () => {
    setPrintableRows((prev) =>
      prev.map((r) => ({ ...r, copies: r.variant.quantity > 0 ? r.variant.quantity : 1 }))
    );
  };

  const handleConfirmPrint = async () => {
    if (printableRows.length === 0) return;
    try {
      setPrinting(true);
      const variantItems = printableRows.map((r) => ({
        id: r.variant.id,
        copies: r.copies,
      }));

      const labels = await getVariantPrintPayload({ variantItems });
      if (labels && labels.length > 0) {
        await printLabel(labels);
        toast.success(`Sent ${totalLabelsCount} continuous variant label(s) to printer`);
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to print variant labels");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight={700} display="flex" alignItems="center" gap={1}>
              <Printer className="text-indigo-600" size={22} />
              Print Preview: Variant Barcode Labels
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Product: <strong>{productName}</strong> | Unique Variants: {printableRows.length}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" disabled={printing}>
            <X size={18} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          {/* Preset Buttons */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Review quantity & copies per variant before printing:
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" color="primary" onClick={handleResetToStockQty}>
                Default (Stock Qty)
              </Button>
              <Button size="small" variant="outlined" color="secondary" onClick={handleSetAllToOne}>
                1 Copy Each
              </Button>
            </Stack>
          </Stack>

          {/* Table List of Printable Variants */}
          <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: "grey.50" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Article No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Color / Size</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Batch</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Barcode</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Stock Qty</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, width: 140 }}>Copies to Print</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {printableRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>
                      No variants selected for printing.
                    </TableCell>
                  </TableRow>
                ) : (
                  printableRows.map(({ variant: v, copies }) => (
                    <TableRow key={v.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="primary.main">
                          {v.article_no || "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {v.dim1_value && <Chip label={v.dim1_value} size="small" variant="outlined" color="info" />}
                          {v.dim2_value && <Chip label={v.dim2_value} size="small" color="primary" />}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" fontWeight={600} sx={{ bgcolor: "action.hover", px: 1, py: 0.5, borderRadius: 1 }}>
                          {v.batch_number || "DEFAULT"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace" fontWeight={700}>
                          {v.barcode}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${v.quantity} units`}
                          size="small"
                          color={v.quantity > 0 ? "success" : "default"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={copies}
                          onChange={(e) => handleCopiesChange(v.id, Number(e.target.value))}
                          inputProps={{ min: 1, style: { textAlign: "right", fontWeight: 700 } }}
                          sx={{ width: 90 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>

          {/* Total Summary Footer */}
          <Box
            sx={{
              p: 2,
              bgcolor: "indigo.50",
              borderRadius: 2,
              border: "1px solid",
              borderColor: "indigo.200",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                Print Job Summary
              </Typography>
              <Typography variant="body1" fontWeight={700} color="indigo.900">
                {printableRows.length} Unique Variant(s) Selected
              </Typography>
            </Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h6" fontWeight={800} color="primary.main">
                {totalLabelsCount} Continuous Label(s)
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit" disabled={printing}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirmPrint}
          variant="contained"
          color="primary"
          startIcon={<Printer size={18} />}
          disabled={printableRows.length === 0 || printing}
          sx={{ fontWeight: 700, textTransform: "none", px: 3 }}
        >
          {printing ? "Generating Labels..." : `Confirm & Print (${totalLabelsCount} Labels)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
