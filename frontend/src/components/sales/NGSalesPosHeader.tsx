"use client";

import {
  Box,
  TextField,
  Typography,
  CircularProgress,
  Autocomplete,
  Card,
  CardContent,
  InputAdornment,
  MenuItem,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useState } from "react";
import type { CustomerType } from "../../lib/types/customerTypes";
import { User, Phone, Hash, MapPin, Building } from "lucide-react";
import { indianStates } from "../../lib/constants/statesList";
import { FormField } from "../FormField";

// Define the simplified props for the Non-GST header
interface Props {
  options: CustomerType[];
  loading: boolean;
  customerName: string;
  selectedPhone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  setCustomerName: (value: string) => void;
  setQuery: (value: string) => void;
  handleSelect: (customer: CustomerType | null) => void;
  setSelectedPhone: (value: string) => void;
  setAddress: (value: string) => void;
  setCity: (value: string) => void;
  setState: (value: string) => void;
  setPincode: (value: string) => void;
}

export default function NGSalesPosHeader({
  options,
  loading,
  customerName,
  selectedPhone,
  address,
  city,
  state,
  pincode,
  setCustomerName,
  setQuery,
  handleSelect,
  setSelectedPhone,
  setAddress,
  setCity,
  setState,
  setPincode,
}: Props) {
  const [errors, setErrors] = useState<any>({});

  // Simplified validation (removed GSTIN)
  const validateField = (name: string, value: string) => {
    let error = "";
    if (name === "customerName" && value.length > 50)
      error = "Name cannot exceed 50 characters.";
    if (name === "selectedPhone" && value && !/^\d{10}$/.test(value))
      error = "Phone must be 10 digits.";
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
        {/* Removed the top section with Reference No and Quote Toggle */}
        <Box>
          <Typography
            sx={{ textTransform: "uppercase", fontWeight: 600, mb: 0.5 }}
            variant="body2"
          >
            Customer Details (Optional)
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} sm={6}>
              <FormField
                label="Search or Enter Customer Name"
                charCount={{ current: customerName.length, max: 50 }}
              >
                <Autocomplete
                  freeSolo
                  options={options}
                  loading={loading}
                  fullWidth
                  getOptionLabel={(option) =>
                    typeof option === "string" ? option : option.name || ""
                  }
                  value={null} // This component is now for search/entry only
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
                    if (typeof val === "string") {
                      setCustomerName(val);
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
            <Grid item xs={12} sm={6}>
              <FormField
                label="Phone Number"
                charCount={{ current: selectedPhone.length, max: 10 }}
              >
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
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

            {/* Removed GSTIN Field */}

            <Grid item xs={12}>
              <FormField
                label="Address (Street, Area)"
                charCount={{ current: address.length, max: 48 }}
              >
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
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
