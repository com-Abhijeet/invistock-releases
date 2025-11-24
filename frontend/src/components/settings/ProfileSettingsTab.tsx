import {
  Typography,
  TextField,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  Divider,
  Box,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { FormField } from "../FormField";
import { type ShopSetupForm } from "../../lib/types/shopTypes";
import LogoPicker from "./LogoPicker";

interface Props {
  data: ShopSetupForm;
  onChange: (field: keyof ShopSetupForm, value: any) => void;
}

export default function ProfileSettingsTab({ data, onChange }: Props) {
  return (
    <Grid container spacing={3}>
      {/* --- Left Column: Branding --- */}
      <Grid item xs={12} md={4}>
        <Card variant="outlined" sx={{ height: "100%" }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Branding
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box display="flex" flexDirection="column" alignItems="center">
              <LogoPicker
                currentLogo={data.logo_url}
                onLogoSelect={(path: any) => onChange("logo_url", path)}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                align="center"
                sx={{ mt: 2, display: "block" }}
              >
                This logo will appear on your invoices and reports.
                <br />
                Recommended size: 300x300px.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* --- Right Column: Details & Address --- */}
      <Grid item xs={12} md={8}>
        <Card variant="outlined">
          <CardContent>
            {/* Business Details Section */}
            <Typography variant="h6" gutterBottom>
              Business Details
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormField label="Shop Name *">
                  <TextField
                    fullWidth
                    size="small"
                    value={data.shop_name}
                    onChange={(e) => onChange("shop_name", e.target.value)}
                    placeholder="e.g. My General Store"
                  />
                </FormField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormField label="Shop Alias (for Bills)">
                  <TextField
                    fullWidth
                    size="small"
                    value={data.shop_alias || ""}
                    onChange={(e) => onChange("shop_alias", e.target.value)}
                    placeholder="Short name for receipts"
                  />
                </FormField>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(data.use_alias_on_bills)}
                      onChange={(e) =>
                        onChange("use_alias_on_bills", e.target.checked)
                      }
                    />
                  }
                  label={
                    <Typography variant="body2" color="text.secondary">
                      Use Shop Alias on Bills instead of Legal Name
                    </Typography>
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormField label="Owner Name">
                  <TextField
                    fullWidth
                    size="small"
                    value={data.owner_name}
                    onChange={(e) => onChange("owner_name", e.target.value)}
                  />
                </FormField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormField label="Contact Number">
                  <TextField
                    fullWidth
                    size="small"
                    value={data.contact_number}
                    onChange={(e) => onChange("contact_number", e.target.value)}
                  />
                </FormField>
              </Grid>
              <Grid item xs={12}>
                <FormField label="Email Address">
                  <TextField
                    fullWidth
                    size="small"
                    value={data.email}
                    onChange={(e) => onChange("email", e.target.value)}
                  />
                </FormField>
              </Grid>
            </Grid>

            {/* Business Address Section */}
            <Box mt={4}>
              <Typography variant="h6" gutterBottom>
                Location & Address
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormField label="Address Line 1">
                    <TextField
                      fullWidth
                      size="small"
                      value={data.address_line1 || ""}
                      onChange={(e) =>
                        onChange("address_line1", e.target.value)
                      }
                      placeholder="Shop No, Building, Street"
                    />
                  </FormField>
                </Grid>
                <Grid item xs={12}>
                  <FormField label="Address Line 2">
                    <TextField
                      fullWidth
                      size="small"
                      value={data.address_line2 || ""}
                      onChange={(e) =>
                        onChange("address_line2", e.target.value)
                      }
                      placeholder="Area, Landmark"
                    />
                  </FormField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormField label="City">
                    <TextField
                      fullWidth
                      size="small"
                      value={data.city || ""}
                      onChange={(e) => onChange("city", e.target.value)}
                    />
                  </FormField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormField label="Pincode">
                    <TextField
                      fullWidth
                      size="small"
                      value={data.pincode || ""}
                      onChange={(e) => onChange("pincode", e.target.value)}
                    />
                  </FormField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormField label="State">
                    <TextField
                      fullWidth
                      size="small"
                      value={data.state || ""}
                      onChange={(e) => onChange("state", e.target.value)}
                    />
                  </FormField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormField label="Country">
                    <TextField
                      fullWidth
                      size="small"
                      value={data.country || ""}
                      onChange={(e) => onChange("country", e.target.value)}
                    />
                  </FormField>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
