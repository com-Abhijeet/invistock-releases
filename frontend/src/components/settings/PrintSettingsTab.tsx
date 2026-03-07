"use client";

import {
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  MenuItem,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Divider,
  Box,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Paper,
  ListSubheader,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { FormField } from "../FormField";
import { type ShopSetupForm } from "../../lib/types/shopTypes";
import { useState, useEffect } from "react";
import { Eye, X, Receipt, Tag, Printer, Columns, Scale } from "lucide-react";
import toast from "react-hot-toast";

const { ipcRenderer } = window.electron;

interface Props {
  data: ShopSetupForm;
  onChange: (field: keyof ShopSetupForm, value: any) => void;
}

const INVOICE_TEMPLATES = [
  { id: "a4_standard", label: "A4 Standard (Classic Table)" },
  { id: "a4_modern", label: "A4 Modern (Clean & Minimal)" },
  { id: "thermal_80mm", label: "Thermal 80mm (Receipt)" },
  { id: "thermal_58mm", label: "Thermal 58mm (Compact)" },
  { id: "a5_landscape", label: "A5 Landscape" },
  { id: "a5_portrait", label: "A5 Portait" },
  { id: "a5_portrait_modern", label: "A5 Portait Modern" },
  { id: "a5_landscape_modern", label: "A5 Landscape Modern" },
];

// Grouped Label Templates
const LABEL_TEMPLATES = [
  {
    group: "General / Retail",
    options: [
      { id: "gen_standard", label: "Standard Retail (Balanced)" },
      { id: "gen_minimal", label: "Modern Minimal (Clean)" },
      { id: "gen_qr", label: "QR Code Focused" },
      { id: "gen_sale", label: "Discount / Sale Tag" },
      { id: "gen_asset", label: "Asset Tag (Property Of)" },
    ],
  },
  {
    group: "Garment / Apparel",
    options: [
      { id: "gar_size_circle", label: "Size Circle (Standard)" },
      { id: "gar_boutique", label: "Boutique Elegant" },
      { id: "gar_grid", label: "Grid Specs (Detailed)" },
      { id: "gar_slim", label: "Vertical Slim Tag" },
      { id: "gar_kids", label: "Kids / Fun Style" },
    ],
  },
  {
    group: "Medicine / Pharma",
    options: [
      { id: "med_dose", label: "Dosage Checkbox (M/A/N)" },
      { id: "med_expiry", label: "Expiry Focused" },
      { id: "med_strip", label: "Compact Strip Label" },
      { id: "med_rack", label: "Rack / Bin Locator" },
      { id: "med_generic", label: "Generic Pharma Tag" },
    ],
  },
  {
    group: "Electronics",
    options: [
      { id: "ele_spec", label: "Spec Sheet (Detailed)" },
      { id: "ele_dark", label: "High Tech Dark" },
      { id: "ele_warranty", label: "Warranty Void Seal" },
      { id: "ele_mobile", label: "Mobile Accessory (Small)" },
      { id: "ele_serial", label: "Serial Number Focus" },
    ],
  },
  {
    group: "Hardware & Jewelry",
    options: [
      { id: "hw_bold", label: "Industrial Bold" },
      { id: "hw_weight", label: "Weight Focused" },
      { id: "jew_standard", label: "Jewelry Standard" },
    ],
  },
];

// Interface for the new LocalStorage settings
interface LocalPrintSettings {
  columns: {
    showHsnSac: boolean;
    showGstRateCol: boolean;
    showGstAmtCol: boolean;
    showDiscountCol: boolean;
  };
  display: {
    showGstBreakdownBottom: boolean;
  };
  legal: {
    jurisdiction: string;
    disclaimer: string;
    termsAndConditions: string;
  };
}

const DEFAULT_LOCAL_SETTINGS: LocalPrintSettings = {
  columns: {
    showHsnSac: true,
    showGstRateCol: true,
    showGstAmtCol: true,
    showDiscountCol: false,
  },
  display: {
    showGstBreakdownBottom: true,
  },
  legal: {
    jurisdiction: "Subject to Jalna Jurisdiction only",
    disclaimer:
      "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
    termsAndConditions:
      "1. Payment must be made within 15 days.\n2. Interest @ 18% p.a. will be charged on delayed payments.\n3. Goods once sold will not be taken back.",
  },
};

export default function PrintSettingsTab({ data, onChange }: Props) {
  const [availablePrinters, setAvailablePrinters] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewType, setPreviewType] = useState<"invoice" | "label">(
    "invoice",
  );

  // Local storage state for extra print settings
  const [localSettings, setLocalSettings] = useState<LocalPrintSettings>(
    DEFAULT_LOCAL_SETTINGS,
  );
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  useEffect(() => {
    async function fetchPrinters() {
      if (!ipcRenderer) return;
      const printers = await ipcRenderer.invoke("get-printers");
      setAvailablePrinters(printers || []);
    }
    fetchPrinters();
  }, []);

  // Load local settings on mount
  useEffect(() => {
    const stored = localStorage.getItem("app_print_settings");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure missing fields are populated if we update the schema later
        setLocalSettings({
          columns: { ...DEFAULT_LOCAL_SETTINGS.columns, ...parsed.columns },
          display: { ...DEFAULT_LOCAL_SETTINGS.display, ...parsed.display },
          legal: { ...DEFAULT_LOCAL_SETTINGS.legal, ...parsed.legal },
        });
      } catch (err) {
        console.error("Failed to parse local print settings", err);
      }
    }
    setIsSettingsLoaded(true);
  }, []);

  const updateLocalSetting = (
    category: keyof LocalPrintSettings,
    field: string,
    value: any,
  ) => {
    setLocalSettings((prev) => {
      const updated = {
        ...prev,
        [category]: {
          ...(prev[category] as any),
          [field]: value,
        },
      };
      // Persist to local storage immediately
      localStorage.setItem("app_print_settings", JSON.stringify(updated));
      return updated;
    });
  };

  const handlePreview = async (type: "invoice" | "label") => {
    if (!ipcRenderer) return;
    setPreviewType(type);
    setPreviewOpen(true);
    setLoadingPreview(true);
    try {
      const templateId =
        type === "invoice"
          ? data.invoice_template_id || "a4_standard"
          : data.label_template_id || "gen_standard";
      const channel =
        type === "invoice"
          ? "generate-template-preview"
          : "generate-label-preview";

      // You may need to update your main process to accept the localSettings if the preview needs to reflect these changes
      const result = await ipcRenderer.invoke(channel, templateId);

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

  const getTemplateLabel = () => {
    const id =
      previewType === "invoice"
        ? data.invoice_template_id || "a4_standard"
        : data.label_template_id || "gen_standard";

    if (previewType === "invoice") {
      return INVOICE_TEMPLATES.find((t) => t.id === id)?.label || id;
    } else {
      // Flatten label groups to find label
      for (const group of LABEL_TEMPLATES) {
        const found = group.options.find((t) => t.id === id);
        if (found) return found.label;
      }
      return id;
    }
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* --- INVOICE SETTINGS --- */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                <Receipt size={20} className="text-blue-600" />
                <Typography variant="h6" fontWeight={600}>
                  Invoice Configuration
                </Typography>
              </Stack>
              <Divider sx={{ mb: 3 }} />

              <Stack spacing={3}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormField label="Printer Name">
                      <TextField
                        select
                        fullWidth
                        size="small"
                        value={data.invoice_printer_name || ""}
                        onChange={(e) =>
                          onChange("invoice_printer_name", e.target.value)
                        }
                      >
                        <MenuItem value="">System Default</MenuItem>
                        {availablePrinters.map((p: any) => (
                          <MenuItem key={p.name} value={p.name}>
                            {p.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </FormField>
                  </Grid>
                  <Grid item xs={6}>
                    <FormField label="Paper Width (mm)">
                      <TextField
                        type="number"
                        fullWidth
                        size="small"
                        value={data.invoice_printer_width_mm || ""}
                        onChange={(e) =>
                          onChange(
                            "invoice_printer_width_mm",
                            Number(e.target.value),
                          )
                        }
                        placeholder="210 for A4"
                      />
                    </FormField>
                  </Grid>
                </Grid>

                <FormField label="Invoice Template">
                  <Stack direction="row" spacing={1}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={data.invoice_template_id || "a4_standard"}
                      onChange={(e) =>
                        onChange("invoice_template_id", e.target.value)
                      }
                    >
                      {INVOICE_TEMPLATES.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Tooltip title="Preview Invoice">
                      <Button
                        variant="outlined"
                        sx={{ minWidth: 48, px: 0, borderRadius: 2 }}
                        onClick={() => handlePreview("invoice")}
                      >
                        <Eye size={20} />
                      </Button>
                    </Tooltip>
                  </Stack>
                </FormField>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* --- LABEL SETTINGS --- */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                <Tag size={20} className="text-green-600" />
                <Typography variant="h6" fontWeight={600}>
                  Barcode Label Settings
                </Typography>
              </Stack>
              <Divider sx={{ mb: 3 }} />

              <Stack spacing={3}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormField label="Label Printer">
                      <TextField
                        select
                        fullWidth
                        size="small"
                        value={data.label_printer_name || ""}
                        onChange={(e) =>
                          onChange("label_printer_name", e.target.value)
                        }
                      >
                        <MenuItem value="">System Default</MenuItem>
                        {availablePrinters.map((p: any) => (
                          <MenuItem key={p.name} value={p.name}>
                            {p.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </FormField>
                  </Grid>
                  <Grid item xs={6}>
                    <FormField label="Label Width (mm)">
                      <TextField
                        type="number"
                        fullWidth
                        size="small"
                        value={data.label_printer_width_mm || ""}
                        onChange={(e) =>
                          onChange(
                            "label_printer_width_mm",
                            Number(e.target.value),
                          )
                        }
                        placeholder="e.g. 50"
                      />
                    </FormField>
                  </Grid>
                </Grid>

                <FormField label="Label Template">
                  <Stack direction="row" spacing={1}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={data.label_template_id || "gen_standard"}
                      onChange={(e) =>
                        onChange("label_template_id", e.target.value)
                      }
                      SelectProps={{ MenuProps: { sx: { maxHeight: 400 } } }}
                    >
                      {LABEL_TEMPLATES.map((group) => [
                        <ListSubheader
                          key={group.group}
                          sx={{ fontWeight: 700, bgcolor: "#f5f5f5" }}
                        >
                          {group.group}
                        </ListSubheader>,
                        ...group.options.map((t) => (
                          <MenuItem key={t.id} value={t.id} sx={{ pl: 4 }}>
                            {t.label}
                          </MenuItem>
                        )),
                      ])}
                    </TextField>
                    <Tooltip title="Preview Label">
                      <Button
                        variant="outlined"
                        sx={{ minWidth: 48, px: 0, borderRadius: 2 }}
                        onClick={() => handlePreview("label")}
                      >
                        <Eye size={20} />
                      </Button>
                    </Tooltip>
                  </Stack>
                </FormField>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* --- LOCAL INVOICE LAYOUT SETTINGS --- */}
        {isSettingsLoaded && (
          <>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
                <CardContent>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    mb={2}
                  >
                    <Columns size={20} className="text-purple-600" />
                    <Typography variant="h6" fontWeight={600}>
                      Invoice Layout & Columns
                    </Typography>
                  </Stack>
                  <Divider sx={{ mb: 3 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={localSettings.columns.showHsnSac}
                            onChange={(e) =>
                              updateLocalSetting(
                                "columns",
                                "showHsnSac",
                                e.target.checked,
                              )
                            }
                          />
                        }
                        label={
                          <Typography variant="body2">Show HSN/SAC</Typography>
                        }
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={localSettings.columns.showGstRateCol}
                            onChange={(e) =>
                              updateLocalSetting(
                                "columns",
                                "showGstRateCol",
                                e.target.checked,
                              )
                            }
                          />
                        }
                        label={
                          <Typography variant="body2">
                            Show GST Rate (%)
                          </Typography>
                        }
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={localSettings.columns.showGstAmtCol}
                            onChange={(e) =>
                              updateLocalSetting(
                                "columns",
                                "showGstAmtCol",
                                e.target.checked,
                              )
                            }
                          />
                        }
                        label={
                          <Typography variant="body2">
                            Show GST Amount
                          </Typography>
                        }
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={localSettings.columns.showDiscountCol}
                            onChange={(e) =>
                              updateLocalSetting(
                                "columns",
                                "showDiscountCol",
                                e.target.checked,
                              )
                            }
                          />
                        }
                        label={
                          <Typography variant="body2">Show Discount</Typography>
                        }
                      />
                    </Grid>
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Divider sx={{ mb: 2 }} />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={
                              localSettings.display.showGstBreakdownBottom
                            }
                            onChange={(e) =>
                              updateLocalSetting(
                                "display",
                                "showGstBreakdownBottom",
                                e.target.checked,
                              )
                            }
                          />
                        }
                        label={
                          <Typography variant="body2" fontWeight={600}>
                            Show GST Breakdown Table at Bottom
                          </Typography>
                        }
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* --- LEGAL & TERMS SETTINGS --- */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
                <CardContent>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    mb={2}
                  >
                    <Scale size={20} className="text-gray-700" />
                    <Typography variant="h6" fontWeight={600}>
                      Legal & Terms
                    </Typography>
                  </Stack>
                  <Divider sx={{ mb: 3 }} />

                  <Stack spacing={3}>
                    <FormField label="Jurisdiction">
                      <TextField
                        fullWidth
                        size="small"
                        value={localSettings.legal.jurisdiction}
                        onChange={(e) =>
                          updateLocalSetting(
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
                        value={localSettings.legal.disclaimer}
                        onChange={(e) =>
                          updateLocalSetting(
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
                        value={localSettings.legal.termsAndConditions}
                        onChange={(e) =>
                          updateLocalSetting(
                            "legal",
                            "termsAndConditions",
                            e.target.value,
                          )
                        }
                      />
                    </FormField>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* --- PRINT BEHAVIOR --- */}
        <Grid item xs={12}>
          <Paper
            variant="outlined"
            sx={{ p: 3, borderRadius: 3, bgcolor: "grey.50" }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
              <Printer size={20} className="text-orange-600" />
              <Typography variant="h6" fontWeight={600}>
                Automation & Behavior
              </Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(data.silent_printing)}
                      onChange={(e) =>
                        onChange("silent_printing", e.target.checked)
                      }
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Silent Printing (Skip Dialog)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Directly print to default printer without popup
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(data.print_after_save)}
                      onChange={(e) =>
                        onChange("print_after_save", e.target.checked)
                      }
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Auto-Print on Save
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Automatically print invoice after creating sale
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* ✅ Responsive Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth={previewType === "label" ? "xs" : "md"} // Adjust width based on type
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            height: previewType === "label" ? "auto" : "80vh", // Auto height for labels
            minHeight: previewType === "label" ? 300 : 600,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #eee",
            pb: 1,
          }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {previewType === "invoice" ? "Invoice Preview" : "Label Preview"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {getTemplateLabel()}
            </Typography>
          </Box>
          <IconButton onClick={() => setPreviewOpen(false)} size="small">
            <X />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            p: 0,
            bgcolor: "#ffffff", // Darker background to see paper edges
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          {loadingPreview ? (
            <CircularProgress />
          ) : previewHtml ? (
            <iframe
              title="Preview"
              srcDoc={previewHtml}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                backgroundColor: "transparent", // Let body background show
                display: "block",
              }}
            />
          ) : (
            <Typography color="error">Preview unavailable</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
