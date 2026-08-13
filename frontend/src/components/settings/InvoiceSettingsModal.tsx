"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  TextField,
  FormControlLabel,
  Switch,
  MenuItem,
  Stack,
  Divider,
  CircularProgress,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { FormField } from "../FormField";
import { useState, useEffect } from "react";
import {
  X,
  FileText,
  Columns,
  Scale,
  Eye,
  Printer,
  Receipt,
  Check,
  User,
  Building,
  Tag,
} from "lucide-react";
import toast from "react-hot-toast";
import type { ShopSetupForm } from "../../lib/types/shopTypes";

import { getShopData, updateShopData } from "../../lib/api/shopService";

const { ipcRenderer } = window.electron || {};

export interface LocalPrintSettings {
  titles: {
    invoiceTitle: string;
    quotationTitle: string;
  };
  labels: {
    colItem: string;
    colHsn: string;
    colQty: string;
    colRate: string;
    colDisc: string;
    colGstRate: string;
    colGstAmt: string;
    colAmount: string;
    refNoLabel: string;
    dateLabel: string;
  };
  customer: {
    headerLabel: string;
    showCustomerName: boolean;
    showCustomerPhone: boolean;
    showCustomerAddress: boolean;
    showCustomerGst: boolean;
  };
  shopDetails: {
    showShopLogo: boolean;
    showShopAddress: boolean;
    showShopGst: boolean;
    showShopBankQr: boolean;
  };
  columns: {
    showHsnSac: boolean;
    showGstRateCol: boolean;
    showGstAmtCol: boolean;
    showDiscountCol: boolean;
  };
  display: {
    showGstBreakdownBottom: boolean;
    showCustomerPhone?: boolean;
    showCustomerAddress?: boolean;
    showCustomerGst?: boolean;
  };
  legal: {
    jurisdiction: string;
    disclaimer: string;
    termsAndConditions: string;
  };
}

export const DEFAULT_LOCAL_PRINT_SETTINGS: LocalPrintSettings = {
  titles: {
    invoiceTitle: "Tax Invoice",
    quotationTitle: "ESTIMATE / QUOTATION",
  },
  labels: {
    colItem: "Item Description",
    colHsn: "HSN",
    colQty: "Qty",
    colRate: "Rate",
    colDisc: "Disc %",
    colGstRate: "GST %",
    colGstAmt: "GST Amt",
    colAmount: "Amount",
    refNoLabel: "Invoice No",
    dateLabel: "Date",
  },
  customer: {
    headerLabel: "Billed To",
    showCustomerName: true,
    showCustomerPhone: true,
    showCustomerAddress: true,
    showCustomerGst: true,
  },
  shopDetails: {
    showShopLogo: true,
    showShopAddress: true,
    showShopGst: true,
    showShopBankQr: true,
  },
  columns: {
    showHsnSac: true,
    showGstRateCol: true,
    showGstAmtCol: true,
    showDiscountCol: false,
  },
  display: {
    showGstBreakdownBottom: true,
    showCustomerPhone: true,
    showCustomerAddress: true,
    showCustomerGst: true,
  },
  legal: {
    jurisdiction: "Subject to Jalna Jurisdiction only",
    disclaimer:
      "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
    termsAndConditions:
      "1. Payment must be made within 15 days.\n2. Interest @ 18% p.a. will be charged on delayed payments.\n3. Goods once sold will not be taken back.",
  },
};

export const INVOICE_TEMPLATES = [
  { id: "a4_standard", label: "A4 Standard (Classic Table)" },
  { id: "a4_modern", label: "A4 Modern (Clean & Minimal)" },
  { id: "thermal_80mm", label: "Thermal 80mm (Receipt)" },
  { id: "thermal_58mm", label: "Thermal 58mm (Compact)" },
  { id: "a5_landscape", label: "A5 Landscape" },
  { id: "a5_portrait", label: "A5 Portrait" },
  { id: "a5_portrait_modern", label: "A5 Portrait Modern" },
  { id: "a5_landscape_modern", label: "A5 Landscape Modern" },
];

interface InvoiceSettingsModalProps {
  open: boolean;
  onClose: () => void;
  shopData?: ShopSetupForm;
  onShopChange?: (field: keyof ShopSetupForm, value: any) => void;
}

export default function InvoiceSettingsModal({
  open,
  onClose,
  shopData,
  onShopChange,
}: InvoiceSettingsModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState<LocalPrintSettings>(
    DEFAULT_LOCAL_PRINT_SETTINGS,
  );
  const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);
  const [internalShopData, setInternalShopData] = useState<ShopSetupForm | null>(null);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (!open) return;

    // Load print settings from localStorage
    const stored = localStorage.getItem("app_print_settings");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({
          titles: { ...DEFAULT_LOCAL_PRINT_SETTINGS.titles, ...parsed.titles },
          labels: { ...DEFAULT_LOCAL_PRINT_SETTINGS.labels, ...parsed.labels },
          customer: {
            ...DEFAULT_LOCAL_PRINT_SETTINGS.customer,
            ...parsed.customer,
          },
          shopDetails: {
            ...DEFAULT_LOCAL_PRINT_SETTINGS.shopDetails,
            ...parsed.shopDetails,
          },
          columns: {
            ...DEFAULT_LOCAL_PRINT_SETTINGS.columns,
            ...parsed.columns,
          },
          display: {
            ...DEFAULT_LOCAL_PRINT_SETTINGS.display,
            ...parsed.display,
          },
          legal: { ...DEFAULT_LOCAL_PRINT_SETTINGS.legal, ...parsed.legal },
        });
      } catch (err) {
        console.error("Failed to parse local print settings", err);
      }
    } else {
      setSettings(DEFAULT_LOCAL_PRINT_SETTINGS);
    }

    // Load shop data if not provided via props
    if (shopData) {
      setInternalShopData(shopData);
    } else {
      getShopData().then((data) => {
        if (data) setInternalShopData(data);
      });
    }

    // Fetch printers if available
    async function fetchPrinters() {
      if (!ipcRenderer) return;
      try {
        const printers = await ipcRenderer.invoke("get-printers");
        setAvailablePrinters(printers || []);
      } catch (e) {
        console.error("Failed to fetch printers", e);
      }
    }
    fetchPrinters();
  }, [open, shopData]);

  const effectiveShopData = shopData || internalShopData;

  const handleShopChange = (field: keyof ShopSetupForm, value: any) => {
    if (onShopChange) {
      onShopChange(field, value);
    }
    setInternalShopData((prev) =>
      prev ? { ...prev, [field]: value } : ({ [field]: value } as any),
    );
  };

  const updateSettingGroup = (
    group: keyof LocalPrintSettings,
    field: string,
    value: any,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [group]: {
        ...(prev[group] as any),
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    localStorage.setItem("app_print_settings", JSON.stringify(settings));
    if (internalShopData) {
      try {
        const updated = await updateShopData(internalShopData);
        localStorage.setItem("shop", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save shop data", e);
      }
    }
    toast.success("Invoice configuration saved!");
    onClose();
  };

  const handlePreview = async () => {
    if (!ipcRenderer) {
      toast.error("Preview available in desktop app mode.");
      return;
    }
    setPreviewOpen(true);
    setLoadingPreview(true);
    try {
      const templateId = effectiveShopData?.invoice_template_id || "a4_standard";
      const result = await ipcRenderer.invoke(
        "generate-template-preview",
        templateId,
      );
      if (result.success) {
        setPreviewHtml(result.html);
      } else {
        toast.error("Failed to generate preview");
      }
    } catch (e) {
      console.error(e);
      toast.error("Preview error");
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: "hidden", minHeight: 540 },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "primary.main",
            color: "white",
            py: 1.8,
            px: 3,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Receipt size={22} color="white" />
            <Typography variant="h6" fontWeight={700}>
              Invoice & Quotation Full Control Master
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: "white" }}>
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "#f8fafc" }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 2 }}
          >
            <Tab
              icon={<FileText size={16} />}
              iconPosition="start"
              label="Titles & Labels"
            />
            <Tab
              icon={<User size={16} />}
              iconPosition="start"
              label="Customer Details"
            />
            <Tab
              icon={<Building size={16} />}
              iconPosition="start"
              label="Shop Details"
            />
            <Tab
              icon={<Columns size={16} />}
              iconPosition="start"
              label="Table & Columns"
            />
            <Tab
              icon={<Scale size={16} />}
              iconPosition="start"
              label="Legal & Terms"
            />
            <Tab
              icon={<Printer size={16} />}
              iconPosition="start"
              label="Printer & Template"
            />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: 3, minHeight: 340 }}>
          {/* TAB 0: TITLES & LABELS */}
          {activeTab === 0 && (
            <Stack spacing={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Customize document titles and table column header names.
              </Typography>

              <Typography variant="subtitle2" fontWeight={800} color="primary">
                1. DOCUMENT HEADER TITLES & INVOICE TEMPLATE
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormField label="Print / Export Invoice Template">
                    <Stack direction="row" spacing={1}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        value={effectiveShopData?.invoice_template_id || "a4_standard"}
                        onChange={(e) =>
                          handleShopChange("invoice_template_id", e.target.value)
                        }
                      >
                        {INVOICE_TEMPLATES.map((t) => (
                          <MenuItem key={t.id} value={t.id}>
                            {t.label}
                          </MenuItem>
                        ))}
                      </TextField>
                      <Button
                        variant="outlined"
                        startIcon={<Eye size={18} />}
                        onClick={handlePreview}
                      >
                        Preview
                      </Button>
                    </Stack>
                  </FormField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormField label="Sales Invoice Header Title">
                    <TextField
                      fullWidth
                      size="small"
                      value={settings.titles.invoiceTitle}
                      onChange={(e) =>
                        updateSettingGroup(
                          "titles",
                          "invoiceTitle",
                          e.target.value,
                        )
                      }
                      placeholder="Tax Invoice / Sales Bill / Cash Memo"
                    />
                  </FormField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormField label="Quotation / Estimate Header Title">
                    <TextField
                      fullWidth
                      size="small"
                      value={settings.titles.quotationTitle}
                      onChange={(e) =>
                        updateSettingGroup(
                          "titles",
                          "quotationTitle",
                          e.target.value,
                        )
                      }
                      placeholder="ESTIMATE / QUOTATION"
                    />
                  </FormField>
                </Grid>
              </Grid>

              <Divider />

              <Typography variant="subtitle2" fontWeight={800} color="primary">
                2. CUSTOM TABLE COLUMN HEADER LABELS
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormField label="Item Description">
                    <TextField
                      fullWidth
                      size="small"
                      value={settings.labels.colItem}
                      onChange={(e) =>
                        updateSettingGroup("labels", "colItem", e.target.value)
                      }
                    />
                  </FormField>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormField label="HSN Code Label">
                    <TextField
                      fullWidth
                      size="small"
                      value={settings.labels.colHsn}
                      onChange={(e) =>
                        updateSettingGroup("labels", "colHsn", e.target.value)
                      }
                    />
                  </FormField>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormField label="Quantity Label">
                    <TextField
                      fullWidth
                      size="small"
                      value={settings.labels.colQty}
                      onChange={(e) =>
                        updateSettingGroup("labels", "colQty", e.target.value)
                      }
                    />
                  </FormField>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormField label="Rate Label">
                    <TextField
                      fullWidth
                      size="small"
                      value={settings.labels.colRate}
                      onChange={(e) =>
                        updateSettingGroup("labels", "colRate", e.target.value)
                      }
                    />
                  </FormField>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormField label="Discount Label">
                    <TextField
                      fullWidth
                      size="small"
                      value={settings.labels.colDisc}
                      onChange={(e) =>
                        updateSettingGroup("labels", "colDisc", e.target.value)
                      }
                    />
                  </FormField>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormField label="GST % Label">
                    <TextField
                      fullWidth
                      size="small"
                      value={settings.labels.colGstRate}
                      onChange={(e) =>
                        updateSettingGroup(
                          "labels",
                          "colGstRate",
                          e.target.value,
                        )
                      }
                    />
                  </FormField>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormField label="GST Amount Label">
                    <TextField
                      fullWidth
                      size="small"
                      value={settings.labels.colGstAmt}
                      onChange={(e) =>
                        updateSettingGroup(
                          "labels",
                          "colGstAmt",
                          e.target.value,
                        )
                      }
                    />
                  </FormField>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormField label="Total Amount Label">
                    <TextField
                      fullWidth
                      size="small"
                      value={settings.labels.colAmount}
                      onChange={(e) =>
                        updateSettingGroup(
                          "labels",
                          "colAmount",
                          e.target.value,
                        )
                      }
                    />
                  </FormField>
                </Grid>
              </Grid>
            </Stack>
          )}

          {/* TAB 1: CUSTOMER DETAILS */}
          {activeTab === 1 && (
            <Stack spacing={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Configure what customer information is displayed on the bill and its section heading.
              </Typography>

              <FormField label="Customer Section Header Text">
                <TextField
                  fullWidth
                  size="small"
                  value={settings.customer.headerLabel}
                  onChange={(e) =>
                    updateSettingGroup(
                      "customer",
                      "headerLabel",
                      e.target.value,
                    )
                  }
                  placeholder="e.g. Billed To / Customer Details / Buyer"
                />
              </FormField>

              <Divider sx={{ my: 1 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.customer.showCustomerName}
                        onChange={(e) =>
                          updateSettingGroup(
                            "customer",
                            "showCustomerName",
                            e.target.checked,
                          )
                        }
                      />
                    }
                    label={<Typography variant="body2" fontWeight={600}>Show Customer Name</Typography>}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.customer.showCustomerPhone}
                        onChange={(e) =>
                          updateSettingGroup(
                            "customer",
                            "showCustomerPhone",
                            e.target.checked,
                          )
                        }
                      />
                    }
                    label={<Typography variant="body2" fontWeight={600}>Show Phone Number</Typography>}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.customer.showCustomerAddress}
                        onChange={(e) =>
                          updateSettingGroup(
                            "customer",
                            "showCustomerAddress",
                            e.target.checked,
                          )
                        }
                      />
                    }
                    label={<Typography variant="body2" fontWeight={600}>Show Full Address & City</Typography>}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.customer.showCustomerGst}
                        onChange={(e) =>
                          updateSettingGroup(
                            "customer",
                            "showCustomerGst",
                            e.target.checked,
                          )
                        }
                      />
                    }
                    label={<Typography variant="body2" fontWeight={600}>Show Customer GSTIN / PAN</Typography>}
                  />
                </Grid>
              </Grid>
            </Stack>
          )}

          {/* TAB 2: SHOP DETAILS */}
          {activeTab === 2 && (
            <Stack spacing={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Control shop header branding and payment details visible on printed bills.
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.shopDetails.showShopLogo}
                        onChange={(e) =>
                          updateSettingGroup(
                            "shopDetails",
                            "showShopLogo",
                            e.target.checked,
                          )
                        }
                      />
                    }
                    label={<Typography variant="body2" fontWeight={600}>Show Shop Logo</Typography>}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.shopDetails.showShopAddress}
                        onChange={(e) =>
                          updateSettingGroup(
                            "shopDetails",
                            "showShopAddress",
                            e.target.checked,
                          )
                        }
                      />
                    }
                    label={<Typography variant="body2" fontWeight={600}>Show Shop Address & Contact</Typography>}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.shopDetails.showShopGst}
                        onChange={(e) =>
                          updateSettingGroup(
                            "shopDetails",
                            "showShopGst",
                            e.target.checked,
                          )
                        }
                      />
                    }
                    label={<Typography variant="body2" fontWeight={600}>Show Shop GSTIN</Typography>}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.shopDetails.showShopBankQr}
                        onChange={(e) =>
                          updateSettingGroup(
                            "shopDetails",
                            "showShopBankQr",
                            e.target.checked,
                          )
                        }
                      />
                    }
                    label={<Typography variant="body2" fontWeight={600}>Show UPI QR & Bank Details in Footer</Typography>}
                  />
                </Grid>
              </Grid>
            </Stack>
          )}

          {/* TAB 3: TABLE & COLUMNS */}
          {activeTab === 3 && (
            <Stack spacing={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Control table column toggles and summary tax breakdown visibility.
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.columns.showHsnSac}
                        onChange={(e) =>
                          updateSettingGroup(
                            "columns",
                            "showHsnSac",
                            e.target.checked,
                          )
                        }
                      />
                    }
                    label={<Typography variant="body2" fontWeight={600}>Show HSN/SAC Code Column</Typography>}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.columns.showGstRateCol}
                        onChange={(e) =>
                          updateSettingGroup(
                            "columns",
                            "showGstRateCol",
                            e.target.checked,
                          )
                        }
                      />
                    }
                    label={<Typography variant="body2" fontWeight={600}>Show GST Rate (%) Column</Typography>}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.columns.showGstAmtCol}
                        onChange={(e) =>
                          updateSettingGroup(
                            "columns",
                            "showGstAmtCol",
                            e.target.checked,
                          )
                        }
                      />
                    }
                    label={<Typography variant="body2" fontWeight={600}>Show GST Amount Column</Typography>}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.columns.showDiscountCol}
                        onChange={(e) =>
                          updateSettingGroup(
                            "columns",
                            "showDiscountCol",
                            e.target.checked,
                          )
                        }
                      />
                    }
                    label={<Typography variant="body2" fontWeight={600}>Show Discount Column</Typography>}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.display.showGstBreakdownBottom}
                        onChange={(e) =>
                          updateSettingGroup(
                            "display",
                            "showGstBreakdownBottom",
                            e.target.checked,
                          )
                        }
                      />
                    }
                    label={
                      <Typography variant="body2" fontWeight={700} color="primary">
                        Show GST Tax Breakdown Table at Bottom
                      </Typography>
                    }
                  />
                </Grid>
              </Grid>
            </Stack>
          )}

          {/* TAB 4: LEGAL & TERMS */}
          {activeTab === 4 && (
            <Stack spacing={2.5}>
              <FormField label="Jurisdiction Statement">
                <TextField
                  fullWidth
                  size="small"
                  value={settings.legal.jurisdiction}
                  onChange={(e) =>
                    updateSettingGroup(
                      "legal",
                      "jurisdiction",
                      e.target.value,
                    )
                  }
                  placeholder="Subject to Jalna Jurisdiction only"
                />
              </FormField>

              <FormField label="Disclaimer Statement">
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  value={settings.legal.disclaimer}
                  onChange={(e) =>
                    updateSettingGroup(
                      "legal",
                      "disclaimer",
                      e.target.value,
                    )
                  }
                />
              </FormField>

              <FormField label="Terms & Conditions">
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={4}
                  value={settings.legal.termsAndConditions}
                  onChange={(e) =>
                    updateSettingGroup(
                      "legal",
                      "termsAndConditions",
                      e.target.value,
                    )
                  }
                />
              </FormField>
            </Stack>
          )}

          {/* TAB 5: PRINTER & TEMPLATE */}
          {activeTab === 5 && (
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <FormField label="Invoice Printer Name">
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={effectiveShopData?.invoice_printer_name || ""}
                      onChange={(e) =>
                        handleShopChange("invoice_printer_name", e.target.value)
                      }
                    >
                      <MenuItem value="">System Default Printer</MenuItem>
                      {availablePrinters.map((p: any) => (
                        <MenuItem key={p.name} value={p.name}>
                          {p.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </FormField>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormField label="Paper Width (mm)">
                    <TextField
                      type="number"
                      fullWidth
                      size="small"
                      value={effectiveShopData?.invoice_printer_width_mm || ""}
                      onChange={(e) =>
                        handleShopChange(
                          "invoice_printer_width_mm",
                          Number(e.target.value),
                        )
                      }
                      placeholder="210 for A4"
                    />
                  </FormField>
                </Grid>

                <Grid item xs={12}>
                  <FormField label="Invoice Template Layout">
                    <Stack direction="row" spacing={1}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        value={effectiveShopData?.invoice_template_id || "a4_standard"}
                        onChange={(e) =>
                          handleShopChange("invoice_template_id", e.target.value)
                        }
                      >
                        {INVOICE_TEMPLATES.map((t) => (
                          <MenuItem key={t.id} value={t.id}>
                            {t.label}
                          </MenuItem>
                        ))}
                      </TextField>

                      <Button
                        variant="outlined"
                        startIcon={<Eye size={18} />}
                        onClick={handlePreview}
                      >
                        Preview
                      </Button>
                    </Stack>
                  </FormField>
                </Grid>
              </Grid>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, px: 3, borderTop: 1, borderColor: "divider" }}>
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            startIcon={<Check size={18} />}
            sx={{ fontWeight: 700, px: 3 }}
          >
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, height: "80vh" } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Invoice Template Preview
          </Typography>
          <IconButton onClick={() => setPreviewOpen(false)} size="small">
            <X />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
          {loadingPreview ? (
            <CircularProgress />
          ) : previewHtml ? (
            <iframe
              title="Preview"
              srcDoc={previewHtml}
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          ) : (
            <Typography color="error">Preview unavailable</Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
