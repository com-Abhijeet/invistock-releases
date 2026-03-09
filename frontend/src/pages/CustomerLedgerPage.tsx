"use client";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Chip,
  Collapse,
  IconButton,
} from "@mui/material";
import {
  Printer,
  ChevronDown,
  ChevronUp,
  CreditCard,
  MessageCircle,
} from "lucide-react";
import DashboardHeader from "../components/DashboardHeader";
import { getCustomerLedger } from "../lib/api/customerService";
import { getShopData } from "../lib/api/shopService";
import toast from "react-hot-toast";
import type { DashboardFilter } from "../lib/types/inventoryDashboardTypes";
import KbdButton from "../components/ui/Button";

const getInitialFilters = (): DashboardFilter => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    from: start.toISOString().split("T")[0],
    to: end.toISOString().split("T")[0],
    filter: "custom",
  };
};

interface Transaction {
  id: number;
  date: string;
  amount: number;
  payment_mode: string;
  type: string;
}

interface LedgerEntry {
  id: number;
  date: string;
  reference: string;
  total_amount: number;
  credit_notes: number;
  paid_amount: number;
  balance: number;
  status: "PAID" | "PARTIAL" | "PENDING" | "CREDITED" | "REFUND_DUE";
  transactions: Transaction[];
}

// Utility to cleanly format negative currency without weird dash placements
const formatCurrency = (val: number) => {
  if (val < 0) {
    return `-₹${Math.abs(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function CustomerLedgerPage() {
  const { id } = useParams();
  const customerId = Number(id);
  const [activeFilters, setActiveFilters] =
    useState<DashboardFilter>(getInitialFilters);
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);
  const [totals, setTotals] = useState({
    billed: 0,
    credits: 0,
    paid: 0,
    pending: 0,
  });
  const [shop, setShop] = useState<any>(null);

  useEffect(() => {
    fetchLedger();
    getShopData().then((res) => setShop(res));
  }, [customerId, activeFilters.from, activeFilters.to]);

  const fetchLedger = async () => {
    if (!customerId || !activeFilters.from || !activeFilters.to) return;
    setLoading(true);
    try {
      const response = await getCustomerLedger(customerId, {
        startDate: activeFilters.from,
        endDate: activeFilters.to,
      });
      if (response.success) {
        setCustomer(response.customer);
        processLedger(response.ledger);
      }
    } catch (error) {
      toast.error("Failed to load ledger.");
    } finally {
      setLoading(false);
    }
  };

  const processLedger = (rawLedger: any[]) => {
    let tb = 0,
      tc = 0,
      tp = 0,
      tpen = 0;

    const entries: LedgerEntry[] = rawLedger.map((bill: any) => {
      const amt = parseFloat(bill.total_amount || 0);
      const credits = parseFloat(bill.total_credit_notes || 0);

      // ✅ STRICT SEPARATION: Payment In vs Payment Out
      const paidIn = parseFloat(bill.total_paid || 0);
      const paidOut = parseFloat(bill.total_refunded || 0);

      const netPaid = paidIn - paidOut;
      const bal = amt - credits - netPaid;

      const txs =
        bill.transactions?.map((t: any) => ({
          id: t.id,
          date: t.transaction_date || t.date,
          amount: parseFloat(t.amount || 0),
          payment_mode: t.payment_mode,
          type: t.type,
        })) || [];

      tb += amt;
      tc += credits;
      tp += netPaid;
      tpen += bal; // ✅ BUG FIX: Allows negative totals so you can see if you owe money globally

      let status: LedgerEntry["status"] = "PENDING";

      if (bal <= 0.9 && bal >= -0.9) {
        if (credits >= amt * 0.9 && netPaid <= 0.9) {
          status = "CREDITED";
        } else {
          status = "PAID";
        }
      } else if (bal < -0.9) {
        // ✅ EXPOSE NEGATIVE BALANCES AS REFUNDS OWED
        status = "REFUND_DUE";
      } else if (netPaid > 0 || credits > 0) {
        status = "PARTIAL";
      }

      return {
        id: bill.id,
        date: bill.bill_date,
        reference: bill.reference_no,
        total_amount: amt,
        credit_notes: credits,
        paid_amount: netPaid,
        balance: bal, // ✅ Allows exact negative values
        status,
        transactions: txs,
      };
    });

    setLedgerData(entries);
    setTotals({ billed: tb, credits: tc, paid: tp, pending: tpen });
  };

  const handlePrint = () =>
    window.electron.ipcRenderer.invoke("print-customer-ledger", {
      customerId,
      filters: { startDate: activeFilters.from, endDate: activeFilters.to },
    });

  const handleWhatsApp = async () => {
    if (!customer?.phone)
      return toast.error("Customer phone number is missing");
    const toastId = toast.loading("Sending ledger via WhatsApp...");
    try {
      const res = await window.electron.sendWhatsAppCustomerLedger({
        customerId,
        phone: customer.phone,
        filters: { startDate: activeFilters.from, endDate: activeFilters.to },
      });
      if (res.success)
        toast.success("Ledger sent successfully!", { id: toastId });
      else
        toast.error("Failed to send WhatsApp: " + res.error, { id: toastId });
    } catch (e: any) {
      toast.error("Error sending ledger: " + e.message, { id: toastId });
    }
  };

  return (
    <Box p={3} sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <DashboardHeader
        title="Customer Ledger"
        showSearch={false}
        showDateFilters={true}
        onFilterChange={setActiveFilters}
        actions={
          <Stack direction="row" spacing={2}>
            <KbdButton
              variant="secondary"
              label="Share Ledger"
              underlineChar="s"
              shortcut="ctrl+s"
              startIcon={<MessageCircle size={18} />}
              onClick={handleWhatsApp}
              disabled={loading || !customer || !shop}
            />
            <KbdButton
              variant="primary"
              label="Print Statement"
              underlineChar="p"
              shortcut="ctrl+p"
              startIcon={<Printer size={18} />}
              onClick={handlePrint}
              disabled={loading || !customer}
            />
          </Stack>
        }
      />

      {loading ? (
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          {customer && (
            <Card
              elevation={0}
              sx={{ border: "1px solid", borderColor: "divider" }}
            >
              <CardContent>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={2}
                >
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      {customer.name}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      {customer.phone}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      {customer.address}, {customer.city}
                    </Typography>
                  </Box>
                  <Box textAlign={{ xs: "left", sm: "right" }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight="bold"
                    >
                      {totals.pending < 0
                        ? "TOTAL REFUND OWED"
                        : "NET BALANCE DUE"}
                    </Typography>
                    <Typography
                      variant="h4"
                      fontWeight="bold"
                      color={
                        totals.pending < 0
                          ? "warning.main"
                          : totals.pending > 0
                            ? "error.main"
                            : "success.main"
                      }
                    >
                      {formatCurrency(totals.pending)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}

          <Paper
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
              borderRadius: 2,
            }}
          >
            <TableContainer sx={{ maxHeight: "60vh" }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width="50px" sx={{ bgcolor: "grey.50" }} />
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "grey.50" }}>
                      Date
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "grey.50" }}>
                      Ref No.
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", bgcolor: "grey.50" }}>
                      Status
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: "bold", bgcolor: "grey.50" }}
                    >
                      Bill Total
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: "bold",
                        bgcolor: "grey.50",
                        color: "warning.main",
                      }}
                    >
                      Credits (Returns)
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: "bold",
                        bgcolor: "grey.50",
                        color: "success.main",
                      }}
                    >
                      Net Paid
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: "bold", bgcolor: "grey.50" }}
                    >
                      Balance
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ledgerData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        No transactions found for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledgerData.map((row) => <Row key={row.id} row={row} />)
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Box
              sx={{
                bgcolor: "grey.100",
                p: 2,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack direction="row" justifyContent="flex-end" spacing={4}>
                <Box textAlign="right">
                  <Typography variant="caption" color="text.secondary">
                    Total Billed
                  </Typography>
                  <Typography fontWeight="bold">
                    {formatCurrency(totals.billed)}
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="caption" color="text.secondary">
                    Total Credits (Returns)
                  </Typography>
                  <Typography fontWeight="bold" color="warning.main">
                    {formatCurrency(totals.credits)}
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="caption" color="text.secondary">
                    Total Received (Net)
                  </Typography>
                  <Typography fontWeight="bold" color="success.main">
                    {formatCurrency(totals.paid)}
                  </Typography>
                </Box>
                <Box
                  textAlign="right"
                  sx={{
                    pl: 2,
                    borderLeft: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Closing Balance
                  </Typography>
                  <Typography
                    fontWeight="bold"
                    color={
                      totals.pending < 0
                        ? "warning.main"
                        : totals.pending > 0
                          ? "error.main"
                          : "text.primary"
                    }
                  >
                    {formatCurrency(totals.pending)}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Paper>
        </Stack>
      )}
    </Box>
  );
}

function Row({ row }: { row: LedgerEntry }) {
  const [open, setOpen] = useState(false);
  const hasTransactions = row.transactions && row.transactions.length > 0;
  return (
    <>
      <TableRow
        hover
        onClick={() => hasTransactions && setOpen(!open)}
        sx={{
          cursor: hasTransactions ? "pointer" : "default",
          bgcolor: open ? "action.hover" : "inherit",
        }}
      >
        <TableCell>
          {hasTransactions && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(!open);
              }}
            >
              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </IconButton>
          )}
        </TableCell>
        <TableCell>
          {new Date(row.date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </TableCell>
        <TableCell>
          <Typography
            variant="body2"
            fontFamily="monospace"
            fontWeight="medium"
          >
            {row.reference}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={row.status.replace("_", " ")}
            size="small"
            color={
              row.status === "PAID"
                ? "success"
                : row.status === "CREDITED"
                  ? "info"
                  : row.status === "REFUND_DUE"
                    ? "secondary"
                    : row.status === "PARTIAL"
                      ? "warning"
                      : "error" // Default for PENDING
            }
            variant="outlined"
            sx={{
              fontWeight: "bold",
              fontSize: "0.7rem",
              textTransform: "uppercase",
            }}
          />
        </TableCell>
        <TableCell align="right">{formatCurrency(row.total_amount)}</TableCell>
        <TableCell align="right" sx={{ color: "warning.main" }}>
          {row.credit_notes > 0 ? formatCurrency(row.credit_notes) : "-"}
        </TableCell>
        <TableCell
          align="right"
          sx={{ color: "success.main", fontWeight: 600 }}
        >
          {row.paid_amount !== 0 ? formatCurrency(row.paid_amount) : "-"}
        </TableCell>
        <TableCell
          align="right"
          sx={{
            fontWeight: "bold",
            color:
              row.balance < 0
                ? "warning.main"
                : row.balance > 0
                  ? "error.main"
                  : "inherit",
          }}
        >
          {formatCurrency(row.balance)}
        </TableCell>
      </TableRow>
      {hasTransactions && (
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box
                sx={{
                  margin: 2,
                  ml: 8,
                  bgcolor: "grey.50",
                  borderRadius: 2,
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  component="div"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <CreditCard size={16} /> Transaction History
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                      >
                        Date
                      </TableCell>
                      <TableCell
                        sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                      >
                        Mode
                      </TableCell>
                      <TableCell
                        sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                      >
                        Type
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                      >
                        Amount
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {row.transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          {new Date(t.date).toLocaleDateString("en-IN")}
                        </TableCell>
                        <TableCell sx={{ textTransform: "capitalize" }}>
                          {t.payment_mode || "N/A"}
                        </TableCell>
                        <TableCell sx={{ textTransform: "capitalize" }}>
                          <Chip
                            label={
                              t.type === "payment_in"
                                ? "Payment In"
                                : t.type === "payment_out"
                                  ? "Refund (Cash Out)"
                                  : "Credit Note (Return)"
                            }
                            size="small"
                            color={
                              t.type === "payment_in"
                                ? "success"
                                : t.type === "credit_note"
                                  ? "warning"
                                  : "default"
                            }
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color:
                              t.type === "payment_out"
                                ? "error.main"
                                : "inherit",
                          }}
                        >
                          {t.type === "payment_out" ? "-" : ""}
                          {formatCurrency(t.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
