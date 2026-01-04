import {
  Typography,
  TextField,
  MenuItem,
  Card,
  CardContent,
  Divider,
  Box,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { FormField } from "../FormField";
import { type ShopSetupForm } from "../../lib/types/shopTypes";

interface Props {
  data: ShopSetupForm;
  onChange: (field: keyof ShopSetupForm, value: any) => void;
}

export default function TaxBankSettingsTab({ data, onChange }: Props) {
  return (
    <Box>
      {/* --- Section 1: Tax Details --- */}
      <Card variant="outlined" sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Tax Information
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormField label="GST Registration Type">
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={data.gst_registration_type || "unregistered"}
                  onChange={(e) =>
                    onChange("gst_registration_type", e.target.value)
                  }
                >
                  <MenuItem value="regular">Regular</MenuItem>
                  <MenuItem value="composition">Composition</MenuItem>
                  <MenuItem value="unregistered">Unregistered</MenuItem>
                </TextField>
              </FormField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormField label="GSTIN">
                <TextField
                  fullWidth
                  size="small"
                  value={data.gstin || ""}
                  onChange={(e) => onChange("gstin", e.target.value)}
                  placeholder="Enter 15-digit GSTIN"
                />
              </FormField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormField label="PAN Number">
                <TextField
                  fullWidth
                  size="small"
                  value={data.pan_number || ""}
                  onChange={(e) => onChange("pan_number", e.target.value)}
                  placeholder="Enter PAN"
                />
              </FormField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* --- Section 2: Bank & UPI Details --- */}
      <Grid container spacing={3}>
        {/* Left Column: Bank Account */}
        <Grid item xs={12} md={8}>
          <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Bank Account Details
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormField label="Bank Name">
                    <TextField
                      fullWidth
                      size="small"
                      value={data.bank_name || ""}
                      onChange={(e) => onChange("bank_name", e.target.value)}
                      placeholder="e.g. HDFC Bank"
                    />
                  </FormField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormField label="Branch Name">
                    <TextField
                      fullWidth
                      size="small"
                      value={data.bank_account_branch || ""}
                      onChange={(e) =>
                        onChange("bank_account_branch", e.target.value)
                      }
                    />
                  </FormField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormField label="Account Holder Name">
                    <TextField
                      fullWidth
                      size="small"
                      value={data.bank_account_holder_name || ""}
                      onChange={(e) =>
                        onChange("bank_account_holder_name", e.target.value)
                      }
                    />
                  </FormField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormField label="Account Type">
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={data.bank_account_type || "current"}
                      onChange={(e) =>
                        onChange("bank_account_type", e.target.value)
                      }
                    >
                      <MenuItem value="savings">Savings</MenuItem>
                      <MenuItem value="current">Current</MenuItem>
                      <MenuItem value="od">Overdraft (OD)</MenuItem>
                    </TextField>
                  </FormField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormField label="Account Number">
                    <TextField
                      fullWidth
                      size="small"
                      value={data.bank_account_no || ""}
                      onChange={(e) =>
                        onChange("bank_account_no", e.target.value)
                      }
                    />
                  </FormField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormField label="IFSC Code">
                    <TextField
                      fullWidth
                      size="small"
                      value={data.bank_account_ifsc_code || ""}
                      onChange={(e) =>
                        onChange("bank_account_ifsc_code", e.target.value)
                      }
                      placeholder="e.g. HDFC0001234"
                    />
                  </FormField>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: UPI / Digital Payments */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Digital Payments (UPI)
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Box display="flex" flexDirection="column" gap={2}>
                <FormField label="UPI ID (VPA)">
                  <TextField
                    fullWidth
                    size="small"
                    value={data.upi_id || ""}
                    onChange={(e) => onChange("upi_id", e.target.value)}
                    placeholder="username@bank"
                    helperText="Used to generate QR codes on invoices."
                  />
                </FormField>

                <FormField label="Banking Name">
                  <TextField
                    fullWidth
                    size="small"
                    value={data.upi_banking_name || ""}
                    onChange={(e) =>
                      onChange("upi_banking_name", e.target.value)
                    }
                    placeholder="Name as per bank records"
                  />
                </FormField>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
