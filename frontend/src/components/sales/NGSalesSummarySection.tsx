"use client";

import {
  Box,
  Button,
  MenuItem,
  TextField,
  Typography,
  Dialog,
  InputAdornment,
  Stack,
  Menu,
  ButtonGroup,
  CircularProgress,
  Divider,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useRef, useState } from "react";
import type { NonGstSalePayload } from "../../lib/types/nonGstSalesTypes";
import { createNonGstSale } from "../../lib/api/nonGstSalesService";
import { numberToWords } from "../../utils/numberToWords";
import { Save, ArrowDown as ArrowDropDown } from "lucide-react";
import toast from "react-hot-toast";

type SaveAction = "save" | "print";
const actionLabels: Record<SaveAction, string> = {
  save: "Save Only",
  print: "Save & Print",
};

interface Props {
  sale: NonGstSalePayload;
  onSaleChange: (field: keyof NonGstSalePayload, value: any) => void;
  customer?: { name: string; phone: string };
  resetForm: () => void;
}
const { ipcRenderer } = window.electron;

const handleNonGstPrint = async (saleData: NonGstSalePayload) => {
  try {
    const result = await ipcRenderer.invoke("print-non-gst-receipt", saleData);
    if (!result.success) {
      throw new Error(result.error);
    }
    toast.success("Receipt sent to printer.");
  } catch (err: any) {
    toast.error(`Print failed: ${err.message}`);
  }
};

export default function NGSaleSummarySection({
  sale,
  onSaleChange,
  customer,
  resetForm,
}: Props) {
  const [warningOpen, setWarningOpen] = useState(false);
  const [saveAction, setSaveAction] = useState<SaveAction>("print");
  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFieldChange = (field: keyof NonGstSalePayload, value: any) => {
    onSaleChange(field, value);
  };

  const handlePaidInFull = () => {
    onSaleChange("paid_amount", sale.total_amount);
    onSaleChange("status", "paid");
  };

  const handleCancel = () => {
    resetForm();
    toast("Sale canceled.");
  };

  const handleSubmit = async () => {
    if (
      sale.items.filter((i) => i.product_name && i.product_name.trim() !== "")
        .length === 0
    ) {
      toast.error("Please add at least one valid item.");
      return;
    }

    if (sale.status === "paid" && sale.paid_amount < sale.total_amount) {
      setWarningOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: NonGstSalePayload = {
        ...sale,
        customer_name: customer?.name || "Walk-in Customer",
        customer_phone: customer?.phone || "",
        items: sale.items.filter(
          (item) => item.product_name && item.product_name.trim() !== ""
        ),
      };

      const response = await createNonGstSale(payload);

      if (response?.status === "success") {
        toast.success("Bill saved successfully!");
        if (saveAction === "print") {
          handleNonGstPrint(response.data);
        }
        resetForm();
      } else {
        toast.error(response?.error || "Failed to save sale.");
      }
    } catch (err: any) {
      console.log(err);
      toast.error(err.message || `An unexpected error occurred.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 1.5 }}>
      <Grid container spacing={2}>
        {/* Left Side: Notes & Amount in Words */}
        <Grid item xs={12} md={6}>
          <Stack spacing={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography
                variant="caption"
                fontWeight={600}
                color="textSecondary"
                sx={{ minWidth: 80 }}
              >
                Amount in Words:
              </Typography>
              <Typography
                variant="body2"
                fontStyle="italic"
                color="text.primary"
              >
                {numberToWords(sale.total_amount) || "Zero"}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography
                variant="caption"
                fontWeight={600}
                color="textSecondary"
                sx={{ minWidth: 80 }}
              >
                Remarks:
              </Typography>
              <TextField
                fullWidth
                variant="standard"
                size="small"
                value={sale.note}
                onChange={(e) => handleFieldChange("note", e.target.value)}
                placeholder="Enter remarks..."
                InputProps={{
                  disableUnderline: true,
                  style: { fontSize: "0.9rem" },
                }}
                sx={{ borderBottom: "1px dashed #ccc" }}
              />
            </Box>
          </Stack>
        </Grid>

        {/* Right Side: Totals & Payments */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 4,
              textAlign: "right",
            }}
          >
            {/* Total Display */}
            <Box>
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
              >
                Total Amount
              </Typography>
              <Typography variant="h4" fontWeight={700} color="primary">
                {sale.total_amount.toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                })}
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Divider sx={{ my: 1.5 }} />

      {/* Action Bar */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        {/* Payment Details Inputs */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Box>
            <Typography
              variant="caption"
              display="block"
              fontWeight={600}
              mb={0.5}
            >
              Paid Amt.
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <TextField
                variant="outlined"
                size="small"
                type="number"
                value={sale.paid_amount}
                onChange={(e) =>
                  handleFieldChange(
                    "paid_amount",
                    parseFloat(e.target.value) || 0
                  )
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                  style: { height: 32, fontSize: "0.9rem" },
                }}
                sx={{
                  width: 120,
                  "& .MuiOutlinedInput-root": { borderRadius: 1 },
                }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={handlePaidInFull}
                disabled={sale.paid_amount >= sale.total_amount}
                sx={{ minWidth: 40, height: 32, p: 0, borderRadius: 1 }}
              >
                All
              </Button>
            </Stack>
          </Box>

          <Box>
            <Typography
              variant="caption"
              display="block"
              fontWeight={600}
              mb={0.5}
            >
              Mode
            </Typography>
            <TextField
              select
              size="small"
              variant="outlined"
              value={sale.payment_mode}
              onChange={(e) =>
                handleFieldChange("payment_mode", e.target.value)
              }
              InputProps={{ style: { height: 32, fontSize: "0.9rem" } }}
              sx={{
                width: 100,
                "& .MuiOutlinedInput-root": { borderRadius: 1 },
              }}
            >
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="card">Card</MenuItem>
              <MenuItem value="upi">UPI</MenuItem>
            </TextField>
          </Box>
          <Box>
            <Typography
              variant="caption"
              display="block"
              fontWeight={600}
              mb={0.5}
            >
              Status
            </Typography>
            <TextField
              select
              size="small"
              variant="outlined"
              value={sale.status}
              onChange={(e) => handleFieldChange("status", e.target.value)}
              InputProps={{ style: { height: 32, fontSize: "0.9rem" } }}
              sx={{
                width: 110,
                "& .MuiOutlinedInput-root": { borderRadius: 1 },
              }}
            >
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="partial_payment">Partial</MenuItem>
            </TextField>
          </Box>
        </Stack>

        {/* Buttons */}
        <Stack direction="row" spacing={1}>
          <Button
            onClick={handleCancel}
            disabled={isSubmitting}
            color="inherit"
            sx={{ textTransform: "none" }}
          >
            Reset
          </Button>

          <ButtonGroup
            variant="contained"
            ref={anchorRef}
            sx={{ boxShadow: "none" }}
          >
            <Button
              onClick={handleSubmit}
              sx={{
                px: 3,
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "4px 0 0 4px",
              }}
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <Save size={18} />
                )
              }
              disabled={isSubmitting}
            >
              {actionLabels[saveAction]}
            </Button>
            <Button
              size="small"
              onClick={() => setMenuOpen(true)}
              disabled={isSubmitting}
              sx={{ borderRadius: "0 4px 4px 0" }}
            >
              <ArrowDropDown size={18} />
            </Button>
          </ButtonGroup>
          <Menu
            anchorEl={anchorRef.current}
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
          >
            <MenuItem
              onClick={() => {
                setSaveAction("print");
                setMenuOpen(false);
              }}
            >
              Save & Print
            </MenuItem>
            <MenuItem
              onClick={() => {
                setSaveAction("save");
                setMenuOpen(false);
              }}
            >
              Save Only
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>

      <Dialog open={warningOpen} onClose={() => setWarningOpen(false)}>
        <Box p={3} minWidth={300}>
          <Typography variant="h6" gutterBottom>
            Payment Mismatch
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            You have marked the status as <b>Paid</b>, but the paid amount is
            less than the total.
          </Typography>
          <Stack direction="row" justifyContent="flex-end" spacing={2} mt={2}>
            <Button onClick={() => setWarningOpen(false)}>Edit</Button>
            <Button
              variant="contained"
              onClick={() => {
                setWarningOpen(false);
                handleSubmit();
              }}
            >
              Save Anyway
            </Button>
          </Stack>
        </Box>
      </Dialog>
    </Box>
  );
}
