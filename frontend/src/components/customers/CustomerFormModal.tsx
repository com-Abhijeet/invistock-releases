import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography,
  InputAdornment,
  MenuItem,
  Box,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useState } from "react";
import type { CustomerType } from "../../lib/types/customerTypes";
import { createCustomer, updateCustomer } from "../../lib/api/customerService";
import { User, Phone, MapPin, Building, Hash, Save } from "lucide-react";
import toast from "react-hot-toast";
import { indianStates } from "../../lib/constants/statesList";

// ✅ FormField updated to include a character counter
const FormField = ({
  label,
  children,
  charCount,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  charCount?: { current: number; max: number };
}) => (
  <Box>
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 0.5,
      }}
    >
      <Typography
        variant="body2"
        sx={{ fontWeight: 500, color: "text.secondary" }}
      >
        {label}
      </Typography>
      {charCount && (
        <Typography variant="caption" color="text.secondary">
          {charCount.current} / {charCount.max}
        </Typography>
      )}
    </Box>
    {children}
  </Box>
);

interface Props {
  open: boolean;
  onClose: () => void;
  customer: CustomerType | null;
  onSuccess: () => void;
}

export default function CustomerFormModal({
  open,
  onClose,
  customer,
  onSuccess,
}: Props) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gst_no: "",
    credit_limit: "",
    additional_info: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (customer) {
        setForm({
          name: customer.name || "",
          phone: customer.phone || "",
          address: customer.address || "",
          city: customer.city || "",
          state: customer.state || "",
          pincode: customer.pincode || "",
          gst_no: customer.gst_no || "",
          credit_limit: customer.credit_limit?.toString() || "0",
          additional_info: customer.additional_info || "",
        });
      } else {
        setForm({
          name: "",
          phone: "",
          address: "",
          city: "",
          state: "",
          pincode: "",
          gst_no: "",
          credit_limit: "0",
          additional_info: "",
        });
      }
      setErrors({}); // Clear errors when modal opens
    }
  }, [customer, open]);

  // ✅ New function to handle all form validation
  const validate = (fieldValues = form) => {
    const tempErrors: Partial<typeof form> = {};

    if (!fieldValues.name) tempErrors.name = "Name is required.";
    else if (fieldValues.name.length > 50)
      tempErrors.name = "Name cannot exceed 50 characters.";

    if (!fieldValues.phone) tempErrors.phone = "Phone number is required.";
    else if (!/^\d{10}$/.test(fieldValues.phone))
      tempErrors.phone = "Phone number must be 10 digits.";

    if (fieldValues.gst_no && !/^[0-9A-Z]{15}$/.test(fieldValues.gst_no))
      tempErrors.gst_no = "GSTIN must be 15 alphanumeric characters.";

    if (fieldValues.pincode && !/^\d{6}$/.test(fieldValues.pincode))
      tempErrors.pincode = "Pincode must be 6 digits.";

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);
    validate(newForm); // Validate in real-time
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Please fix the errors before submitting.");
      return;
    }

    setIsSaving(true);
    const payload = {
      ...form,
      credit_limit: parseFloat(form.credit_limit || "0"),
    };

    try {
      if (customer?.id) {
        await updateCustomer(customer.id, payload);
      } else {
        await createCustomer(payload);
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save customer");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <User />
          <Typography variant="h6">
            {customer ? "Edit Customer" : "Add New Customer"}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} mt={0.5}>
          <Grid item xs={12} sm={6}>
            <FormField
              label={
                <>
                  Customer Name <span style={{ color: "red" }}>*</span>
                </>
              }
              charCount={{ current: form.name.length, max: 50 }}
            >
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                inputProps={{ maxLength: 50 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <User size={18} />
                    </InputAdornment>
                  ),
                }}
              />
            </FormField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              label={
                <>
                  Phone Number <span style={{ color: "red" }}>*</span>
                </>
              }
              charCount={{ current: form.phone.length, max: 10 }}
            >
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                error={!!errors.phone}
                helperText={errors.phone}
                inputProps={{ maxLength: 10 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone size={18} />
                    </InputAdornment>
                  ),
                }}
              />
            </FormField>
          </Grid>
          <Grid item xs={12}>
            <FormField label="Address (Street, Area)">
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MapPin size={18} />
                    </InputAdornment>
                  ),
                }}
              />
            </FormField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormField label="City">
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Building size={18} />
                    </InputAdornment>
                  ),
                }}
              />
            </FormField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormField label="State">
              <TextField
                select
                fullWidth
                variant="outlined"
                size="small"
                value={form.state}
                onChange={(e) => handleChange("state", e.target.value)}
              >
                {indianStates.map((stateName) => (
                  <MenuItem key={stateName} value={stateName}>
                    {stateName}
                  </MenuItem>
                ))}
              </TextField>
            </FormField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormField
              label="Pincode"
              charCount={{ current: form.pincode.length, max: 6 }}
            >
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={form.pincode}
                onChange={(e) => handleChange("pincode", e.target.value)}
                error={!!errors.pincode}
                helperText={errors.pincode}
                inputProps={{ maxLength: 6 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Hash size={18} />
                    </InputAdornment>
                  ),
                }}
              />
            </FormField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField
              label="GST Number"
              charCount={{ current: form.gst_no.length, max: 15 }}
            >
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={form.gst_no}
                onChange={(e) => handleChange("gst_no", e.target.value)}
                error={!!errors.gst_no}
                helperText={errors.gst_no}
                inputProps={{ maxLength: 15 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Hash size={18} />
                    </InputAdornment>
                  ),
                }}
              />
            </FormField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField label="Credit Limit">
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                type="number"
                value={form.credit_limit}
                onChange={(e) => handleChange("credit_limit", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                }}
              />
            </FormField>
          </Grid>
          <Grid item xs={12}>
            <FormField label="Additional Info">
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                multiline
                rows={2}
                value={form.additional_info}
                onChange={(e) =>
                  handleChange("additional_info", e.target.value)
                }
              />
            </FormField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSaving}
          startIcon={<Save size={18} />}
        >
          {isSaving
            ? "Saving..."
            : customer
            ? "Update Customer"
            : "Add Customer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
