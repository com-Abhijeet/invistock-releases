import { useState } from "react";
import {
  Button,
  TextField,
  Typography,
  Box,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy"; // Standard Grid
import {
  Info,
  Upload,
  ArrowRight,
  Check,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import type { ShopSetupForm } from "../../lib/types/shopTypes";
import { api } from "../../lib/api/api";

type Props = {
  onSuccess: () => void;
};

// Helper for Financial Year
const getCurrentFinancialYear = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan
  return month >= 3
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
};

// Steps Definition
const STEPS = [
  "Essentials",
  "Location",
  "Compliance & Bank",
  "Preferences",
  "Account Info",
];

export default function ShopSetupWizard({ onSuccess }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Initial Form State
  const [form, setForm] = useState<ShopSetupForm>({
    shop_name: "",
    owner_name: "",
    contact_number: "",
    email: "",

    // Address (Optional)
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",

    // Compliance (Optional)
    gstin: "",
    gst_registration_type: "regular",
    pan_number: "",
    bank_account_no: 0,
    bank_account_ifsc_code: "",
    bank_account_holder_name: "",
    bank_account_type: "current",
    bank_account_branch: "",
    bank_name: "",
    upi_id: "",
    upi_banking_name: "",

    // Preferences (Defaults)
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
    invoice_printer_name: "",
    invoice_printer_width_mm: "",
    label_printer_name: "",
    shop_alias: "",
    silent_printing: false,
    use_alias_on_bills: false,
    last_reset_fy: getCurrentFinancialYear(),
    invoice_template_id: "1",
    label_template_id: "gen_standard",
  });

  const updateForm = <K extends keyof ShopSetupForm>(
    key: K,
    value: ShopSetupForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePickLogo = async () => {
    if (window.electron?.ipcRenderer?.invoke) {
      try {
        const result = await window.electron.ipcRenderer.invoke("select-logo");

        // Backend returns: { success: boolean, fileName?: string, error?: string }
        if (result && result.success && result.fileName) {
          updateForm("logo_url", result.fileName);
          toast.success("Logo selected successfully");
        } else if (result && result.error) {
          toast.error(result.error);
        }
      } catch (err) {
        console.error("Failed to select logo:", err);
        toast.error("Could not select logo");
      }
    }
  };

  // Validation Logic
  const canProceed = () => {
    if (activeStep === 0) {
      // Essentials are strictly required
      return (
        form.shop_name.trim() !== "" &&
        form.owner_name.trim() !== "" &&
        form.contact_number.trim() !== ""
      );
    }
    return true; // Other steps are optional/have defaults
  };

  const handleNext = () => {
    if (canProceed()) {
      setActiveStep((prev) => prev + 1);
    } else {
      toast.error("Please fill in all required fields.");
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSkip = () => {
    // Skip logic: just move next.
    // Backend handles empty strings fine, and form has valid defaults.
    setActiveStep((prev) => prev + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post("/api/shop/", { shop: form });
      toast.success("Shop setup complete!");
      onSuccess();
    } catch (error: any) {
      console.error(error);
      const msg =
        error.response?.data?.error || error.message || "Setup failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Helper Component for Form Labels
  const Label = ({ text, tooltip }: { text: string; tooltip?: string }) => (
    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
      <Typography variant="body2" fontWeight={600} color="text.primary">
        {text}
      </Typography>
      {tooltip && (
        <Tooltip title={tooltip} arrow>
          <Info size={14} className="text-gray-400 cursor-pointer" />
        </Tooltip>
      )}
    </Box>
  );

  // --- Step Content Renderers ---

  const renderEssentials = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Let's get the basics down.
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          These details will appear on your invoices and reports.
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Label text="Shop Name" />
        <TextField
          fullWidth
          required
          placeholder="e.g. My Awesome Store"
          value={form.shop_name}
          onChange={(e) => updateForm("shop_name", e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <Label text="Owner Name" />
        <TextField
          fullWidth
          required
          placeholder="Your Full Name"
          value={form.owner_name}
          onChange={(e) => updateForm("owner_name", e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <Label text="Contact Number" />
        <TextField
          fullWidth
          required
          placeholder="10-digit Mobile Number"
          value={form.contact_number}
          onChange={(e) => updateForm("contact_number", e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <Label text="Email Address (Optional)" />
        <TextField
          fullWidth
          placeholder="business@example.com"
          value={form.email}
          onChange={(e) => updateForm("email", e.target.value)}
        />
      </Grid>
    </Grid>
  );

  const renderLocation = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6">Where are you located?</Typography>
        <Typography variant="body2" color="text.secondary">
          You can skip this if you run an online-only business or want to set it
          later.
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Label text="Address Line 1" />
        <TextField
          fullWidth
          value={form.address_line1}
          onChange={(e) => updateForm("address_line1", e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <Label text="Address Line 2" />
        <TextField
          fullWidth
          value={form.address_line2}
          onChange={(e) => updateForm("address_line2", e.target.value)}
        />
      </Grid>
      <Grid item xs={6}>
        <Label text="City" />
        <TextField
          fullWidth
          value={form.city}
          onChange={(e) => updateForm("city", e.target.value)}
        />
      </Grid>
      <Grid item xs={6}>
        <Label text="State" />
        <TextField
          fullWidth
          value={form.state}
          onChange={(e) => updateForm("state", e.target.value)}
        />
      </Grid>
      <Grid item xs={6}>
        <Label text="Pincode" />
        <TextField
          fullWidth
          value={form.pincode}
          onChange={(e) => updateForm("pincode", e.target.value)}
        />
      </Grid>
      <Grid item xs={6}>
        <Label text="Country" />
        <TextField
          fullWidth
          value={form.country}
          onChange={(e) => updateForm("country", e.target.value)}
        />
      </Grid>
    </Grid>
  );

  const renderCompliance = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6">Tax & Banking</Typography>
        <Typography variant="body2" color="text.secondary">
          Set up your GST and bank details for invoices.
        </Typography>
      </Grid>

      {/* GST Section */}
      <Grid item xs={12}>
        <Divider textAlign="left">
          <Typography variant="caption" color="text.secondary">
            GST DETAILS
          </Typography>
        </Divider>
      </Grid>
      <Grid item xs={6}>
        <Label text="GSTIN" />
        <TextField
          fullWidth
          size="small"
          value={form.gstin}
          onChange={(e) => updateForm("gstin", e.target.value)}
        />
      </Grid>
      <Grid item xs={6}>
        <Label text="GST Reg. Type" />
        <TextField
          select
          fullWidth
          size="small"
          value={form.gst_registration_type}
          onChange={(e) =>
            updateForm("gst_registration_type", e.target.value as any)
          }
        >
          <MenuItem value="regular">Regular</MenuItem>
          <MenuItem value="composition">Composition</MenuItem>
          <MenuItem value="unregistered">Unregistered</MenuItem>
        </TextField>
      </Grid>

      {/* Banking Section */}
      <Grid item xs={12}>
        <Divider textAlign="left">
          <Typography variant="caption" color="text.secondary">
            BANKING
          </Typography>
        </Divider>
      </Grid>
      <Grid item xs={6}>
        <Label text="Bank Name" />
        <TextField
          fullWidth
          size="small"
          value={form.bank_name}
          onChange={(e) => updateForm("bank_name", e.target.value)}
        />
      </Grid>
      <Grid item xs={6}>
        <Label text="Account No." />
        <TextField
          fullWidth
          size="small"
          value={form.bank_account_no || ""}
          onChange={(e) =>
            updateForm("bank_account_no", Number(e.target.value))
          }
        />
      </Grid>
      <Grid item xs={6}>
        <Label text="IFSC Code" />
        <TextField
          fullWidth
          size="small"
          value={form.bank_account_ifsc_code}
          onChange={(e) => updateForm("bank_account_ifsc_code", e.target.value)}
        />
      </Grid>
      <Grid item xs={6}>
        <Label text="UPI ID" tooltip="Used for generating UPI QR codes" />
        <TextField
          fullWidth
          size="small"
          value={form.upi_id}
          onChange={(e) => updateForm("upi_id", e.target.value)}
        />
      </Grid>
      <Grid item xs={6}>
        <Label
          text="UPI Banking Name"
          tooltip="Merchant name for UPI (e.g. Shop Name)"
        />
        <TextField
          fullWidth
          size="small"
          value={form.upi_banking_name}
          onChange={(e) => updateForm("upi_banking_name", e.target.value)}
        />
      </Grid>
    </Grid>
  );

  const renderPreferences = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6">Final Touches</Typography>
        <Typography variant="body2" color="text.secondary">
          Customize how the app looks and works.
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="subtitle2">Shop Logo</Typography>
            <Typography variant="caption" color="text.secondary">
              {form.logo_url && typeof form.logo_url === "string"
                ? "Logo selected"
                : "No logo uploaded"}
            </Typography>
          </Box>
          <Button
            startIcon={<Upload size={16} />}
            size="small"
            variant="outlined"
            onClick={handlePickLogo}
          >
            Select File
          </Button>
        </Paper>
        {form.logo_url && typeof form.logo_url === "string" && (
          <Typography
            variant="caption"
            color="success.main"
            mt={1}
            display="block"
            sx={{ wordBreak: "break-all" }}
          >
            ✓ {form.logo_url}
          </Typography>
        )}
      </Grid>

      <Grid item xs={6}>
        <Label text="Theme" />
        <TextField
          select
          fullWidth
          size="small"
          value={form.theme}
          onChange={(e) => updateForm("theme", e.target.value as any)}
        >
          <MenuItem value="light">Light</MenuItem>
          <MenuItem value="dark">Dark</MenuItem>
        </TextField>
      </Grid>
      <Grid item xs={6}>
        <Label text="Language" />
        <TextField
          select
          fullWidth
          size="small"
          value={form.language}
          onChange={(e) => updateForm("language", e.target.value)}
        >
          <MenuItem value="en">English</MenuItem>
          <MenuItem value="hi">हिन्दी</MenuItem>
        </TextField>
      </Grid>

      <Grid item xs={12}>
        <Divider textAlign="left">
          <Typography variant="caption" color="text.secondary">
            TAX & BILLING
          </Typography>
        </Divider>
      </Grid>

      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Checkbox
              checked={form.gst_enabled}
              onChange={(e) => updateForm("gst_enabled", e.target.checked)}
            />
          }
          label={
            <Typography variant="body2" fontWeight={600}>
              Enable GST Features
            </Typography>
          }
        />
      </Grid>

      {form.gst_enabled && (
        <>
          <Grid item xs={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.inclusive_tax_pricing}
                  onChange={(e) =>
                    updateForm("inclusive_tax_pricing", e.target.checked)
                  }
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Inclusive Pricing</Typography>
                  <Tooltip
                    title="If ON, entered prices will include tax. If OFF, tax is added on top."
                    arrow
                  >
                    <Info size={14} className="text-gray-400" />
                  </Tooltip>
                </Box>
              }
            />
          </Grid>
          <Grid item xs={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.hsn_required}
                  onChange={(e) => updateForm("hsn_required", e.target.checked)}
                />
              }
              label={<Typography variant="body2">Require HSN Codes</Typography>}
            />
          </Grid>
          <Grid item xs={6}>
            <Label
              text="Default GST %"
              tooltip="Default tax rate for new products"
            />
            <TextField
              size="small"
              type="number"
              fullWidth
              value={form.default_gst_rate}
              onChange={(e) =>
                updateForm("default_gst_rate", Number(e.target.value))
              }
            />
          </Grid>
          <Grid item xs={6}>
            <Label text="Invoice Format" />
            <TextField
              select
              size="small"
              fullWidth
              value={form.gst_invoice_format}
              onChange={(e) => updateForm("gst_invoice_format", e.target.value)}
            >
              <MenuItem value="Tax Invoice">Tax Invoice</MenuItem>
              <MenuItem value="Bill of Supply">Bill of Supply</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.show_gst_breakup}
                  onChange={(e) =>
                    updateForm("show_gst_breakup", e.target.checked)
                  }
                />
              }
              label={
                <Typography variant="body2">
                  Show Tax Breakup Table on Invoice
                </Typography>
              }
            />
          </Grid>
        </>
      )}
    </Grid>
  );

  const renderAccountInfo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Default Admin Account
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Your shop has been set up with a default administrator account.
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <Paper
          variant="outlined"
          sx={{ p: 3, bgcolor: "grey.50", textAlign: "center" }}
        >
          <Typography variant="subtitle2" color="text.secondary">
            Username
          </Typography>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            admin
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" color="text.secondary">
            Default Password
          </Typography>
          <Typography variant="h5" fontWeight="bold" color="primary.main">
            admin123
          </Typography>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Box
          display="flex"
          gap={2}
          alignItems="start"
          sx={{
            bgcolor: "info.soft",
            p: 2,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "info.main",
          }}
        >
          <ShieldAlert className="text-blue-500 shrink-0 mt-0.5" size={24} />
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Important Security Step
            </Typography>
            <Typography variant="body2">
              Please go to <strong>Administration {">"} User Management</strong>{" "}
              immediately after logging in to create a new user with your own
              secure password, or update this account.
            </Typography>
          </Box>
        </Box>
      </Grid>
    </Grid>
  );

  // --- Main Render ---

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", py: 4, px: 2 }}>
      {/* Stepper Header */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 6 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step Content */}
      <Box sx={{ minHeight: 400 }}>
        {activeStep === 0 && renderEssentials()}
        {activeStep === 1 && renderLocation()}
        {activeStep === 2 && renderCompliance()}
        {activeStep === 3 && renderPreferences()}
        {activeStep === 4 && renderAccountInfo()}
      </Box>

      {/* Navigation Actions */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 6 }}>
        <Button
          disabled={activeStep === 0 || loading}
          onClick={handleBack}
          startIcon={<ArrowLeft size={18} />}
          sx={{ visibility: activeStep === 0 ? "hidden" : "visible" }}
        >
          Back
        </Button>

        <Box display="flex" gap={2}>
          {/* Skip Button (only for optional steps 1, 2) */}
          {(activeStep === 1 || activeStep === 2) && (
            <Button onClick={handleSkip} color="inherit">
              Skip
            </Button>
          )}

          {/* Next/Finish Button */}
          {activeStep === STEPS.length - 1 ? (
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={!loading && <Check size={18} />}
            >
              {loading ? "Setting up..." : "Finish Setup"}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={activeStep === 0 && !canProceed()}
              endIcon={<ArrowRight size={18} />}
            >
              Next
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
