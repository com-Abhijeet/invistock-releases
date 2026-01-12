"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Chip,
} from "@mui/material";
import { Printer, Info } from "lucide-react";
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

// Extend LabelItem to support our UI state
interface ExtendedLabelItem extends LabelItem {
  printQuantity: number;
  printMode: "product" | "batch" | "serial"; // Expanded to support Serial
  serial_numbers?: string; // Comma separated list from backend
}

export default function BulkLabelPrintModal({
  open,
  onClose,
  purchaseId,
}: Props) {
  const [items, setItems] = useState<ExtendedLabelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false); // Added missing state

  // Fetch data when modal opens
  useEffect(() => {
    if (open && purchaseId) {
      setLoading(true);
      fetchPurchaseItemsForLabels(purchaseId)
        .then((data) => {
          // Initialize state with smart defaults
          const initialized: ExtendedLabelItem[] = data.map((i: any) => {
            let defaultMode: "product" | "batch" | "serial" = "product";

            // Default to the most specific available tracking type
            if (i.tracking_type === "serial") defaultMode = "serial";
            else if (i.tracking_type === "batch") defaultMode = "batch";

            return {
              ...i,
              printQuantity: i.purchase_quantity,
              printMode: defaultMode,
              // Ensure we capture these fields from the raw API response
              serial_numbers: i.serial_numbers,
              batch_uid: i.batch_uid,
              batch_number: i.batch_number, // Ensure batch_number is captured
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

  const handleQtyChange = (index: number, val: string) => {
    const newQty = Math.max(0, parseInt(val) || 0);
    const updated = [...items];
    updated[index].printQuantity = newQty;
    setItems(updated);
  };

  const handleModeChange = (
    index: number,
    val: "product" | "batch" | "serial"
  ) => {
    const updated = [...items];
    updated[index].printMode = val;
    setItems(updated);
  };

  const handlePrint = async () => {
    if (!ipcRenderer) return toast.error("Printer not available");

    setPrinting(true);

    // Flatten logic: Convert UI rows into print jobs
    const itemsToPrint: any[] = [];

    items.forEach((item) => {
      if (item.printQuantity <= 0) return;

      // Helper to ensure a valid batch UID is always present for the barcode generator
      // Logic matches LabelPrintModal: batch_uid > batch_number > BAT-{fallback}
      const safeBatchUid =
        item.batch_uid || item.batch_number || `BAT-PUR${purchaseId}`;

      // CASE 1: SERIAL MODE
      // If user wants serial labels, we must generate unique barcodes for each unit.
      if (item.printMode === "serial") {
        // Split serials string (e.g. "SN1, SN2, SN3")
        const serialList = (item.serial_numbers || "")
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter((s) => s !== "");

        // If no serials found (e.g. legacy data), we can't print unique serials.
        if (serialList.length === 0) {
          toast.error(
            `No serial numbers found for ${item.name}. Printing generic batch labels.`
          );
          // Fallback to Batch logic
          const productShim = {
            id: item.id,
            tracking_type: "batch",
            barcode: item.barcode,
            product_code: item.product_code,
          } as any;
          const batchShim = { batch_uid: safeBatchUid };
          itemsToPrint.push({
            ...item,
            printQuantity: item.printQuantity,
            customBarcode: generateTrackingBarcode(productShim, batchShim),
          });
          return;
        }

        // Determine how many serials to print based on user's quantity input
        // Standard behavior: Print first N serials. If quantity > serials, we cycle.
        const countToPrint = item.printQuantity;

        for (let i = 0; i < countToPrint; i++) {
          const sn = serialList[i % serialList.length];

          // Construct Product & Batch Shims for the generator
          const productShim = {
            id: item.id,
            tracking_type: "serial", // Force generator to use serial logic
            barcode: item.barcode,
            product_code: item.product_code,
          } as any;

          const batchShim = { batch_uid: safeBatchUid };
          const serialShim = { serial_number: sn };

          itemsToPrint.push({
            ...item,
            printQuantity: 1, // 1 label per specific serial iteration
            customBarcode: generateTrackingBarcode(
              productShim,
              batchShim,
              serialShim
            ),
          });
        }
      }
      // CASE 2: BATCH or PRODUCT MODE
      else {
        // Prepare Product Shim
        const productShim = {
          id: item.id,
          // If printing 'product' mode, tell generator 'none' to force standard barcode
          // If printing 'batch' mode, tell generator 'batch' to get Batch UID
          tracking_type: item.printMode === "batch" ? "batch" : "none",
          barcode: item.barcode,
          product_code: item.product_code,
        } as any;

        const batchShim = { batch_uid: safeBatchUid };

        itemsToPrint.push({
          ...item,
          printQuantity: item.printQuantity, // Bulk print identical labels
          customBarcode: generateTrackingBarcode(productShim, batchShim),
        });
      }
    });

    if (itemsToPrint.length === 0) {
      setPrinting(false);
      return toast.error("No valid labels to print");
    }

    toast.loading(`Generating ${itemsToPrint.length} unique print jobs...`);

    try {
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
      <DialogContent dividers>
        {loading ? (
          <KoshSpinningLoader />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Tracking</TableCell>
                <TableCell width={220}>Barcode Type</TableCell>
                <TableCell align="center" sx={{ width: 100 }}>
                  Qty
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, idx) => {
                // Modified Logic: Show options based on Configured Tracking Type
                const isBatchTracked = item.tracking_type === "batch";
                const isSerialTracked = item.tracking_type === "serial";
                const isTracked = isBatchTracked || isSerialTracked;

                return (
                  <TableRow key={idx}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {item.name}
                      </Typography>
                      {item.batch_number && (
                        <Typography variant="caption" color="text.secondary">
                          Batch: {item.batch_number}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{item.product_code}</TableCell>
                    <TableCell>
                      {isTracked ? (
                        <Chip
                          label={item.tracking_type?.toUpperCase()}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontSize: "10px" }}
                        />
                      ) : (
                        <span style={{ color: "#999" }}>-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isTracked ? (
                        <>
                          <FormControl size="small" fullWidth>
                            <Select
                              value={item.printMode}
                              onChange={(e) =>
                                handleModeChange(
                                  idx,
                                  e.target.value as
                                    | "product"
                                    | "batch"
                                    | "serial"
                                )
                              }
                              sx={{ fontSize: "0.85rem", height: 32 }}
                            >
                              <MenuItem value="product">
                                Product (Standard)
                              </MenuItem>

                              {(isBatchTracked || isSerialTracked) && (
                                <MenuItem value="batch">
                                  Batch Code{" "}
                                  {item.batch_uid
                                    ? `(${item.batch_uid})`
                                    : "(Auto)"}
                                </MenuItem>
                              )}

                              {isSerialTracked && (
                                <MenuItem value="serial">
                                  Serial Numbers (Unique)
                                </MenuItem>
                              )}
                            </Select>
                          </FormControl>
                          {item.printMode === "serial" && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              mt={0.5}
                              fontSize="0.7rem"
                            >
                              <Info
                                size={10}
                                style={{ display: "inline", marginRight: 2 }}
                              />
                              Prints unique barcode for each serial
                            </Typography>
                          )}
                        </>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Standard Only
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        type="number"
                        size="small"
                        value={item.printQuantity}
                        onChange={(e) => handleQtyChange(idx, e.target.value)}
                        inputProps={{ min: 0, style: { textAlign: "center" } }}
                        helperText={
                          item.printMode === "serial"
                            ? `Max: ${item.purchase_quantity}`
                            : ""
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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