"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
} from "@mui/material";
import { AlertTriangle } from "lucide-react"; // For a visual warning

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  header: string;
  disclaimer: string;
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  header,
  disclaimer,
}: Props) {
  const handleConfirm = () => {
    onConfirm();
    onClose(); // Automatically close the modal after confirming
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <AlertTriangle color="orange" />
          <Typography variant="h6">{header}</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mt: 1 }}>
          {disclaimer}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          No
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          autoFocus
        >
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
