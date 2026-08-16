"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
} from "@mui/material";
import { Plus, Zap, Hash } from "lucide-react";
import toast from "react-hot-toast";

import { Product } from "../../lib/types/product";
import { addSerialsToBatch } from "../../lib/api/batchService";
import FastSerialScannerInput from "./FastSerialScannerInput";

interface AddSerialsModalProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  batchId: number;
  batchNumber: string;
  untrackedQuantity?: number;
  onSuccess: () => void;
}

export default function AddSerialsModal({
  open,
  onClose,
  product,
  batchId,
  batchNumber,
  untrackedQuantity = 0,
  onSuccess,
}: AddSerialsModalProps) {
  const [loading, setLoading] = useState(false);
  const [serials, setSerials] = useState<string[]>([]);
  const [stockMode, setStockMode] = useState<"new_stock" | "untracked_stock">(
    "new_stock"
  );

  useEffect(() => {
    if (open) {
      setSerials([]);
      setStockMode("new_stock");
    }
  }, [open]);

  // Global Ctrl+Enter shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open && (e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, serials, stockMode]);

  const handleSubmit = async () => {
    if (serials.length === 0) {
      toast.error("Please scan or enter at least one serial number");
      return;
    }

    if (
      stockMode === "untracked_stock" &&
      untrackedQuantity > 0 &&
      serials.length > untrackedQuantity
    ) {
      toast.error(
        `Cannot assign more serials than untracked stock (${untrackedQuantity})`
      );
      return;
    }

    setLoading(true);
    try {
      await addSerialsToBatch({
        productId: product.id!,
        batchId,
        serials,
        increaseProductStock: stockMode === "new_stock",
      });

      toast.success(
        `Added ${serials.length} serial numbers to Batch ${batchNumber}!`
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error || "Failed to add serial numbers");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: "#f8fafc",
          borderBottom: "1px solid",
          borderColor: "divider",
          pb: 1.5,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Add Serial Numbers to Batch
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.2 }}
            >
              Product: <b>{product.name}</b> | <Hash size={12} /> Batch:{" "}
              <b>{batchNumber}</b>
            </Typography>
          </Box>
          <Chip
            icon={<Zap size={14} />}
            label="Ctrl+Enter to Save"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5} pt={1}>
          {/* Stock Source Switch */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: stockMode === "new_stock" ? "primary.50" : "warning.50",
              border: "1px solid",
              borderColor:
                stockMode === "new_stock" ? "primary.200" : "warning.200",
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Stock Source Selection
            </Typography>
            <RadioGroup
              row
              value={stockMode}
              onChange={(e) =>
                setStockMode(e.target.value as "new_stock" | "untracked_stock")
              }
            >
              <FormControlLabel
                value="new_stock"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      🟢 Add New Stock
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Increases batch quantity AND total product inventory
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="untracked_stock"
                control={<Radio size="small" />}
                disabled={untrackedQuantity <= 0}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      🟡 Assign Untracked Stock ({untrackedQuantity} Available)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Converts general inventory into serials without double counting
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </Box>

          {/* Fast Serial Scanner Input */}
          <FastSerialScannerInput serials={serials} onChange={setSerials} />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: "#f8fafc" }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          startIcon={<Plus size={18} />}
          disabled={loading || serials.length === 0}
          sx={{ px: 3, fontWeight: 700 }}
        >
          {loading
            ? "Adding..."
            : `Add ${serials.length} Serials (Ctrl+Enter)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
