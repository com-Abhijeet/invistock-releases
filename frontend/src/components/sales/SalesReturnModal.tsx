"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  TextField,
  Typography,
  Box,
} from "@mui/material";
import { SalePayload } from "../../lib/types/salesTypes";
import { api } from "../../lib/api/api";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sale: SalePayload;
}

export default function SalesReturnModal({
  open,
  onClose,
  onSuccess,
  sale,
}: Props) {
  // Track return quantity and "return to stock" status for each item
  // Structure: { [productId]: { qty: 0, returnToStock: true } }
  const [returnState, setReturnState] = useState<
    Record<number, { qty: number; returnToStock: boolean }>
  >({});
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleQtyChange = (itemId: number, maxQty: number, val: string) => {
    const qty = Math.min(Math.max(0, Number(val)), maxQty);
    setReturnState((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], qty },
    }));
  };

  const handleStockToggle = (itemId: number, checked: boolean) => {
    setReturnState((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || { qty: 0 }), returnToStock: checked },
    }));
  };

  const calculateRefundTotal = () => {
    let total = 0;
    sale.items.forEach((item) => {
      const state = returnState[item.product_id];
      if (state && state.qty > 0) {
        // Use item.price (total price) / item.quantity (original qty) to get unit price effectively
        const unitPrice = item.price / item.quantity;
        total += unitPrice * state.qty;
      }
    });
    return total;
  };

  const handleSubmit = async () => {
    const returnItems = sale.items
      .filter((item) => returnState[item.product_id]?.qty > 0)
      .map((item) => ({
        product_id: item.product_id,
        quantity: returnState[item.product_id].qty,
        returnToStock: returnState[item.product_id]?.returnToStock ?? true,
        price: (item.price / item.quantity) * returnState[item.product_id].qty, // Refund amount for these items
      }));

    if (returnItems.length === 0) return toast.error("Select items to return.");

    setLoading(true);
    try {
      await api.post("/api/sales/return", {
        saleId: sale.id,
        returnItems,
        note,
      });
      toast.success("Return processed successfully");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to process return");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Process Return / Credit Note</DialogTitle>
      <DialogContent dividers>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell align="right">Sold Qty</TableCell>
              <TableCell align="right" sx={{ width: 100 }}>
                Return Qty
              </TableCell>
              <TableCell align="center">Restock?</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sale.items.map((item) => (
              <TableRow key={item.product_id}>
                <TableCell>{item.product_name}</TableCell>
                <TableCell align="right">{item.quantity}</TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    size="small"
                    value={returnState[item.product_id]?.qty || 0}
                    onChange={(e) =>
                      handleQtyChange(
                        item.product_id,
                        item.quantity,
                        e.target.value
                      )
                    }
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    checked={
                      returnState[item.product_id]?.returnToStock ?? true
                    }
                    onChange={(e) =>
                      handleStockToggle(item.product_id, e.target.checked)
                    }
                    title="Uncheck if item is damaged (won't add to stock)"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Box
          mt={3}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <TextField
            label="Reason / Note"
            size="small"
            sx={{ width: "60%" }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Typography variant="h6" color="error">
            Refund: ₹{Math.round(calculateRefundTotal()).toLocaleString()}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="error"
          disabled={loading}
        >
          Confirm Return
        </Button>
      </DialogActions>
    </Dialog>
  );
}
