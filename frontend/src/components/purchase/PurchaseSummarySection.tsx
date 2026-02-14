"use client";

import {
  Box,
  Button,
  MenuItem,
  TextField,
  Typography,
  Dialog,
  InputAdornment,
  Stack,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  useTheme,
  Divider,
  Tooltip,
} from "@mui/material";
import { useState, useEffect } from "react";
import type { PurchasePayload } from "../../lib/types/purchaseTypes";
import { createPurchase, updatePurchase } from "../../lib/api/purchaseService";
import { createSupplier } from "../../lib/api/supplierService";
import type { SupplierType } from "../../lib/types/supplierTypes";
import { numberToWords } from "../../utils/numberToWords";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

interface Props {
  purchase: PurchasePayload;
  onPurchaseChange: (updated: PurchasePayload) => void;
  setSuccess: (value: boolean) => void;
  supplier?: SupplierType;
  mode: "new" | "view" | "edit";
  resetForm: () => void;
}

const PurchaseSummarySection = ({
  purchase,
  onPurchaseChange,
  setSuccess,
  supplier,
  mode,
  resetForm,
}: Props) => {
  const theme = useTheme();
  const [warningOpen, setWarningOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only active in edit/new modes and when not submitting
      if (mode === "view" || isSubmitting) return;

      // Ctrl + S: Save Purchase
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.code === "KeyS" || e.key.toLowerCase() === "s")
      ) {
        e.preventDefault();
        handleSubmit();
      }

      // Ctrl + U: Full Payment
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.code === "KeyU" || e.key.toLowerCase() === "u")
      ) {
        e.preventDefault();
        handlePaidInFull();
      }

      // Escape: Cancel
      if (e.key === "Escape") {
        e.preventDefault();
        if (
          purchase.items.length > 0 &&
          confirm("Are you sure you want to cancel?")
        ) {
          handleCancel();
        } else if (purchase.items.length === 0) {
          handleCancel();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, isSubmitting, purchase]); // Depend on state for latest closure

  // 💡 Helper to access the reconciled payment data safely
  // This matches the structure returned by the updated purchaseRepository
  const paymentSummary = (purchase as any).payment_summary || {
    total_paid: purchase.paid_amount || 0,
    balance: purchase.total_amount - (purchase.paid_amount || 0),
    status: purchase.status || "pending",
  };

  const handleFieldChange = (field: keyof PurchasePayload, value: any) => {
    onPurchaseChange({ ...purchase, [field]: value });
  };

  const handlePaidInFull = () => {
    onPurchaseChange({
      ...purchase,
      paid_amount: purchase.total_amount,
      status: "paid",
    });
  };

  const handleCancel = () => {
    resetForm();
    toast("Purchase canceled.");
  };

  const handleSubmit = async () => {
    // --- Frontend Validations (Null Check) ---
    if (!purchase.reference_no || purchase.reference_no.trim() === "") {
      toast.error("Ref No / Bill No is required");
      return;
    }
    if (!purchase.date) {
      toast.error("Date is required");
      return;
    }
    if (!purchase.supplier_id && !supplier) {
      toast.error("Supplier is required");
      return;
    }
    // Filter invalid items first to check real count
    const validItems = purchase.items.filter((item) => item.product_id > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one valid product");
      return;
    }
    // ----------------------------------------

    if (
      purchase.status === "paid" &&
      purchase.paid_amount < purchase.total_amount
    ) {
      setWarningOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      let purchaseDataWithSupplier = { ...purchase };

      // Create Supplier if it doesn't exist (Quick-add logic)
      if (!purchase.supplier_id || purchase.supplier_id === 0) {
        if (supplier?.name) {
          const supplierData = {
            name: supplier.name,
            phone: supplier.phone,
            // Add minimal required fields
            address: supplier.address || "",
            city: supplier.city || "",
            state: supplier.state || "",
            pincode: supplier.pincode || "",
            gst_number: supplier.gst_number || "",
          };
          const supRes = await createSupplier(supplierData as any);
          if (supRes?.id) {
            purchaseDataWithSupplier.supplier_id = supRes.id;
          } else {
            toast.error("Failed to create supplier.");
            setIsSubmitting(false);
            return;
          }
        } else {
          toast.error("Please select a valid supplier.");
          setIsSubmitting(false);
          return;
        }
      }

      // Filter invalid items
      const payload = {
        ...purchaseDataWithSupplier,
        items: validItems, // Use the already filtered valid items
      };

      let response;

      // FIXED: Conditional Logic for Create vs Update
      if (mode === "edit" && (purchase as any).id) {
        // Use ID from purchase object
        const purchaseId = (purchase as any).id;
        response = await updatePurchase(purchaseId, payload);
      } else {
        response = await createPurchase(payload);
      }

      if (response) {
        setSuccess(true);
        toast.success(
          mode === "edit"
            ? "Purchase Updated Successfully!"
            : "Purchase Saved Successfully!",
        );
        resetForm();
        navigate("/purchase-history");
      } else {
        toast.error("Failed to save purchase.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: theme.palette.background.default }}>
      {/* 1. Notes Section */}
      <Box px={3} py={1}>
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={1}
          maxRows={3}
          value={purchase.note}
          onChange={(e) => handleFieldChange("note", e.target.value)}
          placeholder="Add notes, GRN reference, or remarks..."
          variant="standard"
          InputProps={{
            disableUnderline: true,
            sx: { fontSize: "0.9rem", color: "text.secondary" },
          }}
          // Validation: Char limit
          inputProps={{ maxLength: 500 }}
        />
        <Divider sx={{ mt: 1 }} />
      </Box>

      {/* 2. Unified Footer (Total + Actions) */}
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
                Total Payable
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              fontStyle="italic"
              color="text.secondary"
            >
              {numberToWords(purchase.total_amount)}
            </Typography>

            {/* Payment Details */}
            {mode !== "view" ? (
              // EDIT/NEW MODE: Input fields
              <Stack direction="row" spacing={2} alignItems="center" mt={2}>
                <TextField
                  label="Paid"
                  size="small"
                  type="number"
                  variant="standard"
                  value={purchase.paid_amount}
                  onChange={(e) =>
                    handleFieldChange(
                      "paid_amount",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">₹</InputAdornment>
                    ),
                    disableUnderline: false,
                  }}
                  // Validation: Positive number
                  inputProps={{ min: 0 }}
                  sx={{ width: 100 }}
                />
                <Tooltip title="Shortcut: Ctrl + U">
                  <Button
                    size="small"
                    sx={{ textTransform: "none", minWidth: "auto" }}
                    onClick={handlePaidInFull}
                    disabled={purchase.paid_amount >= purchase.total_amount}
                  >
                    F<span style={{ textDecoration: "underline" }}>u</span>ll
                  </Button>
                </Tooltip>
                <TextField
                  select
                  label="Mode"
                  size="small"
                  variant="standard"
                  value={purchase.payment_mode}
                  onChange={(e) =>
                    handleFieldChange("payment_mode", e.target.value)
                  }
                  sx={{ width: 100 }}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="bank_transfer">Bank</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Status"
                  size="small"
                  variant="standard"
                  value={purchase.status}
                  onChange={(e) => handleFieldChange("status", e.target.value)}
                  sx={{ width: 100 }}
                >
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="ordered">Ordered</MenuItem>
                </TextField>
              </Stack>
            ) : (
              // 💡 VIEW MODE: Read-Only Reconciled Status
              // This shows the actual payment status from transactions
              <Stack
                direction="row"
                spacing={3}
                alignItems="center"
                mt={2}
                sx={{
                  p: 1.5,
                  bgcolor: "action.hover",
                  borderRadius: 2,
                  width: "fit-content",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    Status
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    sx={{
                      textTransform: "uppercase",
                      color:
                        paymentSummary.status === "paid"
                          ? "success.main"
                          : paymentSummary.status === "partial"
                            ? "warning.main"
                            : "error.main",
                    }}
                  >
                    {paymentSummary.status}
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    Paid
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {paymentSummary.total_paid?.toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    Balance
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="text.secondary"
                  >
                    {paymentSummary.balance?.toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </Typography>
                </Box>
              </Stack>
            )}
          </Stack>

          {/* Right: Actions Block */}
          {mode !== "view" && (
            <Stack spacing={2} alignItems="flex-end">
              {/* Toggles Row */}
              <Stack direction="row" spacing={2} alignItems="center">
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={purchase.is_reverse_charge}
                      onChange={(e) =>
                        handleFieldChange("is_reverse_charge", e.target.checked)
                      }
                    />
                  }
                  label={
                    <Typography variant="caption">Reverse Charge</Typography>
                  }
                />
              </Stack>

              {/* Buttons Row */}
              <Stack direction="row" spacing={2}>
                <Tooltip title="Shortcut: Esc">
                  <Button
                    variant="text"
                    color="error"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    <span style={{ textDecoration: "underline" }}>C</span>ancel
                  </Button>
                </Tooltip>

                <Tooltip title="Shortcut: Ctrl + S">
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={() => handleSubmit()}
                    disabled={isSubmitting}
                    startIcon={
                      isSubmitting && (
                        <CircularProgress size={20} color="inherit" />
                      )
                    }
                    sx={{
                      px: 5,
                      borderRadius: 2,
                      fontWeight: 700,
                      fontSize: "1rem",
                      boxShadow: theme.shadows[4],
                    }}
                  >
                    {isSubmitting ? (
                      "Saving..."
                    ) : (
                      <>
                        {mode === "edit" ? "UPDATE" : "SAVE"} PURCHA
                        <span style={{ textDecoration: "underline" }}>S</span>E
                      </>
                    )}
                  </Button>
                </Tooltip>
              </Stack>
            </Stack>
          )}
        </Stack>
      </Box>

      {/* Warning Dialog */}
      <Dialog open={warningOpen} onClose={() => setWarningOpen(false)}>
        <DialogTitle>Partial Payment Warning</DialogTitle>
        <DialogContent>
          Paid amount is less than total. Status will be marked{" "}
          <b>Partial Payment</b>.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarningOpen(false)}>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseSummarySection;
