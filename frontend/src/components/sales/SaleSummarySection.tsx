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
  Select,
  FormControl,
  InputLabel,
  OutlinedInput,
  ListItemText,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useState, useEffect, useRef } from "react";
import type { SalePayload } from "../../lib/types/salesTypes";
import { createSale, updateSale } from "../../lib/api/salesService";
import { updateSalesOrder } from "../../lib/api/salesOrderService";
import { handlePrint } from "../../lib/handleInvoicePrint";
import { createCustomer } from "../../lib/api/customerService";
import type { CustomerType } from "../../lib/types/customerTypes";
import { numberToWords } from "../../utils/numberToWords";
import { Printer, MessageCircle, Percent, Settings } from "lucide-react";
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
  const [doWhatsApp, setDoWhatsApp] = useState(true);

  // Refs for keyboard navigation
  const containerRef = useRef<HTMLDivElement>(null);

  // --- DERIVED CALCULATIONS ---
  // 1. Subtotal (Sum of Items)
  const subtotal = sale.items.reduce(
    (sum, item) => sum + (Number(item.price) || 0),
    0,
  );

  // 2. Discount Amount
  const discountPct = Number(sale.discount) || 0;
  const discountAmount = (subtotal * discountPct) / 100;

  // 3. Expected Total (Before Round Off)
  const netBeforeRound = Math.max(0, subtotal - discountAmount);

  // 4. Current Round Off (Difference between stored Total and Expected Total)
  const currentRoundOff =
    Math.round((sale.total_amount - netBeforeRound + Number.EPSILON) * 100) /
    100;

  // Local state for Round Off input to allow typing "-" freely without instant re-calc blocking it
  const [roundOffInput, setRoundOffInput] = useState<string>("");

  // Sync local input when external round-off changes (e.g. items added reset total)
  useEffect(() => {
    const parsed = parseFloat(roundOffInput);
    // Only update local input if the actual data value is significantly different
    // (This prevents overwriting user input like "-." or "-0" while typing)
    // Also update if roundOffInput is empty/invalid but currentRoundOff has a value (e.g. loaded from DB)
    const inputValue = isNaN(parsed) ? 0 : parsed;

    if (Math.abs(inputValue - currentRoundOff) > 0.05) {
      setRoundOffInput(currentRoundOff === 0 ? "" : currentRoundOff.toString());
    }
  }, [currentRoundOff]);

  // --- AUTOMATIC TOTAL RE-CALCULATION ---
  useEffect(() => {
    if (mode === "view") return;

    const reCalcTotal =
      Math.round((netBeforeRound + Number.EPSILON) * 100) / 100;

    const isTotalZero = sale.total_amount === 0;
    const hasItems = sale.items.length > 0;

    if (
      Math.abs(sale.total_amount - reCalcTotal) > 0.5 ||
      (isTotalZero && hasItems)
    ) {
      onSaleChange({ ...sale, total_amount: reCalcTotal });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, sale.discount]);

  // Keyboard Navigation: Enter to Next Field
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global shortcuts
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

  // Handle Enter key for form navigation
  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // Find all focusable elements within the container
      const focusable = containerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable) {
        const elements = Array.from(focusable) as HTMLElement[];
        const index = elements.indexOf(e.target as HTMLElement);
        if (index > -1 && index < elements.length - 1) {
          e.preventDefault();
          elements[index + 1].focus();
        }
      }
    }
  };

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

  const handleManualRoundOffChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const valStr = e.target.value;
    setRoundOffInput(valStr);

    // Only update calculation if it's a valid number
    // This allows typing "-" or "." without resetting
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      const newTotal = netBeforeRound + val;
      const roundedTotal = Math.round((newTotal + Number.EPSILON) * 100) / 100;
      onSaleChange({ ...sale, total_amount: roundedTotal });
    } else if (valStr === "" || valStr === "-") {
      // If empty or just minus sign, we don't update the total yet,
      // or we could reset to netBeforeRound if empty?
      // Let's reset to base total if completely empty
      if (valStr === "") {
        const roundedTotal =
          Math.round((netBeforeRound + Number.EPSILON) * 100) / 100;
        onSaleChange({ ...sale, total_amount: roundedTotal });
      }
    }
  };

  const handlePaidInFull = () => {
    onSaleChange({ ...sale, paid_amount: sale.total_amount, status: "paid" });
  };

  const handleCancel = () => {
    resetForm();
    toast("Operation canceled.");
  };

  // Helper for options multi-select
  const saleOptions = [
    { label: "Reverse Charge", value: "is_reverse_charge" },
    { label: "E-Commerce", value: "is_ecommerce_sale" },
  ];

  const selectedOptions = [
    ...(sale.is_reverse_charge ? ["is_reverse_charge"] : []),
    ...(sale.is_ecommerce_sale ? ["is_ecommerce_sale"] : []),
  ];

  const handleOptionsChange = (event: any) => {
    const {
      target: { value },
    } = event;
    const values = typeof value === "string" ? value.split(",") : value;

    onSaleChange({
      ...sale,
      is_reverse_charge: values.includes("is_reverse_charge"),
      is_ecommerce_sale: values.includes("is_ecommerce_sale"),
    });
  };

  const handleSubmit = async () => {
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

        const itemsList = savedSale.items
          .map(
            (item: any, index: number) =>
              `${index + 1}. ${item.product_name} x ${item.quantity} = ₹${(
                item.quantity * item.rate
              ).toLocaleString("en-IN")}`,
          )
          .join(nl);

        const shopName = shop?.shop_name || "Our Shop";
        const message =
          `*${shopName}*${nl}` +
          `Invoice Summary${nl}` +
          `———————————————${nl}${nl}` +
          `Hello ${customer?.name || "Customer"},${nl}${nl}` +
          `🧾 *Bill No:* ${savedSale.reference_no}${nl}` +
          `📅 *Date:* ${new Date(savedSale.created_at || Date.now()).toLocaleDateString("en-IN")}${nl}${nl}` +
          `*Items Purchased:*${nl}` +
          `${itemsList}${nl}${nl}` +
          `———————————————${nl}` +
          `*Total Amount:* ₹${savedSale.total_amount.toLocaleString("en-IN")}${nl}` +
          `———————————————${nl}${nl}` +
          `Thank you for shopping with us 🙏${nl}` +
          `Please find your invoice PDF attached.`;
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
    <Box
      sx={{ bgcolor: theme.palette.background.default }}
      ref={containerRef}
      onKeyDown={handleContainerKeyDown}
    >
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
          alignItems="flex-start"
          spacing={3}
        >
          {/* SECTION 1: Totals & Breakdown (Left) */}
          <Stack spacing={1} flex={1} maxWidth={{ lg: "30%" }}>
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
            </Stack>

            <Typography
              variant="body2"
              fontStyle="italic"
              color="text.secondary"
            >
              {numberToWords(sale.total_amount)}
            </Typography>

            <Divider sx={{ width: "100%", my: 1 }} />

            <Stack spacing={0} sx={{ opacity: 0.8 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Subtotal:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {subtotal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Stack>
              {discountPct > 0 && (
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  color="error.main"
                >
                  <Typography variant="body2">
                    Discount ({discountPct}%):
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    -{" "}
                    {discountAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Stack>
              )}
              {/* Round Off Display (Read-Only on Left) */}
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body2" color="text.secondary">
                  Round Off:
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color={
                    currentRoundOff !== 0 ? "text.primary" : "text.secondary"
                  }
                >
                  {currentRoundOff > 0 ? "+" : ""}
                  {currentRoundOff.toFixed(2)}
                </Typography>
              </Stack>
            </Stack>
          </Stack>

          {/* SECTION 2: Center Grid (Inputs) */}
          <Box flex={2} width="100%">
            {!isViewMode ? (
              <Grid container spacing={2}>
                {/* Row 1: Discount, Round Off, Paid Amount */}
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Disc %"
                    size="small"
                    fullWidth
                    type="number"
                    variant="outlined"
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
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Round Off"
                    size="small"
                    fullWidth
                    type="number"
                    variant="outlined"
                    value={roundOffInput}
                    onChange={handleManualRoundOffChange}
                    placeholder="0.00"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">₹</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Paid Amount"
                    size="small"
                    fullWidth
                    type="number"
                    variant="outlined"
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
                      endAdornment: (
                        <InputAdornment position="end">
                          <Button
                            size="small"
                            onClick={handlePaidInFull}
                            disabled={sale.paid_amount >= sale.total_amount}
                            sx={{
                              minWidth: "auto",
                              p: 0.5,
                              fontSize: "0.75rem",
                            }}
                          >
                            FULL
                          </Button>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                {/* Row 2: Mode, Status, Options */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="Mode"
                    size="small"
                    fullWidth
                    variant="outlined"
                    value={sale.payment_mode}
                    onChange={(e) =>
                      handleFieldChange("payment_mode", e.target.value)
                    }
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="upi">UPI</MenuItem>
                    <MenuItem value="card">Card</MenuItem>
                    <MenuItem value="credit">Credit</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    variant="outlined"
                    value={sale.status}
                    onChange={(e) =>
                      handleFieldChange("status", e.target.value)
                    }
                  >
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl size="small" fullWidth variant="outlined">
                    <InputLabel>Options</InputLabel>
                    <Select
                      multiple
                      value={selectedOptions}
                      onChange={handleOptionsChange}
                      input={<OutlinedInput label="Options" />}
                      renderValue={(selected) => (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Settings size={14} />
                          <Typography variant="caption">
                            {selected.length} selected
                          </Typography>
                        </Stack>
                      )}
                    >
                      {saleOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          <Checkbox
                            checked={selectedOptions.indexOf(option.value) > -1}
                            size="small"
                          />
                          <ListItemText primary={option.label} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            ) : (
              /* VIEW MODE SUMMARY */
              <Stack
                direction="row"
                spacing={3}
                alignItems="center"
                justifyContent="center"
                sx={{
                  height: "100%",
                  p: 2,
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
                <Divider orientation="vertical" flexItem />
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
          </Box>

          {/* SECTION 3: Actions (Right) */}
          {!isViewMode && (
            <Stack spacing={2} alignItems="flex-end" minWidth={200}>
              {/* Checkboxes Row */}
              <Stack direction="row" spacing={2} justifyContent="flex-end">
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
              <Stack direction="row" spacing={1} width="100%">
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  fullWidth
                  sx={{ flex: 1 }}
                >
                  CANCEL
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  fullWidth
                  sx={{ flex: 1.5, minHeight: 44, fontWeight: "bold" }}
                  startIcon={
                    isSubmitting && (
                      <CircularProgress size={20} color="inherit" />
                    )
                  }
                >
                  {isSubmitting ? "..." : mode === "edit" ? "UPDATE" : "SAVE"}
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
