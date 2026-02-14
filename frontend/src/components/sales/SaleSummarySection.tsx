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
} from "@mui/material";
import { useState, useEffect } from "react";
import type { SalePayload } from "../../lib/types/salesTypes";
import { createSale, updateSale } from "../../lib/api/salesService";
import { updateSalesOrder } from "../../lib/api/salesOrderService";
import { handlePrint } from "../../lib/handleInvoicePrint";
import { createCustomer } from "../../lib/api/customerService";
import type { CustomerType } from "../../lib/types/customerTypes";
import { numberToWords } from "../../utils/numberToWords";
import { Printer, MessageCircle, Percent } from "lucide-react";
import toast from "react-hot-toast";
import { getShopData } from "../../lib/api/shopService";

interface Props {
  sale: SalePayload;
  onSaleChange: (updated: SalePayload) => void;
  setSuccess: (value: boolean) => void;
  customer?: CustomerType;
  mode: "new" | "view" | "edit";
  resetForm: () => void;
  salesOrderId?: number | null;
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

  const [doPrint, setDoPrint] = useState(true);
  // UPDATED: WhatsApp default to true
  const [doWhatsApp, setDoWhatsApp] = useState(true);

  // --- AUTOMATIC TOTAL CALCULATION ---
  // Recalculate Total whenever Items or Discount % changes
  useEffect(() => {
    if (mode === "view") return;

    const subtotal = sale.items.reduce(
      (sum, item) => sum + (Number(item.price) || 0),
      0,
    );
    const discountPct = Number(sale.discount) || 0;
    const discountAmount = (subtotal * discountPct) / 100;
    const calculatedTotal = Math.max(0, subtotal - discountAmount);

    // Round to 2 decimals to avoid floating point jitter
    const finalTotal =
      Math.round((calculatedTotal + Number.EPSILON) * 100) / 100;

    // Only update if value is different to avoid loops
    // Note: We do NOT include sale.total_amount in dependency array.
    // This allows "Round Off" to persist until items/discount are touched again.
    if (Math.abs(finalTotal - sale.total_amount) > 0.05) {
      onSaleChange({ ...sale, total_amount: finalTotal });
    }
  }, [sale.items, sale.discount, mode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((mode !== "new" && mode !== "edit") || isSubmitting) return;
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyS") {
        e.preventDefault();
        handleSubmit();
      }
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyU") {
        e.preventDefault();
        handlePaidInFull();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (sale.items.length > 0 && confirm("Are you sure?")) handleCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, isSubmitting, sale]);

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

  const handleRoundOff = () => {
    const roundedTotal = Math.floor(sale.total_amount);
    const wasPaidInFull = sale.paid_amount === sale.total_amount;
    onSaleChange({
      ...sale,
      total_amount: roundedTotal,
      paid_amount: wasPaidInFull ? roundedTotal : sale.paid_amount,
    });
    toast.success(`Rounded off to ₹${roundedTotal}`);
  };

  const handleCancel = () => {
    resetForm();
    toast("Operation canceled.");
  };

  const handleSubmit = async () => {
    // --- UPDATED: Frontend Validation for Customer ---
    if (!sale.customer_id || sale.customer_id === 0) {
      if (!customer?.name || !customer?.phone) {
        toast.error("Customer Name and Phone Number are required.");
        return;
      }
    }

    if (sale.status === "paid" && sale.paid_amount < sale.total_amount) {
      setWarningOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      let saleDataWithCustomer = { ...sale };

      // Create Customer if needed
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
        try {
          const customerRes = await createCustomer(customerData);
          saleDataWithCustomer = {
            ...saleDataWithCustomer,
            customer_id: customerRes.id,
          };
        } catch (err) {
          toast.error("Failed to create customer. Please check details.");
          setIsSubmitting(false);
          return;
        }
      }

      const payload = {
        ...saleDataWithCustomer,
        items: saleDataWithCustomer.items.filter((item) => item.product_id > 0),
      };

      let savedSale;
      if (mode === "edit" && sale.id) {
        const response = await updateSale(Number(sale.id), payload);
        savedSale = response.data;
      } else {
        const response = await createSale(payload);
        savedSale = response.data;
        if (salesOrderId) {
          await updateSalesOrder(salesOrderId, {
            status: "completed",
            fulfilled_invoice_id: savedSale.id,
            total_amount: sale.total_amount,
            items: [],
            customer_id: sale.customer_id || null,
          });
        }
      }

      setSuccess(true);
      toast.success(mode === "edit" ? "Sale Updated!" : "Sale Saved!");
      if (doPrint) handlePrint(savedSale);

      if (doWhatsApp && customer?.phone) {
        const nl = "\n";
        const message = `*Invoice from ${shop?.shop_name || "Our Shop"}*${nl}${nl}Bill No: ${savedSale.reference_no}${nl}Total: ₹${savedSale.total_amount}${nl}Thank you!`;
        if (window.electron && window.electron.sendWhatsAppMessage) {
          window.electron.sendWhatsAppMessage(customer.phone, message);
        }
        const pdfRes = await window.electron.sendWhatsAppInvoicePdf({
          sale: sale,
          shop: shop,
          customerPhone: customer?.phone,
        });

        if (pdfRes.success) {
          toast.success("Invoice sent successfully!");
        } else {
          toast.error("Failed to send PDF.");
        }
      }
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Error during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isViewMode = mode === "view";

  return (
    <Box sx={{ bgcolor: theme.palette.background.default }}>
      <Box px={3} py={1}>
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={1}
          maxRows={3}
          value={sale.note}
          onChange={(e) => handleFieldChange("note", e.target.value)}
          placeholder="Add notes..."
          variant="standard"
          disabled={isViewMode}
          InputProps={{
            disableUnderline: true,
            sx: { fontSize: "0.9rem", color: "text.secondary" },
          }}
        />
        <Divider sx={{ mt: 1 }} />
      </Box>

      <Box sx={{ px: 3, py: 2 }}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          justifyContent="space-between"
          alignItems="flex-end"
          spacing={4}
        >
          <Stack spacing={0.5} flex={1}>
            <Stack direction="row" alignItems="baseline" spacing={2}>
              <Typography variant="h4" fontWeight={800} color="text.primary">
                {sale.total_amount.toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Net Payable
              </Typography>
              {!isViewMode && sale.total_amount % 1 !== 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleRoundOff}
                >
                  Round Off
                </Button>
              )}
            </Stack>
            <Typography
              variant="body2"
              fontStyle="italic"
              color="text.secondary"
            >
              {numberToWords(sale.total_amount)}
            </Typography>

            {!isViewMode ? (
              <Stack direction="row" spacing={2} alignItems="center" mt={2}>
                {/* UPDATED: Discount Field Added */}
                <TextField
                  label="Disc %"
                  size="small"
                  type="number"
                  variant="standard"
                  value={sale.discount || ""}
                  onChange={(e) =>
                    handleFieldChange(
                      "discount",
                      Math.max(0, parseFloat(e.target.value) || 0),
                    )
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Percent size={14} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 80 }}
                />

                <TextField
                  label="Paid"
                  size="small"
                  type="number"
                  variant="standard"
                  value={sale.paid_amount}
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
                  }}
                  sx={{ width: 100 }}
                />
                <Button
                  size="small"
                  onClick={handlePaidInFull}
                  disabled={sale.paid_amount >= sale.total_amount}
                >
                  Full
                </Button>
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
              <Stack
                direction="row"
                spacing={3}
                alignItems="center"
                mt={2}
                sx={{
                  p: 1.5,
                  bgcolor: "action.hover",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box>
                  <Typography variant="caption">Status</Typography>
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    color={
                      paymentSummary.status === "paid"
                        ? "success.main"
                        : "error.main"
                    }
                  >
                    {paymentSummary.status}
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box>
                  <Typography variant="caption">Paid</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {paymentSummary.total_paid?.toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption">Balance</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {paymentSummary.balance?.toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </Typography>
                </Box>
              </Stack>
            )}
          </Stack>

          {!isViewMode && (
            <Stack spacing={2} alignItems="flex-end">
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
                <Divider orientation="vertical" flexItem sx={{ height: 20 }} />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={doPrint}
                      onChange={(e) => setDoPrint(e.target.checked)}
                    />
                  }
                  label={
                    <Stack direction="row" spacing={0.5}>
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
                    <Stack direction="row" spacing={0.5}>
                      <MessageCircle size={14} />
                      <Typography variant="caption">WhatsApp</Typography>
                    </Stack>
                  }
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <Button
                  variant="text"
                  color="error"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  startIcon={
                    isSubmitting && (
                      <CircularProgress size={20} color="inherit" />
                    )
                  }
                >
                  {isSubmitting
                    ? "Processing..."
                    : mode === "edit"
                      ? "UPDATE SALE"
                      : "SAVE SALE"}
                </Button>
              </Stack>
            </Stack>
          )}
        </Stack>
      </Box>

      <Dialog open={warningOpen} onClose={() => setWarningOpen(false)}>
        <DialogTitle>Partial Payment Warning</DialogTitle>
        <DialogContent>
          Paid amount is less than total. Mark as <b>Partial Payment</b>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarningOpen(false)}>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SaleSummarySection;
