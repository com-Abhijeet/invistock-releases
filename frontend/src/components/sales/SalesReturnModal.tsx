"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  TextField,
  Typography,
  Box,
  Stack,
  alpha,
  useTheme,
  CircularProgress,
  IconButton,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  RotateCcw,
  Banknote,
  MessageCircle,
  CheckCircle2,
  Package,
  ScanBarcode,
  X,
  AlertCircle,
  Wallet,
  Printer,
} from "lucide-react";
import { api } from "../../lib/api/api";
import { getShopData } from "../../lib/api/shopService";
import toast from "react-hot-toast";
import TransactionPrintModal from "../transactions/TransactionPrintModal";
import { getTransactionById } from "../../lib/api/transactionService";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void; // Refreshes the table and closes the modal
  sale: any;
}

export default function SalesReturnModal({
  open,
  onClose,
  onSuccess,
  sale,
}: Props) {
  const theme = useTheme();

  // --- STEP 1 STATE: ADJUSTMENT FORM ---
  const [returnState, setReturnState] = useState<
    Record<
      number,
      { qty: number; returnToStock: boolean; refundAmount: number }
    >
  >({});
  const [note, setNote] = useState("");
  const [manualFinalTotal, setManualFinalTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // --- STEP 2 & 3 STATE: SUCCESS & REFUND PAYOUT ---
  const [successData, setSuccessData] = useState<{
    ref: string;
    amount: number;
  } | null>(null);
  const [refundStep, setRefundStep] = useState<
    "pending" | "recorded" | "skipped"
  >("pending");
  const [paymentMode, setPaymentMode] = useState("cash");

  // --- PRINTING STATE ---
  const [creditNoteTx, setCreditNoteTx] = useState<any>(null);
  const [payoutTx, setPayoutTx] = useState<any>(null);
  const [printModal, setPrintModal] = useState<{
    open: boolean;
    tx: any | null;
  }>({
    open: false,
    tx: null,
  });

  const [shop, setShop] = useState<any>(null);

  useEffect(() => {
    getShopData()
      .then(setShop)
      .catch(() => {});
  }, []);

  const handleQtyChange = (
    itemId: number,
    availableQty: number,
    val: string,
    item: any,
  ) => {
    const qty = Math.min(Math.max(0, parseFloat(val) || 0), availableQty);
    const soldUnitPrice = item.price / item.quantity;
    const suggestedRefund = soldUnitPrice * qty;

    setReturnState((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { returnToStock: true }),
        qty,
        refundAmount: parseFloat(suggestedRefund.toFixed(2)),
      },
    }));
  };

  const calculatedItemsTotal = useMemo(() => {
    const total = Object.values(returnState).reduce(
      (sum, i) => sum + (i.refundAmount || 0),
      0,
    );
    return parseFloat(total.toFixed(2));
  }, [returnState]);

  const finalPayout = useMemo(() => {
    const val =
      manualFinalTotal !== null ? manualFinalTotal : calculatedItemsTotal;
    return parseFloat(val.toFixed(2));
  }, [manualFinalTotal, calculatedItemsTotal]);

  // --- STEP 1 SUBMIT: PROCESS RETURN ---
  const handleSubmitReturn = async () => {
    const returnItems = sale.items
      .filter((item: any) => (returnState[item.id]?.qty || 0) > 0)
      .map((item: any) => ({
        sales_item_id: item.id,
        product_id: item.product_id,
        quantity: returnState[item.id].qty,
        unit: item.unit,
        returnToStock: returnState[item.id].returnToStock ?? true,
        price: returnState[item.id].refundAmount,
      }));

    if (returnItems.length === 0) return toast.error("Select items to return.");

    setLoading(true);
    try {
      const res = await api.post("/api/sales/return", {
        saleId: sale.id,
        returnItems,
        note:
          manualFinalTotal !== null
            ? `${note} (Adjusted payout: ₹${finalPayout})`
            : note,
        customTotalAmount: finalPayout,
      });

      const payload = res.data.data || res.data;

      if (payload.success) {
        // Store the transaction record for printing
        console.log("PAYLOAD", payload);
        const transaction = await getTransactionById(payload.cnId);
        setCreditNoteTx(transaction);

        setSuccessData({
          ref: payload.creditNoteRef,
          amount: payload.refundAmount,
        });
        setRefundStep("pending");
      } else {
        throw new Error(res.data.message || "Return failed");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to process return",
      );
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 2 SUBMIT: RECORD CASH PAYOUT ---
  const handleRecordRefund = async () => {
    if (!successData) return;
    setLoading(true);
    try {
      const res = await api.post("/api/transactions", {
        type: "payment_out",
        bill_type: "sale",
        bill_id: sale.id,
        entity_type: "customer",
        entity_id: sale.customer_id || null,
        amount: successData.amount,
        payment_mode: paymentMode,
        transaction_date: new Date().toISOString().split("T")[0],
        status: "paid",
        note: `Cash refund for Credit Note ${successData.ref}`,
      });

      const txRecord = res.data.data || res.data;
      setPayoutTx(txRecord);

      toast.success("Cash refund recorded successfully!");
      setRefundStep("recorded"); // Move to Step 3
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to record refund transaction",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFinalCompletion = () => {
    onSuccess(); // Close modal and refresh table
  };

  const handleWhatsAppShare = () => {
    if (!successData) return;

    const shopName = shop?.shop_name || "Our Shop";
    const nl = "\n";

    const returnedItemsList = sale.items
      .filter((item: any) => (returnState[item.id]?.qty || 0) > 0)
      .map((item: any) => {
        const tracking = item.serial_number
          ? ` (SN: ${item.serial_number})`
          : item.batch_number
            ? ` (Batch: ${item.batch_number})`
            : "";
        return `- ${item.product_name}${tracking} x ${returnState[item.id].qty} ${item.unit}`;
      })
      .join(nl);

    const settlementText =
      refundStep === "recorded"
        ? `Refund of ₹${successData.amount.toFixed(2)} has been paid out via ${paymentMode.toUpperCase()}.`
        : `Refund amount of ₹${successData.amount.toFixed(2)} has been kept as store credit.`;

    const message =
      `*RETURN PROCESSED - ${shopName.toUpperCase()}*${nl}${nl}` +
      `Hello ${sale.customer_name || "Customer"},${nl}${nl}` +
      `Your return against Bill #${sale.reference_no} has been processed.${nl}${nl}` +
      `📦 *Items Returned:*${nl}${returnedItemsList}${nl}${nl}` +
      `💰 *Total Value:* ₹${successData.amount.toFixed(2)}${nl}` +
      `🧾 *CN Ref:* ${successData.ref}${nl}${nl}` +
      `*Status:* ${settlementText}${nl}${nl}` +
      `Thank you! 🙏`;

    if (window.electron?.sendWhatsAppMessage) {
      window.electron.sendWhatsAppMessage(sale.customer_phone, message);
      toast.success("WhatsApp shared!");
    } else {
      toast.error("WhatsApp integration not available.");
    }
  };

  const openPrint = (tx: any) => {
    setPrintModal({ open: true, tx });
  };

  // --- STEP 2 UI: REFUND SETTLEMENT PROMPT ---
  if (successData && refundStep === "pending") {
    return (
      <Dialog
        open={open}
        onClose={handleFinalCompletion}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogContent sx={{ textAlign: "center", py: 5, px: 4 }}>
          <Box
            sx={{
              mb: 2,
              display: "inline-flex",
              p: 2,
              borderRadius: "50%",
              bgcolor: alpha(theme.palette.info.main, 0.1),
            }}
          >
            <Wallet size={48} color={theme.palette.info.main} />
          </Box>
          <Typography variant="h5" fontWeight={900} gutterBottom>
            Settle Refund
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Credit Note <b>{successData.ref}</b> generated for{" "}
            <b>₹{successData.amount.toFixed(2)}</b>.
            <br />
            <br />
            Did you return this amount to the customer immediately?
          </Typography>

          <Box sx={{ textAlign: "left", mb: 3 }}>
            <Typography
              variant="caption"
              fontWeight={800}
              color="text.secondary"
              sx={{ display: "block", mb: 0.5 }}
            >
              PAYMENT MODE
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                {["cash", "upi", "card", "bank_transfer"].map((m) => (
                  <MenuItem
                    key={m}
                    value={m}
                    sx={{ textTransform: "uppercase", fontWeight: 600 }}
                  >
                    {m.replace("_", " ")}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Stack spacing={2}>
            <Button
              fullWidth
              variant="contained"
              color="info"
              size="large"
              disabled={loading}
              onClick={handleRecordRefund}
              sx={{ py: 1.5, fontWeight: 800, borderRadius: 2 }}
            >
              {loading
                ? "Recording..."
                : `Record ₹${successData.amount.toFixed(2)} Payout`}
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              disabled={loading}
              onClick={() => setRefundStep("skipped")}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Keep as Store Credit (Skip)
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    );
  }

  // --- STEP 3 UI: SUCCESS VIEW (WITH PRINT ACTIONS) ---
  if (successData && refundStep !== "pending") {
    return (
      <>
        <Dialog
          open={open}
          onClose={handleFinalCompletion}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 4 } }}
        >
          <DialogContent sx={{ textAlign: "center", py: 5 }}>
            <Box sx={{ mb: 3 }}>
              <CheckCircle2 size={80} color={theme.palette.success.main} />
            </Box>
            <Typography variant="h5" fontWeight={900} gutterBottom>
              Return Completed!
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 4, px: 2 }}
            >
              Credit Note <b>{successData.ref}</b> saved.
              <br />
              <span
                style={{
                  fontWeight: 600,
                  color:
                    refundStep === "recorded"
                      ? theme.palette.info.main
                      : theme.palette.warning.main,
                }}
              >
                {refundStep === "recorded"
                  ? `Refund payout (${paymentMode.toUpperCase()}) recorded.`
                  : "Amount kept as store credit."}
              </span>
            </Typography>

            <Stack spacing={2} px={2}>
              {/* PRINT ACTIONS */}
              <Grid container spacing={1.5}>
                <Grid item xs={payoutTx ? 6 : 12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="warning"
                    startIcon={<Printer size={18} />}
                    onClick={() => openPrint(creditNoteTx)}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  >
                    Print CN
                  </Button>
                </Grid>
                {payoutTx && (
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="info"
                      startIcon={<Printer size={18} />}
                      onClick={() => openPrint(payoutTx)}
                      sx={{ fontWeight: 700, borderRadius: 2 }}
                    >
                      Print Payout
                    </Button>
                  </Grid>
                )}
              </Grid>

              <Button
                fullWidth
                variant="contained"
                color="success"
                size="large"
                startIcon={<MessageCircle size={20} />}
                onClick={handleWhatsAppShare}
                sx={{ py: 1.5, fontWeight: 800, borderRadius: 2 }}
              >
                Share via WhatsApp
              </Button>

              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                onClick={handleFinalCompletion}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                Close Modal
              </Button>
            </Stack>
          </DialogContent>
        </Dialog>

        <TransactionPrintModal
          open={printModal.open}
          onClose={() => setPrintModal({ open: false, tx: null })}
          transaction={printModal.tx}
          entity={{ name: sale.customer_name, phone: sale.customer_phone }}
          linkedBill={{ reference_no: sale.reference_no }}
        />
      </>
    );
  }

  // --- STEP 1 UI: ADJUSTMENT FORM ---
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <RotateCcw size={22} color={theme.palette.error.main} />
          <Typography variant="h6" fontWeight={800}>
            Process Sale Return
          </Typography>
        </Stack>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.05) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, py: 1.5 }}>
                Product & Tracking
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>
                Sold Rate
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>
                Available
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, width: 110 }}>
                Return Qty
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: 800, width: 150, color: "primary.main" }}
              >
                Refund Amt
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>
                Restock?
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sale.items?.map((item: any) => {
              const available = Math.max(
                0,
                item.quantity -
                  (item.return_qunatity || item.return_quantity || 0),
              );
              const isFullyReturned = available <= 0;
              const soldUnitPrice = item.price / item.quantity;

              return (
                <TableRow
                  key={item.id}
                  sx={{
                    bgcolor: isFullyReturned
                      ? alpha(theme.palette.action.disabledBackground, 0.05)
                      : "inherit",
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {item.product_name}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      {item.batch_number && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            color: "text.secondary",
                          }}
                        >
                          <Package size={10} /> {item.batch_number}
                        </Typography>
                      )}
                      {item.serial_number && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            color: "text.secondary",
                          }}
                        >
                          <ScanBarcode size={10} /> {item.serial_number}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    ₹{soldUnitPrice.toFixed(2)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 700, color: "success.main" }}
                  >
                    {available} {item.unit}
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      type="number"
                      size="small"
                      disabled={isFullyReturned || loading}
                      value={returnState[item.id]?.qty ?? ""}
                      onChange={(e) =>
                        handleQtyChange(
                          item.id,
                          available,
                          e.target.value,
                          item,
                        )
                      }
                      inputProps={{
                        style: { textAlign: "right", fontWeight: 800 },
                      }}
                      variant="standard"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      type="number"
                      size="small"
                      disabled={
                        isFullyReturned ||
                        loading ||
                        (returnState[item.id]?.qty || 0) === 0
                      }
                      value={returnState[item.id]?.refundAmount ?? ""}
                      onChange={(e) =>
                        setReturnState((p) => ({
                          ...p,
                          [item.id]: {
                            ...p[item.id],
                            refundAmount: parseFloat(e.target.value) || 0,
                          },
                        }))
                      }
                      InputProps={{ startAdornment: "₹" }}
                      variant="standard"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Checkbox
                      size="small"
                      disabled={isFullyReturned || loading}
                      checked={returnState[item.id]?.returnToStock ?? true}
                      onChange={(e) =>
                        setReturnState((p) => ({
                          ...p,
                          [item.id]: {
                            ...p[item.id],
                            returnToStock: e.target.checked,
                          },
                        }))
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Box p={3} bgcolor={alpha(theme.palette.background.default, 0.6)}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
            <Box flex={1}>
              <Typography
                variant="subtitle2"
                gutterBottom
                fontWeight={800}
                color="text.secondary"
              >
                REASON / NOTES
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Damage description or deduction reason..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                variant="outlined"
                sx={{ bgcolor: "#fff" }}
              />
            </Box>

            <Box
              sx={{
                minWidth: 350,
                p: 3,
                borderRadius: 2,
                border: "2px solid",
                borderColor: "divider",
                bgcolor: "#fff",
              }}
            >
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontWeight={700}
                  >
                    Items Subtotal:
                  </Typography>
                  <Typography variant="body2" fontWeight={800}>
                    ₹{calculatedItemsTotal.toFixed(2)}
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: alpha(theme.palette.error.main, 0.05),
                    borderRadius: 1,
                    border: "1px dashed",
                    borderColor: "error.main",
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Banknote size={16} color={theme.palette.error.main} />
                      <Typography
                        variant="subtitle2"
                        fontWeight={800}
                        color="error.main"
                      >
                        Final Payout:
                      </Typography>
                    </Stack>
                    <TextField
                      type="number"
                      size="small"
                      variant="standard"
                      value={finalPayout.toFixed(2)}
                      onChange={(e) =>
                        setManualFinalTotal(parseFloat(e.target.value) || 0)
                      }
                      inputProps={{
                        style: {
                          textAlign: "right",
                          fontWeight: 900,
                          fontSize: "1.2rem",
                          color: theme.palette.error.main,
                        },
                      }}
                      sx={{ width: 120 }}
                    />
                  </Stack>
                  <Typography
                    variant="caption"
                    color="error.main"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mt: 1,
                      fontWeight: 700,
                    }}
                  >
                    <AlertCircle size={10} /> Editable for manual deductions.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <Button
          onClick={onClose}
          color="inherit"
          disabled={loading}
          sx={{ fontWeight: 700 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmitReturn}
          variant="contained"
          color="error"
          size="large"
          startIcon={
            loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <RotateCcw size={18} />
            )
          }
          disabled={loading || finalPayout <= 0}
          sx={{ fontWeight: 800, px: 5, borderRadius: "8px" }}
        >
          {loading ? "Processing..." : "Issue Credit Note"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
