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
  Box,
  FormHelperText,
  List,
  ListItemButton,
  ListItemIcon,
  Paper,
  Typography,
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

  // For Serial Mode: used to FILTER the serial list
  const [filterBatchId, setFilterBatchId] = useState<number | "">("");

  // For Serial Mode: actual selected serials to print
  const [selectedSerialIds, setSelectedSerialIds] = useState<number[]>([]);

  // For Batch Mode: selected batches to print
  const [selectedPrintBatchIds, setSelectedPrintBatchIds] = useState<number[]>(
    [],
  );

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
        product.tracking_type as "batch" | "serial",
      )
        .then((data) => {
          setStockItems(data || []);
          setFilterBatchId("");
          setSelectedSerialIds([]);
          setSelectedPrintBatchIds([]);
        })
        .catch(() => toast.error("Failed to load stock info"))
        .finally(() => setLoading(false));
    } else {
      setStockItems([]);
      setFilterBatchId("");
      setSelectedSerialIds([]);
      setSelectedPrintBatchIds([]);
    }
  }, [open, product, isTracked]);

  // Reset logic when scope changes
  useEffect(() => {
    if (printScope === "product") {
      setFilterBatchId("");
      setSelectedSerialIds([]);
      setSelectedPrintBatchIds([]);
    } else if (printScope === "batch") {
      // When switching to batch, maybe select all? or none. Let's keep none.
      setSelectedPrintBatchIds([]);
    }
  }, [printScope]);

  // Reset serials when filter batch changes (only for serial mode)
  useEffect(() => {
    setSelectedSerialIds([]);
  }, [filterBatchId]);

  if (!product) return null;

  // --- DERIVED LISTS ---
  const uniqueBatches = useMemo(() => {
    if (!isTracked) return [];
    // If tracking type is serial, we still might want batches to group them

    const map = new Map();
    stockItems.forEach((item) => {
      // Handle items with no batch_id (Direct Serial Stock) by using -1
      const bId = item.batch_id || -1;

      if (!map.has(bId)) {
        map.set(bId, {
          ...item,
          id: bId, // Ensure the ID is -1 for the dropdown value
          batch_number: item.batch_number || "General Stock (No Batch)",
        });
      }
    });
    return Array.from(map.values());
  }, [stockItems, isTracked]);

  const availableSerials = useMemo(() => {
    // Check for empty string specifically to allow 0 or -1 as valid IDs
    if (!isSerial || filterBatchId === "") return [];

    // If "General Stock" (-1) is selected, filter items with no batch_id
    if (filterBatchId === -1) {
      return stockItems.filter((item) => !item.batch_id);
    }

    return stockItems.filter((item) => item.batch_id === filterBatchId);
  }, [stockItems, isSerial, filterBatchId]);

  // --- HANDLERS ---

  // 1. Serial Handlers
  const handleToggleSerial = (id: number) => {
    const currentIndex = selectedSerialIds.indexOf(id);
    const newChecked = [...selectedSerialIds];
    if (currentIndex === -1) {
      newChecked.push(id);
    } else {
      newChecked.splice(currentIndex, 1);
    }
    setSelectedSerialIds(newChecked);
  };

  const handleSelectAllSerials = () => {
    if (selectedSerialIds.length === availableSerials.length) {
      setSelectedSerialIds([]);
    } else {
      setSelectedSerialIds(availableSerials.map((s) => s.id));
    }
  };

  // 2. Batch Handlers
  const handleToggleBatch = (id: number) => {
    const currentIndex = selectedPrintBatchIds.indexOf(id);
    const newChecked = [...selectedPrintBatchIds];
    if (currentIndex === -1) {
      newChecked.push(id);
    } else {
      newChecked.splice(currentIndex, 1);
    }
    setSelectedPrintBatchIds(newChecked);
  };

  const handleSelectAllBatches = () => {
    if (selectedPrintBatchIds.length === uniqueBatches.length) {
      setSelectedPrintBatchIds([]);
    } else {
      setSelectedPrintBatchIds(uniqueBatches.map((b) => b.id));
    }
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
    if (printScope === "batch" && selectedPrintBatchIds.length === 0) {
      toast.error("Please select at least one batch.");
      return;
    }
    if (printScope === "serial" && selectedSerialIds.length === 0) {
      toast.error("Please select at least one serial.");
      return;
    }

    try {
      setPrinting(true);
      toast.loading("Generating labels...");

      let allPrintJobs: any[] = [];

      if (printScope === "batch") {
        // Loop through all selected batches and gather jobs
        const promises = selectedPrintBatchIds.map((batchId) =>
          getBatchPrintData({
            scope: "batch",
            productId: product.id!,
            batchId: batchId === -1 ? undefined : batchId,
            copies: copies,
          }),
        );
        const results = await Promise.all(promises);
        results.forEach((jobs) => {
          if (jobs) allPrintJobs.push(...jobs);
        });
      } else {
        // Product or Serial scope (single call)
        allPrintJobs = await getBatchPrintData({
          scope: printScope,
          productId: product.id!,
          // If scope is serial, we use the selectedSerialIds
          // If scope is product, params are minimal
          batchId:
            printScope === "serial" && filterBatchId !== ""
              ? filterBatchId === -1
                ? undefined
                : Number(filterBatchId)
              : undefined,
          serialIds:
            selectedSerialIds.length > 0 ? selectedSerialIds : undefined,
          copies: copies,
        });
      }

      toast.dismiss();

      if (!allPrintJobs || allPrintJobs.length === 0) {
        toast.error("No labels generated.");
        setPrinting(false);
        return;
      }

      toast.loading(`Printing ${allPrintJobs.length} labels...`, {
        duration: 2000,
      });

      // Loop through the jobs returned by backend and print
      let index = 0;
      const interval = setInterval(() => {
        if (index >= allPrintJobs.length) {
          clearInterval(interval);
          setPrinting(false);
          onClose();
          return;
        }

        const job = allPrintJobs[index];

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

  const showRightPanel = printScope === "serial" || printScope === "batch";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={showRightPanel ? "md" : "sm"}
    >
      <DialogTitle>Print Labels: {product.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, display: "flex", gap: 3, alignItems: "flex-start" }}>
          {/* LEFT COLUMN: Controls */}
          <Box sx={{ flex: 1 }}>
            <Stack spacing={3}>
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

              {/* Only show "Batch Source" filter if in Serial Mode. 
                  In Batch Mode, the list is on the right. */}
              {printScope === "serial" && (
                <FormControl fullWidth size="small">
                  <InputLabel>Select Batch Filter</InputLabel>
                  <Select
                    value={filterBatchId}
                    label="Select Batch Filter"
                    onChange={(e) => setFilterBatchId(Number(e.target.value))}
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

              <TextField
                type="number"
                label="Copies (Per Label)"
                fullWidth
                inputProps={{ min: 1 }}
                value={copies}
                onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
              />
            </Stack>
          </Box>

          {/* RIGHT COLUMN: List (Shown for Batch OR Serial scope) */}
          {showRightPanel && (
            <Box
              sx={{
                flex: 1,
                borderLeft: "1px solid",
                borderColor: "divider",
                pl: 3,
                minHeight: 300,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* --- BATCH LIST UI --- */}
              {printScope === "batch" && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Select Batches to Print
                    {uniqueBatches.length > 0 &&
                      ` (${selectedPrintBatchIds.length}/${uniqueBatches.length})`}
                  </Typography>

                  {uniqueBatches.length === 0 ? (
                    <Box
                      display="flex"
                      flex={1}
                      alignItems="center"
                      justifyContent="center"
                      color="text.secondary"
                    >
                      <Typography variant="body2">No batches found.</Typography>
                    </Box>
                  ) : (
                    <Paper
                      variant="outlined"
                      sx={{ flex: 1, overflow: "auto", mt: 1, maxHeight: 400 }}
                    >
                      <List dense disablePadding>
                        <ListItemButton
                          onClick={handleSelectAllBatches}
                          divider
                        >
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={
                                uniqueBatches.length > 0 &&
                                selectedPrintBatchIds.length ===
                                  uniqueBatches.length
                              }
                              indeterminate={
                                selectedPrintBatchIds.length > 0 &&
                                selectedPrintBatchIds.length <
                                  uniqueBatches.length
                              }
                              tabIndex={-1}
                              disableRipple
                            />
                          </ListItemIcon>
                          <ListItemText primary="Select All" />
                        </ListItemButton>

                        {uniqueBatches.map((b) => (
                          <ListItemButton
                            key={b.id}
                            onClick={() => handleToggleBatch(b.id)}
                            divider
                          >
                            <ListItemIcon>
                              <Checkbox
                                edge="start"
                                checked={
                                  selectedPrintBatchIds.indexOf(b.id) !== -1
                                }
                                tabIndex={-1}
                                disableRipple
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={b.batch_number}
                              secondary={
                                b.expiry_date
                                  ? `Exp: ${b.expiry_date}`
                                  : "No Expiry"
                              }
                            />
                          </ListItemButton>
                        ))}
                      </List>
                    </Paper>
                  )}
                </>
              )}

              {/* --- SERIAL LIST UI --- */}
              {printScope === "serial" && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Select Serials to Print
                    {availableSerials.length > 0 &&
                      ` (${selectedSerialIds.length}/${availableSerials.length})`}
                  </Typography>

                  {filterBatchId === "" ? (
                    <Box
                      display="flex"
                      flex={1}
                      alignItems="center"
                      justifyContent="center"
                      color="text.secondary"
                      textAlign="center"
                      p={2}
                    >
                      <Typography variant="body2">
                        Please select a Batch Filter on the left to view
                        available serials.
                      </Typography>
                    </Box>
                  ) : availableSerials.length === 0 ? (
                    <Box
                      display="flex"
                      flex={1}
                      alignItems="center"
                      justifyContent="center"
                      color="text.secondary"
                    >
                      <Typography variant="body2">No serials found.</Typography>
                    </Box>
                  ) : (
                    <Paper
                      variant="outlined"
                      sx={{ flex: 1, overflow: "auto", mt: 1, maxHeight: 400 }}
                    >
                      <List dense disablePadding>
                        <ListItemButton
                          onClick={handleSelectAllSerials}
                          divider
                        >
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={
                                availableSerials.length > 0 &&
                                selectedSerialIds.length ===
                                  availableSerials.length
                              }
                              indeterminate={
                                selectedSerialIds.length > 0 &&
                                selectedSerialIds.length <
                                  availableSerials.length
                              }
                              tabIndex={-1}
                              disableRipple
                            />
                          </ListItemIcon>
                          <ListItemText primary="Select All" />
                        </ListItemButton>

                        {availableSerials.map((s) => (
                          <ListItemButton
                            key={s.id}
                            onClick={() => handleToggleSerial(s.id)}
                            divider
                          >
                            <ListItemIcon>
                              <Checkbox
                                edge="start"
                                checked={selectedSerialIds.indexOf(s.id) !== -1}
                                tabIndex={-1}
                                disableRipple
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={s.serial_number}
                              secondary={
                                s.status ? `Status: ${s.status}` : null
                              }
                            />
                          </ListItemButton>
                        ))}
                      </List>
                    </Paper>
                  )}
                </>
              )}
            </Box>
          )}
        </Box>
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
            (printScope === "batch" && selectedPrintBatchIds.length === 0) ||
            (printScope === "serial" && selectedSerialIds.length === 0)
          }
        >
          {printing ? "Printing..." : "Print"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
