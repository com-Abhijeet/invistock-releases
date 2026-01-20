"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  Typography,
  Chip,
  Box,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  List,
  ListItemButton,
  ListItemIcon,
  Checkbox,
  ListItemText,
  Divider,
} from "@mui/material";
import { Printer, Package, ScanBarcode, Tag } from "lucide-react";
import toast from "react-hot-toast";
import {
  fetchPurchaseItemsForLabels,
  LabelItem,
} from "../lib/api/purchaseService";
import KoshSpinningLoader from "./KoshSpinningLoader";
import { generateTrackingBarcode } from "../lib/generateTrackingBarcode";

// Safety check for Electron
// @ts-ignore
const ipcRenderer = window.electron?.ipcRenderer;

interface Props {
  open: boolean;
  onClose: () => void;
  purchaseId: number | null;
}

// Extend LabelItem to support our complex UI state per item
interface ExtendedLabelItem extends LabelItem {
  printMode: "product" | "batch" | "serial";
  parsedSerials: string[]; // List of available serials from backend string
  selectedSerials: string[]; // List of serials selected for printing
  customQuantity: number; // Quantity for Product/Batch mode
  copies: number; // Copies per label
}

export default function BulkLabelPrintModal({
  open,
  onClose,
  purchaseId,
}: Props) {
  const [items, setItems] = useState<ExtendedLabelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);

  // Fetch data when modal opens
  useEffect(() => {
    if (open && purchaseId) {
      setLoading(true);
      fetchPurchaseItemsForLabels(purchaseId)
        .then((data) => {
          // Initialize state
          const initialized: ExtendedLabelItem[] = data.map((i: any) => {
            let defaultMode: "product" | "batch" | "serial" = "product";

            if (i.tracking_type === "serial") defaultMode = "serial";
            else if (i.tracking_type === "batch") defaultMode = "batch";

            // Parse serials string into array
            const serialList = (i.serial_numbers || "")
              .split(/[\n,]+/)
              .map((s: string) => s.trim())
              .filter((s: string) => s !== "");

            return {
              ...i,
              printMode: defaultMode,
              parsedSerials: serialList,
              selectedSerials: serialList, // Default select all
              customQuantity: i.purchase_quantity, // Default to full qty
              copies: 1,
              tracking_type: i.tracking_type || "none",
            };
          });
          setItems(initialized);
        })
        .catch((err) => {
          console.error(err);
          toast.error("Failed to load items");
        })
        .finally(() => setLoading(false));
    }
  }, [open, purchaseId]);

  // --- UPDATE HANDLERS ---
  const updateItem = (index: number, updates: Partial<ExtendedLabelItem>) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], ...updates };
      return newItems;
    });
  };

  const handleToggleSerial = (index: number, serial: string) => {
    const item = items[index];
    const currentSelected = item.selectedSerials;
    const isSelected = currentSelected.includes(serial);

    let newSelected;
    if (isSelected) {
      newSelected = currentSelected.filter((s) => s !== serial);
    } else {
      newSelected = [...currentSelected, serial];
    }
    updateItem(index, { selectedSerials: newSelected });
  };

  const handleSelectAllSerials = (index: number) => {
    const item = items[index];
    if (item.selectedSerials.length === item.parsedSerials.length) {
      updateItem(index, { selectedSerials: [] });
    } else {
      updateItem(index, { selectedSerials: [...item.parsedSerials] });
    }
  };

  const handlePrint = async () => {
    if (!ipcRenderer) return toast.error("Printer not available");

    setPrinting(true);

    const itemsToPrint: any[] = [];

    items.forEach((item) => {
      // Logic from LabelPrintModal adapted for Bulk
      const safeBatchUid =
        item.batch_uid || item.batch_number || `BAT-PUR${purchaseId}`;

      // CASE 1: SERIAL MODE
      if (item.printMode === "serial") {
        if (item.selectedSerials.length === 0) return; // Skip if none selected

        item.selectedSerials.forEach((sn) => {
          const productShim = {
            id: item.id,
            tracking_type: "serial",
            barcode: item.barcode,
            product_code: item.product_code,
          } as any;

          const batchShim = { batch_uid: safeBatchUid };
          const serialShim = { serial_number: sn };

          itemsToPrint.push({
            ...item,
            printQuantity: 1, // 1 label per serial
            copies: item.copies, // Apply copies per label
            customBarcode: generateTrackingBarcode(
              productShim,
              batchShim,
              serialShim,
            ),
          });
        });
      }
      // CASE 2: BATCH or PRODUCT MODE
      else {
        if (item.customQuantity <= 0) return;

        const productShim = {
          id: item.id,
          tracking_type: item.printMode === "batch" ? "batch" : "none",
          barcode: item.barcode,
          product_code: item.product_code,
        } as any;

        const batchShim = { batch_uid: safeBatchUid };

        itemsToPrint.push({
          ...item,
          printQuantity: item.customQuantity,
          copies: item.copies,
          customBarcode: generateTrackingBarcode(productShim, batchShim),
        });
      }
    });

    if (itemsToPrint.length === 0) {
      setPrinting(false);
      return toast.error("No valid labels selected");
    }

    toast.loading(`Generating ${itemsToPrint.length} print jobs...`);

    try {
      // We reuse the existing bulk print IPC handler
      // It expects an array of objects with { ...item, printQuantity, customBarcode }
      // We added 'copies' property, ensure your main.js handler respects it or loops it.
      // If main.js 'print-bulk-labels' doesn't handle 'copies', we might need to loop here.
      // Assuming standard implementation prints 'printQuantity' labels.
      // For Serial: printQuantity is 1, so we get 1 label per serial.

      const res = await ipcRenderer.invoke("print-bulk-labels", itemsToPrint);
      toast.dismiss();
      setPrinting(false);
      if (res.success) {
        toast.success("Labels sent to printer!");
        onClose();
      } else {
        toast.error("Print failed: " + res.error);
      }
    } catch (e) {
      toast.dismiss();
      setPrinting(false);
      toast.error("Print error");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Print Labels from Purchase</DialogTitle>
      <DialogContent dividers sx={{ bgcolor: "#F9FAFB", p: 2 }}>
        {loading ? (
          <KoshSpinningLoader />
        ) : (
          <Stack spacing={2}>
            {items.map((item, idx) => (
              <BulkPrintItemCard
                key={idx}
                item={item}
                index={idx}
                onUpdate={updateItem}
                onToggleSerial={handleToggleSerial}
                onSelectAllSerials={handleSelectAllSerials}
              />
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={printing}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<Printer size={18} />}
          onClick={handlePrint}
          disabled={printing}
        >
          {printing ? "Printing..." : "Print Labels"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// --- SUB-COMPONENT: The Card (Repeated N times) ---
function BulkPrintItemCard({
  item,
  index,
  onUpdate,
  onToggleSerial,
  onSelectAllSerials,
}: {
  item: ExtendedLabelItem;
  index: number;
  onUpdate: (index: number, updates: Partial<ExtendedLabelItem>) => void;
  onToggleSerial: (index: number, serial: string) => void;
  onSelectAllSerials: (index: number) => void;
}) {
  const isTracked =
    item.tracking_type === "batch" || item.tracking_type === "serial";
  const isSerial = item.tracking_type === "serial";
  const showRightPanel = item.printMode === "serial";

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ display: "flex", flexDirection: "row" }}>
        {/* LEFT COLUMN: Controls */}
        <Box sx={{ flex: 1, p: 2 }}>
          <Stack spacing={2}>
            {/* Header Info */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>
                {item.name}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                mt={0.5}
                flexWrap="wrap"
              >
                <Chip
                  label={item.product_code}
                  size="small"
                  variant="outlined"
                />
                {item.batch_number && (
                  <Chip
                    label={`Batch: ${item.batch_number}`}
                    size="small"
                    color="info"
                    variant="filled"
                  />
                )}
                {isTracked && (
                  <Chip
                    label={item.tracking_type?.toUpperCase()}
                    size="small"
                    color="primary"
                    sx={{ fontSize: "10px", height: 20 }}
                  />
                )}
              </Stack>
            </Box>

            <Divider />

            {/* Scope Toggle */}
            <FormControl fullWidth size="small">
              <ToggleButtonGroup
                value={item.printMode}
                exclusive
                onChange={(_, val) =>
                  val && onUpdate(index, { printMode: val })
                }
                color="primary"
                fullWidth
                size="small"
              >
                <ToggleButton value="product" sx={{ py: 0.5 }}>
                  <Stack direction="row" gap={1} alignItems="center">
                    <Tag size={14} /> Product
                  </Stack>
                </ToggleButton>
                {isTracked && (
                  <ToggleButton value="batch" sx={{ py: 0.5 }}>
                    <Stack direction="row" gap={1} alignItems="center">
                      <Package size={14} /> Batch
                    </Stack>
                  </ToggleButton>
                )}
                {isSerial && (
                  <ToggleButton value="serial" sx={{ py: 0.5 }}>
                    <Stack direction="row" gap={1} alignItems="center">
                      <ScanBarcode size={14} /> Serial
                    </Stack>
                  </ToggleButton>
                )}
              </ToggleButtonGroup>
            </FormControl>

            {/* Inputs */}
            <Stack direction="row" spacing={2}>
              {/* Quantity Input (Hidden for Serial Mode, uses selection count) */}
              {item.printMode !== "serial" && (
                <TextField
                  type="number"
                  label="Quantity"
                  size="small"
                  fullWidth
                  value={item.customQuantity}
                  onChange={(e) =>
                    onUpdate(index, {
                      customQuantity: parseInt(e.target.value) || 0,
                    })
                  }
                  inputProps={{ min: 0 }}
                />
              )}

              {/* Copies Input */}
              <TextField
                type="number"
                label="Copies"
                size="small"
                fullWidth
                value={item.copies}
                onChange={(e) =>
                  onUpdate(index, { copies: parseInt(e.target.value) || 1 })
                }
                inputProps={{ min: 1 }}
                helperText="Per Label"
              />
            </Stack>
          </Stack>
        </Box>

        {/* RIGHT COLUMN: Selection List (Serial Mode Only) */}
        {showRightPanel && (
          <Box
            sx={{
              flex: 1,
              borderLeft: "1px solid",
              borderColor: "divider",
              bgcolor: "#FAFAFA",
              display: "flex",
              flexDirection: "column",
              maxHeight: 280, // Limit height of the card
            }}
          >
            <Box
              p={1}
              px={2}
              borderBottom="1px solid"
              borderColor="divider"
              bgcolor="white"
            >
              <Typography variant="caption" fontWeight={600} color="primary">
                Select Serials ({item.selectedSerials.length} /{" "}
                {item.parsedSerials.length})
              </Typography>
            </Box>

            {item.parsedSerials.length === 0 ? (
              <Box
                flex={1}
                display="flex"
                alignItems="center"
                justifyContent="center"
                p={2}
              >
                <Typography variant="caption" color="text.secondary">
                  No serials found.
                </Typography>
              </Box>
            ) : (
              <List dense disablePadding sx={{ overflow: "auto", flex: 1 }}>
                <ListItemButton
                  onClick={() => onSelectAllSerials(index)}
                  divider
                  dense
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Checkbox
                      edge="start"
                      checked={
                        item.selectedSerials.length ===
                          item.parsedSerials.length &&
                        item.parsedSerials.length > 0
                      }
                      indeterminate={
                        item.selectedSerials.length > 0 &&
                        item.selectedSerials.length < item.parsedSerials.length
                      }
                      tabIndex={-1}
                      disableRipple
                      size="small"
                    />
                  </ListItemIcon>
                  <ListItemText primary="Select All" />
                </ListItemButton>

                {item.parsedSerials.map((sn) => (
                  <ListItemButton
                    key={sn}
                    onClick={() => onToggleSerial(index, sn)}
                    divider
                    dense
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Checkbox
                        edge="start"
                        checked={item.selectedSerials.includes(sn)}
                        tabIndex={-1}
                        disableRipple
                        size="small"
                      />
                    </ListItemIcon>
                    <ListItemText primary={sn} />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
}
