"use client";

import {
  Box,
  Button,
  MenuItem,
  TextField,
  Typography,
  Dialog,
  Stack,
  DialogActions,
  DialogContent,
  DialogTitle,
  Checkbox,
  CircularProgress,
  useTheme,
  Divider,
  Select,
  FormControl,
  OutlinedInput,
  ListItemText,
  alpha,
  IconButton,
  Tooltip,
  Chip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useState, useEffect, useRef } from "react";
import type { SalePayload } from "../../lib/types/salesTypes";
import { createSale, updateSale } from "../../lib/api/salesService";
import { updateSalesOrder } from "../../lib/api/salesOrderService";
import { handlePrint } from "../../lib/handleInvoicePrint";
import { createCustomer } from "../../lib/api/customerService";
import type { CustomerType } from "../../lib/types/customerTypes";
import {
  Save,
  X,
  Info,
  SlidersHorizontal,
  Banknote,
  Receipt,
  Settings,
  SplitSquareHorizontal,
  Clock,
  FileText,
} from "lucide-react";
import InvoiceSettingsModal from "../settings/InvoiceSettingsModal";
import toast from "react-hot-toast";
import { getShopData } from "../../lib/api/shopService";
import { getBusinessProfile } from "../../lib/api/businessService";
import SalesPosConfigModal, { PosConfigSettings } from "./SalesPosConfigModal";
import PostSaleTransactionModal from "./PostSaleTransactionModal";

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
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [businessId, setBusinessId] = useState("");

  const [configOpen, setConfigOpen] = useState(false);
  const [configSettings, setConfigSettings] = useState<PosConfigSettings>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("kosh_pos_config");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return {
      doPrint: true,
      doWhatsApp: true,
      paymentTiming: "before_save",
      doSplit: false,
    };
  });

  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [savedSaleForSplit, setSavedSaleForSplit] = useState<any>(null);

  const handleUpdateConfig = (newSettings: PosConfigSettings) => {
    setConfigSettings(newSettings);
    setDoPrint(newSettings.doPrint);
    setDoWhatsApp(newSettings.doWhatsApp);
    if (typeof window !== "undefined") {
      localStorage.setItem("kosh_pos_config", JSON.stringify(newSettings));
    }
  };

  const [doPrint, setDoPrint] = useState(configSettings.doPrint);
  const [doWhatsApp, setDoWhatsApp] = useState(configSettings.doWhatsApp);

  const [conflictDialog, setConflictDialog] = useState<{
    open: boolean;
    existingCustomer: any;
    newPhone: string;
  }>({
    open: false,
    existingCustomer: null,
    newPhone: "",
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const localSettingsString = localStorage.getItem("app_print_settings");
  const localSettings = localSettingsString
    ? JSON.parse(localSettingsString)
    : {};

  // --- COMPLIANT DERIVED CALCULATIONS ---
  const subtotal = sale.items.reduce(
    (sum, item) => sum + (Number(item.price) || 0),
    0,
  );
  const discountPct = Number(sale.discount) || 0;
  const discountAmount = (subtotal * discountPct) / 100;

  const netBeforeRound =
    Math.round(
      (Math.max(0, subtotal - discountAmount) + Number.EPSILON) * 100,
    ) / 100;

  const implicitRoundOff =
    Math.round((sale.total_amount - netBeforeRound + Number.EPSILON) * 100) /
    100;

  const displayRoundOff =
    mode === "view" && !sale.round_off && Math.abs(implicitRoundOff) > 0.005
      ? implicitRoundOff
      : Number(sale.round_off) || 0;

  const [roundOffInput, setRoundOffInput] = useState<string>(
    sale.round_off?.toString() || "0",
  );
  const [discountInput, setDiscountInput] = useState<string>(
    sale.discount?.toString() || "0",
  );

  // Reconciled payment data from backend (Returns/Credit Notes)
  const paymentSummary = (sale as any).payment_summary || {
    total_paid: sale.paid_amount || 0,
    total_credit_notes: 0,
    net_payable: sale.total_amount,
    balance:
      Math.round(
        (sale.total_amount - (sale.paid_amount || 0) + Number.EPSILON) * 100,
      ) / 100,
    status: sale.status || "pending",
  };

  const hasReturns = (paymentSummary.total_credit_notes || 0) > 0;

  useEffect(() => {
    if (parseFloat(discountInput) !== sale.discount) {
      setDiscountInput(sale.discount?.toString() || "0");
    }
  }, [sale.discount]);

  useEffect(() => {
    const parsed = parseFloat(roundOffInput);
    if (
      parsed !== sale.round_off &&
      roundOffInput !== "-" &&
      !roundOffInput.endsWith(".")
    ) {
      setRoundOffInput(sale.round_off?.toString() || "0");
    }
  }, [sale.round_off]);

  useEffect(() => {
    if (mode === "view") return;
    const manualRoundOff = Number(sale.round_off) || 0;
    const expectedTotal = netBeforeRound + manualRoundOff;
    if (Math.abs(sale.total_amount - expectedTotal) > 0.001) {
      onSaleChange({
        ...sale,
        total_amount: Math.round((expectedTotal + Number.EPSILON) * 100) / 100,
      });
    }
  }, [
    netBeforeRound,
    sale.round_off,
    sale.total_amount,
    mode,
    onSaleChange,
    sale,
  ]);

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
        if (sale.items.length > 0 && confirm("Are you sure?")) resetForm();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, isSubmitting, sale]);

  useEffect(() => {
    getShopData()
      .then((data) => {
        setShop(data);
        if (data?.print_after_save) setDoPrint(true);
      })
      .catch(() => setShop(null));
    getBusinessProfile()
      .then((data) => {
        if (data?.kosh_business_id) setBusinessId(data.kosh_business_id);
      })
      .catch(() => {});
  }, []);

  const handleFieldChange = (field: keyof SalePayload, value: any) => {
    onSaleChange({ ...sale, [field]: value });
  };

  const handlePaidInFull = () => {
    onSaleChange({ ...sale, paid_amount: sale.total_amount, status: "paid" });
  };

  //   UPDATED: Handler for changing paid_amount to automatically update status
  const handlePaidAmountChange = (val: number) => {
    const newStatus = val >= sale.total_amount ? "paid" : "pending";
    onSaleChange({
      ...sale,
      paid_amount: val,
      status: newStatus,
    });
  };

  const handleSubmit = async (
    resolvedCustomer?: {
      id?: number;
      phone?: string;
      name?: string;
    },
    skipWarning = false,
  ) => {
    let finalCustomerId = sale.customer_id;
    let finalCustomerName = sale.customer_name;
    const hasManualName = !!customer?.name || !!resolvedCustomer?.name;

    // Only fallback to Walk-in if no customer ID is set AND no manual name was provided
    if ((!finalCustomerId || finalCustomerId === 0) && !hasManualName) {
      try {
        // Query backend for Walk-in Customer
        const { getCustomers } = await import("../../lib/api/customerService");
        const res = await getCustomers({
          query: "Walk-in Customer",
          all: true,
        });
        let walkIn = res.records.find(
          (c: any) => c.name.toLowerCase() === "walk-in customer",
        );

        if (!walkIn) {
          const { createCustomer } =
            await import("../../lib/api/customerService");
          walkIn = await createCustomer({
            name: "Walk-in Customer",
            phone: "",
            address: "",
            city: "",
            state: "",
            pincode: "",
            gst_no: "",
          });
        }

        if (walkIn && walkIn.id) {
          finalCustomerId = walkIn.id;
          finalCustomerName = walkIn.name;
        }
      } catch (e) {
        console.error("Failed to auto-assign Walk-in Customer:", e);
      }
    }

    if (!finalCustomerId || finalCustomerId === 0) {
      if (!customer?.name || (!customer?.phone && !resolvedCustomer?.phone)) {
        toast.error("Customer Name and Phone Number are required.");
        return;
      }
    }

    // Check for paid status with small tolerance (0.01) unless bypass flag is active
    const isActuallyPaid = sale.paid_amount + 0.01 >= sale.total_amount;
    if (!skipWarning && sale.status === "paid" && !isActuallyPaid) {
      setWarningOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      let saleDataWithCustomer = { ...sale };

      if (resolvedCustomer?.id) {
        saleDataWithCustomer = {
          ...saleDataWithCustomer,
          customer_id: resolvedCustomer.id,
          customer_name: resolvedCustomer.name || finalCustomerName,
        };
      } else if (finalCustomerId && finalCustomerId !== 0) {
        saleDataWithCustomer = {
          ...saleDataWithCustomer,
          customer_id: finalCustomerId,
          customer_name: finalCustomerName,
        };
      } else if (!sale.customer_id || sale.customer_id === 0) {
        const phoneToUse = resolvedCustomer?.phone || customer?.phone!;
        try {
          const customerRes = await createCustomer({
            name: customer?.name!,
            phone: phoneToUse,
            address: customer?.address,
            city: customer?.city,
            state: customer?.state,
            pincode: customer?.pincode,
            gst_no: customer?.gst_no,
          });
          saleDataWithCustomer = {
            ...saleDataWithCustomer,
            customer_id: customerRes.id,
          };
        } catch (err: any) {
          if (
            err.response?.status === 409 &&
            err.response?.data?.existingCustomer
          ) {
            setConflictDialog({
              open: true,
              existingCustomer: err.response.data.existingCustomer,
              newPhone: "",
            });
            setIsSubmitting(false);
            return;
          }
          throw err;
        }
      }

      // Explicitly construct the final payload verifying all fields
      const payload: SalePayload = {
        ...saleDataWithCustomer,
        is_quote: Boolean(sale.is_quote),
        round_off: Number(sale.round_off) || 0, // Enforce newly added snapshot field
        items: saleDataWithCustomer.items.filter((item) => item.product_id > 0),
      };

      // If Quotation or Post-Sale payment mode is enabled: force paid_amount = 0 and status = pending
      if (sale.is_quote || (configSettings.paymentTiming === "post_save" && mode !== "edit")) {
        payload.paid_amount = 0;
        payload.status = "pending";
      }

      let savedSale;
      if (mode === "edit" && sale.id) {
        savedSale = (await updateSale(Number(sale.id), payload)).data;
        console.log("SAVED SALE", savedSale);
      } else {
        savedSale = (await createSale(payload)).data;
        console.log("SAVED SALE", savedSale);
        if (salesOrderId)
          await updateSalesOrder(salesOrderId, {
            status: "completed",
            fulfilled_invoice_id: savedSale.id,
            total_amount: sale.total_amount,
            items: [],
            customer_id: sale.customer_id || null,
          });
      }

      const printPayload = {
        ...savedSale,
        is_quote: savedSale.is_quote ?? (sale.is_quote ? 1 : 0),
      };

      setSuccess(true);
      toast.success(mode === "edit" ? "Sale Updated!" : "Sale Saved!");
      if (doPrint) handlePrint(printPayload);

      // If Post-Sale payment mode is enabled AND not a quote: open post sale modal right after save
      if (!sale.is_quote && configSettings.paymentTiming === "post_save" && mode !== "edit") {
        setSavedSaleForSplit(savedSale);
        setSplitModalOpen(true);
      }

      // --- CLOUD INVOICE / WHATSAPP LOGIC ---
      if (doWhatsApp && customer?.phone) {
        const shopName = shop?.shop_name || "Our Shop";
        let message = "";

        try {
          // 1. Construct Invoice Data for Cloud Web-Renderer
          const invoiceData = {
            business_id: businessId,
            is_quote: Boolean(savedSale.is_quote ?? sale.is_quote),
            shopName: shopName,
            shopAddress: savedSale.bill_address || "",
            gstin: savedSale.gstin || "",
            invoiceNo: savedSale.reference_no,
            date: savedSale.created_at || new Date().toISOString(),
            customerName: savedSale.customer_name || "Customer",
            customerPhone: savedSale.customer_phone || "",
            customerAddress: savedSale.customer_address || "",
            customerState: savedSale.customer_state || "",
            customerPincode: savedSale.customer_pincode || "",

            items: savedSale.items.map(
              (item: {
                rate: string;
                quantity: string;
                discount: any;
                product_name: any;
                description: any;
                unit: any;
                gst_rate: any;
                hsn: any;
              }) => {
                const itemRate = parseFloat(item.rate);
                const itemQty = parseFloat(item.quantity);
                const itemDiscountPercent = parseFloat(item.discount || 0);
                const lineTotal = itemRate * itemQty;
                const discountedAmount =
                  lineTotal - lineTotal * (itemDiscountPercent / 100);

                return {
                  name: item.product_name,
                  description: item.description,
                  qty: itemQty,
                  rate: itemRate,
                  unit: item.unit,
                  discount_percent: itemDiscountPercent,
                  amount: discountedAmount,
                  gst_rate: item.gst_rate || 0,
                  hsn: item.hsn || "",
                };
              },
            ),

            subTotal: savedSale.items.reduce(
              (sum: number, item: { rate: string; quantity: string }) => {
                return sum + parseFloat(item.rate) * parseFloat(item.quantity);
              },
              0,
            ),

            taxAmount: savedSale.total_tax || 0,
            discount: savedSale.discount || 0,
            totalAmount: savedSale.total_amount,
            roundoff: savedSale.round_off,
            paymentMode: savedSale.payment_mode,
            paymentStatus:
              savedSale.payment_summary?.status || savedSale.status,
          };

          // 2. Upload to Google Drive via IPC
          const uploadRes =
            await window.electron?.uploadInvoiceToDrive(invoiceData);

          if (uploadRes && uploadRes.success) {
            // 3A. Success! Send itemised message + Web Link
            const nl = "\n";
            const itemsList = savedSale.items
              .map(
                (item: any, index: number) =>
                  `${index + 1}. ${item.product_name} x ${item.quantity} = ₹${(
                    item.quantity * item.rate
                  ).toLocaleString("en-IN")}`,
              )
              .join(nl);

            const webLink = `https://getkosh.co.in/invoice/web-view/${uploadRes.fileId}`;

            message = `*${shopName}*${nl}Invoice Summary${nl}———————————————${nl}${nl}Hello ${customer?.name || "Customer"},${nl}${nl}🧾 *Bill No:* ${savedSale.reference_no}${nl}📅 *Date:* ${new Date(savedSale.created_at || Date.now()).toLocaleDateString("en-IN")}${nl}*Items Purchased:*${nl}${itemsList}${nl}———————————————${nl}💰 *Total Amount:* ₹${savedSale.total_amount.toLocaleString("en-IN")}${nl}———————————————${nl}🌐 *View your detailed digital bill here:*${nl}${webLink}${nl}Thank you for shopping with us! 🙏${nl}Please find the PDF copy attached below.${nl}_Powered by Kosh Billing Software_`;
          } else {
            throw new Error(uploadRes?.error || "Drive upload failed");
          }
        } catch (uploadError) {
          console.warn(
            "Cloud Invoice failed, falling back to standard text message",
            uploadError,
          );

          // 3B. Fallback: Clean string formatting without unintended indentation gaps
          const nl = "\n";
          const itemsList = savedSale.items
            .map(
              (item: any, index: number) =>
                `${index + 1}. ${item.product_name} x ${item.quantity} = ₹${(item.quantity * item.rate).toLocaleString("en-IN")}`,
            )
            .join(nl);

          message = `*${shopName}*${nl}Invoice Summary${nl}———————————————${nl}Hello ${customer?.name || "Customer"},${nl}${nl}🧾 *Bill No:* ${savedSale.reference_no}${nl}📅 *Date:* ${new Date(savedSale.created_at || Date.now()).toLocaleDateString("en-IN")}${nl}${nl}*Items Purchased:*${nl}${itemsList}${nl}${nl}———————————————${nl}*Total Amount:* ₹${savedSale.total_amount.toLocaleString("en-IN")}${nl}———————————————${nl}${nl}Thank you for shopping with us 🙏${nl}Please find your invoice PDF attached.${nl}✨ Powered by Kosh`;
        }

        // 4. Send WhatsApp Text Message
        if (window.electron?.sendWhatsAppMessage) {
          window.electron.sendWhatsAppMessage(customer.phone, message);
        }

        // 5. Send PDF Invoice via WhatsApp
        window.electron
          ?.sendWhatsAppInvoicePdf({
            sale: printPayload,
            shop: shop,
            localSettings: localSettings,
            customerPhone: customer?.phone,
          })
          .then((res: any) => {
            console.log("RESPONSE FROM PDF", res);
          })
          .catch((err: any) => {
            console.error("Error sending PDF via WhatsApp", err);
          });

        console.log("sale reference in frontend", sale.reference_no);
      }

      if (configSettings.paymentTiming !== "post_save") {
        resetForm();
      }
    } catch (err: any) {
      toast.error(err.message || "Error during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSplitModalClose = () => {
    setSplitModalOpen(false);
    setSavedSaleForSplit(null);
    resetForm();
  };

  const isViewMode = mode === "view";

  const labelStyle = {
    variant: "caption" as const,
    sx: {
      fontSize: "0.625rem",
      fontWeight: 800,
      color: "text.disabled",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      mb: 0.2,
      display: "block",
    },
  };

  const fieldBoxSx = {
    bgcolor: alpha(theme.palette.action.hover, 0.03),
    border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
    borderRadius: "4px",
    px: 1,
    py: 0.25,
    transition: "all 0.2s",
    "&:focus-within": {
      borderColor: theme.palette.primary.main,
      bgcolor: "background.paper",
    },
  };

  const inputSx = {
    "& .MuiInputBase-root": {
      fontSize: "0.85rem",
      fontWeight: 700,
      padding: 0,
    },
    "& .MuiInput-underline:before, & .MuiInput-underline:after": {
      display: "none",
    },
  };

  return (
    <Box
      sx={{
        bgcolor: theme.palette.background.paper,
        borderTop: `1px solid ${theme.palette.divider}`,
      }}
      ref={containerRef}
    >
      {/* 1. Slim Internal Notes Strip */}
      <Box
        sx={{
          px: 2,
          py: 0.5,
          bgcolor: alpha(theme.palette.action.hover, 0.02),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Receipt size={12} color={theme.palette.text.disabled} />
          <TextField
            fullWidth
            size="small"
            value={sale.note || ""}
            onChange={(e) => handleFieldChange("note", e.target.value)}
            placeholder="Billing notes..."
            variant="standard"
            disabled={isViewMode}
            sx={{
              "& .MuiInputBase-root": {
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "text.secondary",
              },
            }}
            InputProps={{ disableUnderline: true }}
          />
        </Stack>
      </Box>

      <Box sx={{ px: 2, py: 1.5 }}>
        <Grid container spacing={1} alignItems="center">
          {/* LEFT: Prominent Totals (RECONCILED) */}
          {/* LEFT: Total & Breakdown */}
          <Grid item xs={12} md={3.2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box>
                <Typography {...labelStyle}>
                  {hasReturns && isViewMode ? "Net Amount" : "Grand Total"}
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 900,
                    color:
                      hasReturns && isViewMode
                        ? theme.palette.success.dark
                        : theme.palette.secondary.main,
                    fontFamily: '"JetBrains Mono", monospace',
                    letterSpacing: -0.5,
                  }}
                >
                  {(isViewMode && hasReturns
                    ? paymentSummary.net_payable
                    : sale.total_amount
                  ).toLocaleString("en-IN", {
                    style: "currency",
                    currency: "INR",
                  })}
                </Typography>
              </Box>

              {isViewMode && hasReturns && (
                <>
                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{ height: 32, alignSelf: "center" }}
                  />
                  <Box>
                    <Typography {...labelStyle}>Gross Bill</Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography
                        variant="body2"
                        color="text.disabled"
                        sx={{ textDecoration: "line-through", fontWeight: 700 }}
                      >
                        ₹{sale.total_amount.toLocaleString()}
                      </Typography>
                      <Chip
                        label={`-₹${paymentSummary.total_credit_notes} Returned`}
                        size="small"
                        color="error"
                        variant="outlined"
                        sx={{ fontWeight: 800, height: 18, fontSize: "0.6rem" }}
                      />
                    </Stack>
                  </Box>
                </>
              )}

              <Divider
                orientation="vertical"
                flexItem
                sx={{ height: 32, alignSelf: "center" }}
              />

              <Box>
                <Typography {...labelStyle}>Breakdown</Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  <Typography
                    sx={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "text.secondary",
                    }}
                  >
                    Sub: {subtotal.toFixed(2)}
                  </Typography>
                  {discountPct > 0 && (
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: "error.main",
                      }}
                    >
                      Off: {discountAmount.toFixed(2)}
                    </Typography>
                  )}
                  {Math.abs(displayRoundOff) > 0.005 && (
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: "text.primary",
                      }}
                    >
                      Rnd: {displayRoundOff.toFixed(2)}
                    </Typography>
                  )}
                  {hasReturns && isViewMode && (
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: "error.main",
                      }}
                    >
                      Ret: -{paymentSummary.total_credit_notes.toFixed(2)}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Grid>

          {/* CENTER: Compact Inputs */}
          <Grid item xs={12} md={4.5}>
            {!isViewMode ? (
              <Grid container spacing={1}>
                {/* <Grid item xs={2}>
                  <Typography {...labelStyle}>Disc %</Typography>
                  <Box sx={fieldBoxSx}>
                    <TextField
                      fullWidth
                      type="number"
                      variant="standard"
                      value={discountInput}
                      onChange={(e) => {
                        setDiscountInput(e.target.value);
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v))
                          handleFieldChange("discount", Math.max(0, v));
                        else if (e.target.value === "")
                          handleFieldChange("discount", 0);
                      }}
                      sx={inputSx}
                    />
                  </Box>
                </Grid> */}
                {/* 1. Round Off */}
                <Grid item xs={sale.is_quote ? 4 : (configSettings.paymentTiming === "post_save" ? 2.5 : 2)}>
                  <Typography {...labelStyle}>Round Off</Typography>
                  <Box sx={fieldBoxSx}>
                    <TextField
                      fullWidth
                      type="number"
                      variant="standard"
                      value={roundOffInput}
                      onChange={(e) => {
                        setRoundOffInput(e.target.value);
                        if (e.target.value === "" || e.target.value === "-") {
                          onSaleChange({ ...sale, round_off: 0 });
                          return;
                        }
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) onSaleChange({ ...sale, round_off: v });
                      }}
                      sx={inputSx}
                    />
                  </Box>
                </Grid>

                {/* 2. GST Opt (moved right beside Round Off) */}
                <Grid item xs={sale.is_quote ? 4 : (configSettings.paymentTiming === "post_save" ? 2.5 : 2)}>
                  <Typography {...labelStyle}>GST Opt</Typography>
                  <FormControl size="small" fullWidth>
                    <Select
                      multiple
                      value={[
                        ...(sale.is_reverse_charge
                          ? ["is_reverse_charge"]
                          : []),
                        ...(sale.is_ecommerce_sale
                          ? ["is_ecommerce_sale"]
                          : []),
                      ]}
                      onChange={(e) => {
                        const v = e.target.value as string[];
                        onSaleChange({
                          ...sale,
                          is_reverse_charge: v.includes("is_reverse_charge"),
                          is_ecommerce_sale: v.includes("is_ecommerce_sale"),
                        });
                      }}
                      input={
                        <OutlinedInput
                          sx={{
                            height: 32,
                            fontSize: "0.75rem",
                            borderRadius: "4px",
                          }}
                        />
                      }
                      renderValue={() => <Settings size={14} />}
                    >
                      <MenuItem value="is_reverse_charge" dense>
                        <Checkbox
                          size="small"
                          color="secondary"
                          checked={sale.is_reverse_charge}
                        />{" "}
                        <ListItemText
                          primary="Reverse Charge"
                          primaryTypographyProps={{ fontSize: "0.75rem" }}
                        />
                      </MenuItem>
                      <MenuItem value="is_ecommerce_sale" dense>
                        <Checkbox
                          size="small"
                          color="secondary"
                          checked={sale.is_ecommerce_sale}
                        />{" "}
                        <ListItemText
                          primary="E-Commerce"
                          primaryTypographyProps={{ fontSize: "0.75rem" }}
                        />
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* 3. Payment Info / Inputs (Disabled for Quotations) */}
                {sale.is_quote ? null : configSettings.paymentTiming === "post_save" ? (
                  <Grid item xs={7}>
                    <Box sx={{ display: "flex", alignItems: "center", height: "100%", pt: 1.5 }}>
                      <Chip
                        icon={<Clock size={14} />}
                        label="Post-Sale Payment (Modal opens on Save)"
                        color="secondary"
                        variant="outlined"
                        size="small"
                        sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                      />
                    </Box>
                  </Grid>
                ) : (
                  <>
                    <Grid item xs={4.5}>
                      <Typography {...labelStyle}>Paid (Ctrl+U)</Typography>
                      <Box
                        sx={{
                          ...fieldBoxSx,
                          borderColor: alpha(theme.palette.success.main, 0.3),
                        }}
                      >
                        <TextField
                          fullWidth
                          type="number"
                          variant="standard"
                          value={sale.paid_amount ?? ""}
                          onChange={(e) =>
                            handlePaidAmountChange(parseFloat(e.target.value) || 0)
                          }
                          sx={{
                            ...inputSx,
                            "& input": { color: theme.palette.success.dark },
                          }}
                          InputProps={{
                            endAdornment: (
                              <Button
                                size="small"
                                onClick={handlePaidInFull}
                                disabled={sale.paid_amount >= sale.total_amount}
                                sx={{
                                  fontSize: "0.6rem",
                                  fontWeight: 900,
                                  minWidth: 0,
                                  p: 0,
                                }}
                              >
                                FULL
                              </Button>
                            ),
                          }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={3.5}>
                      <Typography {...labelStyle}>Mode</Typography>
                      <Box sx={fieldBoxSx}>
                        <TextField
                          select
                          fullWidth
                          variant="standard"
                          value={sale.payment_mode || "cash"}
                          onChange={(e) =>
                            handleFieldChange("payment_mode", e.target.value)
                          }
                          sx={inputSx}
                        >
                          {["cash", "upi", "card", "credit"].map((m) => (
                            <MenuItem
                              key={m}
                              value={m}
                              sx={{ fontSize: "0.75rem", fontWeight: 700 }}
                            >
                              {m.toUpperCase()}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>
                    </Grid>
                  </>
                )}
              </Grid>
            ) : (
              <Stack
                direction="row"
                spacing={3}
                sx={{
                  py: 0.5,
                  px: 2,
                  borderLeft: `2px solid ${theme.palette.divider}`,
                }}
              >
                <Box>
                  <Typography {...labelStyle}>Status</Typography>
                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: "0.8rem",
                      color:
                        paymentSummary.status === "paid"
                          ? "success.main"
                          : "warning.main",
                    }}
                  >
                    {paymentSummary.status.toUpperCase()}
                  </Typography>
                </Box>
                <Box>
                  <Typography {...labelStyle}>Total Paid</Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: "0.8rem" }}>
                    ₹{paymentSummary.total_paid.toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography {...labelStyle}>Current Balance</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: "0.8rem",
                        color:
                          paymentSummary.balance > 0
                            ? "error.main"
                            : "success.main",
                      }}
                    >
                      ₹{paymentSummary.balance.toLocaleString()}
                    </Typography>
                    {paymentSummary.balance > 0 && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        startIcon={<SplitSquareHorizontal size={12} />}
                        onClick={() => {
                          setSavedSaleForSplit(sale);
                          setSplitModalOpen(true);
                        }}
                        sx={{ fontSize: "0.65rem", fontWeight: 800, py: 0.25, px: 1, minWidth: 0 }}
                      >
                        Record Payment
                      </Button>
                    )}
                    {hasReturns && (
                      <Tooltip title="Balance is Net Amount minus Paid Amount.">
                        <Info size={12} color={theme.palette.text.disabled} />
                      </Tooltip>
                    )}
                  </Stack>
                </Box>
              </Stack>
            )}
          </Grid>

          {/* RIGHT: Actions */}
          {!isViewMode && (
            <Grid item xs={12} md={4.3}>
              <Stack direction="row" spacing={1} alignItems="center" width="100%">
                <Button
                  onClick={() => setConfigOpen(true)}
                  color="primary"
                  variant="outlined"
                  size="small"
                  startIcon={<SlidersHorizontal size={15} />}
                  sx={{
                    height: 38,
                    fontWeight: 800,
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    px: 1.5,
                    whiteSpace: "nowrap",
                  }}
                >
                  CONFIG
                </Button>
                <Button
                  color="secondary"
                  variant="contained"
                  size="small"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting}
                  startIcon={
                    isSubmitting ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <Save size={16} />
                    )
                  }
                  sx={{
                    height: 38,
                    borderRadius: "6px",
                    px: 2,
                    flex: 1,
                    textTransform: "none",
                  }}
                >
                  <Stack direction="row" spacing={0.8} alignItems="baseline">
                    <Typography variant="body2" sx={{ fontWeight: 900, fontSize: "0.85rem", letterSpacing: 0.5 }}>
                      {isSubmitting ? "..." : "SAVE"}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: "0.68rem", fontWeight: 700, opacity: 0.85 }}>
                      (Ctrl+S)
                    </Typography>
                  </Stack>
                </Button>
                <IconButton onClick={resetForm} color="error" size="small">
                  <X size={18} />
                </IconButton>
              </Stack>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Warning Dialog */}
      <Dialog
        open={warningOpen}
        onClose={() => setWarningOpen(false)}
        PaperProps={{ sx: { borderRadius: "8px" } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: "1rem" }}>
          Partial Payment Warning
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" fontWeight={600}>
            You are saving a payment of ₹{sale.paid_amount} against a total bill
            of ₹{sale.total_amount}. Do you want to adjust status to Partial and
            save?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarningOpen(false)}>Edit Amount</Button>
          <Button
            variant="contained"
            onClick={() => {
              setWarningOpen(false);
              // Automatically set status to partial and skip warning check
              onSaleChange({ ...sale, status: "pending" });
              handleSubmit(undefined, true);
            }}
          >
            Save as Partial
          </Button>
        </DialogActions>
      </Dialog>

      {/* Conflict Dialog */}
      <Dialog
        open={conflictDialog.open}
        onClose={() => setConflictDialog({ ...conflictDialog, open: false })}
        PaperProps={{ sx: { borderRadius: "8px", minWidth: "400px" } }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            fontSize: "1rem",
            color: theme.palette.error.main,
          }}
        >
          Customer Already Exists
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            A customer with the phone number <strong>{customer?.phone}</strong>{" "}
            already exists as{" "}
            <strong>{conflictDialog.existingCustomer?.name}</strong>.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
            Do you want to proceed with the existing customer, or enter a new
            phone number for {customer?.name}?
          </Typography>
          <TextField
            fullWidth
            size="small"
            label={`New Phone Number for ${customer?.name}`}
            variant="outlined"
            value={conflictDialog.newPhone}
            onChange={(e) =>
              setConflictDialog({ ...conflictDialog, newPhone: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() =>
              setConflictDialog({ ...conflictDialog, open: false })
            }
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setConflictDialog({ ...conflictDialog, open: false });
              handleSubmit({
                id: conflictDialog.existingCustomer.id,
                name: conflictDialog.existingCustomer.name,
              });
            }}
          >
            Use {conflictDialog.existingCustomer?.name}
          </Button>
          <Button
            variant="contained"
            disabled={
              !conflictDialog.newPhone || conflictDialog.newPhone.length < 10
            }
            onClick={() => {
              setConflictDialog({ ...conflictDialog, open: false });
              handleSubmit({ phone: conflictDialog.newPhone });
            }}
          >
            Save with New Phone
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sales POS Configuration Modal */}
      <SalesPosConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        settings={configSettings}
        onSaveSettings={handleUpdateConfig}
        onOpenInvoiceConfig={() => setInvoiceModalOpen(true)}
      />

      {/* Post Sale Split Payment Modal */}
      {savedSaleForSplit && (
        <PostSaleTransactionModal
          open={splitModalOpen}
          onClose={handleSplitModalClose}
          saleId={savedSaleForSplit.id}
          customerId={savedSaleForSplit.customer_id || customer?.id || 0}
          totalAmount={savedSaleForSplit.payment_summary?.balance || savedSaleForSplit.total_amount || 0}
          referenceNo={savedSaleForSplit.reference_no || ""}
        />
      )}
      {/* Invoice Settings Modal */}
      <InvoiceSettingsModal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
      />
    </Box>
  );
};

export default SaleSummarySection;
