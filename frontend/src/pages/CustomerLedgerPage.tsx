"use client";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Button,
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
  MessageCircle, // Imported Icon
} from "lucide-react";
import DashboardHeader from "../components/DashboardHeader";
import { getCustomerLedger } from "../lib/api/customerService";
import { getShopData } from "../lib/api/shopService"; // Import shop service
import toast from "react-hot-toast";
import type { DashboardFilter } from "../lib/types/inventoryDashboardTypes";

// Helper for initial date range (Last 30 Days)
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
  paid_amount: number;
  balance: number;
  status: "PAID" | "PARTIAL" | "PENDING";
  transactions: Transaction[];
}

export default function CustomerLedgerPage() {
  const { id } = useParams();

  const customerId = Number(id);

  const [activeFilters, setActiveFilters] =
    useState<DashboardFilter>(getInitialFilters);
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);
  const [totals, setTotals] = useState({ billed: 0, paid: 0, pending: 0 });
  const [shop, setShop] = useState<any>(null); // Store shop data

  useEffect(() => {
    fetchLedger();
    // Fetch Shop Data
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
      // console.log(response);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load ledger.");
    } finally {
      setLoading(false);
    }
  };

  // Process data to keep Bill structure with nested transactions
  const processLedger = (rawLedger: any[]) => {
    let totalBilled = 0;
    let totalPaid = 0;
    let totalPending = 0;

    const processedEntries: LedgerEntry[] = rawLedger.map((bill: any) => {
      const billAmount = parseFloat(bill.total_amount || 0);

      // Calculate paid amount from transactions if not provided directly, or use the API's paid_amount
      const transactions =
        bill.transactions?.map((t: any) => ({
          id: t.id,
          date: t.transaction_date || t.date,
          amount: parseFloat(t.amount || 0),
          payment_mode: t.payment_mode,
          type: t.type,
        })) || [];

      // Use the root paid_amount if available (reconciled), otherwise sum transactions
      const paidAmount =
        bill.paid_amount !== undefined
          ? parseFloat(bill.paid_amount)
          : transactions.reduce(
              (sum: number, t: Transaction) => sum + t.amount,
              0
            );

      const balance = billAmount - paidAmount;

      // Update Globals
      totalBilled += billAmount;
      totalPaid += paidAmount;
      totalPending += balance;

      // Determine Status
      let status: "PAID" | "PARTIAL" | "PENDING" = "PENDING";
      if (balance <= 0.9) status = "PAID";
      else if (paidAmount > 0) status = "PARTIAL";

      return {
        id: bill.id,
        date: bill.bill_date,
        reference: bill.reference_no,
        total_amount: billAmount,
        paid_amount: paidAmount,
        balance: balance > 0 ? balance : 0,
        status,
        transactions,
      };
    });

    // Sort by Date Descending (Newest first) or Ascending depending on preference.
    processedEntries.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    setLedgerData(processedEntries);
    setTotals({
      billed: totalBilled,
      paid: totalPaid,
      pending: totalPending,
    });
  };

  const handlePrint = () => {
    window.electron.ipcRenderer.invoke("print-customer-ledger", {
      customerId,
      filters: {
        startDate: activeFilters.from,
        endDate: activeFilters.to,
      },
    });
  };

  const handleWhatsApp = async () => {
    if (!customer?.phone) {
      toast.error("Customer phone number is missing");
      return;
    }

    const toastId = toast.loading("Generating and sending ledger PDF...");

    try {
      const res = await window.electron.sendWhatsAppCustomerLedger({
        customerId, // Just ID needed now
        phone: customer.phone,
        filters: {
          startDate: activeFilters.from,
          endDate: activeFilters.to,
        },
      });

      if (res.success) {
        toast.success("Ledger sent successfully!", { id: toastId });
      } else {
        toast.error("Failed to send WhatsApp: " + res.error, { id: toastId });
      }
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
            <Button
              variant="contained"
              color="success"
              startIcon={<MessageCircle size={18} />}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 600,
                px: 3,
                boxShadow: "none",
                bgcolor: "#2e7d32",
                "&:hover": {
                  bgcolor: "#1b5e20",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                },
              }}
              onClick={handleWhatsApp}
              disabled={loading || !customer || !shop}
            >
              Share Ledger PDF
            </Button>
            <Button
              variant="contained"
              startIcon={<Printer size={18} />}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 600,
                px: 3,
                boxShadow: "none",
                "&:hover": {
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                },
              }}
              onClick={handlePrint}
              disabled={loading || !customer}
            >
              Print Statement
            </Button>
          </Stack>
        }
      />

      {loading ? (
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          {/* Customer Summary Card */}
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
                      NET BALANCE DUE
                    </Typography>
                    <Typography
                      variant="h4"
                      fontWeight="bold"
                      color={totals.pending > 0 ? "error.main" : "success.main"}
                    >
                      ₹{totals.pending.toLocaleString()}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Ledger Table */}
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
                      sx={{
                        fontWeight: "bold",
                        bgcolor: "grey.50",
                        color: "primary.main",
                      }}
                    >
                      Bill Amount (₹)
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: "bold",
                        bgcolor: "grey.50",
                        color: "success.main",
                      }}
                    >
                      Paid (₹)
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: "bold", bgcolor: "grey.50" }}
                    >
                      Balance (₹)
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ledgerData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        No transactions found for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledgerData.map((row) => <Row key={row.id} row={row} />)
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Totals Footer */}
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
                    ₹{totals.billed.toLocaleString()}
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="caption" color="text.secondary">
                    Total Received
                  </Typography>
                  <Typography fontWeight="bold" color="success.main">
                    ₹{totals.paid.toLocaleString()}
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
                    color={totals.pending > 0 ? "error.main" : "text.primary"}
                  >
                    ₹{totals.pending.toLocaleString()}
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

// Sub-component for Collapsible Row
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
              aria-label="expand row"
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
            label={row.status}
            size="small"
            color={
              row.status === "PAID"
                ? "success"
                : row.status === "PARTIAL"
                ? "warning"
                : "error"
            }
            variant="outlined"
            sx={{ fontWeight: "bold", fontSize: "0.7rem" }}
          />
        </TableCell>
        <TableCell align="right">{row.total_amount.toLocaleString()}</TableCell>
        <TableCell align="right" sx={{ color: "success.main" }}>
          {row.paid_amount > 0 ? row.paid_amount.toLocaleString() : "-"}
        </TableCell>
        <TableCell
          align="right"
          sx={{
            fontWeight: "bold",
            color: row.balance > 0 ? "error.main" : "inherit",
          }}
        >
          {row.balance.toLocaleString()}
        </TableCell>
      </TableRow>

      {/* Nested Transactions Row */}
      {hasTransactions && (
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
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
                <Table size="small" aria-label="purchases">
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
                        <TableCell component="th" scope="row">
                          {new Date(t.date).toLocaleDateString("en-IN")}
                        </TableCell>
                        <TableCell sx={{ textTransform: "capitalize" }}>
                          {t.payment_mode}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: "medium" }}>
                          ₹{t.amount.toLocaleString()}
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
