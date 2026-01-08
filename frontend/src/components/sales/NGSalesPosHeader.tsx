"use client";

import {
  Box,
  TextField,
  Paper,
  InputAdornment,
  Stack,
  Typography,
} from "@mui/material";
import { User, Phone } from "lucide-react";
import { useState } from "react";
import theme from "../../../theme";

interface Props {
  customerName: string;
  selectedPhone: string;
  setCustomerName: (value: string) => void;
  setSelectedPhone: (value: string) => void;
}

export default function NGSalesPosHeader({
  customerName,
  selectedPhone,
  setCustomerName,
  setSelectedPhone,
}: Props) {
  const [errors, setErrors] = useState<any>({});

  const validateField = (name: string, value: string) => {
    let error = "";
    if (name === "customerName" && value.length > 50)
      error = "Name max 50 chars.";
    if (name === "selectedPhone" && value && !/^\d{0,10}$/.test(value))
      error = "Invalid phone.";

    setErrors((prev: any) => ({ ...prev, [name]: error }));
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: 1,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: "#fff",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems="center"
      >
        <Box sx={{ minWidth: 120 }}>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            color="primary"
            textTransform="uppercase"
            fontSize="0.8rem"
          >
            Bill To / Party
          </Typography>
        </Box>

        <Stack direction="row" spacing={2} sx={{ flexGrow: 1, width: "100%" }}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            value={customerName}
            onChange={(e) => {
              setCustomerName(e.target.value);
              validateField("customerName", e.target.value);
            }}
            placeholder="Party Name"
            error={!!errors.customerName}
            inputProps={{
              maxLength: 50,
              style: { padding: "8px 12px", fontSize: "0.9rem" },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <User size={16} color={theme.palette.text.secondary} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 1,
                backgroundColor: "#f9fafb",
              },
            }}
          />

          <TextField
            fullWidth
            variant="outlined"
            size="small"
            value={selectedPhone}
            onChange={(e) => {
              const val = e.target.value;
              if (/^\d{0,10}$/.test(val)) {
                setSelectedPhone(val);
                validateField("selectedPhone", val);
              }
            }}
            placeholder="Mobile No."
            error={!!errors.selectedPhone}
            inputProps={{
              maxLength: 10,
              inputMode: "numeric",
              style: { padding: "8px 12px", fontSize: "0.9rem" },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Phone size={16} color={theme.palette.text.secondary} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 1,
                backgroundColor: "#f9fafb",
              },
            }}
          />
        </Stack>
      </Stack>
    </Paper>
  );
}
