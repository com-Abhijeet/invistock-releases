"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
} from "@mui/material";

interface Props {
  open: boolean;
  onClose: () => void;
  onExport: (dates: { startDate: string; endDate: string }) => void;
  title: string;
  loading: boolean;
}

export default function ExportDateRangeModal({
  open,
  onClose,
  onExport,
  title,
  loading,
}: Props) {
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const handleExportClick = () => {
    if (startDate && endDate) {
      onExport({ startDate, endDate });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label="Start Date"
            type="date"
            fullWidth
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            fullWidth
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleExportClick}
          variant="contained"
          disabled={loading || !startDate || !endDate}
        >
          {loading ? "Exporting..." : "Export"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
