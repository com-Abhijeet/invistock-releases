"use client";

import {
  Box,
  TextField,
  Typography,
  CircularProgress,
  Autocomplete,
  InputAdornment,
  MenuItem,
  Stack,
  useTheme,
  Button,
  Collapse,
  Divider,
  Tooltip,
  IconButton,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useState, useEffect, useRef } from "react";
import type { CustomerType } from "../../lib/types/customerTypes";
import type { SalePayload } from "../../lib/types/salesTypes";
import {
  User,
  Phone,
  MapPin,
  Hash,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  Briefcase,
  Edit2,
  Check,
  Lock, // Added Lock Icon
} from "lucide-react";
import { indianStates } from "../../lib/constants/statesList";
import BooleanToggle from "../BooleanToggle";
import { api } from "../../lib/api/api";
import toast from "react-hot-toast";

interface EmployeeOption {
  id: number;
  name: string;
  role: string;
}

interface Props {
  sale: SalePayload;
  options: CustomerType[];
  employees: EmployeeOption[];
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
  employees,
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
  const theme = useTheme();
  const [showMore, setShowMore] = useState(false);

  // State for editing mode
  const [isEditingRef, setIsEditingRef] = useState(false);
  const [refError, setRefError] = useState(false);

  // Refs for focusing
  const customerInputRef = useRef<HTMLInputElement>(null);
  const employeeInputRef = useRef<HTMLInputElement>(null);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.code === "KeyB" || e.key.toLowerCase() === "b")
      ) {
        e.preventDefault();
        customerInputRef.current?.focus();
      }
      if (e.altKey && (e.code === "KeyE" || e.key.toLowerCase() === "e")) {
        e.preventDefault();
        employeeInputRef.current?.focus();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.code === "KeyD" || e.key.toLowerCase() === "d")
      ) {
        e.preventDefault();
        setShowMore((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const checkDuplicate = async (val: string) => {
    if (!val || val === "Auto Generated On Submit") return;
    try {
      const res = await api.get(`/api/sales/search?query=${val}`);
      if (
        res.data.success &&
        res.data.data.some((s: any) => s.reference_no === val)
      ) {
        setRefError(true);
        toast.error("Invoice number already exists!");
      } else {
        setRefError(false);
      }
    } catch (e) {}
  };

  const toggleRefEdit = () => {
    if (isEditingRef) {
      // Stop Editing (Validation happens on change/blur)
      if (refError) {
        toast.error("Cannot save duplicate reference");
        return;
      }
      // Ensure we don't save empty string, revert to Auto if empty
      if (!sale.reference_no || sale.reference_no.trim() === "") {
        handleFieldChange("reference_no", "Auto Generated On Submit");
      }
    } else {
      // Start Editing: Clear the "Auto..." text for easier typing
      if (sale.reference_no === "Auto Generated On Submit") {
        handleFieldChange("reference_no", "");
      }
    }
    setIsEditingRef(!isEditingRef);
  };

  const labelStyle = {
    variant: "caption" as const,
    fontWeight: 700,
    color: "text.secondary",
    display: "block",
    mb: 0.5,
    sx: { textTransform: "uppercase", letterSpacing: 0.5 },
  };

  const isRefEditable = mode === "new" || sale.status === "draft";

  return (
    <Box
      sx={{
        borderBottom: `1px solid ${theme.palette.divider}`,
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={3}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={4}
            alignItems={{ xs: "stretch", sm: "center" }}
            width={{ xs: "100%", md: "auto" }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  p: 1,
                  bgcolor: theme.palette.action.hover,
                  borderRadius: 1,
                  color: theme.palette.primary.main,
                }}
              >
                <FileText size={20} />
              </Box>
              <Box>
                <Typography {...labelStyle}>DOCUMENT TYPE</Typography>
                <BooleanToggle
                  value={sale.is_quote || false}
                  onChange={(newValue) =>
                    handleFieldChange("is_quote", newValue)
                  }
                  trueLabel="Quotation"
                  falseLabel="Tax Invoice"
                  disabled={mode === "view"}
                />
              </Box>
            </Stack>

            <Box sx={{ minWidth: 200 }}>
              <Tooltip title="Shortcut: Alt + E" placement="top-start">
                <Typography {...labelStyle}>SALESPERSON</Typography>
              </Tooltip>
              <Autocomplete
                options={employees}
                getOptionLabel={(option) => option.name}
                value={employees.find((e) => e.id === sale.employee_id) || null}
                onChange={(_, newValue) => {
                  handleFieldChange(
                    "employee_id",
                    newValue ? newValue.id : null,
                  );
                }}
                disabled={mode === "view"}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    inputRef={employeeInputRef}
                    variant="standard"
                    placeholder="Select Staff"
                    InputProps={{
                      ...params.InputProps,
                      disableUnderline: true,
                      sx: { fontWeight: 600, fontSize: "0.95rem" },
                      startAdornment: (
                        <InputAdornment position="start">
                          <Briefcase
                            size={16}
                            color={theme.palette.text.disabled}
                          />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={4}
            divider={
              <Divider
                orientation="vertical"
                flexItem
                sx={{ height: 20, alignSelf: "center" }}
              />
            }
          >
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography {...labelStyle}>REF NO</Typography>
                {isRefEditable ? (
                  <Tooltip
                    title={
                      isEditingRef
                        ? "Save Manual Ref"
                        : "Edit Reference No manually (e.g. match Tally)"
                    }
                  >
                    <IconButton
                      size="small"
                      onClick={toggleRefEdit}
                      sx={{ p: 0.5 }}
                    >
                      {isEditingRef ? (
                        <Check size={14} color="green" />
                      ) : (
                        <Edit2 size={14} />
                      )}
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip title="Reference number is locked for finalized invoices">
                    <Lock
                      size={14}
                      color={theme.palette.text.disabled}
                      style={{ marginLeft: 4 }}
                    />
                  </Tooltip>
                )}
              </Stack>

              {/* ✅ Editable Reference Field */}
              {isEditingRef && isRefEditable ? (
                <TextField
                  variant="standard"
                  size="small"
                  // ✅ Directly bind to parent state to ensure value is captured even without clicking save
                  value={
                    sale.reference_no === "Auto Generated On Submit"
                      ? ""
                      : sale.reference_no
                  }
                  onChange={(e) =>
                    handleFieldChange("reference_no", e.target.value)
                  }
                  onBlur={() => checkDuplicate(sale.reference_no)}
                  error={refError}
                  placeholder="Enter Invoice No."
                  autoFocus
                  InputProps={{
                    disableUnderline: false,
                    sx: {
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      width: 150,
                      color: refError ? "error.main" : "inherit",
                    },
                  }}
                />
              ) : (
                <Typography
                  variant="body2"
                  fontWeight={700}
                  color={
                    sale.reference_no === "Auto Generated On Submit"
                      ? "text.secondary"
                      : "primary.main"
                  }
                >
                  {sale.reference_no || "AUTO-GENERATED"}
                </Typography>
              )}
            </Box>

            <Box>
              <Typography {...labelStyle}>DATE</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Calendar size={14} color={theme.palette.text.secondary} />
                <Typography variant="body2" fontWeight={600}>
                  {new Date().toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Stack>
      </Box>

      <Divider sx={{ borderStyle: "dashed" }} />

      {/* ... (Rest of Customer Section is Unchanged) ... */}
      <Box sx={{ p: 3 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <Tooltip title="Shortcut: Ctrl + B" placement="top-start">
              <Typography {...labelStyle}>BILL TO (CUSTOMER)</Typography>
            </Tooltip>
            <Autocomplete
              freeSolo
              options={options}
              loading={loading}
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
                }
              }}
              onChange={(_, val, reason) => {
                if (reason === "clear") return handleSelect(null);
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
                    <Typography variant="body2" fontWeight={600}>
                      {option.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.phone}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={customerInputRef}
                  variant="standard"
                  placeholder="Search or enter name (Ctrl+B)"
                  InputProps={{
                    ...params.InputProps,
                    disableUnderline: true,
                    sx: {
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      color: "text.primary",
                    },
                    startAdornment: (
                      <InputAdornment position="start">
                        <User size={18} color={theme.palette.text.disabled} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Typography {...labelStyle}>CONTACT</Typography>
            <TextField
              fullWidth
              variant="standard"
              disabled={mode === "view"}
              value={selectedPhone}
              onChange={(e) => setSelectedPhone(e.target.value)}
              placeholder="Mobile Number"
              InputProps={{
                disableUnderline: true,
                sx: { fontSize: "0.95rem", fontWeight: 500 },
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone size={16} color={theme.palette.text.disabled} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid
            item
            xs={12}
            md={4}
            display="flex"
            alignItems="center"
            justifyContent="flex-end"
          >
            <Tooltip title="Shortcut: Ctrl + D">
              <Button
                onClick={() => setShowMore(!showMore)}
                endIcon={
                  showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                }
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  color: "text.secondary",
                }}
              >
                {showMore ? (
                  "Hide Billing Details"
                ) : (
                  <>
                    A<span style={{ textDecoration: "underline" }}>d</span>d
                    Address & GSTIN
                  </>
                )}
              </Button>
            </Tooltip>
          </Grid>
        </Grid>

        <Collapse in={showMore}>
          <Box mt={2} pt={2} borderTop={`1px dashed ${theme.palette.divider}`}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography {...labelStyle}>GSTIN</Typography>
                <TextField
                  fullWidth
                  variant="standard"
                  disabled={mode === "view"}
                  value={customerGstNo}
                  onChange={(e) => setCustomerGstNo(e.target.value)}
                  placeholder="Enter GST Number"
                  InputProps={{
                    disableUnderline: true,
                    sx: { fontSize: "0.9rem" },
                    startAdornment: (
                      <InputAdornment position="start">
                        <Hash size={15} color={theme.palette.text.disabled} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <Typography {...labelStyle}>ADDRESS</Typography>
                <TextField
                  fullWidth
                  variant="standard"
                  disabled={mode === "view"}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street Address, Area"
                  InputProps={{
                    disableUnderline: true,
                    sx: { fontSize: "0.9rem" },
                    startAdornment: (
                      <InputAdornment position="start">
                        <MapPin size={15} color={theme.palette.text.disabled} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={4} md={4}>
                <TextField
                  fullWidth
                  variant="standard"
                  disabled={mode === "view"}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  InputProps={{
                    disableUnderline: true,
                    sx: { fontSize: "0.9rem" },
                  }}
                />
              </Grid>
              <Grid item xs={4} md={4}>
                <TextField
                  select
                  fullWidth
                  variant="standard"
                  disabled={mode === "view"}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  label="State"
                  InputProps={{
                    disableUnderline: true,
                    sx: { fontSize: "0.9rem" },
                  }}
                >
                  {indianStates.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={4} md={4}>
                <TextField
                  fullWidth
                  variant="standard"
                  disabled={mode === "view"}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="Pincode"
                  InputProps={{
                    disableUnderline: true,
                    sx: { fontSize: "0.9rem" },
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}
