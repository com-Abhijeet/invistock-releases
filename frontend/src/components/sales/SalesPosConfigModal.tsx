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
} from "@mui/material";
import { Settings, Printer, MessageSquare, Clock, SplitSquareHorizontal } from "lucide-react";

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
}

export default function SalesPosConfigModal({
  open,
  onClose,
  settings,
  onSaveSettings,
}: Props) {
  const theme = useTheme();

  const handleChange = <K extends keyof PosConfigSettings>(
    field: K,
    value: PosConfigSettings[K],
  ) => {
    onSaveSettings({
      ...settings,
      [field]: value,
    });
  };

  return (
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
  );
}
