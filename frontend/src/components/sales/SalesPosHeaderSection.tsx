"use client";

import {
  Box,
  TextField,
  Typography,
  CircularProgress,
  Autocomplete,
  Divider,
  Card,
  CardContent,
  InputAdornment,
  MenuItem,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useState } from "react"; // ✅ Import useState for errors
import type { CustomerType } from "../../lib/types/customerTypes";
import type { SalePayload } from "../../lib/types/salesTypes";
import { User, Phone, Hash, MapPin, Building } from "lucide-react";
import { indianStates } from "../../lib/constants/statesList";
import { FormField } from "../FormField";
import BooleanToggle from "../BooleanToggle";

// Define all the props the component will need from its parent
interface Props {
  sale: SalePayload;
  options: CustomerType[];
  loading: boolean;
  mode: "new" | "view";
  customerId: number;
  customerName: string;
  selectedPhone: string;
  customerGstNo: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  setCustomerName: (value: string) => void;
  setQuery: (value: string) => void;
  setCustomerId: (value: number) => void;
  handleSelect: (customer: CustomerType | null) => void;
  setSelectedPhone: (value: string) => void;
  setCustomerGstNo: (value: string) => void;
  setAddress: (value: string) => void;
  setCity: (value: string) => void;
  setState: (value: string) => void;
  setPincode: (value: string) => void;
  handleFieldChange: (field: keyof SalePayload, value: any) => void;
}

export default function SalesPosHeaderSection({
  sale,
  options,
  loading,
  mode,
  customerId,
  customerName,
  selectedPhone,
  customerGstNo,
  address,
  city,
  state,
  pincode,
  setCustomerName,
  setQuery,
  setCustomerId,
  handleSelect,
  setSelectedPhone,
  setCustomerGstNo,
  setAddress,
  setCity,
  setState,
  setPincode,
  handleFieldChange,
}: Props) {
  // ✅ State to hold validation errors locally within the header
  const [errors, setErrors] = useState<any>({});

  // ✅ Simple validation for fields that have rules
  const validateField = (name: string, value: string) => {
    let error = "";
    if (name === "customerName" && value.length > 50)
      error = "Name cannot exceed 50 characters.";
    if (name === "selectedPhone" && value && !/^\d{10}$/.test(value))
      error = "Phone must be 10 digits.";
    if (name === "customerGstNo" && value && !/^[0-9A-Z]{15}$/.test(value))
      error = "GSTIN must be 15 characters.";
    if (name === "pincode" && value && !/^\d{6}$/.test(value))
      error = "Pincode must be 6 digits.";

    setErrors((prev: any) => ({ ...prev, [name]: error }));
  };

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 3,
        borderRadius: 2,
        backgroundColor: "inherit",
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          {/* Left side: Reference Number */}
          <Box>
            <Typography variant="body2" color="text.secondary">
              {/* ✅ Label changes based on the toggle state */}
              {sale.is_quote ? "Quote No." : "Invoice No."}
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {sale.reference_no}
            </Typography>
          </Box>

          {/* ✅ Center: The new toggle component */}
          <BooleanToggle
            value={sale.is_quote || false} // Handles initial undefined state
            onChange={(newValue) => handleFieldChange("is_quote", newValue)}
            trueLabel="Quote"
            falseLabel="Sale"
            disabled={mode === "view"}
          />

          {/* Right side: Date */}
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="body2" color="text.secondary">
              Date
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Typography>
          </Box>
        </Box>
        <Divider />
        <Box mt={2}>
          <Typography
            sx={{ textTransform: "uppercase", fontWeight: 600, mb: 0.5 }}
            variant="body2"
          >
            Customer Details
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={4}>
              <FormField
                label="Search or Enter Customer Name *"
                charCount={{ current: customerName.length, max: 50 }}
              >
                <Autocomplete
                  freeSolo
                  options={options}
                  loading={loading}
                  fullWidth
                  disabled={mode === "view"}
                  getOptionLabel={(option) =>
                    typeof option === "string" ? option : option.name || ""
                  }
                  value={options.find((opt) => opt.id === customerId) || null}
                  inputValue={customerName}
                  onInputChange={(_, val, reason) => {
                    if (reason === "input") {
                      setCustomerName(val);
                      setQuery(val);
                      validateField("customerName", val);
                    }
                  }}
                  onChange={(_, val, reason) => {
                    if (reason === "clear") {
                      handleSelect(null);
                      return;
                    }

                    // This existing logic is fine
                    if (typeof val === "string") {
                      setCustomerName(val);
                      setCustomerId(0);
                    } else if (val) {
                      handleSelect(val);
                    }
                  }}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {option.name}
                        </Typography>
                        <Typography variant="caption" color="gray">
                          {option.phone}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      variant="outlined"
                      placeholder="Search by name..."
                      error={!!errors.customerName}
                      helperText={errors.customerName}
                      inputProps={{ ...params.inputProps, maxLength: 50 }}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <User size={18} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <>
                            {loading ? <CircularProgress size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </FormField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormField
                label="Phone Number *"
                charCount={{ current: selectedPhone.length, max: 10 }}
              >
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  disabled={mode === "view"}
                  value={selectedPhone}
                  onChange={(e) => {
                    setSelectedPhone(e.target.value);
                    validateField("selectedPhone", e.target.value);
                  }}
                  placeholder="Enter phone..."
                  error={!!errors.selectedPhone}
                  helperText={errors.selectedPhone}
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
            <Grid item xs={12} sm={4}>
              <FormField
                label="GSTIN (Optional)"
                charCount={{ current: customerGstNo.length, max: 15 }}
              >
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  disabled={mode === "view"}
                  value={customerGstNo}
                  onChange={(e) => {
                    setCustomerGstNo(e.target.value);
                    validateField("customerGstNo", e.target.value);
                  }}
                  placeholder="Enter GSTIN..."
                  error={!!errors.customerGstNo}
                  helperText={errors.customerGstNo}
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
            <Grid item xs={12}>
              <FormField
                label="Address (Street, Area)"
                charCount={{ current: address.length, max: 48 }}
              >
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  disabled={mode === "view"}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter street address..."
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
              <FormField
                label="City"
                charCount={{ current: city.length, max: 32 }}
              >
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  disabled={mode === "view"}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter city..."
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
                  disabled={mode === "view"}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
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
                charCount={{ current: pincode.length, max: 6 }}
              >
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  disabled={mode === "view"}
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value);
                    validateField("pincode", e.target.value);
                  }}
                  placeholder="Enter pincode..."
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
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
}
