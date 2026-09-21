"use client";

import {
  Box,
  TextField,
  Typography,
  Stack,
  useTheme,
  Button,
  Collapse,
  alpha,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useState, useEffect, useRef, useMemo } from "react";
import type { CustomerType } from "../../lib/types/customerTypes";
import type { SalePayload } from "../../lib/types/salesTypes";
import {
  User,
  Phone,
  MapPin,
  Calendar,
  ChevronUp,
  Briefcase,
  FileText,
  ScanLine,
} from "lucide-react";
import { indianStates } from "../../lib/constants/statesList";
import AutoSuggestInput, {
  AutoSuggestOption,
} from "../common/AutoSuggestInput";

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
  loading: _loading,
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

  const customerInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const employeeInputRef = useRef<HTMLInputElement>(null);

  const customerOptions: AutoSuggestOption[] = useMemo(() => {
    return options.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.phone || "",
      customer: c,
    }));
  }, [options]);

  const employeeOptions: AutoSuggestOption[] = useMemo(() => {
    return employees.map((e) => ({
      id: e.id,
      name: e.name,
      code: e.role,
    }));
  }, [employees]);

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.id === sale.employee_id);
  }, [employees, sale.employee_id]);

  const stateOptions: AutoSuggestOption[] = useMemo(() => {
    const allStates = Array.from(
      new Set([...(state ? [state] : []), ...indianStates]),
    );
    return allStates.map((s) => ({ id: s, name: s }));
  }, [state]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        customerInputRef.current?.focus();
        customerInputRef.current?.select();
      }
      if (e.altKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        employeeInputRef.current?.focus();
        employeeInputRef.current?.select();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setShowMore((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-focus Customer Name input on initial page load & after explicit sale reset
  useEffect(() => {
    const handleResetFocus = () => {
      setTimeout(() => {
        if (customerInputRef.current) {
          customerInputRef.current.focus();
          customerInputRef.current.select();
        }
      }, 150);
    };

    if (mode !== "view") {
      handleResetFocus();
    }

    window.addEventListener("pos-reset", handleResetFocus);
    return () => window.removeEventListener("pos-reset", handleResetFocus);
  }, [mode]);

  const containerSx = {
    display: "flex",
    alignItems: "center",
    gap: 1,
    px: 1,
    py: 0.5,
    borderRadius: "8px",
    bgcolor: alpha(theme.palette.action.hover, 0.03),
    border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:focus-within": {
      bgcolor: 'background.paper',
      borderColor: theme.palette.primary.main,
      boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
    },
  };

  const labelSx = {
    fontSize: "0.65rem",
    fontWeight: 800,
    color: "text.disabled",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    whiteSpace: "nowrap",
  };

  const inputSx = {
    "& .MuiInputBase-root": {
      fontSize: "0.875rem",
      fontWeight: 600,
      padding: 0,
    },
    "& .MuiInput-underline:before, & .MuiInput-underline:after": {
      display: "none",
    },
  };

  const isPartyMissing = !customerName && mode !== "view";
  const isPhoneMissing = !selectedPhone && mode !== "view";

  return (
    <Box
      sx={{
        bgcolor: theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.divider}`,
        border: `1px solid #ccc`,
      }}
    >
      <Stack spacing={0}>
        {/* Main Toolbar Container */}
        <Box
          sx={{
            p: 1.5,
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            alignItems: "center",
          }}
        >
          {/* 2. Party Selection Command Bar - Required */}
          <Box
            sx={{
              ...containerSx,
              flexGrow: 2,
              minWidth: 250,
              borderColor: isPartyMissing
                ? alpha(theme.palette.error.main, 0.4)
                : alpha(theme.palette.divider, 0.8),
            }}
          >
            <User
              size={14}
              color={
                isPartyMissing
                  ? theme.palette.error.main
                  : theme.palette.primary.main
              }
            />
            <Typography
              sx={{
                ...labelSx,
                color: isPartyMissing ? "error.main" : "text.disabled",
              }}
            >
              PARTY *
            </Typography>
            <AutoSuggestInput
              id="pos-party-input"
              value={customerName}
              options={customerOptions}
              placeholder="Search or Type Name..."
              disabled={mode === "view"}
              allowCreate={true}
              variant="standard"
              sx={inputSx}
              inputRef={(el) => {
                (customerInputRef as any).current = el;
              }}
              onSearch={(val) => {
                setCustomerName(val);
                setQuery(val);
                if (customerId !== 0) setCustomerId(0);
              }}
              onChange={(val) => {
                if (!val) {
                  handleSelect(null);
                  return;
                }
                const selected =
                  options.find((c) => c.id === val) ||
                  options.find(
                    (c) =>
                      c.name.toLowerCase() === String(val).toLowerCase() ||
                      c.phone === String(val),
                  );
                if (selected) {
                  handleSelect(selected);
                } else {
                  setCustomerName(String(val));
                  setCustomerId(0);
                }
              }}
              onNext={() => {
                mobileInputRef.current?.focus();
              }}
            />
          </Box>

          {/* 3. Phone Input - Required beside Name (Reduced Width) */}
          <Box
            sx={{
              ...containerSx,
              flexGrow: 0.8,
              minWidth: 150,
              width: 200,
              borderColor: isPhoneMissing
                ? alpha(theme.palette.error.main, 0.4)
                : alpha(theme.palette.divider, 0.8),
            }}
          >
            <Phone
              size={14}
              color={
                isPhoneMissing
                  ? theme.palette.error.main
                  : theme.palette.text.disabled
              }
            />
            <Typography
              sx={{
                ...labelSx,
                color: isPhoneMissing ? "error.main" : "text.disabled",
              }}
            >
              MOBILE *
            </Typography>
            <TextField
              inputRef={mobileInputRef}
              fullWidth
              variant="standard"
              disabled={mode === "view"}
              value={selectedPhone}
              onFocus={() => {
                if (selectedPhone === "0000000000") {
                  setSelectedPhone("");
                }
              }}
              onBlur={() => {
                if (
                  !selectedPhone.trim() &&
                  (!customerName ||
                    customerName.toLowerCase() === "walk-in customer")
                ) {
                  setSelectedPhone("0000000000");
                }
              }}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedPhone(val);
                if (
                  customerId !== 0 &&
                  customerName.toLowerCase() !== "walk-in customer"
                ) {
                  setCustomerId(0);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  employeeInputRef.current?.focus();
                }
              }}
              placeholder="99..."
              sx={inputSx}
            />
          </Box>

          {/* 4. Personnel Selection (Extra Width) */}
          <Box sx={{ ...containerSx, flexGrow: 1.5, minWidth: 180 }}>
            <Briefcase size={14} color={theme.palette.text.disabled} />
            <Typography sx={labelSx}>STAFF</Typography>
            <AutoSuggestInput
              id="pos-staff-input"
              value={selectedEmployee ? selectedEmployee.name : ""}
              options={employeeOptions}
              placeholder="Billed By..."
              disabled={mode === "view"}
              allowCreate={false}
              variant="standard"
              sx={inputSx}
              inputRef={(el) => {
                (employeeInputRef as any).current = el;
              }}
              onChange={(val) => {
                const emp = employees.find(
                  (e) =>
                    e.id === val ||
                    e.name.toLowerCase() === String(val).toLowerCase(),
                );
                handleFieldChange("employee_id", emp ? emp.id : null);
              }}
              onNext={() => {
                if (showMore) {
                  const firstExpanded = document.getElementById(
                    "billing-gstin-override",
                  );
                  if (firstExpanded) {
                    firstExpanded.focus();
                    return;
                  }
                }

                // Details are collapsed: proceed directly to line item
                const firstProductInput = document.getElementById("product-0");
                if (firstProductInput) {
                  firstProductInput.focus();
                  return;
                }

                // If table is empty, trigger the Add Line Item button
                const addLineBtn = document.getElementById("add-line-item-btn");
                if (addLineBtn) {
                  addLineBtn.click();
                  setTimeout(() => {
                    document.getElementById("product-0")?.focus();
                  }, 120);
                  return;
                }

                // Fallback: Dispatch Ctrl+A
                window.dispatchEvent(
                  new KeyboardEvent("keydown", {
                    key: "a",
                    ctrlKey: true,
                    bubbles: true,
                  }),
                );
              }}
              onPrev={() => {
                mobileInputRef.current?.focus();
              }}
            />
          </Box>

          {/* 5. Reference Badge (Reduced Width) */}
          <Box
            sx={{
              ...containerSx,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderColor: alpha(theme.palette.primary.main, 0.2),
              flexGrow: 0.8,
              minWidth: 130,
              maxWidth: 180,
            }}
          >
            <ScanLine size={14} color={theme.palette.primary.main} />
            <Typography sx={{ ...labelSx, color: 'text.primary' }}>
              REF
            </Typography>
            <TextField
              fullWidth
              variant="standard"
              value={sale.reference_no || "AUTO GENERATED"}
              onChange={(e) =>
                handleFieldChange("reference_no", e.target.value)
              }
              disabled={mode === "view"}
              sx={{
                ...inputSx,
                "& .MuiInputBase-root": {
                  color: sale.reference_no
                    ? "inherit"
                    : theme.palette.primary.main,
                  fontFamily: "monospace",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                },
              }}
            />
          </Box>

          {/* 6. Date Badge */}
          <Box
            sx={{
              ...containerSx,
              border: "none",
              bgcolor: "transparent",
              minWidth: "fit-content",
            }}
          >
            <Calendar size={14} color={theme.palette.text.disabled} />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                letterSpacing: -0.5,
                whiteSpace: "nowrap",
              }}
            >
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Typography>
          </Box>
        </Box>

        {/* Info Strip: Neutral Billing Summary Bar */}
        <Box
          sx={{
            px: 2,
            py: 0.6,
            bgcolor: alpha(theme.palette.action.hover, 0.08),
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack direction="row" spacing={3} alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <MapPin size={11} color={theme.palette.text.disabled} />
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: "text.secondary" }}
              >
                {address ? `${address}, ${city}` : "Address Pending"}
              </Typography>
            </Stack>
            {customerGstNo && (
              <Box
                sx={{
                  px: 1,
                  py: 0.2,
                  borderRadius: "4px",
                  bgcolor: "text.secondary",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Typography sx={{ fontSize: "0.6rem", fontWeight: 900 }}>
                  GST: {customerGstNo}
                </Typography>
              </Box>
            )}
          </Stack>

          <Button
            size="small"
            onClick={() => setShowMore(!showMore)}
            startIcon={
              showMore ? <ChevronUp size={14} /> : <FileText size={14} />
            }
            sx={{
              fontSize: "0.65rem",
              fontWeight: 800,
              textTransform: "none",
              color: "text.primary",
              py: 0,
            }}
          >
            {showMore ? "Collapse Details" : "Full Billing Profile (Ctrl+D)"}
          </Button>
        </Box>

        {/* Collapsible Expansion */}
        <Collapse in={showMore}>
          <Box sx={{ p: 2, bgcolor: alpha(theme.palette.action.hover, 0.02) }}>
            <Grid container spacing={2}>
              {[
                {
                  id: "billing-gstin-override",
                  label: "GSTIN (Bill Override)",
                  value: customerGstNo,
                  setter: setCustomerGstNo,
                  size: 3,
                },
                {
                  label: "Billing Address Line",
                  value: address,
                  setter: setAddress,
                  size: 9,
                },
                { label: "City", value: city, setter: setCity, size: 3 },
                {
                  label: "Billing State",
                  value: state,
                  setter: setState,
                  isSelect: true,
                  size: 3,
                },
                {
                  label: "Billing Pincode",
                  value: pincode,
                  setter: setPincode,
                  size: 2,
                },
              ].map((f, i) => (
                <Grid item xs={12} sm={f.size} key={i}>
                  <Box sx={{ ...containerSx, bgcolor: "background.paper" }}>
                    <Typography sx={labelSx}>{f.label}</Typography>
                    {f.isSelect ? (
                      <AutoSuggestInput
                        id="billing-state"
                        value={f.value || ""}
                        options={stateOptions}
                        placeholder="Select State"
                        allowCreate={true}
                        variant="standard"
                        sx={inputSx}
                        onChange={(val) => f.setter((val as string) || "")}
                      />
                    ) : (
                      <TextField
                        id={f.id}
                        fullWidth
                        variant="standard"
                        value={f.value}
                        onChange={(e) => f.setter(e.target.value)}
                        sx={inputSx}
                      />
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Collapse>
      </Stack>
    </Box>
  );
}
