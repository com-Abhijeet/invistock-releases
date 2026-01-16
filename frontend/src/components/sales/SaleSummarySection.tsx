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
import type { SalePayload } from "../../lib/types/salesTypes";
import { createSale } from "../../lib/api/salesService";
import { updateSalesOrder } from "../../lib/api/salesOrderService"; // Import update service
import { handlePrint } from "../../lib/handleInvoicePrint";
import { createCustomer } from "../../lib/api/customerService";
import type { CustomerType } from "../../lib/types/customerTypes";
import { numberToWords } from "../../utils/numberToWords";
import { Printer, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import { getShopData } from "../../lib/api/shopService";

interface Props {
  sale: SalePayload;
  onSaleChange: (updated: SalePayload) => void;
  setSuccess: (value: boolean) => void;
  customer?: CustomerType;
  mode: "new" | "view";
  resetForm: () => void;
  salesOrderId?: number | null; // Optional prop to link order
}

const SaleSummarySection = ({
  sale,
  onSaleChange,
  setSuccess,
  customer,
  mode,
  resetForm,
  salesOrderId,
}: Props) => {
  const theme = useTheme();
  const [shop, setShop] = useState<any>(null);
  const [warningOpen, setWarningOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Actions Checkbox State
  const [doPrint, setDoPrint] = useState(true);
  const [doWhatsApp, setDoWhatsApp] = useState(false);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only active in "new" mode and when not submitting
      if (mode !== "new" || isSubmitting) return;

      // Ctrl + S: Save/Complete Sale
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
          sale.items.length > 0 &&
          confirm("Are you sure you want to cancel and clear?")
        ) {
          handleCancel();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, isSubmitting, sale]);

  // Helper to access the reconciled data safely from the repo update
  const paymentSummary = (sale as any).payment_summary || {
    total_paid: sale.paid_amount || 0,
    balance: sale.total_amount - (sale.paid_amount || 0),
    status: sale.status || "pending",
  };

  useEffect(() => {
    getShopData()
      .then((data) => {
        setShop(data);
        if (data?.print_after_save) setDoPrint(true);
      })
      .catch(() => setShop(null));
  }, []);

  const handleFieldChange = (field: keyof SalePayload, value: any) => {
    onSaleChange({ ...sale, [field]: value });
  };

  const handlePaidInFull = () => {
    onSaleChange({ ...sale, paid_amount: sale.total_amount, status: "paid" });
  };

  const handleCancel = () => {
    resetForm();
    toast("Sale canceled.");
  };

  const handleSubmit = async () => {
    if (sale.status === "paid" && sale.paid_amount < sale.total_amount) {
      setWarningOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      let saleDataWithCustomer = { ...sale };

      if (!sale.customer_id || sale.customer_id === 0) {
        const customerData = {
          name: customer?.name!,
          phone: customer?.phone!,
          address: customer?.address,
          city: customer?.city,
          state: customer?.state,
          pincode: customer?.pincode,
          gst_no: customer?.gst_no,
        };
        const customerRes = await createCustomer(customerData);
        saleDataWithCustomer = {
          ...saleDataWithCustomer,
          customer_id: customerRes.id,
        };
      }

      const payload = {
        ...saleDataWithCustomer,
        items: saleDataWithCustomer.items.filter((item) => item.product_id > 0),
      };

      const response = await createSale(payload);
      const savedSale = response.data;

      if (response?.status === "success") {
        // --- If this sale fulfills an Order, update the Order now ---
        if (salesOrderId) {
          try {
            await updateSalesOrder(salesOrderId, {
              status: "completed",
              fulfilled_invoice_id: savedSale.id,
              total_amount: sale.total_amount,
              items: [], // We typically don't change items here, but TypeScript might require the shape. Assuming partial update works or we pass empty.
              customer_id: sale.customer_id || null,
            });
            toast.success("Sales Order marked as Completed");
          } catch (orderErr) {
            console.error("Failed to update sales order status", orderErr);
            toast.error("Sale saved, but failed to update Order status.");
          }
        }
        // ------------------------------------------------------------

        setSuccess(true);
        toast.success("Sale Saved!");

        if (doPrint) handlePrint(savedSale);

        if (doWhatsApp) {
          const phoneToSend = customer?.phone;
          if (phoneToSend) {
            const nl = "\n";
            const shopName = shop?.shop_name || "Our Shop";
            const itemsList = savedSale.items
              .map(
                (item: any, index: number) =>
                  `${index + 1}. ${item.product_name} x ${item.quantity} = ₹${(
                    item.quantity * item.rate
                  ).toLocaleString("en-IN")}`
              )
              .join(nl);

            const message = `*Invoice from ${shopName}*${nl}${nl}Hello ${
              customer?.name || "Customer"
            },${nl}Bill No: ${
              savedSale.reference_no
            }${nl}${nl}*Items Ordered:*${nl}${itemsList}${nl}------------------------------${nl}*Total: ₹${savedSale.total_amount.toLocaleString(
              "en-IN"
            )}*${nl}------------------------------${nl}Thank you!`;

            toast.loading("Sending WhatsApp...");
            window.electron
              .sendWhatsAppMessage(phoneToSend, message)
              .then((res: { success: any; error: string }) => {
                if (res.success) {
                  window.electron.sendWhatsAppInvoicePdf({
                    sale: savedSale,
                    shop: shop,
                    customerPhone: phoneToSend,
                  });
                  toast.dismiss();
                  toast.success("WhatsApp Sent!");
                } else {
                  toast.error("WhatsApp Failed: " + res.error);
                }
              });
          } else {
            toast.error("No phone number for WhatsApp.");
          }
        }
        resetForm();
      } else {
        toast.error(response?.error || "Failed to save.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: theme.palette.background.default }}>
      {/* 1. Notes Section (Clean Input) */}
      <Box px={3} py={1}>
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={1}
          maxRows={3}
          value={sale.note}
          onChange={(e) => handleFieldChange("note", e.target.value)}
          placeholder="Add notes, warranty info, or delivery details..."
          variant="standard"
          InputProps={{
            disableUnderline: true,
            sx: { fontSize: "0.9rem", color: "text.secondary" },
          }}
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
                {sale.total_amount.toLocaleString("en-IN", {
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
              {numberToWords(sale.total_amount)}
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
                  value={sale.paid_amount}
                  onChange={(e) =>
                    handleFieldChange(
                      "paid_amount",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">₹</InputAdornment>
                    ),
                    disableUnderline: false,
                  }}
                  sx={{ width: 100 }}
                />
                <Tooltip title="Shortcut: Ctrl + U">
                  <Button
                    size="small"
                    sx={{ textTransform: "none", minWidth: "auto" }}
                    onClick={handlePaidInFull}
                    disabled={sale.paid_amount >= sale.total_amount}
                  >
                    F<span style={{ textDecoration: "underline" }}>u</span>ll
                  </Button>
                </Tooltip>
                <TextField
                  select
                  label="Mode"
                  size="small"
                  variant="standard"
                  value={sale.payment_mode}
                  onChange={(e) =>
                    handleFieldChange("payment_mode", e.target.value)
                  }
                  sx={{ width: 100 }}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="credit">Credit</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Status"
                  size="small"
                  variant="standard"
                  value={sale.status}
                  onChange={(e) => handleFieldChange("status", e.target.value)}
                  sx={{ width: 100 }}
                >
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </TextField>
              </Stack>
            ) : (
              // VIEW MODE: Read-Only Reconciled Status
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
                      checked={sale.is_reverse_charge}
                      onChange={(e) =>
                        handleFieldChange("is_reverse_charge", e.target.checked)
                      }
                    />
                  }
                  label={
                    <Typography variant="caption">Reverse Charge</Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={sale.is_ecommerce_sale}
                      onChange={(e) =>
                        handleFieldChange("is_ecommerce_sale", e.target.checked)
                      }
                    />
                  }
                  label={<Typography variant="caption">E-Commerce</Typography>}
                />
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ height: 20, alignSelf: "center" }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={doPrint}
                      onChange={(e) => setDoPrint(e.target.checked)}
                    />
                  }
                  label={
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Printer size={14} />
                      <Typography variant="caption">Print</Typography>
                    </Stack>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={doWhatsApp}
                      onChange={(e) => setDoWhatsApp(e.target.checked)}
                    />
                  }
                  label={
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <MessageCircle size={14} />
                      <Typography variant="caption">WhatsApp</Typography>
                    </Stack>
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
                        <span style={{ textDecoration: "underline" }}> S</span>
                        AVE SALE
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

export default SaleSummarySection;
