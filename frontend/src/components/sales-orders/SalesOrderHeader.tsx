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
  Divider,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import type { CustomerType } from "../../lib/types/customerTypes";
import type { SalesOrderPayload } from "../../lib/api/salesOrderService";
import { User, Phone, Hash, Calendar, UserCheck, FileText } from "lucide-react";

interface Props {
  order: SalesOrderPayload;
  options: CustomerType[];
  loading: boolean;
  mode: "new" | "view" | "edit";

  customerId: number;
  customerName: string;
  customerPhone: string;

  setCustomerName: (val: string) => void;
  setCustomerPhone: (val: string) => void;
  setCustomerId: (val: number) => void;
  setQuery: (val: string) => void;

  onFieldChange: (field: keyof SalesOrderPayload, value: any) => void;
  handleSelectCustomer: (customer: CustomerType | null) => void;
}

export default function SalesOrderHeader({
  order,
  options,
  loading,
  mode,
  customerId,
  customerName,
  customerPhone,
  setCustomerName,
  setCustomerPhone,
  setCustomerId,
  setQuery,
  onFieldChange,
  handleSelectCustomer,
}: Props) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        borderBottom: `1px solid ${theme.palette.divider}`,
        overflow: "hidden",
      }}
    >
      {/* --- Meta Data --- */}
      <Box sx={{ p: 3, pb: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack direction="row" spacing={3}>
            <Box>
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
              >
                STATUS
              </Typography>
              <TextField
                select
                variant="standard"
                value={order.status}
                onChange={(e) => onFieldChange("status", e.target.value)}
                disabled={mode === "view"}
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    fontWeight: 700,
                    color:
                      order.status === "completed"
                        ? "success.main"
                        : "warning.main",
                  },
                }}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </TextField>
            </Box>

            {/* Fulfilled Invoice Link */}
            {order.fulfilled_invoice_id && (
              <Box>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                >
                  FULFILLED INVOICE
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FileText size={16} color={theme.palette.primary.main} />
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="primary"
                    sx={{ cursor: "pointer", textDecoration: "underline" }}
                  >
                    #{order.fulfilled_invoice_id}
                  </Typography>
                </Stack>
              </Box>
            )}
          </Stack>

          <Stack
            direction="row"
            spacing={4}
            divider={
              <Divider orientation="vertical" flexItem sx={{ height: 20 }} />
            }
          >
            <Box>
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
              >
                REF NO
              </Typography>
              <TextField
                variant="standard"
                value={order.reference_no || ""}
                onChange={(e) => onFieldChange("reference_no", e.target.value)}
                disabled={mode === "view"}
                placeholder="Auto-Generated"
                InputProps={{
                  disableUnderline: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Hash size={16} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Box>
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
              >
                DATE
              </Typography>
              <Stack direction="row" spacing={1}>
                <Calendar size={14} color={theme.palette.text.secondary} />
                <Typography variant="body2" fontWeight={600}>
                  {new Date().toLocaleDateString("en-IN")}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Stack>
      </Box>

      <Divider sx={{ borderStyle: "dashed" }} />

      {/* --- Customer Selection (Matches SalesPOS) --- */}
      <Box sx={{ p: 3 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <Typography
              variant="caption"
              fontWeight={700}
              color="text.secondary"
            >
              CUSTOMER
            </Typography>
            <Autocomplete
              freeSolo
              options={options}
              loading={loading}
              disabled={mode === "view"}
              getOptionLabel={(opt) =>
                typeof opt === "string" ? opt : opt.name || ""
              }
              value={options.find((opt) => opt.id === customerId) || null}
              inputValue={customerName}
              onInputChange={(_, val, reason) => {
                if (reason === "input") {
                  setCustomerName(val);
                  setQuery(val);
                  setCustomerId(0); // Trigger new creation flow
                }
              }}
              onChange={(_, val) => handleSelectCustomer(val as CustomerType)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  placeholder="Search or enter name"
                  InputProps={{
                    ...params.InputProps,
                    disableUnderline: true,
                    sx: { fontSize: "1.1rem", fontWeight: 600 },
                    startAdornment: (
                      <InputAdornment position="start">
                        <User size={18} />
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
            <Typography
              variant="caption"
              fontWeight={700}
              color="text.secondary"
            >
              CONTACT
            </Typography>
            <TextField
              fullWidth
              variant="standard"
              disabled={mode === "view"}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Mobile Number"
              InputProps={{
                disableUnderline: true,
                sx: { fontSize: "0.95rem", fontWeight: 500 },
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone size={16} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography
              variant="caption"
              fontWeight={700}
              color="text.secondary"
            >
              AGENT
            </Typography>
            <TextField
              fullWidth
              variant="standard"
              value={order.created_by || ""}
              onChange={(e) => onFieldChange("created_by", e.target.value)}
              disabled={mode === "view"}
              placeholder="Agent Name"
              InputProps={{
                disableUnderline: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <UserCheck size={16} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
