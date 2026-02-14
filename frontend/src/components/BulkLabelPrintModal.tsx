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
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Divider,
  IconButton,
  Collapse,
} from "@mui/material";
import {
  Printer,
  Package,
  ScanBarcode,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  fetchPurchaseItemsForLabels,
  LabelItem,
} from "../lib/api/purchaseService";
import KoshSpinningLoader from "./KoshSpinningLoader";
// Keep this as fallback only if absolutely needed, but we prioritize DB values now

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
  batch_barcode?: string; // Explicitly map this from API
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
          const initialized: ExtendedLabelItem[] = data.map((i: any) => {
            let defaultMode: "product" | "batch" | "serial" = "product";

            // Smart Default: If tracked, default to that mode
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
              customQuantity: i.purchase_quantity || 1, // Default to full qty
              copies: 1,
              tracking_type: i.tracking_type || "none",
              // Ensure we capture the batch barcode if the API provides it
              batch_barcode: i.batch_barcode || i.barcode,
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

  console.log("items to print", items);

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

  const handleSelectAllSerials = (index: number, select: boolean) => {
    const item = items[index];
    updateItem(index, {
      selectedSerials: select ? [...item.parsedSerials] : [],
    });
  };

  // Calculate Total Labels for the Footer Summary
  const totalLabels = useMemo(() => {
    return items.reduce((acc, item) => {
      const copies = item.copies || 1;
      let qty = 0;
      if (item.printMode === "serial") {
        qty = item.selectedSerials.length;
      } else {
        qty = item.customQuantity || 0;
      }
      return acc + qty * copies;
    }, 0);
  }, [items]);

  const handlePrint = async () => {
    if (!ipcRenderer) return toast.error("Printer not available");

    setPrinting(true);
    const itemsToPrint: any[] = [];

    items.forEach((item) => {
      // 1. Determine Barcode & Label based on Mode
      // User Request: Use ACTUAL batch barcode, not generated.

      // SERIAL MODE
      if (item.printMode === "serial") {
        if (item.selectedSerials.length === 0) return;

        item.selectedSerials.forEach((sn) => {
          itemsToPrint.push({
            ...item,
            printQuantity: 1, // 1 label per serial logic
            copies: item.copies,
            customBarcode: sn, // The Serial IS the barcode
            label: `${item.name} (SN: ${sn})`,
          });
        });
      }
      // BATCH MODE
      else if (item.printMode === "batch") {
        if (item.customQuantity <= 0) return;

        // Priority: Batch Barcode > Batch Number > Batch UID > Fallback Gen
        const batchCode = item.batch_barcode;
        console.log("product barcode =", batchCode);

        itemsToPrint.push({
          ...item,
          printQuantity: item.customQuantity,
          copies: item.copies,
          customBarcode: batchCode,
          label: `${item.name} (Batch: ${item.batch_number})`,
        });
      }
      // PRODUCT MODE
      else {
        if (item.customQuantity <= 0) return;

        const productCode =
          item.barcode || item.product_code || `PROD-${item.id}`;

        itemsToPrint.push({
          ...item,
          printQuantity: item.customQuantity,
          copies: item.copies,
          customBarcode: productCode,
          label: item.name,
        });
      }
    });

    if (itemsToPrint.length === 0) {
      setPrinting(false);
      return toast.error("No labels selected to print");
    }

    toast.loading(`Sending ${itemsToPrint.length} jobs to printer...`);
    try {
      const res = await ipcRenderer.invoke("print-bulk-labels", itemsToPrint);
      toast.dismiss();
      setPrinting(false);
      if (res.success) {
        toast.success("Print job sent successfully!");
        onClose();
      } else {
        toast.error("Print failed: " + res.error);
      }
    } catch (e) {
      toast.dismiss();
      setPrinting(false);
      console.error(e);
      toast.error("Printer communication error");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Print Labels
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Purchase Order #{purchaseId}
            </Typography>
          </Box>
          <Chip
            icon={<Printer size={14} />}
            label={`${totalLabels} Labels Total`}
            color="primary"
            variant="filled"
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ bgcolor: "#F3F4F6", p: 2 }}>
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
            {items.length === 0 && (
              <Box textAlign="center" py={5}>
                <Typography color="text.secondary">
                  No items found in this purchase.
                </Typography>
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, bgcolor: "white" }}>
        <Stack
          direction="row"
          width="100%"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="body2" color="text.secondary">
            Make sure printer is connected and calibrated.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button onClick={onClose} disabled={printing} color="inherit">
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<Printer size={18} />}
              onClick={handlePrint}
              disabled={printing || totalLabels === 0}
              sx={{ px: 4 }}
            >
              {printing ? "Printing..." : `Print ${totalLabels} Labels`}
            </Button>
          </Stack>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

// --- SUB-COMPONENT: Item Card ---
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
  onSelectAllSerials: (index: number, select: boolean) => void;
}) {
  const isTracked = ["batch", "serial"].includes(item.tracking_type || "");
  const isSerial = item.tracking_type === "serial";
  const [expanded, setExpanded] = useState(true);

  // Styling for the Mode Toggle
  const toggleSx = {
    py: 0.5,
    px: 2,
    textTransform: "none",
    fontWeight: 500,
    fontSize: "0.85rem",
    "&.Mui-selected": {
      bgcolor: "primary.soft",
      color: "primary.main",
      borderColor: "primary.main",
    },
  };

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        overflow: "hidden",
        borderRadius: 2,
        borderColor: "divider",
        transition: "all 0.2s",
        "&:hover": {
          borderColor: "primary.light",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        },
      }}
    >
      {/* Header Row */}
      <Box sx={{ p: 2, bgcolor: "white" }}>
        <Stack direction="row" alignItems="start" spacing={2}>
          {/* Icon Box */}
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: isSerial
                ? "purple.50"
                : isTracked
                  ? "orange.50"
                  : "blue.50",
              color: isSerial
                ? "purple.600"
                : isTracked
                  ? "orange.600"
                  : "blue.600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isSerial ? (
              <ScanBarcode size={20} />
            ) : isTracked ? (
              <Package size={20} />
            ) : (
              <Tag size={20} />
            )}
          </Box>

          <Box sx={{ flex: 1 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box>
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  lineHeight={1.2}
                >
                  {item.name}
                </Typography>
                <Stack direction="row" spacing={1} mt={0.5}>
                  <Typography
                    variant="caption"
                    sx={{
                      bgcolor: "grey.100",
                      px: 0.8,
                      borderRadius: 0.5,
                      fontFamily: "monospace",
                    }}
                  >
                    {item.product_code || "No Code"}
                  </Typography>
                  {item.batch_number && (
                    <Typography
                      variant="caption"
                      sx={{
                        bgcolor: "orange.50",
                        color: "orange.800",
                        px: 0.8,
                        borderRadius: 0.5,
                      }}
                    >
                      Batch: {item.batch_number}
                    </Typography>
                  )}
                </Stack>
              </Box>
              <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </IconButton>
            </Stack>
          </Box>
        </Stack>

        <Collapse in={expanded}>
          <Box mt={2}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={3}
              alignItems="start"
            >
              {/* Left: Mode Selection */}
              <Box flex={1} width="100%">
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.secondary"
                  mb={1}
                  display="block"
                >
                  PRINT TARGET
                </Typography>
                <ToggleButtonGroup
                  value={item.printMode}
                  exclusive
                  onChange={(_, val) =>
                    val && onUpdate(index, { printMode: val })
                  }
                  size="small"
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  <ToggleButton value="product" sx={toggleSx}>
                    Product
                  </ToggleButton>
                  {isTracked && (
                    <ToggleButton value="batch" sx={toggleSx}>
                      Batch
                    </ToggleButton>
                  )}
                  {isSerial && (
                    <ToggleButton value="serial" sx={toggleSx}>
                      Serials
                    </ToggleButton>
                  )}
                </ToggleButtonGroup>

                {/* Conditional Inputs */}
                {item.printMode !== "serial" ? (
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Total Labels"
                      type="number"
                      size="small"
                      fullWidth
                      value={item.customQuantity}
                      onChange={(e) =>
                        onUpdate(index, {
                          customQuantity: Math.max(
                            0,
                            parseInt(e.target.value) || 0,
                          ),
                        })
                      }
                      InputProps={{
                        endAdornment: (
                          <Typography variant="caption" color="text.secondary">
                            Qty
                          </Typography>
                        ),
                      }}
                    />
                    <TextField
                      label="Copies"
                      type="number"
                      size="small"
                      fullWidth
                      value={item.copies}
                      onChange={(e) =>
                        onUpdate(index, {
                          copies: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      InputProps={{
                        endAdornment: (
                          <Typography variant="caption" color="text.secondary">
                            Each
                          </Typography>
                        ),
                      }}
                    />
                  </Stack>
                ) : (
                  <TextField
                    label="Copies Per Serial"
                    type="number"
                    size="small"
                    fullWidth
                    value={item.copies}
                    onChange={(e) =>
                      onUpdate(index, {
                        copies: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                  />
                )}
              </Box>

              {/* Right: Serial Selection (Only for Serial Mode) */}
              {item.printMode === "serial" && (
                <Box
                  flex={1.5}
                  width="100%"
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 1.5,
                    bgcolor: "grey.50",
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={1}
                  >
                    <Typography variant="caption" fontWeight={700}>
                      SELECT SERIALS ({item.selectedSerials.length}/
                      {item.parsedSerials.length})
                    </Typography>
                    <Stack direction="row" spacing={0.5}>
                      <Button
                        size="small"
                        variant="text"
                        sx={{ fontSize: "0.7rem", minWidth: "auto", p: 0.5 }}
                        onClick={() => onSelectAllSerials(index, true)}
                      >
                        All
                      </Button>
                      <Typography variant="caption" color="text.disabled">
                        |
                      </Typography>
                      <Button
                        size="small"
                        variant="text"
                        sx={{ fontSize: "0.7rem", minWidth: "auto", p: 0.5 }}
                        onClick={() => onSelectAllSerials(index, false)}
                      >
                        None
                      </Button>
                    </Stack>
                  </Stack>

                  <Box
                    sx={{
                      maxHeight: 150,
                      overflowY: "auto",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 0.5,
                    }}
                  >
                    {item.parsedSerials.length === 0 ? (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ p: 1 }}
                      >
                        No serials available.
                      </Typography>
                    ) : (
                      item.parsedSerials.map((sn) => {
                        const isSelected = item.selectedSerials.includes(sn);
                        return (
                          <Chip
                            key={sn}
                            label={sn}
                            size="small"
                            onClick={() => onToggleSerial(index, sn)}
                            variant={isSelected ? "filled" : "outlined"}
                            color={isSelected ? "primary" : "default"}
                            sx={{
                              borderRadius: 1,
                              height: 24,
                              fontSize: "0.75rem",
                              bgcolor: isSelected ? "primary.main" : "white",
                            }}
                          />
                        );
                      })
                    )}
                  </Box>
                </Box>
              )}
            </Stack>
          </Box>
        </Collapse>
      </Box>
    </Paper>
  );
}
