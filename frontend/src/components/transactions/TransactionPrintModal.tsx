"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  CircularProgress,
  useTheme,
  TextField,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { Printer, RefreshCcw, Settings2 } from "lucide-react";
import toast from "react-hot-toast";
import { getShopData } from "../../lib/api/shopService";

interface Props {
  open: boolean;
  onClose: () => void;
  transaction: any | null;
  entity: any | null;
  linkedBill?: any | null;
}

export default function TransactionPrintModal({
  open,
  onClose,
  transaction,
  entity,
  linkedBill,
}: Props) {
  const theme = useTheme();

  // Preference States (Cached)
  const [paperSize, setPaperSize] = useState(
    () => localStorage.getItem("txPrint_size") || "A5",
  );
  const [orientation, setOrientation] = useState(
    () => localStorage.getItem("txPrint_orient") || "landscape",
  );

  // UI States
  const [isPrinting, setIsPrinting] = useState(false);
  const [shop, setShop] = useState<any>(null);

  // Editable Data States
  const [editedData, setEditedData] = useState({
    entityName: "",
    entityPhone: "",
    amount: 0,
    date: "",
    reference_no: "",
    payment_mode: "",
    linkedBillRef: "",
    note: "",
  });

  // Fetch Shop Data for 1:1 Preview
  useEffect(() => {
    if (open) {
      getShopData()
        .then(setShop)
        .catch(() => {});
    }
  }, [open]);

  // Sync initial data to editable state when modal opens
  useEffect(() => {
    if (open && transaction) {
      setEditedData({
        entityName: entity?.name || "Cash / Walk-in",
        entityPhone: entity?.phone || "",
        amount: transaction.amount || 0,
        date: transaction.transaction_date
          ? new Date(transaction.transaction_date).toISOString().split("T")[0]
          : "",
        reference_no: transaction.reference_no || "",
        payment_mode: transaction.payment_mode || "cash",
        linkedBillRef: linkedBill?.reference_no || "",
        note: transaction.note || "",
      });
    }
  }, [open, transaction, entity, linkedBill]);

  // Cache Preferences & Handle Thermal Orientation
  useEffect(() => {
    if (paperSize.includes("mm")) {
      setOrientation("portrait");
    }
    localStorage.setItem("txPrint_size", paperSize);
    localStorage.setItem("txPrint_orient", orientation);
  }, [paperSize, orientation]);

  const handleReset = () => {
    if (transaction) {
      setEditedData({
        entityName: entity?.name || "Cash / Walk-in",
        entityPhone: entity?.phone || "",
        amount: transaction.amount || 0,
        date: transaction.transaction_date
          ? new Date(transaction.transaction_date).toISOString().split("T")[0]
          : "",
        reference_no: transaction.reference_no || "",
        payment_mode: transaction.payment_mode || "cash",
        linkedBillRef: linkedBill?.reference_no || "",
        note: transaction.note || "",
      });
      toast.success("Restored original details");
    }
  };

  const handlePrint = async () => {
    if (!window.electron?.ipcRenderer) {
      toast.error("Desktop App (Electron) required for hardware printing.");
      return;
    }
    if (!transaction) return;

    setIsPrinting(true);
    const toastId = toast.loading("Sending to printer...");

    // Construct Payload with Edited Data
    const payload = {
      transaction: {
        ...transaction,
        amount: editedData.amount,
        transaction_date: editedData.date,
        reference_no: editedData.reference_no,
        payment_mode: editedData.payment_mode,
        note: editedData.note,
      },
      entity: {
        name: editedData.entityName,
        phone: editedData.entityPhone,
      },
      linkedBill: linkedBill
        ? { ...linkedBill, reference_no: editedData.linkedBillRef }
        : null,
      printOptions: {
        size: paperSize,
        orientation: orientation,
      },
    };

    try {
      const res = await window.electron.ipcRenderer.invoke(
        "print-transaction",
        payload,
      );

      if (res?.success) {
        toast.success("Printed successfully!", { id: toastId });
        onClose();
      } else {
        toast.error(`Print failed: ${res?.error}`, { id: toastId });
      }
    } catch (error) {
      toast.error("Printer communication failed.", { id: toastId });
    } finally {
      setIsPrinting(false);
    }
  };

  if (!transaction) return null;

  // Dynamic Theme Logic
  let title = "VOUCHER";
  let entityLabel = "Party";
  let themeColor = "#374151"; // Default Gray
  let lightBg = "#f3f4f6";

  if (transaction.type === "payment_in") {
    title = "RECEIPT VOUCHER";
    entityLabel = "Received From";
    themeColor = "#059669";
    lightBg = "#ecfdf5";
  } else if (transaction.type === "payment_out") {
    title = "PAYMENT VOUCHER";
    entityLabel = "Paid To";
    themeColor = "#dc2626";
    lightBg = "#fef2f2";
  } else if (transaction.type === "credit_note") {
    title = "CREDIT NOTE";
    entityLabel = "Customer";
    themeColor = "#ea580c";
    lightBg = "#fff7ed";
  } else if (transaction.type === "debit_note") {
    title = "DEBIT NOTE";
    entityLabel = "Supplier";
    themeColor = "#dc2626";
    lightBg = "#fef2f2";
  }

  const isThermal = paperSize.includes("mm");
  const displayDate = editedData.date
    ? new Date(editedData.date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
  const displayAmount = Number(editedData.amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, height: "90vh" } }}
    >
      <DialogTitle
        sx={{
          fontWeight: 800,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Printer size={22} color={theme.palette.primary.main} />
          Print Document Setup
        </Box>
        <Tooltip title="Reset to Original Values">
          <IconButton
            onClick={handleReset}
            size="small"
            sx={{ bgcolor: "action.hover" }}
          >
            <RefreshCcw size={18} />
          </IconButton>
        </Tooltip>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          p: 0,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          bgcolor: "#f9fafb",
        }}
      >
        {/* LEFT PANEL: EDITABLE SETTINGS */}
        <Box
          sx={{
            width: { xs: "100%", md: "40%" },
            p: 3,
            bgcolor: "#fff",
            borderRight: "1px solid",
            borderColor: "divider",
            overflowY: "auto",
          }}
        >
          <Stack spacing={3}>
            {/* Print Preferences */}
            <Box>
              <Typography
                variant="overline"
                fontWeight={800}
                color="primary"
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}
              >
                <Settings2 size={16} /> Print Configuration
              </Typography>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Paper Size</InputLabel>
                  <Select
                    value={paperSize}
                    label="Paper Size"
                    onChange={(e) => setPaperSize(e.target.value)}
                  >
                    <MenuItem value="A4">A4 (Standard)</MenuItem>
                    <MenuItem value="A5">A5 (Half Size)</MenuItem>
                    <MenuItem value="80mm">80mm (Thermal POS)</MenuItem>
                    <MenuItem value="58mm">58mm (Small Thermal)</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small" disabled={isThermal}>
                  <InputLabel>Orientation</InputLabel>
                  <Select
                    value={orientation}
                    label="Orientation"
                    onChange={(e) => setOrientation(e.target.value)}
                  >
                    <MenuItem value="portrait">Portrait</MenuItem>
                    <MenuItem value="landscape">Landscape</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            <Divider />

            {/* Editable Content */}
            <Box>
              <Typography
                variant="overline"
                fontWeight={800}
                color="text.secondary"
                sx={{ display: "block", mb: 1.5 }}
              >
                Voucher Details (Editable)
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label={entityLabel}
                  size="small"
                  fullWidth
                  value={editedData.entityName}
                  onChange={(e) =>
                    setEditedData({ ...editedData, entityName: e.target.value })
                  }
                />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Phone"
                      size="small"
                      fullWidth
                      value={editedData.entityPhone}
                      onChange={(e) =>
                        setEditedData({
                          ...editedData,
                          entityPhone: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Amount (₹)"
                      type="number"
                      size="small"
                      fullWidth
                      value={editedData.amount}
                      onChange={(e) =>
                        setEditedData({
                          ...editedData,
                          amount: Number(e.target.value),
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Payment Mode"
                      size="small"
                      fullWidth
                      value={editedData.payment_mode}
                      onChange={(e) =>
                        setEditedData({
                          ...editedData,
                          payment_mode: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Date"
                      type="date"
                      size="small"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={editedData.date}
                      onChange={(e) =>
                        setEditedData({ ...editedData, date: e.target.value })
                      }
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Voucher Reference No."
                      size="small"
                      fullWidth
                      value={editedData.reference_no}
                      onChange={(e) =>
                        setEditedData({
                          ...editedData,
                          reference_no: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  {linkedBill && (
                    <Grid item xs={12}>
                      <TextField
                        label="Adjusted Against Bill No."
                        size="small"
                        fullWidth
                        value={editedData.linkedBillRef}
                        onChange={(e) =>
                          setEditedData({
                            ...editedData,
                            linkedBillRef: e.target.value,
                          })
                        }
                      />
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <TextField
                      label="Remarks / Narration"
                      size="small"
                      fullWidth
                      multiline
                      rows={2}
                      value={editedData.note}
                      onChange={(e) =>
                        setEditedData({ ...editedData, note: e.target.value })
                      }
                    />
                  </Grid>
                </Grid>
              </Stack>
            </Box>
          </Stack>
        </Box>

        {/* RIGHT PANEL: LIVE PREVIEW */}
        <Box
          sx={{
            width: { xs: "100%", md: "60%" },
            p: 3,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            overflowY: "auto",
          }}
        >
          {isThermal ? (
            /* THERMAL PREVIEW */
            <Box
              sx={{
                width: "280px",
                bgcolor: "#fff",
                p: 2,
                fontFamily: "monospace",
                color: "#000",
                border: "1px solid #ccc",
                boxShadow: theme.shadows[3],
              }}
            >
              <Box textAlign="center" mb={1}>
                <Typography fontWeight={800}>
                  {shop?.shop_name || "Shop Name"}
                </Typography>
                <Typography fontSize="10px">
                  {[shop?.address_line1, shop?.city].filter(Boolean).join(", ")}
                </Typography>
                <Typography fontSize="10px">
                  Ph: {shop?.contact_number || shop?.phone || ""}
                </Typography>
              </Box>
              <Box borderTop="1px dashed #000" my={1} />
              <Typography
                textAlign="center"
                fontWeight={800}
                sx={{ textDecoration: "underline", mb: 1 }}
              >
                {title}
              </Typography>
              <Stack
                direction="row"
                justifyContent="space-between"
                fontSize="11px"
              >
                <Box>Date:</Box>
                <Box>{displayDate}</Box>
              </Stack>
              <Stack
                direction="row"
                justifyContent="space-between"
                fontSize="11px"
              >
                <Box>Ref:</Box>
                <Box>{editedData.reference_no || "-"}</Box>
              </Stack>
              <Box borderTop="1px dashed #000" my={1} />
              <Typography fontWeight={800} fontSize="11px" mb={0.5}>
                {entityLabel}:
              </Typography>
              <Typography fontSize="11px">
                {editedData.entityName || "Cash Customer"}
              </Typography>
              {editedData.entityPhone && (
                <Typography fontSize="11px">
                  Ph: {editedData.entityPhone}
                </Typography>
              )}

              <Box
                border="1px solid #000"
                p={1}
                textAlign="center"
                fontWeight={800}
                fontSize="16px"
                my={1.5}
              >
                ₹ {displayAmount}
              </Box>

              <Stack
                direction="row"
                justifyContent="space-between"
                fontSize="11px"
              >
                <Box>Mode:</Box>
                <Box textTransform="uppercase">
                  {editedData.payment_mode || "CASH"}
                </Box>
              </Stack>
              {linkedBill && (
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  fontSize="11px"
                >
                  <Box>Agst Bill:</Box>
                  <Box>{editedData.linkedBillRef || "-"}</Box>
                </Stack>
              )}
              {editedData.note && (
                <Typography fontSize="11px" mt={1}>
                  Note: {editedData.note}
                </Typography>
              )}

              <Box borderTop="1px dashed #000" my={1.5} />
              <Typography textAlign="center" fontSize="11px" mt={3}>
                Sign: ____________________
              </Typography>
              <Typography textAlign="center" fontSize="9px" mt={1}>
                Thank You!
              </Typography>
            </Box>
          ) : (
            /* STANDARD (A4/A5) PREVIEW */
            <Box
              sx={{
                width: "100%",
                maxWidth: orientation === "landscape" ? "800px" : "550px",
                bgcolor: "#fff",
                border: "1px solid #e5e7eb",
                borderTop: `8px solid ${themeColor}`,
                borderRadius: 2,
                p: { xs: 2, md: 4 },
                boxShadow: theme.shadows[3],
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Watermark */}
              <Typography
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%) rotate(-20deg)",
                  fontSize: { xs: 40, md: 70 },
                  fontWeight: 900,
                  color: "rgba(0,0,0,0.02)",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              >
                {title}
              </Typography>

              <Box position="relative" zIndex={1}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  mb={3}
                >
                  <Box width="50%">
                    {shop?.logo_url && (
                      <img
                        src={shop.logo_url}
                        style={{
                          maxHeight: 45,
                          marginBottom: 10,
                          objectFit: "contain",
                        }}
                        alt="Logo"
                      />
                    )}
                    <Typography
                      variant="h6"
                      fontWeight={800}
                      color="#111827"
                      sx={{
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        lineHeight: 1.2,
                      }}
                    >
                      {shop?.shop_name || "Shop Name"}
                    </Typography>
                    <Typography fontSize="11px" color="#4b5563" mt={0.5}>
                      {[shop?.address_line1, shop?.city, shop?.state]
                        .filter(Boolean)
                        .join(", ")}
                    </Typography>
                    <Typography fontSize="11px" color="#4b5563">
                      Ph: {shop?.contact_number || shop?.phone || "N/A"}{" "}
                      {shop?.gstin ? ` | GSTIN: ${shop.gstin}` : ""}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography
                      variant="h6"
                      fontWeight={900}
                      color={themeColor}
                      sx={{
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        mb: 1,
                      }}
                    >
                      {title}
                    </Typography>
                    <Box
                      sx={{
                        display: "inline-block",
                        bgcolor: "#f9fafb",
                        border: "1px solid #f3f4f6",
                        borderRadius: 1.5,
                        p: 1.5,
                        textAlign: "left",
                        minWidth: 170,
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        mb={0.5}
                      >
                        <Typography
                          fontSize="11px"
                          fontWeight={600}
                          color="#6b7280"
                          mr={2}
                        >
                          Voucher No:
                        </Typography>
                        <Typography
                          fontSize="12px"
                          fontWeight={800}
                          fontFamily="monospace"
                          color="#111827"
                        >
                          {editedData.reference_no || "-"}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography
                          fontSize="11px"
                          fontWeight={600}
                          color="#6b7280"
                          mr={2}
                        >
                          Date:
                        </Typography>
                        <Typography
                          fontSize="12px"
                          fontWeight={800}
                          fontFamily="monospace"
                          color="#111827"
                        >
                          {displayDate}
                        </Typography>
                      </Stack>
                    </Box>
                  </Box>
                </Stack>

                <Table
                  size="small"
                  sx={{
                    "& td": {
                      borderBottom: "1px solid #f3f4f6",
                      py: 1.5,
                      fontSize: "13px",
                    },
                  }}
                >
                  <TableBody>
                    <TableRow>
                      <TableCell
                        width="35%"
                        sx={{ fontWeight: 600, color: "#4b5563" }}
                      >
                        {entityLabel}:
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#111827" }}>
                        {editedData.entityName || "Cash / Walk-in"}
                        {editedData.entityPhone && (
                          <span
                            style={{
                              color: "#6b7280",
                              fontWeight: 500,
                              marginLeft: 8,
                            }}
                          >
                            (Ph: {editedData.entityPhone})
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: "#4b5563" }}>
                        Amount (₹):
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: "inline-block",
                            bgcolor: lightBg,
                            color: themeColor,
                            border: `1.5px solid ${themeColor}`,
                            borderRadius: 1.5,
                            px: 2.5,
                            py: 0.5,
                            fontWeight: 900,
                            fontSize: "18px",
                            boxShadow: `2px 2px 0px ${themeColor}`,
                          }}
                        >
                          ₹ {displayAmount}
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: "#4b5563" }}>
                        Payment Mode:
                      </TableCell>
                      <TableCell>
                        <Box
                          component="span"
                          sx={{
                            bgcolor: "#f3f4f6",
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            border: "1px solid #e5e7eb",
                            textTransform: "uppercase",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          {editedData.payment_mode || "CASH"}
                        </Box>
                      </TableCell>
                    </TableRow>
                    {linkedBill && (
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, color: "#4b5563" }}>
                          Adjusted Against Bill:
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#111827" }}>
                          {editedData.linkedBillRef || "-"}
                        </TableCell>
                      </TableRow>
                    )}
                    {editedData.note && (
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, color: "#4b5563" }}>
                          Remarks / Narration:
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 500,
                            fontStyle: "italic",
                            color: "#4b5563",
                          }}
                        >
                          {editedData.note}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  mt={6}
                  pt={1}
                >
                  <Box
                    sx={{
                      width: 180,
                      borderTop: "1px solid #9ca3af",
                      textAlign: "center",
                      pt: 1,
                    }}
                  >
                    <Typography
                      fontSize="11px"
                      fontWeight={700}
                      color="#374151"
                      textTransform="uppercase"
                    >
                      Receiver's Signature
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 180,
                      borderTop: "1px solid #9ca3af",
                      textAlign: "center",
                      pt: 1,
                    }}
                  >
                    <Typography
                      fontSize="11px"
                      fontWeight={700}
                      color="#374151"
                      textTransform="uppercase"
                    >
                      Authorized Signatory
                    </Typography>
                    <Typography fontSize="9px" color="#6b7280" mt={0.5}>
                      For {shop?.shop_name}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 3, bgcolor: "#fff" }}>
        <Button
          onClick={onClose}
          color="inherit"
          disabled={isPrinting}
          sx={{ fontWeight: 600 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handlePrint}
          disabled={isPrinting}
          startIcon={
            isPrinting ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Printer size={18} />
            )
          }
          sx={{ fontWeight: 800, px: 4 }}
        >
          {isPrinting ? "Processing..." : "Print Voucher"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
