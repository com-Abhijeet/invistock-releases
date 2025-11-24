import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Typography,
  Box,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import toast from "react-hot-toast";
import axios from "axios";
import { Info } from "lucide-react";
import type { ShopSetupForm } from "../../lib/types/shopTypes";
import { api } from "../../lib/api/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ShopSetupModal({ open, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<ShopSetupForm>({
    shop_name: "",
    owner_name: "",
    contact_number: "",
    email: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    gstin: "",
    gst_registration_type: "regular",
    pan_number: "",
    logo_url: "",
    website_url: "",

    invoice_prefix: "INV-",
    invoice_start_number: 1,
    financial_year_start: "01-04",
    gst_enabled: true,
    inclusive_tax_pricing: true,
    default_gst_rate: 18,
    hsn_required: true,
    gst_invoice_format: "Tax Invoice",
    show_gst_breakup: true,
    currency_symbol: "₹",
    currency_position: "before",
    date_format: "DD/MM/YYYY",
    time_format: "24h",
    default_payment_mode: "cash",
    allow_negative_stock: false,
    low_stock_threshold: 5,
    default_printer: "",
    print_after_save: false,
    label_template_default: "",
    label_printer_width_mm: 50,
    theme: "light",
    language: "en",
    round_off_total: true,
    show_discount_column: true,
    barcode_prefix: "",
    enable_auto_backup: true,
    backup_path: "",

    bank_account_no: 0,
    bank_account_ifsc_code: "",
    bank_account_holder_name: "",
    bank_account_type: "current",
    bank_account_branch: "",
    bank_name: "",
    upi_id: "",
    upi_banking_name: "",
    invoice_printer_name: "",
    invoice_printer_width_mm: "",
    label_printer_name: "",
    shop_alias: "",
    silent_printing: false,
    use_alias_on_bills: false,
  });

  // form updater
  const updateForm = <K extends keyof ShopSetupForm>(
    key: K,
    value: ShopSetupForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Submit
  const handleSubmit = async () => {
    try {
      // ✅ Use the 'api' instance and relative path
      await api.post("/api/shop/", {
        shop: form,
      });
      toast.success("Setup complete");
      onClose();
      onSuccess();
    } catch (error: unknown) {
      console.error(error);
      // Safely derive an error message from axios errors or generic Error
      let errorMessage = "Setup failed";
      if (axios.isAxiosError(error)) {
        // axios error: try to read server-provided message, fall back to axios message
        errorMessage = (error.response?.data as any)?.error || error.message || errorMessage;
      } else if (error instanceof Error) {
        // generic Error
        errorMessage = error.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  // helper for label + optional tooltip
  const LabelWithTooltip: React.FC<{ label: string; tip?: string }> = ({
    label,
    tip,
  }) => (
    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
      <Typography variant="body2" fontWeight={600}>
        {label}
      </Typography>
      {tip ? (
        <Tooltip title={tip}>
          <IconButton size="small" aria-label={`${label} info`}>
            <Info size={14} />
          </IconButton>
        </Tooltip>
      ) : null}
    </Box>
  );

  const handlePickLogo = async () => {
    if (window.electron?.ipcRenderer?.invoke) {
      const filePath = await window.electron.ipcRenderer.invoke("select-logo");
      if (filePath) {
        updateForm("logo_url", filePath);
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Register Your Shop</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} mt={1}>
          {/* Basic Info */}
          <Grid item xs={12}>
            <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <LabelWithTooltip label="Shop Name" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.shop_name}
                    onChange={(e) => updateForm("shop_name", e.target.value)}
                    placeholder="e.g. Billing Enterprisess"
                  />
                </Grid>
                <Grid item xs={6}>
                  <LabelWithTooltip label="Owner Name" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.owner_name}
                    onChange={(e) => updateForm("owner_name", e.target.value)}
                  />
                </Grid>

                <Grid item xs={4}>
                  <LabelWithTooltip label="Phone" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.contact_number}
                    onChange={(e) =>
                      updateForm("contact_number", e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={4}>
                  <LabelWithTooltip label="Email" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                  />
                </Grid>
                <Grid item xs={4}>
                  <LabelWithTooltip
                    label="Website"
                    tip="Optional: website printed on invoices"
                  />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.website_url}
                    onChange={(e) => updateForm("website_url", e.target.value)}
                  />
                </Grid>

                <Grid item xs={4}>
                  <LabelWithTooltip
                    label="Invoice Prefix"
                    tip='Prefix for invoice numbers, e.g. "INV-"'
                  />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.invoice_prefix}
                    onChange={(e) =>
                      updateForm("invoice_prefix", e.target.value)
                    }
                    placeholder="INV-"
                  />
                </Grid>
                <Grid item xs={4}>
                  <LabelWithTooltip
                    label="Invoice Start No."
                    tip="Starting invoice number"
                  />
                  <TextField
                    size="small"
                    type="number"
                    fullWidth
                    value={form.invoice_start_number}
                    onChange={(e) =>
                      updateForm(
                        "invoice_start_number",
                        Number(e.target.value || 0)
                      )
                    }
                  />
                </Grid>
                <Grid item xs={4}>
                  <LabelWithTooltip
                    label="Financial Year Start"
                    tip='Format DD-MM, e.g. "01-04" (1st April)'
                  />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.financial_year_start}
                    onChange={(e) =>
                      updateForm("financial_year_start", e.target.value)
                    }
                    placeholder="01-04"
                  />
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Address */}
          <Grid item xs={12}>
            <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Address
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <LabelWithTooltip label="Address Line 1" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.address_line1}
                    onChange={(e) =>
                      updateForm("address_line1", e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <LabelWithTooltip label="Address Line 2" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.address_line2}
                    onChange={(e) =>
                      updateForm("address_line2", e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={3}>
                  <LabelWithTooltip label="City" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.city}
                    onChange={(e) => updateForm("city", e.target.value)}
                  />
                </Grid>
                <Grid item xs={3}>
                  <LabelWithTooltip label="State" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.state}
                    onChange={(e) => updateForm("state", e.target.value)}
                  />
                </Grid>
                <Grid item xs={3}>
                  <LabelWithTooltip label="Pincode" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.pincode}
                    onChange={(e) => updateForm("pincode", e.target.value)}
                  />
                </Grid>
                <Grid item xs={3}>
                  <LabelWithTooltip label="Country" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.country}
                    onChange={(e) => updateForm("country", e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Branding
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={8}>
                  <LabelWithTooltip
                    label="Logo URL"
                    tip="Select an image from your system to use as logo"
                  />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.logo_url}
                    onChange={(e) => updateForm("logo_url", e.target.value)}
                    placeholder="Path to logo image"
                  />
                </Grid>
                <Grid item xs={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{ mt: 3 }}
                    onClick={handlePickLogo}
                  >
                    Choose Logo
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Banking & Payment Details */}
          <Grid item xs={12}>
            <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Banking & Payment Details
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <LabelWithTooltip label="Bank Account No." />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.bank_account_no}
                    onChange={(e) =>
                      updateForm("bank_account_no", Number(e.target.value))
                    }
                  />
                </Grid>

                <Grid item xs={4}>
                  <LabelWithTooltip label="IFSC Code" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.bank_account_ifsc_code}
                    onChange={(e) =>
                      updateForm("bank_account_ifsc_code", e.target.value)
                    }
                  />
                </Grid>

                <Grid item xs={4}>
                  <LabelWithTooltip label="Bank Name" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.bank_name}
                    onChange={(e) => updateForm("bank_name", e.target.value)}
                  />
                </Grid>

                <Grid item xs={4}>
                  <LabelWithTooltip label="Account Holder Name" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.bank_account_holder_name}
                    onChange={(e) =>
                      updateForm("bank_account_holder_name", e.target.value)
                    }
                  />
                </Grid>

                <Grid item xs={4}>
                  <LabelWithTooltip label="Account Type" />
                  <TextField
                    size="small"
                    select
                    fullWidth
                    value={form.bank_account_type}
                    onChange={(e) =>
                      updateForm(
                        "bank_account_type",
                        e.target.value as ShopSetupForm["bank_account_type"]
                      )
                    }
                  >
                    <MenuItem value="savings">Savings</MenuItem>
                    <MenuItem value="current">Current</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={4}>
                  <LabelWithTooltip label="Branch" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.bank_account_branch}
                    onChange={(e) =>
                      updateForm("bank_account_branch", e.target.value)
                    }
                  />
                </Grid>

                <Grid item xs={4}>
                  <LabelWithTooltip label="UPI ID" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.upi_id}
                    onChange={(e) => updateForm("upi_id", e.target.value)}
                  />
                </Grid>

                <Grid item xs={4}>
                  <LabelWithTooltip label="UPI Banking Name" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.upi_banking_name}
                    onChange={(e) =>
                      updateForm("upi_banking_name", e.target.value)
                    }
                  />
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Divider */}
          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* GST Details */}
          <Grid item xs={12}>
            <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                GST Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <LabelWithTooltip label="GSTIN" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.gstin}
                    onChange={(e) => updateForm("gstin", e.target.value)}
                  />
                </Grid>
                <Grid item xs={4}>
                  <LabelWithTooltip
                    label="GST Reg. Type"
                    tip="Regular / Composition / Unregistered"
                  />
                  <TextField
                    size="small"
                    select
                    fullWidth
                    value={form.gst_registration_type}
                    onChange={(e) =>
                      updateForm(
                        "gst_registration_type",
                        e.target.value as ShopSetupForm["gst_registration_type"]
                      )
                    }
                  >
                    <MenuItem value="regular">Regular</MenuItem>
                    <MenuItem value="composition">Composition</MenuItem>
                    <MenuItem value="unregistered">Unregistered</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={4}>
                  <LabelWithTooltip label="PAN Number" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.pan_number}
                    onChange={(e) => updateForm("pan_number", e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* GST Preferences */}
          <Grid item xs={12}>
            <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                GST Preferences
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.gst_enabled}
                        onChange={(e) =>
                          updateForm("gst_enabled", e.target.checked)
                        }
                      />
                    }
                    label="Enable GST"
                  />
                </Grid>

                <Grid item xs={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.inclusive_tax_pricing}
                        onChange={(e) =>
                          updateForm("inclusive_tax_pricing", e.target.checked)
                        }
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography>Inclusive Tax</Typography>
                        <Tooltip title="If ON, prices entered will be treated as inclusive of GST.">
                          <Info size={14} />
                        </Tooltip>
                      </Box>
                    }
                  />
                </Grid>

                <Grid item xs={3}>
                  <LabelWithTooltip
                    label="Default GST Rate (%)"
                    tip="Used when creating new products"
                  />
                  <TextField
                    size="small"
                    type="number"
                    fullWidth
                    value={form.default_gst_rate}
                    onChange={(e) =>
                      updateForm(
                        "default_gst_rate",
                        Number(e.target.value || 0)
                      )
                    }
                  />
                </Grid>

                <Grid item xs={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.hsn_required}
                        onChange={(e) =>
                          updateForm("hsn_required", e.target.checked)
                        }
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography>HSN Required</Typography>
                        <Tooltip title="Require HSN code for products when adding them.">
                          <Info size={14} />
                        </Tooltip>
                      </Box>
                    }
                  />
                </Grid>

                <Grid item xs={6}>
                  <LabelWithTooltip
                    label="GST Invoice Format"
                    tip='Select "Tax Invoice" or "Bill of Supply" (composition taxpayers)'
                  />
                  <TextField
                    size="small"
                    select
                    fullWidth
                    value={form.gst_invoice_format}
                    onChange={(e) =>
                      updateForm("gst_invoice_format", e.target.value)
                    }
                  >
                    <MenuItem value="Tax Invoice">Tax Invoice</MenuItem>
                    <MenuItem value="Bill of Supply">Bill of Supply</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.show_gst_breakup}
                        onChange={(e) =>
                          updateForm("show_gst_breakup", e.target.checked)
                        }
                      />
                    }
                    label="Show GST Breakup"
                  />
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Application Preferences */}
          <Grid item xs={12}>
            <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Application Preferences
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={2}>
                  <LabelWithTooltip label="Currency Symbol" />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.currency_symbol}
                    onChange={(e) =>
                      updateForm("currency_symbol", e.target.value)
                    }
                  />
                </Grid>

                <Grid item xs={2}>
                  <LabelWithTooltip label="Currency Position" />
                  <TextField
                    size="small"
                    select
                    fullWidth
                    value={form.currency_position}
                    onChange={(e) =>
                      updateForm(
                        "currency_position",
                        e.target.value as ShopSetupForm["currency_position"]
                      )
                    }
                  >
                    <MenuItem value="before">Before (₹ 100)</MenuItem>
                    <MenuItem value="after">After (100 ₹)</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={3}>
                  <LabelWithTooltip label="Date Format" />
                  <TextField
                    size="small"
                    select
                    fullWidth
                    value={form.date_format}
                    onChange={(e) => updateForm("date_format", e.target.value)}
                  >
                    <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                    <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                    <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={2}>
                  <LabelWithTooltip label="Time Format" />
                  <TextField
                    size="small"
                    select
                    fullWidth
                    value={form.time_format}
                    onChange={(e) =>
                      updateForm(
                        "time_format",
                        e.target.value as ShopSetupForm["time_format"]
                      )
                    }
                  >
                    <MenuItem value="24h">24h</MenuItem>
                    <MenuItem value="12h">12h</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={3}>
                  <LabelWithTooltip label="Language" />
                  <TextField
                    size="small"
                    select
                    fullWidth
                    value={form.language}
                    onChange={(e) => updateForm("language", e.target.value)}
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="hi">हिन्दी</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={3}>
                  <LabelWithTooltip label="Theme" />
                  <TextField
                    size="small"
                    select
                    fullWidth
                    value={form.theme}
                    onChange={(e) =>
                      updateForm(
                        "theme",
                        e.target.value as ShopSetupForm["theme"]
                      )
                    }
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={3}>
                  <LabelWithTooltip label="Default Payment Mode" />
                  <TextField
                    size="small"
                    select
                    fullWidth
                    value={form.default_payment_mode}
                    onChange={(e) =>
                      updateForm("default_payment_mode", e.target.value)
                    }
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="card">Card</MenuItem>
                    <MenuItem value="upi">UPI</MenuItem>
                    <MenuItem value="on_credit">On Credit</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.round_off_total}
                        onChange={(e) =>
                          updateForm("round_off_total", e.target.checked)
                        }
                      />
                    }
                    label="Round Off Totals"
                  />
                </Grid>

                <Grid item xs={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.show_discount_column}
                        onChange={(e) =>
                          updateForm("show_discount_column", e.target.checked)
                        }
                      />
                    }
                    label="Show Discount Column"
                  />
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Inventory Settings */}
          <Grid item xs={12}>
            <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Inventory Settings
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.allow_negative_stock}
                        onChange={(e) =>
                          updateForm("allow_negative_stock", e.target.checked)
                        }
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography>Allow Negative Stock</Typography>
                        <Tooltip title="If ON, POS will allow selling even if stock goes below zero.">
                          <Info size={14} />
                        </Tooltip>
                      </Box>
                    }
                  />
                </Grid>

                <Grid item xs={3}>
                  <LabelWithTooltip
                    label="Low Stock Threshold"
                    tip="Triggers low stock alert when below this value"
                  />
                  <TextField
                    size="small"
                    type="number"
                    fullWidth
                    value={form.low_stock_threshold}
                    onChange={(e) =>
                      updateForm(
                        "low_stock_threshold",
                        Number(e.target.value || 0)
                      )
                    }
                  />
                </Grid>

                <Grid item xs={6}>
                  <LabelWithTooltip
                    label="Barcode Prefix"
                    tip="Prefix for barcodes you generate internally"
                  />
                  <TextField
                    size="small"
                    fullWidth
                    value={form.barcode_prefix}
                    onChange={(e) =>
                      updateForm("barcode_prefix", e.target.value)
                    }
                  />
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Printing Settings */}
          <Grid item xs={12}>
            <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 2, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Printing Settings
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.print_after_save}
                        onChange={(e) =>
                          updateForm("print_after_save", e.target.checked)
                        }
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography>Print After Save</Typography>
                        <Tooltip title="If ON, invoice will auto-print after saving a sale.">
                          <Info size={14} />
                        </Tooltip>
                      </Box>
                    }
                  />
                </Grid>

                <Grid item xs={3}>
                  <LabelWithTooltip
                    label="Label Width (mm)"
                    tip="Default label width for thermal printers"
                  />
                  <TextField
                    size="small"
                    type="number"
                    fullWidth
                    value={form.label_printer_width_mm}
                    onChange={(e) =>
                      updateForm(
                        "label_printer_width_mm",
                        Number(e.target.value || 0)
                      )
                    }
                  />
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" mb={0.5}>
                    Note
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Printer selection is handled in OS / device settings. Use
                    the label width for template rendering.
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ pr: 3, pb: 2 }}>
        <Button onClick={onClose} color="secondary" variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
}
