"use client";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
  LinearProgress,
  Divider,
  Chip,
} from "@mui/material";
import { Plus, Trash2, CheckCircle2, SplitSquareHorizontal } from "lucide-react";
import { useState, useEffect } from "react";
import { createTransaction } from "../../lib/api/transactionService";
import toast from "react-hot-toast";

const PAYMENT_MODES = ["cash", "upi", "card", "credit", "cheque", "bank_transfer"];

interface TransactionRow {
  id: number;
  amount: string;
  payment_mode: string;
  note: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  saleId: number;
  customerId: number;
  totalAmount: number;
  referenceNo: string;
}

let rowIdCounter = 0;
const newRow = (amount = ""): TransactionRow => ({
  id: ++rowIdCounter,
  amount,
  payment_mode: "cash",
  note: "",
});

export default function PostSaleTransactionModal({
  open,
  onClose,
  saleId,
  customerId,
  totalAmount,
  referenceNo,
}: Props) {
  const theme = useTheme();
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset rows whenever the modal opens with a new sale
  useEffect(() => {
    if (open) {
      rowIdCounter = 0;
      setRows([newRow(totalAmount.toFixed(2))]);
    }
  }, [open, totalAmount]);

  const totalAllocated = rows.reduce(
    (sum, r) => sum + (parseFloat(r.amount) || 0),
    0,
  );
  const remaining = Math.round((totalAmount - totalAllocated + Number.EPSILON) * 100) / 100;
  const isOverpaid = remaining < -0.01;
  const isFullyAllocated = Math.abs(remaining) <= 0.01;

  const handleRowChange = (
    id: number,
    field: keyof TransactionRow,
    value: string,
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const handleAddRow = () => {
    const leftover = remaining > 0 ? remaining.toFixed(2) : "";
    setRows((prev) => [...prev, newRow(leftover)]);
  };

  const handleRemoveRow = (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSplitEvenly = () => {
    if (rows.length === 0) return;
    const split = (totalAmount / rows.length).toFixed(2);
    setRows((prev) => prev.map((r) => ({ ...r, amount: split })));
  };

  const handleSubmit = async () => {
    if (isOverpaid) {
      toast.error("Total allocated exceeds the sale amount.");
      return;
    }
    if (rows.some((r) => !parseFloat(r.amount) || parseFloat(r.amount) <= 0)) {
      toast.error("All rows must have a valid positive amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.all(
        rows.map((r) =>
          createTransaction({
            type: "payment_in",
            bill_id: saleId,
            bill_type: "sale",
            entity_id: customerId,
            entity_type: "customer",
            transaction_date: new Date().toISOString().slice(0, 10),
            amount: parseFloat(r.amount),
            payment_mode: r.payment_mode,
            status: "issued" as const,
            note: r.note || `Payment for Sale #${referenceNo}`,
          }),
        ),
      );

      toast.success("Payments recorded successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payments.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPct = Math.min(100, (totalAllocated / totalAmount) * 100);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "12px",
          overflow: "hidden",
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          bgcolor: theme.palette.secondary.main,
          color: "white",
          pb: 1.5,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <SplitSquareHorizontal size={20} />
          <Box flex={1}>
            <Typography fontWeight={900} fontSize="0.95rem" lineHeight={1}>
              Record Split Payments
            </Typography>
            <Typography fontSize="0.7rem" sx={{ opacity: 0.8 }} mt={0.3}>
              Invoice #{referenceNo} &middot; Total &#8377;{totalAmount.toLocaleString("en-IN")}
            </Typography>
          </Box>
          <Chip
            label={
              isFullyAllocated
                ? "Fully Allocated"
                : remaining > 0
                  ? `\u20b9${remaining.toFixed(2)} remaining`
                  : `\u20b9${Math.abs(remaining).toFixed(2)} over`
            }
            size="small"
            sx={{
              fontWeight: 800,
              fontSize: "0.65rem",
              bgcolor: isOverpaid
                ? theme.palette.error.main
                : isFullyAllocated
                  ? theme.palette.success.main
                  : alpha("#fff", 0.2),
              color: "white",
            }}
          />
        </Stack>

        {/* Progress bar */}
        <Box sx={{ mt: 1.5, borderRadius: 4, overflow: "hidden" }}>
          <LinearProgress
            variant="determinate"
            value={progressPct}
            sx={{
              height: 4,
              bgcolor: alpha("#fff", 0.2),
              "& .MuiLinearProgress-bar": {
                bgcolor: isOverpaid
                  ? theme.palette.error.light
                  : isFullyAllocated
                    ? theme.palette.success.light
                    : "#fff",
              },
            }}
          />
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {isSubmitting && <LinearProgress color="secondary" />}

        {/* Column headers */}
        <Box
          sx={{
            px: 2,
            py: 1,
            bgcolor: alpha(theme.palette.action.hover, 0.04),
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              sx={{ flex: "0 0 100px", fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", color: "text.disabled" }}
            >
              Mode
            </Typography>
            <Typography
              sx={{ flex: 1, fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", color: "text.disabled" }}
            >
              Amount (&#8377;)
            </Typography>
            <Typography
              sx={{ flex: 2, fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", color: "text.disabled" }}
            >
              Note (optional)
            </Typography>
            <Box sx={{ width: 32 }} />
          </Stack>
        </Box>

        {/* Rows */}
        <Box sx={{ px: 2, py: 1 }}>
          <Stack spacing={1}>
            {rows.map((row, idx) => (
              <Stack key={row.id} direction="row" spacing={1} alignItems="center">
                {/* Mode */}
                <TextField
                  select
                  size="small"
                  value={row.payment_mode}
                  onChange={(e) => handleRowChange(row.id, "payment_mode", e.target.value)}
                  sx={{ flex: "0 0 100px" }}
                  SelectProps={{ sx: { fontSize: "0.8rem", fontWeight: 700 } }}
                >
                  {PAYMENT_MODES.map((m) => (
                    <MenuItem key={m} value={m} dense sx={{ fontSize: "0.8rem" }}>
                      {m.toUpperCase().replace("_", " ")}
                    </MenuItem>
                  ))}
                </TextField>

                {/* Amount */}
                <TextField
                  size="small"
                  type="number"
                  placeholder="0.00"
                  value={row.amount}
                  onChange={(e) => handleRowChange(row.id, "amount", e.target.value)}
                  error={!!row.amount && parseFloat(row.amount) <= 0}
                  sx={{
                    flex: 1,
                    "& input": { fontWeight: 700, fontSize: "0.85rem" },
                  }}
                  InputProps={{
                    startAdornment: (
                      <Typography fontSize="0.8rem" color="text.secondary" mr={0.5}>
                        &#8377;
                      </Typography>
                    ),
                  }}
                  autoFocus={idx === rows.length - 1 && rows.length > 1}
                />

                {/* Note */}
                <TextField
                  size="small"
                  placeholder="e.g. UPI ref, cheque no..."
                  value={row.note}
                  onChange={(e) => handleRowChange(row.id, "note", e.target.value)}
                  sx={{
                    flex: 2,
                    "& input": { fontSize: "0.8rem" },
                  }}
                />

                {/* Remove */}
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleRemoveRow(row.id)}
                  disabled={rows.length === 1}
                >
                  <Trash2 size={14} />
                </IconButton>
              </Stack>
            ))}
          </Stack>

          {/* Totals row */}
          <Divider sx={{ my: 1.5 }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={<Plus size={14} />}
                onClick={handleAddRow}
                sx={{ fontWeight: 700, fontSize: "0.72rem" }}
              >
                Add Row
              </Button>
              {rows.length > 1 && (
                <Button
                  size="small"
                  onClick={handleSplitEvenly}
                  variant="outlined"
                  sx={{ fontWeight: 700, fontSize: "0.72rem" }}
                >
                  Split Evenly
                </Button>
              )}
            </Stack>
            <Stack alignItems="flex-end" spacing={0.25}>
              <Typography fontSize="0.65rem" color="text.disabled" fontWeight={700}>
                ALLOCATED / TOTAL
              </Typography>
              <Typography
                fontSize="0.9rem"
                fontWeight={900}
                color={isOverpaid ? "error.main" : isFullyAllocated ? "success.main" : "text.primary"}
              >
                &#8377;{totalAllocated.toFixed(2)} / &#8377;{totalAmount.toFixed(2)}
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button
          onClick={onClose}
          color="inherit"
          sx={{ fontWeight: 700 }}
        >
          Skip (Mark Unpaid)
        </Button>
        <Button
          variant="contained"
          color="secondary"
          disabled={isSubmitting || isOverpaid || rows.length === 0}
          startIcon={<CheckCircle2 size={16} />}
          onClick={handleSubmit}
          sx={{ fontWeight: 800, minWidth: 160 }}
        >
          {isSubmitting ? "Saving..." : "Record Payments"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
