"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { useState } from "react";
import toast from "react-hot-toast";
import type { Product } from "../lib/types/product"; // Adjust path as needed

type Props = {
  open: boolean;
  onClose: () => void;
  // The component now accepts the full product object
  product: Product | null;
};

// Get the ipcRenderer exposed by your preload script
const { ipcRenderer } = window.electron;

export default function LabelPrintDialog({ open, onClose, product }: Props) {
  const [copies, setCopies] = useState(1);
  const shop = JSON.parse(localStorage.getItem("shop") || "{}"); // Get shop settings from your global context

  if (!product) {
    return null;
  }

  const handlePrint = () => {
    if (!shop) {
      toast.error("Shop settings are not available. Cannot print.");
      return;
    }
    if (!ipcRenderer) {
      toast.error("Desktop printing features are not available.");
      return;
    }

    // Loop and send the print command to the Electron backend for each copy
    for (let i = 0; i < copies; i++) {
      ipcRenderer.send("print-label", { product, shop, copies });
    }

    // Close the dialog after sending the print jobs
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Print Product Label</DialogTitle>
      <DialogContent>
        <TextField
          type="number"
          label="Number of Copies"
          fullWidth
          margin="normal"
          inputProps={{ min: 1 }}
          value={copies}
          onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
          autoFocus
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handlePrint} variant="contained">
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
}
