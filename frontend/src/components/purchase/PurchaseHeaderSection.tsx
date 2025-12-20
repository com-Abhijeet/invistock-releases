"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    getAllSuppliers()
      .then((data) => setSuppliers(data || []))
      .finally(() => setLoading(false));
  }, []);

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
            <Typography {...labelStyle}>REF NO / BILL NO</Typography>
            <TextField
              variant="standard"
              value={purchase.reference_no}
              onChange={(e) => handleChange("reference_no", e.target.value)}
              placeholder="Enter Bill No."
              disabled={readOnly}
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
            />
          </Box>

          {/* Right: Date */}
          <Box>
            <Typography {...labelStyle}>DATE</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                type="date"
                variant="standard"
                value={purchase.date}
                onChange={(e) => handleChange("date", e.target.value)}
                disabled={readOnly}
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
            <Typography {...labelStyle}>BILL FROM (SUPPLIER)</Typography>
            <TextField
              fullWidth
              select
              variant="outlined"
              value={purchase.supplier_id}
              onChange={(e) => handleChange("supplier_id", e.target.value)}
              disabled={readOnly}
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
