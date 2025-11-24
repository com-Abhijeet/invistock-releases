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
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Checkbox,
  Menu,
  ButtonGroup,
  CircularProgress,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useRef, useState, useEffect } from "react";
import type { SalePayload } from "../../lib/types/salesTypes";
import { createSale } from "../../lib/api/salesService";
import { handlePrint } from "../../lib/handleInvoicePrint";
import { createCustomer } from "../../lib/api/customerService";
import type { CustomerType } from "../../lib/types/customerTypes";
import { numberToWords } from "../../utils/numberToWords";
import {
  XCircle,
  Save,
  Banknote,
  CreditCard,
  HandCoins,
  Landmark,
  ScrollText,
  Smartphone,
  Split,
  Ticket,
  MessageCircle,
  Truck,
  Printer,
} from "lucide-react";
import theme from "../../../theme";
import { FormField } from "../FormField";
import toast from "react-hot-toast";
import { ArrowDown as ArrowDropDown } from "lucide-react";
import { getShopData } from "../../lib/api/shopService";

type SaveAction = "save" | "print" | "printBoth" | "whatsapp";
const actionLabels: Record<SaveAction, string> = {
  save: "Save Sale",
  print: "Save & Print Invoice",
  printBoth: "Save & Print Both",
  whatsapp: "Save & WhatsApp",
};

interface Props {
  sale: SalePayload;
  onSaleChange: (updated: SalePayload) => void;
  setSuccess: (value: boolean) => void;
  customer?: CustomerType;
  mode: "new" | "view";
  resetForm: () => void;
}

const SaleSummarySection = ({
  sale,
  onSaleChange,
  setSuccess,
  customer,
  mode,
  resetForm,
}: Props) => {
  const [shop, setShop] = useState<any>(null);
  const [warningOpen, setWarningOpen] = useState(false);
  const [saveAction, setSaveAction] = useState<SaveAction>("print"); // 'print' is the default
  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // To disable buttons during submission

  // Load shop data on the client
  useEffect(() => {
    getShopData()
      .then((data) => setShop(data))
      .catch(() => setShop(null));
  }, []);

  const handleFieldChange = (field: keyof SalePayload, value: any) => {
    onSaleChange({ ...sale, [field]: value });
  };

  const handlePaidInFull = () => {
    onSaleChange({
      ...sale,
      paid_amount: sale.total_amount,
      status: "paid",
    });
  };

  // This function is for the "Cancel" button
  const handleCancel = () => {
    resetForm();
    // You might want to fetch a new reference number here if needed
    // onSaleChange({ ...initialSaleState });
    toast("Sale canceled.");
  };

  // This is the main submission function for the split button
  const handleSubmit = async () => {
    // --- 1. Validation ---
    if (sale.status === "paid" && sale.paid_amount < sale.total_amount) {
      setWarningOpen(true);
      return;
    }

    // Set loading state to disable buttons and show a spinner
    setIsSubmitting(true);

    try {
      let saleDataWithCustomer = { ...sale };

      // --- 2. Create New Customer if Necessary ---
      if (!sale.customer_id || sale.customer_id === 0) {
        const customerData = {
          name: customer?.name!,
          phone: customer?.phone!,
          address: customer?.address,
          city: customer?.city,
          state: customer?.state,
          pincode: customer?.pincode,
          gst_no: customer?.gst_no,
        };
        const customerRes = await createCustomer(customerData);
        // Update our data immutably
        saleDataWithCustomer = {
          ...saleDataWithCustomer,
          customer_id: customerRes.id,
        };
      }

      // --- 3. Prepare Final Payload ---
      // Filter out empty rows but keep the reference number
      const payload = {
        ...saleDataWithCustomer,
        items: saleDataWithCustomer.items.filter((item) => item.product_id > 0),
      };

      // --- 4. Create the Sale ---
      const response = await createSale(payload);

      const savedSale = response.data;

      if (response?.status === "success") {
        setSuccess(true);
        toast.success("Sale saved successfully!");
        console.log("Sale created", response.data);

        // --- 5. Handle Printing based on the selected action ---
        if (saveAction === "print" || saveAction === "printBoth") {
          // Print the main invoice
          handlePrint(response.data);
        }

        if (saveAction === "printBoth") {
          // If "Print Both" was selected, also print the shipping label
          setTimeout(() => {
            window.electron.ipcRenderer
              .invoke("print-shipping-label", response.data)
              .catch((err) =>
                toast.error(`Label print failed: ${err.message}`)
              );
          }, 1000); // 1-second delay to avoid printer conflicts
        }

        if (saveAction === "whatsapp") {
          const phoneToSend = customer?.phone;

          if (phoneToSend) {
            const nl = "\n";
            const shopName = shop?.shop_name || "Our Shop";

            // --- 1. Create Itemized List for Text Message ---
            const itemsList = savedSale.items
              .map(
                (
                  item: { quantity: number; rate: number; product_name: any },
                  index: number
                ) => {
                  const rowTotal = item.quantity * item.rate; // Calculate item total
                  return `${index + 1}. ${item.product_name} x ${
                    item.quantity
                  } = ₹${rowTotal.toLocaleString("en-IN")}`;
                }
              )
              .join(nl);

            // --- 2. Construct the Text Message ---
            const message =
              `*Invoice from ${shopName}*${nl}${nl}` +
              `Hello ${customer?.name || "Customer"},${nl}` +
              `Bill No: ${savedSale.reference_no}${nl}${nl}` +
              `*Items Ordered:*${nl}` +
              `${itemsList}${nl}` +
              `------------------------------${nl}` +
              `*Total Amount: ₹${savedSale.total_amount.toLocaleString(
                "en-IN"
              )}*${nl}` +
              `------------------------------${nl}` +
              `Thank you for your business!`;

            // --- 3. Send Text Message ---
            window.electron
              .sendWhatsAppMessage(phoneToSend, message)
              .then((res) => {
                if (res.success) {
                  toast.success("WhatsApp Text Sent!");

                  // --- 4. Send PDF (Nested success) ---
                  // Only try to send PDF if text succeeded (implies connection is good)
                  toast.loading("Generating & sending PDF...");
                  window.electron
                    .sendWhatsAppInvoicePdf({
                      sale: savedSale,
                      shop: shop,
                      customerPhone: phoneToSend,
                    })
                    .then((pdfRes) => {
                      toast.dismiss();
                      if (pdfRes.success) toast.success("PDF Invoice Sent!");
                      else toast.error("PDF Send Failed");
                    });
                } else {
                  toast.error("WhatsApp Text Failed: " + res.error);
                }
              })
              .catch(() => toast.error("WhatsApp Error. Check connection."));
          } else {
            toast.error("Sale saved, but no phone number found for WhatsApp.");
          }
        }

        resetForm(); // Clear the form for the next sale
      } else {
        // Handle API errors gracefully
        toast.error(response?.error || "Failed to save the sale.");
      }
    } catch (err: any) {
      // Handle unexpected errors
      toast.error(
        err.message || "An unexpected error occurred during submission."
      );
    } finally {
      // --- 6. Finalization ---
      // Re-enable the buttons regardless of success or failure
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
                rows={2} // Reduced rows to save space
                disabled={mode === "view"}
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

      {/* --- Advanced GST Options --- */}
      <Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={sale.is_reverse_charge || false}
              onChange={(e) =>
                handleFieldChange("is_reverse_charge", e.target.checked)
              }
              disabled={mode === "view"}
            />
          }
          label={
            <Typography variant="body2">Reverse Charge Applicable</Typography>
          }
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={sale.is_ecommerce_sale || false}
              onChange={(e) =>
                handleFieldChange("is_ecommerce_sale", e.target.checked)
              }
              disabled={mode === "view"}
            />
          }
          label={<Typography variant="body2">Sale via E-Commerce</Typography>}
        />
      </Box>

      {/* Sticky Bottom Action Bar with All Price Fields */}
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
          {/* Left side of bar: Payment Inputs */}
          {mode !== "view" && (
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
                  <MenuItem value="cash">
                    <Banknote size={18} style={{ marginRight: 8 }} /> Cash
                  </MenuItem>
                  <MenuItem value="card">
                    <CreditCard size={18} style={{ marginRight: 8 }} /> Card
                  </MenuItem>
                  <MenuItem value="upi">
                    <Smartphone size={18} style={{ marginRight: 8 }} /> UPI
                  </MenuItem>
                  <MenuItem value="bank_transfer">
                    <Landmark size={18} style={{ marginRight: 8 }} /> Bank
                    Transfer
                  </MenuItem>
                  <MenuItem value="credit">
                    <HandCoins size={18} style={{ marginRight: 8 }} /> On Credit
                  </MenuItem>
                  <MenuItem value="cheque">
                    <ScrollText size={18} style={{ marginRight: 8 }} /> Cheque
                  </MenuItem>
                  <MenuItem value="voucher">
                    <Ticket size={18} style={{ marginRight: 8 }} /> Voucher
                  </MenuItem>
                  <MenuItem value="mixed">
                    <Split size={18} style={{ marginRight: 8 }} /> Mixed Payment
                  </MenuItem>
                </TextField>
              </FormField>

              <FormField label="Status">
                <TextField
                  select
                  size="small"
                  variant="outlined"
                  value={sale.status}
                  onChange={(e) => handleFieldChange("status", e.target.value)}
                  sx={{ width: 160 }} // widened a bit since labels are longer
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="partial_payment">Partial Payment</MenuItem>
                  <MenuItem value="refunded">Refunded</MenuItem>
                  <MenuItem value="returned">Returned</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                </TextField>
              </FormField>
            </Stack>
          )}

          {/* Right side of bar: Total & Action Buttons */}
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

            {mode !== "view" && (
              <Stack direction="row" spacing={1.5}>
                {/* The Cancel button remains separate */}
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleCancel()}
                  sx={{ minWidth: 110 }}
                  startIcon={<XCircle />}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>

                {/* ✅ The new Split Button Group */}
                <ButtonGroup
                  variant="contained"
                  ref={anchorRef}
                  aria-label="split button"
                >
                  <Button
                    onClick={() => handleSubmit()}
                    sx={{ minWidth: 180 }} // A bit wider to fit longer text
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
                    aria-label="select save action"
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
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Printer size={16} />
                      <Typography>Save & Print Invoice</Typography>
                    </Stack>
                  </MenuItem>

                  <MenuItem
                    onClick={() => {
                      setSaveAction("printBoth");
                      setMenuOpen(false);
                    }}
                    selected={saveAction === "printBoth"}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Truck size={16} />
                      <Typography>Save & Print Invoice + Label</Typography>
                    </Stack>
                  </MenuItem>

                  <MenuItem
                    onClick={() => {
                      setSaveAction("whatsapp");
                      setMenuOpen(false);
                    }}
                    selected={saveAction === "whatsapp"}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <MessageCircle size={16} color="green" />
                      <Typography>Save & WhatsApp</Typography>
                    </Stack>
                  </MenuItem>

                  <MenuItem
                    onClick={() => {
                      setSaveAction("save");
                      setMenuOpen(false);
                    }}
                    selected={saveAction === "save"}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Save size={16} />
                      <Typography>Save Only</Typography>
                    </Stack>
                  </MenuItem>
                </Menu>
              </Stack>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Warning Dialog (unchanged) */}
      <Dialog open={warningOpen} onClose={() => setWarningOpen(false)}>
        <DialogTitle>Partial Payment Warning</DialogTitle>
        <DialogContent>
          Paid amount is less than the total amount. The status will be saved as
          <b>Partial Payment Received</b>.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarningOpen(false)} variant="contained">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SaleSummarySection;
