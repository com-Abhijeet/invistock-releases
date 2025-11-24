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
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  HandCoins,
  Landmark,
  PackageCheck,
  Save,
  ScrollText,
  Smartphone,
  Split,
  Ticket,
  XCircle,
  File,
} from "lucide-react";

import theme from "../../../theme";
import { FormField } from "../FormField";
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
}: // isEdit = false,
Props) => {
  const [warnOpen, setWarnOpen] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field: keyof PurchasePayload, value: any) => {
    if (readOnly) return;
    onPurchaseChange({ ...purchase, [field]: value });
  };

  const handleSubmit = async (action: "save" | "cancel") => {
    if (readOnly) return;

    if (action === "cancel") {
      onPurchaseChange({
        reference_no: "",
        date: "",
        supplier_id: 0,
        note: "",
        total_amount: 0,
        discount: 0,
        paid_amount: 0,
        items: [],
        status: "pending",
        payment_mode: "cash",
        is_reverse_charge: false,
      });
      navigate("/purchase");

      return;
    }

    if (
      purchase.status === "paid" &&
      purchase.paid_amount < purchase.total_amount
    ) {
      setWarnOpen(true);
      return;
    }

    // Use updatePurchase if isEdit in future
    const response = await createPurchase(purchase);

    if (response?.status === "success") setSuccess(true);
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
    <>
      <Box sx={{ p: 2, backgroundColor: "#fff", borderRadius: 2 }}>
        <Grid container spacing={4}>
          {/* Left Section: Notes & Amount in Words */}
          <Grid item xs={12} md={7}>
            <Stack spacing={2}>
              <FormField label="Notes / Remarks">
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  multiline
                  rows={2}
                  disabled={readOnly}
                  value={purchase.note}
                  onChange={(e) => handleChange("note", e.target.value)}
                  placeholder="Add any notes about this purchase..."
                />
              </FormField>
              <FormField label="Amount in Words">
                <Typography
                  fontStyle="italic"
                  color="text.primary"
                  fontWeight={500}
                  variant="body2"
                >
                  {numberToWords(purchase.total_amount)}
                </Typography>
              </FormField>
            </Stack>
          </Grid>
          <Grid item xs={12} md={5}></Grid>{" "}
          {/* Empty grid item for alignment */}
        </Grid>
      </Box>
      <FormControlLabel
        control={
          <Checkbox
            checked={purchase.is_reverse_charge || false}
            onChange={(e) =>
              handleChange("is_reverse_charge", e.target.checked)
            }
            disabled={readOnly}
          />
        }
        label={
          <Typography variant="body2">Reverse Charge Applicable</Typography>
        }
      />

      {/* Sticky Bottom Action Bar with All Price Fields */}
      <Paper
        elevation={3}
        sx={{
          position: "sticky",
          bottom: 0,
          py: 1.5,
          px: 2,
          mt: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: "background.paper",
        }}
      >
        <Stack
          direction={{ xs: "column", lg: "row" }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          {/* Left side of bar: Payment Inputs */}
          {!readOnly && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems="center"
              spacing={2}
            >
              <FormField label="Paid Amount">
                {/* ✅ ADDED: "Paid in Full" button */}
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    variant="outlined"
                    size="small"
                    type="number"
                    value={purchase.paid_amount}
                    onChange={(e) =>
                      handleChange("paid_amount", parseFloat(e.target.value))
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">₹</InputAdornment>
                      ),
                    }}
                    sx={{ width: 150 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() =>
                      handleChange("paid_amount", purchase.total_amount)
                    }
                    disabled={purchase.paid_amount >= purchase.total_amount}
                  >
                    Full
                  </Button>
                </Stack>
              </FormField>
              {/* ✅ Payment Mode */}
              <FormField label="Payment Mode">
                <TextField
                  select
                  size="small"
                  variant="outlined"
                  value={purchase.payment_mode}
                  onChange={(e) => handleChange("payment_mode", e.target.value)}
                  sx={{ width: 180 }}
                >
                  <MenuItem value="cash">
                    <Banknote size={18} style={{ marginRight: 8 }} /> Cash
                  </MenuItem>
                  <MenuItem value="card">
                    <CreditCard size={18} style={{ marginRight: 8 }} /> Card
                  </MenuItem>
                  <MenuItem value="upi">
                    <Smartphone size={18} style={{ marginRight: 8 }} /> UPI
                  </MenuItem>
                  <MenuItem value="bank_transfer">
                    <Landmark size={18} style={{ marginRight: 8 }} /> Bank
                    Transfer
                  </MenuItem>
                  <MenuItem value="credit">
                    <HandCoins size={18} style={{ marginRight: 8 }} /> On Credit
                  </MenuItem>
                  <MenuItem value="cheque">
                    <ScrollText size={18} style={{ marginRight: 8 }} /> Cheque
                  </MenuItem>
                  <MenuItem value="voucher">
                    <Ticket size={18} style={{ marginRight: 8 }} /> Voucher
                  </MenuItem>
                  <MenuItem value="mixed">
                    <Split size={18} style={{ marginRight: 8 }} /> Mixed Payment
                  </MenuItem>
                </TextField>
              </FormField>

              {/* ✅ Status Dropdown */}
              <FormField label="Status">
                <TextField
                  select
                  size="small"
                  variant="outlined"
                  value={purchase.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  sx={{ width: 180 }}
                >
                  <MenuItem value="draft">
                    <File size={18} style={{ marginRight: 8 }} /> Draft
                  </MenuItem>
                  <MenuItem value="pending">
                    <Clock size={18} style={{ marginRight: 8 }} /> Pending
                  </MenuItem>
                  <MenuItem value="partial_payment">
                    <HandCoins size={18} style={{ marginRight: 8 }} /> Partial
                    Payment
                  </MenuItem>
                  <MenuItem value="paid">
                    <CheckCircle2 size={18} style={{ marginRight: 8 }} /> Paid
                  </MenuItem>
                  <MenuItem value="received">
                    <PackageCheck size={18} style={{ marginRight: 8 }} />{" "}
                    Received
                  </MenuItem>
                  <MenuItem value="cancelled">
                    <XCircle size={18} style={{ marginRight: 8 }} /> Cancelled
                  </MenuItem>
                </TextField>
              </FormField>
            </Stack>
          )}

          {/* Right side of bar: Total & Action Buttons */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={3}
            flexGrow={1}
            justifyContent="flex-end"
          >
            <Box sx={{ textAlign: "right", minWidth: 180 }}>
              <Typography
                variant="body1"
                color="text.secondary"
                lineHeight={1.2}
              >
                GRAND TOTAL
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {purchase.total_amount.toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                })}
              </Typography>
            </Box>

            {!readOnly && (
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleSubmit("cancel")}
                  sx={{ minWidth: 110 }}
                  startIcon={<XCircle />}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleSubmit("save")}
                  sx={{ minWidth: 120 }}
                  startIcon={<Save />}
                >
                  Save
                </Button>
              </Stack>
            )}
          </Stack>
        </Stack>
      </Paper>

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
    </>
  );
};

export default PurchaseSummarySection;
