"use client";

import {
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  MenuItem,
  InputAdornment,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Divider,
  Box,
  Stack,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { FormField } from "../FormField";
import { type ShopSetupForm } from "../../lib/types/shopTypes";
import { useState, useEffect } from "react";
import { FolderOpen } from "lucide-react";
import toast from "react-hot-toast";

const { ipcRenderer } = window.electron;

interface Props {
  data: ShopSetupForm;
  onChange: (field: keyof ShopSetupForm, value: any) => void;
}

export default function PreferencesTab({ data, onChange }: Props) {
  const [availablePrinters, setAvailablePrinters] = useState([]);

  useEffect(() => {
    async function fetchPrinters() {
      if (!ipcRenderer) return;
      const printers = await ipcRenderer.invoke("get-printers");
      setAvailablePrinters(printers || []);
    }
    fetchPrinters();
  }, []);

  const handleSelectPath = async () => {
    if (!ipcRenderer) return;
    const result = await ipcRenderer.invoke("dialog:open-directory");
    if (result.success && result.path) {
      onChange("backup_path", result.path);
    } else if (result.error) {
      toast.error(`Failed to select path: ${result.error}`);
    }
  };

  return (
    <Box>
      {/* --- Section 1: Invoicing & Inventory --- */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Invoicing Rules
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormField label="Invoice Prefix">
                    <TextField
                      fullWidth
                      size="small"
                      value={data.invoice_prefix || ""}
                      onChange={(e) =>
                        onChange("invoice_prefix", e.target.value)
                      }
                      placeholder="e.g. INV-"
                    />
                  </FormField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormField label="Default GST Rate (%)">
                    <TextField
                      type="number"
                      fullWidth
                      size="small"
                      value={data.default_gst_rate || ""}
                      onChange={(e) =>
                        onChange("default_gst_rate", Number(e.target.value))
                      }
                    />
                  </FormField>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(data.gst_enabled)}
                        onChange={(e) =>
                          onChange("gst_enabled", e.target.checked)
                        }
                      />
                    }
                    label="Enable GST Calculation"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(data.inclusive_tax_pricing)}
                        onChange={(e) =>
                          onChange("inclusive_tax_pricing", e.target.checked)
                        }
                      />
                    }
                    label="Product Prices are Inclusive of Tax"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(data.hsn_required)}
                        onChange={(e) =>
                          onChange("hsn_required", e.target.checked)
                        }
                      />
                    }
                    label="HSN Code is Mandatory"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(data.show_discount_column)}
                        onChange={(e) =>
                          onChange("show_discount_column", e.target.checked)
                        }
                      />
                    }
                    label="Show Discount Column on Invoice"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Stack spacing={3} sx={{ height: "100%" }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Inventory Settings
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormField label="Low Stock Threshold">
                      <TextField
                        type="number"
                        fullWidth
                        size="small"
                        value={data.low_stock_threshold || ""}
                        onChange={(e) =>
                          onChange(
                            "low_stock_threshold",
                            Number(e.target.value)
                          )
                        }
                        helperText="Default alert level"
                      />
                    </FormField>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(data.allow_negative_stock)}
                          onChange={(e) =>
                            onChange("allow_negative_stock", e.target.checked)
                          }
                        />
                      }
                      label="Allow Negative Stock (Sell without stock)"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ flexGrow: 1 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Backup
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(data.enable_auto_backup)}
                      onChange={(e) =>
                        onChange("enable_auto_backup", e.target.checked)
                      }
                    />
                  }
                  label="Auto-Backup on Exit"
                  sx={{ mb: 2 }}
                />

                {data.enable_auto_backup && (
                  <FormField label="Backup Location">
                    <TextField
                      fullWidth
                      size="small"
                      value={data.backup_path || "No folder selected"}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title="Select Backup Folder">
                              <IconButton onClick={handleSelectPath}>
                                <FolderOpen />
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </FormField>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* --- Section 3: Printing --- */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Printer Configuration
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                {/* Label Printer */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Product Label / Barcode Printer
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={8}>
                      <FormField label="Printer Name">
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
                    <Grid item xs={12} sm={4}>
                      <FormField label="Width (mm)">
                        <TextField
                          type="number"
                          fullWidth
                          size="small"
                          value={data.label_printer_width_mm || ""}
                          onChange={(e) =>
                            onChange(
                              "label_printer_width_mm",
                              Number(e.target.value)
                            )
                          }
                        />
                      </FormField>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Invoice Printer */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Invoice / Receipt Printer
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={8}>
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
                    <Grid item xs={12} sm={4}>
                      <FormField label="Width (mm)">
                        <TextField
                          type="number"
                          fullWidth
                          size="small"
                          value={data.invoice_printer_width_mm || ""}
                          onChange={(e) =>
                            onChange(
                              "invoice_printer_width_mm",
                              Number(e.target.value)
                            )
                          }
                        />
                      </FormField>
                    </Grid>
                  </Grid>
                </Grid>

                {/* General Print Settings */}
                <Grid item xs={12}>
                  <Stack direction="row" spacing={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(data.silent_printing)}
                          onChange={(e) =>
                            onChange("silent_printing", e.target.checked)
                          }
                        />
                      }
                      label="Enable Silent Printing (Skip dialog)"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(data.print_after_save)}
                          onChange={(e) =>
                            onChange("print_after_save", e.target.checked)
                          }
                        />
                      }
                      label="Auto-Print Invoice after Saving"
                    />
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
