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
  Chip,
  Switch,
  FormControlLabel,
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
  Percent,
} from "lucide-react";
import { api } from "../../lib/api/api";
import { getShopData } from "../../lib/api/shopService";
import { getPurchaseById, processPurchaseReturn } from "../../lib/api/purchaseService";
import toast from "react-hot-toast";
import TransactionPrintModal from "../transactions/TransactionPrintModal";
import { getTransactionById } from "../../lib/api/transactionService";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchase: any;
}

export default function PurchaseReturnModal({
  open,
  onClose,
  onSuccess,
  purchase,
}: Props) {
  const theme = useTheme();

  const [fullPurchase, setFullPurchase] = useState<any>(null);
  const [fetchingPurchase, setFetchingPurchase] = useState(false);

  // --- STEP 1 STATE: ADJUSTMENT FORM ---
  const [returnState, setReturnState] = useState<
    Record<
      string | number,
      {
        qty: number;
        returnToStock: boolean;
        refundAmount: number;
        selectedSerials: string[];
      }
    >
  >({});
  const [note, setNote] = useState("");
  const [manualFinalTotal, setManualFinalTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Tax pricing toggle (Inclusive vs Exclusive)
  const [isInclusivePricing, setIsInclusivePricing] = useState<boolean>(true);

  // --- STEP 2 & 3 STATE: SUCCESS & REFUND PAYOUT ---
  const [successData, setSuccessData] = useState<{
    ref: string;
    amount: number;
    gstAmount: number;
  } | null>(null);
  const [refundStep, setRefundStep] = useState<
    "pending" | "recorded" | "skipped"
  >("pending");
  const [paymentMode, setPaymentMode] = useState("cash");

  // --- PRINTING STATE ---
  const [debitNoteTx, setDebitNoteTx] = useState<any>(null);
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
      .then((s) => {
        setShop(s);
        setIsInclusivePricing(Boolean(s?.inclusive_tax_pricing ?? 1));
      })
      .catch(() => {});
  }, []);

  // Fetch full purchase record with items when modal opens
  useEffect(() => {
    if (open && purchase?.id) {
      setFetchingPurchase(true);
      getPurchaseById(purchase.id)
        .then((res) => {
          const data = res.data || res;
          setFullPurchase(data);
        })
        .catch((err) => {
          toast.error("Failed to load purchase details");
          console.error(err);
        })
        .finally(() => {
          setFetchingPurchase(false);
        });
    }
  }, [open, purchase?.id]);

  const handleQtyChange = (
    itemId: string | number,
    availableQty: number,
    val: string,
    item: any
  ) => {
    const qty = Math.min(Math.max(0, parseFloat(val) || 0), availableQty);
    const purchasedUnitPrice = item.rate || (item.quantity > 0 ? item.price / item.quantity : 0);
    const suggestedRefund = purchasedUnitPrice * qty;

    setReturnState((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { returnToStock: true, selectedSerials: [] }),
        qty,
        refundAmount: parseFloat(suggestedRefund.toFixed(2)),
      },
    }));
  };

  const handleSerialToggle = (
    itemId: string | number,
    serial: string,
    item: any
  ) => {
    setReturnState((prev) => {
      const currentSerials = prev[itemId]?.selectedSerials || [];
      const exists = currentSerials.includes(serial);
      const newSerials = exists
        ? currentSerials.filter((s) => s !== serial)
        : [...currentSerials, serial];

      const qty = newSerials.length;
      const purchasedUnitPrice = item.rate || (item.quantity > 0 ? item.price / item.quantity : 0);
      const suggestedRefund = purchasedUnitPrice * qty;

      return {
        ...prev,
        [itemId]: {
          ...(prev[itemId] || { returnToStock: true }),
          selectedSerials: newSerials,
          qty,
          refundAmount: parseFloat(suggestedRefund.toFixed(2)),
        },
      };
    });
  };

  const activePurchase = fullPurchase || purchase;

  const calculatedItemsTotal = useMemo(() => {
    const total = Object.values(returnState).reduce(
      (sum, i) => sum + (i.refundAmount || 0),
      0
    );
    return parseFloat(total.toFixed(2));
  }, [returnState]);

  // --- GST BREAKDOWN CALCULATION ---
  const gstSummary = useMemo(() => {
    if (!activePurchase?.items) {
      return {
        taxableTotal: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalGst: 0,
        grandTotal: 0,
        isIntraState: true,
      };
    }

    const shopState = (shop?.state || "").toString().trim().toLowerCase();
    const supplierState = (activePurchase?.supplier_state || activePurchase?.state || "").toString().trim().toLowerCase();
    const isIntraState = !supplierState || !shopState || supplierState === shopState;

    let taxableTotal = 0;
    let totalGst = 0;

    activePurchase.items.forEach((item: any) => {
      const qty = returnState[item.id]?.qty || 0;
      if (qty <= 0) return;

      const enteredPrice = returnState[item.id]?.refundAmount || 0;
      const gstRate = Number(item.gst_rate) || 0;

      if (gstRate <= 0) {
        taxableTotal += enteredPrice;
      } else if (isInclusivePricing) {
        const taxable = enteredPrice / (1 + gstRate / 100);
        const gst = enteredPrice - taxable;
        taxableTotal += taxable;
        totalGst += gst;
      } else {
        const taxable = enteredPrice;
        const gst = taxable * (gstRate / 100);
        taxableTotal += taxable;
        totalGst += gst;
      }
    });

    const grandTotal = isInclusivePricing
      ? calculatedItemsTotal
      : calculatedItemsTotal + totalGst;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isIntraState) {
      cgst = totalGst / 2;
      sgst = totalGst / 2;
    } else {
      igst = totalGst;
    }

    return {
      taxableTotal: parseFloat(taxableTotal.toFixed(2)),
      cgst: parseFloat(cgst.toFixed(2)),
      sgst: parseFloat(sgst.toFixed(2)),
      igst: parseFloat(igst.toFixed(2)),
      totalGst: parseFloat(totalGst.toFixed(2)),
      grandTotal: parseFloat(grandTotal.toFixed(2)),
      isIntraState,
    };
  }, [activePurchase, returnState, isInclusivePricing, calculatedItemsTotal, shop]);

  const finalPayout = useMemo(() => {
    const val =
      manualFinalTotal !== null ? manualFinalTotal : gstSummary.grandTotal;
    return parseFloat(val.toFixed(2));
  }, [manualFinalTotal, gstSummary.grandTotal]);

  // --- STEP 1 SUBMIT: PROCESS PURCHASE RETURN ---
  const handleSubmitReturn = async () => {
    if (!activePurchase?.items) return toast.error("No items found to return.");

    const returnItems = activePurchase.items
      .filter((item: any) => (returnState[item.id]?.qty || 0) > 0)
      .map((item: any) => ({
        purchase_item_id: item.id,
        product_id: item.product_id,
        quantity: returnState[item.id].qty,
        unit: item.unit,
        returnToStock: returnState[item.id].returnToStock ?? true,
        price: returnState[item.id].refundAmount,
        selectedSerials: returnState[item.id].selectedSerials || [],
      }));

    if (returnItems.length === 0) return toast.error("Select items to return.");

    setLoading(true);
    try {
      const res = await processPurchaseReturn({
        purchaseId: activePurchase.id,
        returnItems,
        note:
          manualFinalTotal !== null
            ? `${note} (Adjusted debit note amount: ₹${finalPayout})`
            : note,
        customTotalAmount: finalPayout,
        gstAmount: gstSummary.totalGst,
      });

      const payload = res.data || res;

      if (payload.success) {
        if (payload.dnId) {
          const transaction = await getTransactionById(payload.dnId);
          setDebitNoteTx(transaction);
        }

        setSuccessData({
          ref: payload.debitNoteRef || payload.dnRef || "DN-DEBIT-NOTE",
          amount: payload.refundAmount,
          gstAmount: payload.gstAmount || gstSummary.totalGst,
        });
        setRefundStep("pending");
      } else {
        throw new Error(res.message || "Return failed");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to process purchase return"
      );
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 2 SUBMIT: RECORD SUPPLIER REFUND PAYOUT (PAYMENT IN) ---
  const handleRecordRefund = async () => {
    if (!successData) return;
    setLoading(true);
    try {
      const res = await api.post("/api/transactions", {
        type: "payment_in",
        bill_type: "purchase",
        bill_id: activePurchase.id,
        entity_type: "supplier",
        entity_id: activePurchase.supplier_id || null,
        amount: successData.amount,
        payment_mode: paymentMode,
        transaction_date: new Date().toISOString().split("T")[0],
        status: "paid",
        note: `Supplier cash/bank refund for Debit Note ${successData.ref}`,
      });

      const txRecord = res.data.data || res.data;
      setPayoutTx(txRecord);

      toast.success("Supplier refund payment recorded!");
      setRefundStep("recorded");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to record refund transaction"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFinalCompletion = () => {
    onSuccess();
  };

  const handleWhatsAppShare = () => {
    if (!successData) return;

    const shopName = shop?.shop_name || "Our Shop";
    const nl = "\n";

    const returnedItemsList = activePurchase.items
      .filter((item: any) => (returnState[item.id]?.qty || 0) > 0)
      .map((item: any) => {
        const tracking = item.batch_number
          ? ` (Batch: ${item.batch_number})`
          : "";
        return `- ${item.product_name}${tracking} x ${returnState[item.id].qty} ${item.unit || "pcs"}`;
      })
      .join(nl);

    const settlementText =
      refundStep === "recorded"
        ? `Refund payout of ₹${successData.amount.toFixed(2)} received via ${paymentMode.toUpperCase()}.`
        : `Debit Note amount of ₹${successData.amount.toFixed(2)} applied as reduction to Purchase Bill #${activePurchase.reference_no}.`;

    const message =
      `*DEBIT NOTE ISSUED - ${shopName.toUpperCase()}*${nl}${nl}` +
      `Supplier: ${activePurchase.supplier_name || "Supplier"}${nl}${nl}` +
      `Debit Note #${successData.ref} issued against Purchase Bill #${activePurchase.reference_no}.${nl}${nl}` +
      `📦 *Items Returned:*${nl}${returnedItemsList}${nl}${nl}` +
      `💰 *Taxable Subtotal:* ₹${gstSummary.taxableTotal.toFixed(2)}${nl}` +
      `🧾 *Return GST:* ₹${successData.gstAmount.toFixed(2)}${nl}` +
      `💵 *Total Debit Note:* ₹${successData.amount.toFixed(2)}${nl}` +
      `🧾 *Debit Note Ref:* ${successData.ref}${nl}${nl}` +
      `*Status:* ${settlementText}${nl}${nl}` +
      `Thank you! 🙏`;

    if (window.electron?.sendWhatsAppMessage) {
      window.electron.sendWhatsAppMessage(activePurchase.supplier_phone || "", message);
      toast.success("WhatsApp message sent!");
    } else {
      toast.error("WhatsApp integration not available.");
    }
  };

  const openPrint = (tx: any) => {
    setPrintModal({ open: true, tx });
  };

  // --- STEP 2 UI: SUPPLIER REFUND PROMPT ---
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
              bgcolor: alpha(theme.palette.success.main, 0.1),
            }}
          >
            <Wallet size={48} color={theme.palette.success.main} />
          </Box>
          <Typography variant="h5" fontWeight={900} gutterBottom>
            Supplier Refund
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Debit Note <b>{successData.ref}</b> generated for{" "}
            <b>₹{successData.amount.toFixed(2)}</b> (Includes GST ₹{successData.gstAmount.toFixed(2)}).
            <br />
            <br />
            Did the supplier refund this cash/amount directly to you?
          </Typography>

          <Box sx={{ textAlign: "left", mb: 3 }}>
            <Typography
              variant="caption"
              fontWeight={800}
              color="text.secondary"
              sx={{ display: "block", mb: 0.5 }}
            >
              PAYMENT MODE RECEIVED
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
              color="success"
              size="large"
              disabled={loading}
              onClick={handleRecordRefund}
              sx={{ py: 1.5, fontWeight: 800, borderRadius: 2 }}
            >
              {loading
                ? "Recording..."
                : `Record ₹${successData.amount.toFixed(2)} Refund Received`}
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              disabled={loading}
              onClick={() => setRefundStep("skipped")}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Reduce Purchase Bill Balance (Skip)
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    );
  }

  // --- STEP 3 UI: SUCCESS VIEW ---
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
              Purchase Return Completed!
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 4, px: 2 }}
            >
              Debit Note <b>{successData.ref}</b> saved.
              <br />
              <span
                style={{
                  fontWeight: 600,
                  color:
                    refundStep === "recorded"
                      ? theme.palette.success.main
                      : theme.palette.primary.main,
                }}
              >
                {refundStep === "recorded"
                  ? `Supplier refund payout (${paymentMode.toUpperCase()}) recorded.`
                  : "Purchase Bill balance auto-reduced."}
              </span>
            </Typography>

            <Stack spacing={2} px={2}>
              <Grid container spacing={1.5}>
                <Grid item xs={payoutTx ? 6 : 12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    startIcon={<Printer size={18} />}
                    onClick={() => openPrint(debitNoteTx)}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  >
                    Print Debit Note
                  </Button>
                </Grid>
                {payoutTx && (
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="success"
                      startIcon={<Printer size={18} />}
                      onClick={() => openPrint(payoutTx)}
                      sx={{ fontWeight: 700, borderRadius: 2 }}
                    >
                      Print Receipt
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
          entity={{ name: activePurchase?.supplier_name, phone: activePurchase?.supplier_phone }}
          linkedBill={{ reference_no: activePurchase?.reference_no }}
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
          bgcolor: "#f8fafc",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <RotateCcw size={22} color={theme.palette.warning.main} />
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Process Purchase Return & Issue Debit Note
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Purchase Bill: <b>{activePurchase?.reference_no}</b> | Supplier:{" "}
              <b>{activePurchase?.supplier_name}</b>
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {fetchingPurchase ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={36} />
          </Box>
        ) : (
          <>
            {/* PRICING MODE TOGGLE BAR */}
            <Box
              sx={{
                px: 3,
                py: 1.5,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                borderBottom: "1px solid",
                borderColor: "divider",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Percent size={18} color={theme.palette.primary.main} />
                <Typography variant="subtitle2" fontWeight={800} color="primary">
                  GST Tax Calculation Mode
                </Typography>
              </Stack>

              <FormControlLabel
                control={
                  <Switch
                    checked={isInclusivePricing}
                    onChange={(e) => setIsInclusivePricing(e.target.checked)}
                    color="primary"
                    size="small"
                  />
                }
                label={
                  <Typography variant="caption" fontWeight={700}>
                    {isInclusivePricing
                      ? "Tax Inclusive (Prices include GST)"
                      : "Tax Exclusive (GST added extra)"}
                  </Typography>
                }
              />
            </Box>

            <Table size="small">
              <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.05) }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, py: 1.5 }}>
                    Product & Tracking
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    Purchased Rate
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    GST %
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    Available Qty
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, width: 120 }}>
                    Return Qty
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 800, width: 160, color: "text.primary" }}
                  >
                    Return Amount
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>
                    Deduct Stock?
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activePurchase?.items?.map((item: any) => {
                  const available = Math.max(
                    0,
                    (item.quantity || 0) - (item.return_quantity || 0)
                  );
                  const isFullyReturned = available <= 0;
                  const purchasedUnitPrice = item.rate || (item.quantity > 0 ? item.price / item.quantity : 0);
                  const gstRate = Number(item.gst_rate) || 0;

                  const hasSerials =
                    Array.isArray(item.serial_numbers) && item.serial_numbers.length > 0;

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
                        <Stack direction="column" spacing={0.5} mt={0.5}>
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
                              <Package size={12} /> Batch: <b>{item.batch_number}</b>
                            </Typography>
                          )}
                          {hasSerials && (
                            <Box mt={0.5}>
                              <Typography
                                variant="caption"
                                fontWeight={700}
                                color="text.secondary"
                                sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}
                              >
                                <ScanBarcode size={12} /> Select Serials to Return:
                              </Typography>
                              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                                {item.serial_numbers.map((sn: string) => {
                                  const selected = (
                                    returnState[item.id]?.selectedSerials || []
                                  ).includes(sn);
                                  return (
                                    <Chip
                                      key={sn}
                                      label={sn}
                                      size="small"
                                      color={selected ? "warning" : "default"}
                                      variant={selected ? "filled" : "outlined"}
                                      onClick={() =>
                                        handleSerialToggle(item.id, sn, item)
                                      }
                                      sx={{ cursor: "pointer", fontSize: "0.75rem" }}
                                    />
                                  );
                                })}
                              </Stack>
                            </Box>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        ₹{purchasedUnitPrice.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${gstRate}%`}
                          size="small"
                          color={gstRate > 0 ? "primary" : "default"}
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: "success.main" }}
                      >
                        {available} {item.unit || "pcs"}
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          disabled={isFullyReturned || loading || hasSerials}
                          value={returnState[item.id]?.qty ?? ""}
                          onChange={(e) =>
                            handleQtyChange(
                              item.id,
                              available,
                              e.target.value,
                              item
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
          </>
        )}

        <Box p={3} bgcolor={alpha(theme.palette.background.default, 0.6)}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
            <Box flex={1}>
              <Typography
                variant="subtitle2"
                gutterBottom
                fontWeight={800}
                color="text.secondary"
              >
                RETURN REASON / NOTES
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Reason for returning stock to supplier (e.g. Defective items, expired batch, wrong shipment)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                variant="outlined"
                sx={{ bgcolor: "background.paper" }}
              />
            </Box>

            <Box
              sx={{
                minWidth: 380,
                p: 3,
                borderRadius: 2,
                border: "2px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Stack spacing={1.5}>
                <Typography variant="caption" fontWeight={800} color="text.secondary">
                  GST DEBIT NOTE FINANCIAL SUMMARY
                </Typography>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Taxable Subtotal:
                  </Typography>
                  <Typography variant="body2" fontWeight={800}>
                    ₹{gstSummary.taxableTotal.toFixed(2)}
                  </Typography>
                </Stack>

                {gstSummary.isIntraState ? (
                  <>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        CGST:
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        ₹{gstSummary.cgst.toFixed(2)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        SGST:
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        ₹{gstSummary.sgst.toFixed(2)}
                      </Typography>
                    </Stack>
                  </>
                ) : (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      IGST:
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      ₹{gstSummary.igst.toFixed(2)}
                    </Typography>
                  </Stack>
                )}

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="primary.main" fontWeight={700}>
                    Total Return GST:
                  </Typography>
                  <Typography variant="body2" color="primary.main" fontWeight={800}>
                    ₹{gstSummary.totalGst.toFixed(2)}
                  </Typography>
                </Stack>

                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: alpha(theme.palette.warning.main, 0.05),
                    borderRadius: 1,
                    border: "1px dashed",
                    borderColor: "warning.main",
                    mt: 1,
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Banknote size={16} color={theme.palette.warning.main} />
                      <Typography
                        variant="subtitle2"
                        fontWeight={800}
                        color="warning.main"
                      >
                        Debit Note Total:
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
                          color: theme.palette.warning.main,
                        },
                      }}
                      sx={{ width: 130 }}
                    />
                  </Stack>
                  <Typography
                    variant="caption"
                    color="warning.main"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mt: 1,
                      fontWeight: 700,
                    }}
                  >
                    <AlertCircle size={10} /> Editable for manual adjustments.
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
          color="warning"
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
          {loading ? "Processing..." : "Issue Debit Note"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
