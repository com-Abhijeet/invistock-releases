"use client";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Typography,
  Divider,
  useTheme,
  TextField,
  MenuItem,
  Tooltip,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { Settings, Printer, MessageSquare, Clock, SplitSquareHorizontal, Receipt, Eye, X } from "lucide-react";
import { useState, useEffect } from "react";
import { getShopData, updateShopData } from "../../lib/api/shopService";
import type { ShopSetupForm } from "../../lib/types/shopTypes";
import { INVOICE_TEMPLATES } from "../settings/InvoiceSettingsModal";
import toast from "react-hot-toast";

export interface PosConfigSettings {
  doPrint: boolean;
  doWhatsApp: boolean;
  paymentTiming: "before_save" | "post_save";
  doSplit: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  settings: PosConfigSettings;
  onSaveSettings: (newSettings: PosConfigSettings) => void;
  onOpenInvoiceConfig?: () => void;
}

export default function SalesPosConfigModal({
  open,
  onClose,
  settings,
  onSaveSettings,
  onOpenInvoiceConfig,
}: Props) {
  const theme = useTheme();
  const [shopData, setShopData] = useState<ShopSetupForm | null>(null);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (!open) return;
    getShopData().then((data) => {
      if (data) setShopData(data);
    });
  }, [open]);

  const handleChange = <K extends keyof PosConfigSettings>(
    field: K,
    value: PosConfigSettings[K],
  ) => {
    onSaveSettings({
      ...settings,
      [field]: value,
    });
  };

  const handleTemplateChange = async (templateId: string) => {
    if (!shopData) return;
    const updated = { ...shopData, invoice_template_id: templateId };
    setShopData(updated);
    try {
      const saved = await updateShopData(updated);
      localStorage.setItem("shop", JSON.stringify(saved));
      toast.success("Invoice template updated!");
    } catch (e) {
      console.error("Failed to update invoice template", e);
      toast.error("Failed to update invoice template");
    }
  };

  const handlePreview = async () => {
    const ipcRenderer = window.electron?.ipcRenderer;
    if (!ipcRenderer) {
      toast.error("Preview available in desktop app mode.");
      return;
    }
    setPreviewOpen(true);
    setLoadingPreview(true);
    try {
      const templateId = shopData?.invoice_template_id || "a4_standard";
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
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "12px",
            p: 0.5,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            fontSize: "1.05rem",
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: theme.palette.primary.main,
            pb: 1,
          }}
        >
          <Settings size={20} />
          POS Billing Preferences
        </DialogTitle>
        <Divider />

        <DialogContent sx={{ py: 2 }}>
          <Stack spacing={2.5}>
            {/* Invoice Template Selector */}
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <Receipt size={18} color={theme.palette.text.secondary} />
                <Typography variant="body2" fontWeight={700}>
                  Active Invoice Template
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={shopData?.invoice_template_id || "a4_standard"}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                >
                  {INVOICE_TEMPLATES.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.label}
                    </MenuItem>
                  ))}
                </TextField>
                <Tooltip title="Preview Invoice Layout">
                  <Button
                    variant="outlined"
                    sx={{ minWidth: 44, px: 0, borderRadius: "6px" }}
                    onClick={handlePreview}
                  >
                    <Eye size={18} />
                  </Button>
                </Tooltip>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                Layout style for printed & exported bills (A4, A5, Thermal).
              </Typography>
            </Box>

            <Divider light />

            {/* Print Toggle */}
            <Box flex={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Printer size={18} color={theme.palette.text.secondary} />
                  <Typography variant="body2" fontWeight={700}>
                    Auto-Print Invoice
                  </Typography>
                </Stack>
                <Switch
                  size="small"
                  color="primary"
                  checked={settings.doPrint}
                  onChange={(e) => handleChange("doPrint", e.target.checked)}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Automatically trigger print dialogue when a sale is saved.
              </Typography>
            </Box>

            <Divider light />

            {/* WhatsApp Toggle */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <MessageSquare size={18} color={theme.palette.text.secondary} />
                  <Typography variant="body2" fontWeight={700}>
                    Send WhatsApp Invoice
                  </Typography>
                </Stack>
                <Switch
                  size="small"
                  color="success"
                  checked={settings.doWhatsApp}
                  onChange={(e) => handleChange("doWhatsApp", e.target.checked)}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Send invoice summary & PDF link via WhatsApp after saving.
              </Typography>
            </Box>

            <Divider light />

            {/* Payment Timing Mode */}
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                <Clock size={18} color={theme.palette.text.secondary} />
                <Typography variant="body2" fontWeight={700}>
                  Payment Recording Mode
                </Typography>
              </Stack>

              <RadioGroup
                value={settings.paymentTiming}
                onChange={(e) => {
                  const newTiming = e.target.value as "before_save" | "post_save";
                  onSaveSettings({
                    ...settings,
                    paymentTiming: newTiming,
                    // Disable split payments automatically if switching to before_save
                    doSplit: newTiming === "before_save" ? false : settings.doSplit,
                  });
                }}
              >
                <FormControlLabel
                  value="before_save"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={700}>
                        Before Saving (100% Paid Default)
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Sale is created as paid for full amount upon save.
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 1 }}
                />
                <FormControlLabel
                  value="post_save"
                  control={<Radio size="small" color="secondary" />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={700}>
                        Post-Sale Payment Modal
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Sale created as pending (₹0 paid); payment modal pops up immediately after save.
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </Box>

            <Divider light />

            {/* Split Payment Toggle */}
            <Box sx={{ opacity: settings.paymentTiming !== "post_save" ? 0.55 : 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <SplitSquareHorizontal size={18} color={theme.palette.text.secondary} />
                  <Typography variant="body2" fontWeight={700}>
                    Enable Split Payments
                  </Typography>
                </Stack>
                <Switch
                  size="small"
                  color="secondary"
                  disabled={settings.paymentTiming !== "post_save"}
                  checked={settings.doSplit}
                  onChange={(e) => handleChange("doSplit", e.target.checked)}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {settings.paymentTiming !== "post_save"
                  ? "Split payments require Post-Sale Payment Mode. Select 'Post-Sale Payment Modal' above to enable."
                  : "Allows breaking single payments into multiple modes (e.g. Cash + UPI) in the post-sale modal."}
              </Typography>
            </Box>

            <Divider light />

            {/* Link to Invoice & Print Configuration */}
            {onOpenInvoiceConfig && (
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                startIcon={<Receipt size={18} />}
                onClick={() => {
                  onClose();
                  onOpenInvoiceConfig();
                }}
                sx={{ fontWeight: 700, borderRadius: "6px", textTransform: "none" }}
              >
                Full Invoice Layout & Print Master Config
              </Button>
            )}
          </Stack>
        </DialogContent>

        <Divider />
        <DialogActions sx={{ p: 1.5 }}>
          <Button
            onClick={onClose}
            variant="contained"
            color="primary"
            fullWidth
            sx={{ fontWeight: 800, borderRadius: "6px" }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invoice Template Preview Dialog */}
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
