"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  RadioGroup,
  Radio,
  Chip,
  Paper,
  CircularProgress,
} from "@mui/material";
import { Layers, Zap } from "lucide-react";
import toast from "react-hot-toast";
import {
  getSalesBillingSettings,
  updateSalesBillingSettings,
  SalesBillingSettings,
} from "../../lib/api/salesBillingSettingsService";

interface BillingSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (newSettings: SalesBillingSettings) => void;
}

export default function BillingSettingsModal({
  open,
  onClose,
  onSuccess,
}: BillingSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SalesBillingSettings>({
    id: 1,
    use_queue: true,
    queue_type: "fefo",
    use_default_customer: true,
    auto_print_after_save: false,
    send_whatsapp_invoice: false,
    payment_marking_timing: "pre_save",
    enable_split_payments: true,
  });

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getSalesBillingSettings();
      setSettings(data);
    } catch (err: any) {
      toast.error("Failed to load queue settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateSalesBillingSettings(settings);
      if (typeof window !== "undefined") {
        localStorage.setItem("pos_use_queue", String(updated.use_queue));
        localStorage.setItem("pos_queue_type", updated.queue_type);
      }

      toast.success("Batch Queue settings saved!");
      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save queue settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: "#f8fafc",
          borderBottom: "1px solid",
          borderColor: "divider",
          pb: 1.5,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Layers size={20} className="text-blue-600" />
            <Typography variant="h6" fontWeight={700}>
              Batch Queue & Dispatch Settings
            </Typography>
          </Box>
          <Chip
            icon={<Zap size={14} />}
            label="Database Synced"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: "#fafafa" }}>
              <Stack spacing={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Layers size={18} className="text-purple-600" />
                  <Typography variant="subtitle1" fontWeight={700}>
                    Batch Queue Auto-Selection Rule
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Configure how batch-tracked product inventory is automatically prioritized and selected during billing.
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.use_queue}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, use_queue: e.target.checked }))
                      }
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight={600}>
                      Enable Automatic Batch Queue Auto-Pick
                    </Typography>
                  }
                />

                {settings.use_queue && (
                  <Box sx={{ pl: 2, pt: 1, borderLeft: "3px solid #3b82f6" }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" gutterBottom>
                      Active Queue Strategy:
                    </Typography>
                    <RadioGroup
                      value={settings.queue_type}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          queue_type: e.target.value as "fefo" | "fifo",
                        }))
                      }
                    >
                      <FormControlLabel
                        value="fefo"
                        control={<Radio size="small" />}
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight={700}>
                              FEFO — First Expiring, First Out (Recommended for Perishables)
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Dispatches batches with earliest expiry date first (`expiry_date ASC`)
                            </Typography>
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="fifo"
                        control={<Radio size="small" />}
                        label={
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" fontWeight={700}>
                              FIFO — First In, First Out (Recommended for Standard Stock)
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Dispatches oldest created/received batches first (`created_at ASC`)
                            </Typography>
                          </Box>
                        }
                      />
                    </RadioGroup>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: "#f8fafc" }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={saving || loading}
          sx={{ px: 3, fontWeight: 700 }}
        >
          {saving ? "Saving..." : "Save Queue Settings"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
