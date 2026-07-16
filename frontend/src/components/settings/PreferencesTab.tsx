"use client";

import {
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Box,
  Stack,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { FormField } from "../FormField";
import { type ShopSetupForm } from "../../lib/types/shopTypes";
import { Settings2 } from "lucide-react";

interface Props {
  data: ShopSetupForm;
  onChange: (field: keyof ShopSetupForm, value: any) => void;
}

export default function PreferencesTab({ data, onChange }: Props) {
  return (
    <Box>
      <Grid container spacing={3}>
        {/* --- Left Column: Invoicing Rules --- */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={2}
            sx={{ height: "100%", borderRadius: 3, overflow: "hidden" }}
          >
            <Box
              sx={{
                p: 1.5,
                px: 2.5,
                bgcolor: "primary.main",
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Settings2 size={20} color="white" />
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, letterSpacing: 0.5 }}
              >
                BUSINESS LOGIC
              </Typography>
            </Box>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
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
                </Grid>

                <Box
                  sx={{
                    bgcolor: "grey.50",
                    p: 2,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Stack spacing={1}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={Boolean(data.gst_enabled)}
                          onChange={(e) =>
                            onChange("gst_enabled", e.target.checked)
                          }
                        />
                      }
                      label={
                        <Typography variant="body2">Enable GST</Typography>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={Boolean(data.show_gst_breakup)}
                          onChange={(e) =>
                            onChange("show_gst_breakup", e.target.checked)
                          }
                        />
                      }
                      label={
                        <Typography variant="body2">
                          Show Gst Breakup
                        </Typography>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={Boolean(data.inclusive_tax_pricing)}
                          onChange={(e) =>
                            onChange("inclusive_tax_pricing", e.target.checked)
                          }
                        />
                      }
                      label={
                        <Typography variant="body2">
                          Product Prices are Inclusive of Tax
                        </Typography>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={Boolean(data.hsn_required)}
                          onChange={(e) =>
                            onChange("hsn_required", e.target.checked)
                          }
                        />
                      }
                      label={
                        <Typography variant="body2">
                          HSN Code is Mandatory
                        </Typography>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={Boolean(data.show_discount_column)}
                          onChange={(e) =>
                            onChange("show_discount_column", e.target.checked)
                          }
                        />
                      }
                      label={
                        <Typography variant="body2">
                          Show Discount Column on Invoice
                        </Typography>
                      }
                    />
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
