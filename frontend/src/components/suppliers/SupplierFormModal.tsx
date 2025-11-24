"use client";

import { useEffect, useState } from "react";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  AtSign,
  Building,
  Building2,
  Hash,
  Landmark,
  LandmarkIcon,
  Mail,
  MapPin,
  Phone,
  Save,
  Truck,
  User,
} from "lucide-react";
import toast from "react-hot-toast";

import { createSupplier, updateSupplier } from "../../lib/api/supplierService";
import { indianStates } from "../../lib/constants/statesList";
import type { SupplierType } from "../../lib/types/supplierTypes";

const supplierTypes = ["local", "wholeseller", "manufacturer", "distributor"];

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
  supplier: SupplierType | null;
  refresh: () => void;
}

export default function SupplierFormModal({
  open,
  onClose,
  supplier,
  refresh,
}: Props) {
  const [form, setForm] = useState<Omit<SupplierType, "id">>({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gst_number: "",
    supplier_type: "local",
    bank_account: "",
    ifsc_code: "",
    upi_id: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (supplier) {
        setForm({
          name: supplier.name || "",
          contact_person: supplier.contact_person || "",
          phone: supplier.phone || "",
          email: supplier.email || "",
          address: supplier.address || "",
          city: supplier.city || "",
          state: supplier.state || "",
          pincode: supplier.pincode || "",
          gst_number: supplier.gst_number || "",
          supplier_type: supplier.supplier_type || "local",
          bank_account: supplier.bank_account || "",
          ifsc_code: supplier.ifsc_code || "",
          upi_id: supplier.upi_id || "",
          notes: supplier.notes || "",
        });
      } else {
        setForm({
          name: "",
          contact_person: "",
          phone: "",
          email: "",
          address: "",
          city: "",
          state: "",
          pincode: "",
          gst_number: "",
          supplier_type: "local",
          bank_account: "",
          ifsc_code: "",
          upi_id: "",
          notes: "",
        });
      }
      setErrors({});
    }
  }, [supplier, open]);

  const validate = (fieldValues = form) => {
    const tempErrors: Partial<typeof form> = {};
    if (!fieldValues.name) tempErrors.name = "Supplier name is required.";
    if (fieldValues.name.length > 50)
      tempErrors.name = "Name cannot exceed 50 characters.";
    if (fieldValues.phone && !/^\d{10,15}$/.test(fieldValues.phone))
      tempErrors.phone = "Phone must be 10-15 digits.";
    if (
      fieldValues.gst_number &&
      !/^[0-9A-Z]{15}$/.test(fieldValues.gst_number)
    )
      tempErrors.gst_number = "GSTIN must be 15 alphanumeric characters.";
    if (fieldValues.pincode && !/^\d{6}$/.test(fieldValues.pincode))
      tempErrors.pincode = "Pincode must be 6 digits.";
    // ✅ Added validation for IFSC code
    if (
      fieldValues.ifsc_code &&
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(fieldValues.ifsc_code.toUpperCase())
    )
      tempErrors.ifsc_code = "Invalid IFSC code format.";

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleChange = (field: keyof typeof form, value: string) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);
    validate(newForm);
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error("Please fix the errors before submitting.");
      return;
    }

    setIsSaving(true);
    try {
      if (supplier?.id) {
        await updateSupplier(supplier.id, form);
      } else {
        await createSupplier(form);
      }
      toast.success("Supplier saved successfully!");
      refresh();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save supplier.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Truck />
          <Typography variant="h6">
            {supplier ? "Edit Supplier" : "Add New Supplier"}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} mt={0.5}>
          {/* --- Contact & Address --- */}
          <Grid item xs={12}>
            <Typography variant="overline" color="text.secondary">
              Contact & Address
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormField
              label={
                <>
                  Supplier Name <span style={{ color: "red" }}>*</span>
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
                      <Building2 size={18} />
                    </InputAdornment>
                  ),
                }}
              />
            </FormField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormField label="Contact Person">
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={form.contact_person}
                onChange={(e) => handleChange("contact_person", e.target.value)}
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
          <Grid item xs={12} sm={4}>
            <FormField
              label="Phone Number"
              charCount={{ current: form.phone?.length || 0, max: 10 }}
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
              charCount={{ current: form.pincode?.length || 0, max: 6 }}
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

          {/* --- Business & Payment Details --- */}
          <Grid item xs={12} mt={1}>
            <Typography variant="overline" color="text.secondary">
              Business & Payment Details
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormField
              label="GST Number"
              charCount={{ current: form.gst_number?.length || 0, max: 15 }}
            >
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={form.gst_number}
                onChange={(e) => handleChange("gst_number", e.target.value)}
                error={!!errors.gst_number}
                helperText={errors.gst_number}
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
          <Grid item xs={12} sm={4}>
            <FormField label="Supplier Type">
              <TextField
                select
                fullWidth
                variant="outlined"
                size="small"
                value={form.supplier_type}
                onChange={(e) => handleChange("supplier_type", e.target.value)}
              >
                {supplierTypes.map((type) => (
                  <MenuItem
                    key={type}
                    value={type}
                    sx={{ textTransform: "capitalize" }}
                  >
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </FormField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormField label="Email">
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Mail size={18} />
                    </InputAdornment>
                  ),
                }}
              />
            </FormField>
          </Grid>

          {/* ✅ ADDED: Bank and UPI Details */}
          <Grid item xs={12} sm={5}>
            <FormField label="Bank Account No.">
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={form.bank_account}
                onChange={(e) => handleChange("bank_account", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Landmark size={18} />
                    </InputAdornment>
                  ),
                }}
              />
            </FormField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormField
              label="IFSC Code"
              charCount={{ current: form.ifsc_code?.length || 0, max: 11 }}
            >
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={form.ifsc_code}
                onChange={(e) => handleChange("ifsc_code", e.target.value)}
                error={!!errors.ifsc_code}
                helperText={errors.ifsc_code}
                inputProps={{ maxLength: 11 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LandmarkIcon size={18} />
                    </InputAdornment>
                  ),
                }}
              />
            </FormField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormField label="UPI ID">
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={form.upi_id}
                onChange={(e) => handleChange("upi_id", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AtSign size={18} />
                    </InputAdornment>
                  ),
                }}
              />
            </FormField>
          </Grid>

          <Grid item xs={12}>
            <FormField label="Notes">
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                multiline
                rows={2}
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
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
          onClick={handleSave}
          disabled={isSaving}
          startIcon={<Save size={18} />}
        >
          {isSaving
            ? "Saving..."
            : supplier
            ? "Update Supplier"
            : "Add Supplier"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
