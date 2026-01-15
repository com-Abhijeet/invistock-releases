"use client";

import { useEffect, useState, useRef } from "react";
import {
  Box,
  MenuItem,
  TextField,
  Typography,
  Stack,
  useTheme,
  Divider,
  CircularProgress,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { Calendar, Building, Hash } from "lucide-react";
import { getSuppliers as getAllSuppliers } from "../../lib/api/supplierService";
import type { PurchasePayload } from "../../lib/types/purchaseTypes";
import type { SupplierType as Supplier } from "../../lib/types/supplierTypes";

interface Props {
  purchase: PurchasePayload;
  onPurchaseChange: (data: PurchasePayload) => void;
  readOnly?: boolean;
}

const PurchaseHeaderSection = ({
  purchase,
  onPurchaseChange,
  readOnly = false,
}: Props) => {
  const theme = useTheme();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Refs for shortcuts
  const billNoRef = useRef<HTMLInputElement>(null);
  const supplierRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAllSuppliers()
      .then((data) => setSuppliers(data || []))
      .finally(() => setLoading(false));
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return;

      // Ctrl + B: Focus Bill No
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.code === "KeyR" || e.key.toLowerCase() === "r")
      ) {
        e.preventDefault();
        billNoRef.current?.focus();
      }

      // Ctrl + F: Focus Supplier (Matches Sales "Find Customer")
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.code === "KeyB" || e.key.toLowerCase() === "B")
      ) {
        e.preventDefault();
        // Since it's a select, focusing opens/activates it depending on browser behavior
        supplierRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [readOnly]);

  const handleChange = (field: keyof PurchasePayload, value: any) => {
    if (!readOnly) {
      onPurchaseChange({ ...purchase, [field]: value });
    }
  };

  // Reusable label style matching Summary/Sales
  const labelStyle = {
    variant: "caption" as const,
    fontWeight: 700,
    color: "text.secondary",
    display: "block",
    mb: 0.5,
    sx: { textTransform: "uppercase", letterSpacing: 0.5 },
  };

  return (
    <Box
      sx={{
        borderBottom: `1px solid ${theme.palette.divider}`,
        overflow: "hidden",
      }}
    >
      {/* --- Section 1: Meta Data (Ref & Date) --- */}
      <Box sx={{ p: 3, pb: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={3}
        >
          {/* Left: Ref No */}
          <Box>
            <Tooltip title="Shortcut: Ctrl + B" placement="top-start">
              <Typography {...labelStyle}>
                <span style={{ textDecoration: "underline" }}>R</span>EF NO /
                BILL NO <span style={{ color: "red" }}>*</span>
              </Typography>
            </Tooltip>
            <TextField
              inputRef={billNoRef}
              variant="standard"
              value={purchase.reference_no}
              onChange={(e) => handleChange("reference_no", e.target.value)}
              placeholder="Enter Bill No. (Ctrl+R)"
              disabled={readOnly}
              required
              InputProps={{
                disableUnderline: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <Hash size={16} color={theme.palette.text.disabled} />
                  </InputAdornment>
                ),
                sx: {
                  fontWeight: 700,
                  color: theme.palette.primary.main,
                  fontSize: "1rem",
                },
              }}
              // Validation: Char limit
              inputProps={{ maxLength: 30 }}
            />
          </Box>

          {/* Right: Date */}
          <Box>
            <Typography {...labelStyle}>
              DATE <span style={{ color: "red" }}>*</span>
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                type="date"
                variant="standard"
                value={purchase.date}
                onChange={(e) => handleChange("date", e.target.value)}
                disabled={readOnly}
                required
                InputProps={{
                  disableUnderline: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Calendar size={16} color={theme.palette.text.disabled} />
                    </InputAdornment>
                  ),
                  sx: { fontWeight: 600, fontSize: "0.95rem" },
                }}
              />
            </Stack>
          </Box>
        </Stack>
      </Box>

      <Divider sx={{ borderStyle: "dashed" }} />

      {/* --- Section 2: Supplier Details --- */}
      <Box sx={{ p: 3 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Tooltip title="Shortcut: Ctrl + B">
              <Typography {...labelStyle}>
                <span style={{ textDecoration: "underline" }}>B</span>ILL FROM
                (SUPPLIER) <span style={{ color: "red" }}>*</span>
              </Typography>
            </Tooltip>
            <TextField
              inputRef={supplierRef}
              fullWidth
              select
              variant="outlined"
              value={purchase.supplier_id}
              onChange={(e) => handleChange("supplier_id", e.target.value)}
              disabled={readOnly}
              required
              placeholder="Select Supplier"
              InputProps={{
                disableUnderline: true,
                sx: {
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  color: "text.primary",
                },
                startAdornment: (
                  <InputAdornment position="start">
                    <Building size={18} color={theme.palette.text.disabled} />
                  </InputAdornment>
                ),
              }}
            >
              {loading ? (
                <MenuItem disabled>
                  <CircularProgress size={20} />
                </MenuItem>
              ) : (
                suppliers.map((supplier) => (
                  <MenuItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </MenuItem>
                ))
              )}
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography {...labelStyle}>SUPPLIER CONTACT</Typography>
            <Typography
              variant="body1"
              color="text.primary"
              sx={{ py: 0.5, fontSize: "0.95rem", fontWeight: 500 }}
            >
              {suppliers.find((s) => s.id === purchase.supplier_id)?.phone ||
                "—"}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default PurchaseHeaderSection;
