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
} from "@mui/material";
import { Printer } from "lucide-react";
import toast from "react-hot-toast";
import {
  fetchPurchaseItemsForLabels,
  LabelItem,
} from "../lib/api/purchaseService";
import KoshSpinningLoader from "./KoshSpinningLoader";

const { ipcRenderer } = window.electron;

interface Props {
  open: boolean;
  onClose: () => void;
  purchaseId: number | null;
}

export default function BulkLabelPrintModal({
  open,
  onClose,
  purchaseId,
}: Props) {
  const [items, setItems] = useState<LabelItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch data when modal opens
  useEffect(() => {
    if (open && purchaseId) {
      setLoading(true);
      fetchPurchaseItemsForLabels(purchaseId)
        .then((data) => {
          // Default print quantity = purchase quantity
          const initialized = data.map((i) => ({
            ...i,
            printQuantity: i.purchase_quantity,
          }));
          setItems(initialized);
        })
        .catch(() => toast.error("Failed to load items"))
        .finally(() => setLoading(false));
    }
  }, [open, purchaseId]);

  const handleQtyChange = (index: number, val: string) => {
    const newQty = Math.max(0, parseInt(val) || 0);
    const updated = [...items];
    updated[index].printQuantity = newQty;
    setItems(updated);
  };

  const handlePrint = async () => {
    const itemsToPrint = items.filter((i) => (i.printQuantity || 0) > 0);
    if (itemsToPrint.length === 0) return toast.error("No labels to print");

    toast.loading("Sending to printer...");
    try {
      const res = await ipcRenderer.invoke("print-bulk-labels", itemsToPrint);
      toast.dismiss();
      if (res.success) {
        toast.success("Labels sent to printer!");
        onClose();
      } else {
        toast.error("Print failed: " + res.error);
      }
    } catch (e) {
      toast.dismiss();
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
                <TableCell align="center">Purchased</TableCell>
                <TableCell align="center" sx={{ width: 120 }}>
                  Print Qty
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.product_code}</TableCell>
                  <TableCell align="center">{item.purchase_quantity}</TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      size="small"
                      value={item.printQuantity}
                      onChange={(e) => handleQtyChange(idx, e.target.value)}
                      inputProps={{ min: 0 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={<Printer size={18} />}
          onClick={handlePrint}
        >
          Print Labels
        </Button>
      </DialogActions>
    </Dialog>
  );
}
