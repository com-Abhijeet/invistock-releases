"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import { Pencil, Trash2, Printer } from "lucide-react";
import type { Product } from "../lib/types/product";
import { printLabel } from "../lib/printLabel";

type ProductActionModalProps = {
  open: boolean;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onPrint: (product: Product) => void;
  product: Product | null;
};

export default function ProductActionModal({
  open,
  onClose,
  onEdit,
  onDelete,
  product,
}: ProductActionModalProps) {
  if (!product) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Typography fontWeight="bold">Actions for: {product.name}</Typography>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Pencil size={18} />}
            onClick={() => {
              onEdit(product);
              onClose();
            }}
          >
            Edit Product
          </Button>

          <Button
            variant="outlined"
            color="error"
            startIcon={<Trash2 size={18} />}
            onClick={() => {
              onDelete(product);
              onClose();
            }}
          >
            Delete Product
          </Button>

          <Button
            variant="outlined"
            startIcon={<Printer size={18} />}
            onClick={() => {
              printLabel(product);
              onClose();
            }}
          >
            Print Label
          </Button>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
