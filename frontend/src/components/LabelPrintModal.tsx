"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Box,
  Chip,
  FormHelperText,
} from "@mui/material";
import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import type { Product } from "../lib/types/product";
import { getProductBatches, getBatchPrintData } from "../lib/api/batchService";
import { Package, ScanBarcode, Tag } from "lucide-react";

// Safety check for Electron context
// @ts-ignore
const ipcRenderer = window?.electron?.ipcRenderer;

type Props = {
  open: boolean;
  onClose: () => void;
  product: Product | null;
};

type PrintScope = "product" | "batch" | "serial";

export default function LabelPrintDialog({ open, onClose, product }: Props) {
  const [copies, setCopies] = useState(1);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [stockItems, setStockItems] = useState<any[]>([]);

  // --- SELECTION STATES ---
  const [printScope, setPrintScope] = useState<PrintScope>("product");
  const [selectedBatchId, setSelectedBatchId] = useState<number | "">("");
  const [selectedSerialIds, setSelectedSerialIds] = useState<number[]>([]);

  const shop = JSON.parse(localStorage.getItem("shop") || "{}");

  const isTracked =
    product?.tracking_type === "batch" || product?.tracking_type === "serial";
  const isSerial = product?.tracking_type === "serial";

  // Load Data
  useEffect(() => {
    if (open && product && isTracked) {
      setLoading(true);
      getProductBatches(
        product.id!,
        product.tracking_type as "batch" | "serial"
      )
        .then((data) => {
          setStockItems(data || []);
          setSelectedBatchId("");
          setSelectedSerialIds([]);
        })
        .catch(() => toast.error("Failed to load stock info"))
        .finally(() => setLoading(false));
    } else {
      setStockItems([]);
      setSelectedBatchId("");
      setSelectedSerialIds([]);
    }
  }, [open, product, isTracked]);

  // Reset logic when scope changes
  useEffect(() => {
    if (printScope === "product") {
      setSelectedBatchId("");
      setSelectedSerialIds([]);
    }
  }, [printScope]);

  // Reset serials when batch changes
  useEffect(() => {
    setSelectedSerialIds([]);
  }, [selectedBatchId]);

  if (!product) return null;

  // --- DERIVED LISTS ---
  const uniqueBatches = useMemo(() => {
    if (!isTracked) return [];
    if (!isSerial) return stockItems;

    const map = new Map();
    stockItems.forEach((item) => {
      if (item.batch_id && !map.has(item.batch_id)) {
        map.set(item.batch_id, item);
      }
    });
    return Array.from(map.values());
  }, [stockItems, isTracked, isSerial]);

  const availableSerials = useMemo(() => {
    if (!isSerial || !selectedBatchId) return [];
    return stockItems.filter((item) => item.batch_id === selectedBatchId);
  }, [stockItems, isSerial, selectedBatchId]);

  // --- HANDLERS ---
  const handleSerialSelect = (event: any) => {
    const {
      target: { value },
    } = event;
    if (value.includes("all")) {
      if (selectedSerialIds.length === availableSerials.length) {
        setSelectedSerialIds([]);
      } else {
        setSelectedSerialIds(availableSerials.map((s) => s.id));
      }
      return;
    }
    setSelectedSerialIds(typeof value === "string" ? value.split(",") : value);
  };

  const handlePrint = async () => {
    if (!shop) {
      toast.error("Shop settings missing.");
      return;
    }
    if (!ipcRenderer) {
      toast.error("Desktop printing unavailable.");
      return;
    }

    // Validation
    if (printScope === "batch" && !selectedBatchId) {
      toast.error("Please select a batch.");
      return;
    }
    if (printScope === "serial" && selectedSerialIds.length === 0) {
      toast.error("Please select at least one serial.");
      return;
    }

    try {
      setPrinting(true);
      toast.loading("Generating labels...");

      // 1. Call Backend API to get the print payload
      const printJobs = await getBatchPrintData({
        scope: printScope,
        productId: product.id!,
        batchId: selectedBatchId ? Number(selectedBatchId) : undefined,
        serialIds: selectedSerialIds.length > 0 ? selectedSerialIds : undefined,
        copies: copies,
      });

      toast.dismiss();

      if (!printJobs || printJobs.length === 0) {
        toast.error("No labels generated.");
        setPrinting(false);
        return;
      }

      toast.loading(`Printing ${printJobs.length} labels...`, {
        duration: 2000,
      });

      // 2. Loop through the jobs returned by backend and print
      let index = 0;
      const interval = setInterval(() => {
        if (index >= printJobs.length) {
          clearInterval(interval);
          setPrinting(false);
          onClose();
          return;
        }

        const job = printJobs[index];

        ipcRenderer.send("print-label", {
          product,
          shop,
          copies: job.copies,
          customBarcode: job.barcode,
        });

        index++;
      }, 500);
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to generate print data.");
      console.error(error);
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Print Labels: {product.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <ToggleButtonGroup
              value={printScope}
              exclusive
              onChange={(_, val) => val && setPrintScope(val)}
              color="primary"
              fullWidth
              size="small"
            >
              <ToggleButton value="product">
                <Stack direction="row" gap={1}>
                  <Tag size={16} /> Product
                </Stack>
              </ToggleButton>
              {isTracked && (
                <ToggleButton value="batch">
                  <Stack direction="row" gap={1}>
                    <Package size={16} /> Batch
                  </Stack>
                </ToggleButton>
              )}
              {isSerial && (
                <ToggleButton value="serial">
                  <Stack direction="row" gap={1}>
                    <ScanBarcode size={16} /> Serials
                  </Stack>
                </ToggleButton>
              )}
            </ToggleButtonGroup>
            <FormHelperText sx={{ textAlign: "center" }}>
              {printScope === "product" && "Prints simple product barcode."}
              {printScope === "batch" && "Prints Batch UID."}
              {printScope === "serial" && "Prints unique serial barcodes."}
            </FormHelperText>
          </FormControl>

          {(printScope === "batch" || printScope === "serial") && (
            <FormControl fullWidth size="small">
              <InputLabel>Select Batch Source</InputLabel>
              <Select
                value={selectedBatchId}
                label="Select Batch Source"
                onChange={(e) => setSelectedBatchId(Number(e.target.value))}
                disabled={loading}
              >
                {uniqueBatches.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.batch_number}{" "}
                    {b.expiry_date ? `(Exp: ${b.expiry_date})` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {printScope === "serial" && selectedBatchId && (
            <FormControl fullWidth size="small">
              <InputLabel>Select Serials</InputLabel>
              <Select
                multiple
                value={selectedSerialIds}
                onChange={handleSerialSelect}
                input={<OutlinedInput label="Select Serials" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.length === availableSerials.length ? (
                      <Chip size="small" label={`All (${selected.length})`} />
                    ) : (
                      selected.map((val) => (
                        <Chip
                          key={val}
                          label={
                            availableSerials.find((s) => s.id === val)
                              ?.serial_number
                          }
                          size="small"
                        />
                      ))
                    )}
                  </Box>
                )}
                MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }}
              >
                <MenuItem value="all">
                  <Checkbox
                    checked={
                      availableSerials.length > 0 &&
                      selectedSerialIds.length === availableSerials.length
                    }
                  />
                  <ListItemText primary="Select All" />
                </MenuItem>
                {availableSerials.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    <Checkbox checked={selectedSerialIds.indexOf(s.id) > -1} />
                    <ListItemText primary={s.serial_number} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            type="number"
            label="Copies (Per Label)"
            fullWidth
            inputProps={{ min: 1 }}
            value={copies}
            onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={printing}>
          Cancel
        </Button>
        <Button
          onClick={handlePrint}
          variant="contained"
          disabled={
            printing ||
            (printScope === "batch" && !selectedBatchId) ||
            (printScope === "serial" && selectedSerialIds.length === 0)
          }
        >
          {printing ? "Printing..." : "Print"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
