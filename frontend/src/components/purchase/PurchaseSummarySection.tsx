"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useTheme,
  Divider,
  CircularProgress,
} from "@mui/material";
import { Save } from "lucide-react";

import { createPurchase } from "../../lib/api/purchaseService";
import type { PurchasePayload } from "../../lib/types/purchaseTypes";
import { numberToWords } from "../../utils/numberToWords";

interface Props {
  purchase: PurchasePayload;
  onPurchaseChange: (data: PurchasePayload) => void;
  setSuccess: (v: boolean) => void;
  readOnly?: boolean;
  isEdit?: boolean;
}

const PurchaseSummarySection = ({
  purchase,
  onPurchaseChange,
  setSuccess,
  readOnly = false,
}: Props) => {
  const theme = useTheme();
  const [warnOpen, setWarnOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field: keyof PurchasePayload, value: any) => {
    if (!readOnly) onPurchaseChange({ ...purchase, [field]: value });
  };

  const handleSubmit = async (action: "save" | "cancel") => {
    if (readOnly) return;
    if (action === "cancel") {
      navigate("/purchase-dashboard");
      return;
    }

    if (
      purchase.status === "paid" &&
      purchase.paid_amount < purchase.total_amount
    ) {
      setWarnOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createPurchase(purchase);
      if (response?.status === "success") setSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (readOnly) return;
    const listener = (e: KeyboardEvent) => {
      if (e.key === "F10") handleSubmit("save");
      else if (e.key === "F12") handleSubmit("cancel");
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [purchase, readOnly]);

  return (
    <Box>
      {/* 1. Notes (Clean Input) */}
      <Box px={3} py={1}>
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={1}
          maxRows={3}
          value={purchase.note}
          onChange={(e) => handleChange("note", e.target.value)}
          placeholder="Add delivery notes, supplier info..."
          disabled={readOnly}
          variant="standard"
          InputProps={{
            disableUnderline: true,
            sx: { fontSize: "0.9rem", color: "text.secondary" },
          }}
        />
        <Divider sx={{ mt: 1 }} />
      </Box>

      {/* 2. Unified Footer */}
      <Box sx={{ px: 3, py: 2 }}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          justifyContent="space-between"
          alignItems="flex-end"
          spacing={4}
        >
          {/* Left: Total + Word Amount */}
          <Stack spacing={0.5} flex={1}>
            <Stack direction="row" alignItems="baseline" spacing={2}>
              <Typography
                variant="h4"
                fontWeight={800}
                color="text.primary"
                lineHeight={1}
              >
                {purchase.total_amount.toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                })}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  textTransform: "uppercase",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: 0.5,
                }}
              >
                Net Payable
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              fontStyle="italic"
              color="text.secondary"
            >
              {numberToWords(purchase.total_amount)}
            </Typography>

            {/* Payment Details (Inline) */}
            {!readOnly && (
              <Stack direction="row" spacing={2} alignItems="center" mt={2}>
                <TextField
                  label="Paid"
                  size="small"
                  type="number"
                  variant="standard"
                  value={purchase.paid_amount}
                  onChange={(e) =>
                    handleChange("paid_amount", parseFloat(e.target.value))
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">₹</InputAdornment>
                    ),
                  }}
                  sx={{ width: 100 }}
                />
                <Button
                  size="small"
                  variant="text"
                  sx={{ textTransform: "none", minWidth: "auto" }}
                  onClick={() =>
                    handleChange("paid_amount", purchase.total_amount)
                  }
                  disabled={purchase.paid_amount >= purchase.total_amount}
                >
                  Full
                </Button>
                <TextField
                  select
                  label="Mode"
                  size="small"
                  variant="standard"
                  value={purchase.payment_mode}
                  onChange={(e) => handleChange("payment_mode", e.target.value)}
                  sx={{ width: 100 }}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="bank_transfer">Bank</MenuItem>
                  <MenuItem value="credit">Credit</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Status"
                  size="small"
                  variant="standard"
                  value={purchase.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  sx={{ width: 100 }}
                >
                  <MenuItem value="received">Received</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                </TextField>
              </Stack>
            )}
          </Stack>

          {/* Right: Actions Block */}
          {!readOnly && (
            <Stack spacing={2} alignItems="flex-end">
              {/* Toggles Row */}
              <Stack direction="row" spacing={2} alignItems="center">
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={purchase.is_reverse_charge}
                      onChange={(e) =>
                        handleChange("is_reverse_charge", e.target.checked)
                      }
                      disabled={readOnly}
                    />
                  }
                  label={
                    <Typography variant="caption">Reverse Charge</Typography>
                  }
                />
              </Stack>

              {/* Buttons Row */}
              <Stack direction="row" spacing={2}>
                <Button
                  variant="text"
                  color="error"
                  onClick={() => handleSubmit("cancel")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => handleSubmit("save")}
                  disabled={isSubmitting}
                  startIcon={
                    isSubmitting ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <Save size={20} />
                    )
                  }
                  sx={{
                    px: 4,
                    borderRadius: 2,
                    fontWeight: 700,
                    fontSize: "1rem",
                    boxShadow: theme.shadows[4],
                  }}
                >
                  {isSubmitting ? "Saving..." : "SAVE PURCHASE"}
                </Button>
              </Stack>
            </Stack>
          )}
        </Stack>
      </Box>

      {/* Warning for underpaid */}
      <Dialog open={warnOpen} onClose={() => setWarnOpen(false)}>
        <DialogTitle>Partial Payment Warning</DialogTitle>
        <DialogContent>
          Paid amount is less than total. Status will be marked <b>Pending</b>.
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              handleChange("status", "pending");
              setWarnOpen(false);
            }}
            variant="contained"
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseSummarySection;
