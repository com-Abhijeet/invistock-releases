"use client";

import {
  Box,
  Button,
  MenuItem,
  TextField,
  Typography,
  Dialog,
  InputAdornment,
  Paper,
  Stack,
  Menu,
  ButtonGroup,
  CircularProgress,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useRef, useState } from "react";
// ✅ Import the correct NON-GST types
import type { NonGstSalePayload } from "../../lib/types/nonGstSalesTypes";
// ✅ Import the new NON-GST create function
import { createNonGstSale } from "../../lib/api/nonGstSalesService";
// import { handleNonGstPrint } from "../../lib/handleNonGstPrint"; // TODO: You'll need a print handler for this
import { createCustomer } from "../../lib/api/customerService";
import type { CustomerType } from "../../lib/types/customerTypes";
import { numberToWords } from "../../utils/numberToWords";
import { XCircle, Save, Banknote, CreditCard, Smartphone } from "lucide-react";
import theme from "../../../theme";
import { FormField } from "../FormField";
import toast from "react-hot-toast";
import { ArrowDown as ArrowDropDown } from "lucide-react";

// ✅ Simplified save actions for Non-GST
type SaveAction = "save" | "print";
const actionLabels: Record<SaveAction, string> = {
  save: "Save Only",
  print: "Save & Print Bill",
};

interface Props {
  sale: NonGstSalePayload;
  onSaleChange: (field: keyof NonGstSalePayload, value: any) => void;
  customer?: CustomerType;
  resetForm: () => void;
}
const { ipcRenderer } = window.electron;

// ✅ Create the new print handler function
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
  const [saveAction, setSaveAction] = useState<SaveAction>("print"); // 'print' is the default
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
    if (sale.status === "paid" && sale.paid_amount < sale.total_amount) {
      setWarningOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      let saleDataWithCustomer: NonGstSalePayload = { ...sale };

      // --- Create New Customer if Necessary ---
      if (!sale.customer_id) {
        const customerData = {
          name: customer?.name!,
          phone: customer?.phone!,
          address: customer?.address,
          city: customer?.city,
          state: customer?.state,
          pincode: customer?.pincode,
          gst_no: undefined, // No GST for cash sale customer
        };
        const customerRes = await createCustomer(customerData);
        saleDataWithCustomer = {
          ...saleDataWithCustomer,
          customer_id: customerRes.id!,
        };
      }

      // --- Prepare Final Payload ---
      const payload = {
        ...saleDataWithCustomer,
        items: saleDataWithCustomer.items.filter((item) => item.product_id > 0),
      };

      // ✅ Call the correct NON-GST create function
      const response = await createNonGstSale(payload);

      if (response?.status === "success") {
        toast.success("Cash Sale saved successfully!");

        if (saveAction === "print") {
          handleNonGstPrint(response.data);
        }

        resetForm(); // Clear the form
      } else {
        toast.error(response?.error || "Failed to save sale.");
      }
    } catch (err: any) {
      console.log(err);
      toast.error(err.message || `An unexpected error occurred, ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Non-sticky part of the summary */}
      <Box sx={{ p: 2, backgroundColor: "#fff", borderRadius: 2 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={7}>
            <FormField label="Notes / Remarks">
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                multiline
                rows={2}
                value={sale.note}
                onChange={(e) => handleFieldChange("note", e.target.value)}
                placeholder="Add any notes about the sale..."
              />
            </FormField>
          </Grid>
          <Grid item xs={12} md={5}>
            <FormField label="Amount in Words">
              <Typography
                fontStyle="italic"
                color="text.primary"
                fontWeight={500}
                variant="body2"
              >
                {numberToWords(sale.total_amount)}
              </Typography>
            </FormField>
          </Grid>
        </Grid>
      </Box>

      {/* ✅ Removed the "Advanced GST Options" Box */}

      {/* Sticky Bottom Action Bar */}
      <Paper
        elevation={3}
        sx={{
          position: "sticky",
          bottom: 0,
          py: 1.5,
          px: 2,
          mt: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.primary.contrastText,
        }}
      >
        <Stack
          direction={{ xs: "column", lg: "row" }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          {/* Left side: Payment Inputs */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems="center"
            spacing={2}
          >
            <FormField label="Paid Amount">
              <Stack direction="row" spacing={1} alignItems="center">
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
                  }}
                  sx={{ width: 150 }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handlePaidInFull}
                  disabled={sale.paid_amount >= sale.total_amount}
                >
                  Full
                </Button>
              </Stack>
            </FormField>

            <FormField label="Payment Mode">
              <TextField
                select
                size="small"
                variant="outlined"
                value={sale.payment_mode}
                onChange={(e) =>
                  handleFieldChange("payment_mode", e.target.value)
                }
                sx={{ width: 180 }}
              >
                {/* ... (All MenuItems are the same) ... */}
                <MenuItem value="cash">
                  <Banknote size={18} style={{ marginRight: 8 }} /> Cash
                </MenuItem>
                <MenuItem value="card">
                  <CreditCard size={18} style={{ marginRight: 8 }} /> Card
                </MenuItem>
                <MenuItem value="upi">
                  <Smartphone size={18} style={{ marginRight: 8 }} /> UPI
                </MenuItem>
                {/* ... etc ... */}
              </TextField>
            </FormField>

            <FormField label="Status">
              <TextField
                select
                size="small"
                variant="outlined"
                value={sale.status}
                onChange={(e) => handleFieldChange("status", e.target.value)}
                sx={{ width: 160 }}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="partial_payment">Partial Payment</MenuItem>
                {/* ... (other statuses) ... */}
              </TextField>
            </FormField>
          </Stack>

          {/* Right side: Total & Action Buttons */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={3}
            flexGrow={1}
            justifyContent="flex-end"
          >
            <Box sx={{ textAlign: "right", minWidth: 180 }}>
              <Typography
                variant="body1"
                color="text.secondary"
                lineHeight={1.2}
              >
                GRAND TOTAL
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {sale.total_amount.toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                })}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                color="error"
                onClick={handleCancel}
                sx={{ minWidth: 110 }}
                startIcon={<XCircle />}
                disabled={isSubmitting}
              >
                Cancel
              </Button>

              <ButtonGroup
                variant="contained"
                ref={anchorRef}
                aria-label="split button"
              >
                <Button
                  onClick={handleSubmit}
                  sx={{ minWidth: 180 }}
                  startIcon={
                    isSubmitting ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <Save />
                    )
                  }
                  disabled={isSubmitting}
                >
                  {actionLabels[saveAction]}
                </Button>
                <Button
                  size="small"
                  aria-controls={menuOpen ? "split-button-menu" : undefined}
                  aria-expanded={menuOpen ? "true" : undefined}
                  aria-haspopup="menu"
                  onClick={() => setMenuOpen(true)}
                  disabled={isSubmitting}
                >
                  <ArrowDropDown />
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
                  selected={saveAction === "print"}
                >
                  Save & Print Bill
                </MenuItem>

                {/* ✅ Removed the "printBoth" MenuItem */}

                <MenuItem
                  onClick={() => {
                    setSaveAction("save");
                    setMenuOpen(false);
                  }}
                  selected={saveAction === "save"}
                >
                  Save Only
                </MenuItem>
              </Menu>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      <Dialog open={warningOpen} onClose={() => setWarningOpen(false)}>
        {/* ... (Warning dialog is unchanged) ... */}
      </Dialog>
    </>
  );
}
