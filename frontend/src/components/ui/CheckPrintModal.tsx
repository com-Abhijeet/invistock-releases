"use client";

import { Dialog, DialogContent, DialogTitle, Box, Typography, IconButton } from "@mui/material";
import { Building2, X } from "lucide-react";
import CheckPrintingContent from "./CheckPrintingContent";

interface CheckPrintModalProps {
  open: boolean;
  onClose: () => void;
  initialData?: {
    payee?: string;
    amount?: number;
    date?: string;
  };
}

export default function CheckPrintModal({
  open,
  onClose,
  initialData,
}: CheckPrintModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, overflow: "hidden" },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "primary.main",
          color: "white",
          py: 1.8,
          px: 3,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Building2 size={24} color="white" />
          <Typography variant="h6" fontWeight={700}>
            Cheque Printing Master & Bank Calibration
          </Typography>
        </Box>

        <IconButton onClick={onClose} size="small" sx={{ color: "white" }}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: "#f8fafc" }}>
        <CheckPrintingContent
          initialData={initialData}
          isModal={true}
          onCloseModal={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
