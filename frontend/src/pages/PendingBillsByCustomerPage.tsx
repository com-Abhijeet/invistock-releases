"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  BookAlert,
  ChevronDown,
  IndianRupee,
  Eye,
  FileText,
  Clock,
  ArrowRight,
  User,
  CreditCard,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";

import DashboardHeader from "../components/DashboardHeader";
import {
  fetchPendingBillsByCustomer,
  PendingBillsCustomerGroup,
  PendingBillsSummary,
  PendingBillItem,
} from "../lib/api/customerService";

export default function PendingBillsByCustomerPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCustomerId = searchParams.get("customerId") || "";

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PendingBillsSummary>({
    totalPendingAmount: 0,
    totalPendingBills: 0,
    totalCustomersCount: 0,
    maxAgeDays: 0,
  });
  const [customers, setCustomers] = useState<PendingBillsCustomerGroup[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId);
  const [searchQuery, setSearchQuery] = useState("");
  const [minAgeDays, setMinAgeDays] = useState<number>(0);
  const [expandedCustomer, setExpandedCustomer] = useState<number | false>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPendingBillsByCustomer({
        customerId: selectedCustomerId || undefined,
        query: searchQuery,
        minAgeDays: minAgeDays,
      });

      setSummary(data.summary);
      setCustomers(data.customers);

      // Auto-expand if single customer selected or filtered
      if (data.customers.length === 1) {
        setExpandedCustomer(data.customers[0].customer_id);
      }
    } catch (error: any) {
      console.error("Failed to load pending bills:", error);
      toast.error("Failed to load pending bills");
    } finally {
      setLoading(false);
    }
  }, [selectedCustomerId, searchQuery, minAgeDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update query param when customer selection changes
  const handleCustomerChange = (id: string) => {
    setSelectedCustomerId(id);
    if (id) {
      setSearchParams({ customerId: id });
    } else {
      searchParams.delete("customerId");
      setSearchParams(searchParams);
    }
  };

  const _handleSendCustomerWhatsApp = async (c: PendingBillsCustomerGroup) => {
    if (!c.customer_phone) return toast.error("No phone number recorded for customer");

    const billSummary = c.bills
      .map(
        (b) =>
          `• Ref #${b.reference_no} (${b.bill_age_days} days ago): Billed ₹${b.total_amount.toLocaleString(
            "en-IN"
          )}, Net Due ₹${b.pending_balance.toLocaleString("en-IN")}`
      )
      .join("\n");

    const message = `Hello ${c.customer_name},\n\nThis is a gentle payment reminder for your pending bills:\n\n${billSummary}\n\n*Total Pending Balance: ₹${c.total_pending_amount.toLocaleString(
      "en-IN"
    )}*\n\nPlease make payment at your earliest convenience. Thank you!`;

    try {
      toast.loading("Sending WhatsApp message...");
      const res = await window.electron.sendWhatsAppMessage(c.customer_phone, message);
      toast.dismiss();
      if (res.success) {
        toast.success("Payment reminder sent!");
      } else {
        toast.error("Failed: " + res.error);
      }
    } catch (e) {
      toast.dismiss();
      toast.error("Error sending WhatsApp message");
    }
  };

  const _handleSendSingleBillWhatsApp = async (b: PendingBillItem) => {
    if (!b.customer_phone) return toast.error("No phone number recorded for customer");

    const message = `Hello ${b.customer_name},\n\nPayment reminder for Invoice #${b.reference_no} dated ${new Date(
      b.bill_date
    ).toLocaleDateString("en-IN")}:\n\nInvoice Total: ₹${b.total_amount.toLocaleString(
      "en-IN"
    )}\nPaid (Trans): ₹${b.total_paid_trans.toLocaleString(
      "en-IN"
    )}\nCredit Notes: ₹${b.total_credit_notes_trans.toLocaleString(
      "en-IN"
    )}\n*Pending Due: ₹${b.pending_balance.toLocaleString(
      "en-IN"
    )}*\n\nPlease clear this invoice balance soon. Thank you!`;

    try {
      toast.loading("Sending reminder...");
      const res = await window.electron.sendWhatsAppMessage(b.customer_phone, message);
      toast.dismiss();
      if (res.success) {
        toast.success("Reminder sent!");
      } else {
        toast.error("Failed: " + res.error);
      }
    } catch (e) {
      toast.dismiss();
      toast.error("Error sending message");
    }
  };

  // Keep WhatsApp handlers in scope for future activation:
  void _handleSendCustomerWhatsApp;
  void _handleSendSingleBillWhatsApp;

  return (
    <Box p={3} sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <DashboardHeader
        title="Bills Receivable & Outstanding Balances"
        showSearch={true}
        onSearch={setSearchQuery}
        onRefresh={loadData}
        showDateFilters={false}
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<RotateCcw size={16} />}
              onClick={() => {
                setSelectedCustomerId("");
                setSearchQuery("");
                setMinAgeDays(0);
                setSearchParams({});
              }}
              sx={{ borderRadius: "10px", fontWeight: 700, textTransform: "none" }}
            >
              Reset Filters
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<CreditCard size={18} />}
              onClick={() => navigate("/transactions")}
              sx={{
                borderRadius: "10px",
                fontWeight: 700,
                textTransform: "none",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
              }}
            >
              Record Payment In
            </Button>
          </Stack>
        }
      />

      {/* KPI Cards Summary */}
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              borderRadius: "16px",
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: "background.paper",
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  TOTAL PENDING DUES
                </Typography>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: "10px",
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    color: "error.main",
                  }}
                >
                  <IndianRupee size={18} />
                </Box>
              </Stack>
              <Typography variant="h5" fontWeight={800} color="error.main">
                ₹{summary.totalPendingAmount.toLocaleString("en-IN")}
              </Typography>
              <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                Calculated strictly via Transactions table
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              borderRadius: "16px",
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: "background.paper",
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  DEBTOR CUSTOMERS
                </Typography>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: "10px",
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: "primary.main",
                  }}
                >
                  <User size={18} />
                </Box>
              </Stack>
              <Typography variant="h5" fontWeight={800} color="text.primary">
                {summary.totalCustomersCount}
              </Typography>
              <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                Customers with unpaid balance
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              borderRadius: "16px",
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: "background.paper",
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  PENDING INVOICES
                </Typography>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: "10px",
                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                    color: "warning.main",
                  }}
                >
                  <FileText size={18} />
                </Box>
              </Stack>
              <Typography variant="h5" fontWeight={800} color="text.primary">
                {summary.totalPendingBills}
              </Typography>
              <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                Active sales invoices pending payment
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              borderRadius: "16px",
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: "background.paper",
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  OLDEST OVERDUE AGE
                </Typography>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: "10px",
                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                    color: "secondary.main",
                  }}
                >
                  <Clock size={18} />
                </Box>
              </Stack>
              <Typography variant="h5" fontWeight={800} color="secondary.main">
                {summary.maxAgeDays} Days
              </Typography>
              <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                Oldest uncollected bill age
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Toolbar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: "16px",
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: "background.paper",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" fontWeight={700} color="text.secondary">
              Overdue Aging Filter:
            </Typography>

            {[
              { label: "All Pending", days: 0 },
              { label: "> 7 Days", days: 7 },
              { label: "> 15 Days", days: 15 },
              { label: "> 30 Days", days: 30 },
            ].map((chip) => (
              <Chip
                key={chip.days}
                label={chip.label}
                clickable
                color={minAgeDays === chip.days ? "primary" : "default"}
                variant={minAgeDays === chip.days ? "filled" : "outlined"}
                onClick={() => setMinAgeDays(chip.days)}
                sx={{ fontWeight: 700, borderRadius: "8px" }}
              />
            ))}
          </Stack>

          {selectedCustomerId && (
            <Chip
              label={`Filtered Customer ID: #${selectedCustomerId}`}
              onDelete={() => handleCustomerChange("")}
              color="secondary"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Stack>
      </Paper>

      {/* Customer Accordions List */}
      {loading ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: "16px",
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography color="text.secondary">Loading pending bills by customer...</Typography>
        </Paper>
      ) : customers.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: "16px",
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: "background.paper",
          }}
        >
          <BookAlert size={48} color={theme.palette.success.main} style={{ marginBottom: 12 }} />
          <Typography variant="h6" fontWeight={800} color="text.primary">
            No Pending Bills Found!
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            All customer bills are settled according to the transactions ledger.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {customers.map((c) => {
            const isExpanded = expandedCustomer === c.customer_id;
            return (
              <Accordion
                key={c.customer_id}
                expanded={isExpanded}
                onChange={(_, expanded) => setExpandedCustomer(expanded ? c.customer_id : false)}
                elevation={0}
                sx={{
                  borderRadius: "16px !important",
                  border: `1px solid ${
                    c.oldest_bill_age > 30
                      ? alpha(theme.palette.error.main, 0.4)
                      : theme.palette.divider
                  }`,
                  bgcolor: "background.paper",
                  overflow: "hidden",
                  "&:before": { display: "none" },
                }}
              >
                <AccordionSummary
                  expandIcon={<ChevronDown size={20} />}
                  sx={{
                    px: 3,
                    py: 1.5,
                    bgcolor: isExpanded
                      ? alpha(theme.palette.primary.main, 0.03)
                      : "transparent",
                  }}
                >
                  <Grid container spacing={2} alignItems="center" sx={{ width: "100%", pr: 1 }}>
                    <Grid item xs={12} sm={4}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: "12px",
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: "primary.main",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                          }}
                        >
                          {c.customer_name.charAt(0).toUpperCase()}
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={800}>
                            {c.customer_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {c.customer_phone || "No Phone"} {c.customer_city ? `• ${c.customer_city}` : ""}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>

                    <Grid item xs={6} sm={2.5}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        Pending Bills Count
                      </Typography>
                      <Chip
                        label={`${c.pending_bills_count} Bill${c.pending_bills_count > 1 ? "s" : ""}`}
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ fontWeight: 700, mt: 0.3 }}
                      />
                    </Grid>

                    <Grid item xs={6} sm={2.5}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        Oldest Bill Delay
                      </Typography>
                      <Chip
                        label={`${c.oldest_bill_age} Days`}
                        size="small"
                        color={c.oldest_bill_age > 30 ? "error" : c.oldest_bill_age > 14 ? "warning" : "default"}
                        sx={{ fontWeight: 700, mt: 0.3 }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={3} sx={{ textAlign: { sm: "right" } }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                        Total Pending Balance
                      </Typography>
                      <Typography variant="h6" fontWeight={800} color="error.main">
                        ₹{c.total_pending_amount.toLocaleString("en-IN")}
                      </Typography>
                    </Grid>
                  </Grid>
                </AccordionSummary>

                <AccordionDetails sx={{ p: 3, borderTop: `1px solid ${theme.palette.divider}` }}>
                  {/* Action Bar per Customer */}
                  <Stack
                    direction="row"
                    spacing={1.5}
                    mb={2.5}
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <Typography variant="subtitle2" fontWeight={800} color="text.secondary">
                      INVOICE BREAKDOWN (TRANSACTIONS SOURCE OF TRUTH)
                    </Typography>

                    <Stack direction="row" spacing={1.5}>
                      {/* WhatsApp API currently inactive - hidden for now:
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<MessageCircle size={16} />}
                        onClick={() => handleSendCustomerWhatsApp(c)}
                        sx={{ fontWeight: 700, borderRadius: "8px", textTransform: "none" }}
                      >
                        WhatsApp Summary
                      </Button>
                      */}
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<Eye size={16} />}
                        onClick={() => navigate(`/customers/ledger/${c.customer_id}`)}
                        sx={{ fontWeight: 700, borderRadius: "8px", textTransform: "none" }}
                      >
                        View Full Ledger
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        startIcon={<ArrowRight size={16} />}
                        onClick={() => navigate(`/customer/${c.customer_id}`)}
                        sx={{ fontWeight: 700, borderRadius: "8px", textTransform: "none" }}
                      >
                        Customer Profile
                      </Button>
                    </Stack>
                  </Stack>

                  {/* Pending Bills Table */}
                  <Box sx={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${theme.palette.divider}`, textAlign: "left" }}>
                          <th style={{ padding: "10px 12px", color: theme.palette.text.secondary }}>Ref / Invoice #</th>
                          <th style={{ padding: "10px 12px", color: theme.palette.text.secondary }}>Invoice Date</th>
                          <th style={{ padding: "10px 12px", color: theme.palette.text.secondary }}>Bill Age</th>
                          <th style={{ padding: "10px 12px", color: theme.palette.text.secondary, textAlign: "right" }}>Total Amount</th>
                          <th style={{ padding: "10px 12px", color: theme.palette.text.secondary, textAlign: "right" }}>Trans Paid</th>
                          <th style={{ padding: "10px 12px", color: theme.palette.text.secondary, textAlign: "right" }}>Credit Notes</th>
                          <th style={{ padding: "10px 12px", color: theme.palette.text.secondary, textAlign: "right" }}>Net Pending</th>
                          <th style={{ padding: "10px 12px", color: theme.palette.text.secondary, textAlign: "center" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.bills.map((bill) => (
                          <tr
                            key={bill.sale_id}
                            style={{
                              borderBottom: `1px solid ${theme.palette.divider}`,
                            }}
                          >
                            <td style={{ padding: "12px", fontWeight: 700 }}>
                              <Box
                                component="span"
                                onClick={() => navigate(`/billing/view/${bill.sale_id}`)}
                                sx={{
                                  color: "primary.main",
                                  cursor: "pointer",
                                  "&:hover": { textDecoration: "underline" },
                                }}
                              >
                                {bill.reference_no}
                              </Box>
                            </td>
                            <td style={{ padding: "12px" }}>
                              {new Date(bill.bill_date).toLocaleDateString("en-IN")}
                            </td>
                            <td style={{ padding: "12px" }}>
                              <Chip
                                label={`${bill.bill_age_days}d ago`}
                                size="small"
                                color={bill.bill_age_days > 30 ? "error" : bill.bill_age_days > 7 ? "warning" : "default"}
                                sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                              />
                            </td>
                            <td style={{ padding: "12px", textAlign: "right", fontWeight: 600 }}>
                              ₹{bill.total_amount.toLocaleString("en-IN")}
                            </td>
                            <td style={{ padding: "12px", textAlign: "right", color: theme.palette.success.main, fontWeight: 600 }}>
                              ₹{bill.total_paid_trans.toLocaleString("en-IN")}
                            </td>
                            <td style={{ padding: "12px", textAlign: "right", color: theme.palette.info.main, fontWeight: 600 }}>
                              ₹{bill.total_credit_notes_trans.toLocaleString("en-IN")}
                            </td>
                            <td style={{ padding: "12px", textAlign: "right", color: theme.palette.error.main, fontWeight: 800 }}>
                              ₹{bill.pending_balance.toLocaleString("en-IN")}
                            </td>
                            <td style={{ padding: "12px", textAlign: "center" }}>
                              <Stack direction="row" spacing={1} justifyContent="center">
                                <Tooltip title="Record Payment In">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => navigate("/transactions")}
                                  >
                                    <CreditCard size={16} />
                                  </IconButton>
                                </Tooltip>
                                {/* WhatsApp API currently inactive - hidden for now:
                                <Tooltip title="Send Invoice Reminder">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleSendSingleBillWhatsApp(bill)}
                                  >
                                    <MessageCircle size={16} />
                                  </IconButton>
                                </Tooltip>
                                */}
                                <Tooltip title="View Invoice">
                                  <IconButton
                                    size="small"
                                    onClick={() => navigate(`/billing/view/${bill.sale_id}`)}
                                  >
                                    <Eye size={16} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
