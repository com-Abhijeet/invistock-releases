"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  CircularProgress,
  useTheme,
  Button,
  Collapse,
  IconButton,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  Download,
  Printer,
  Calculator,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Briefcase,
  Wallet,
  CreditCard,
  Activity,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getPnLStatement,
  getStockValuation,
  getStockSummaryReport,
  getCustomerLedger,
  getSupplierLedger,
  getCashBankBook,
  getReceivablesAging,
  getPayablesAging,
  getCustomerBillByBill,
  getSupplierBillByBill,
  PnLData,
  LedgerData,
  StockSummaryData,
  ARAgingRecord,
  APAgingRecord,
  BillByBillRecord,
} from "../lib/api/accountingService";
import { getCustomers } from "../lib/api/customerService";
import { getSuppliers } from "../lib/api/supplierService";
import { getShopData } from "../lib/api/shopService";
import type { CustomerType } from "../lib/types/customerTypes";
import type { SupplierType } from "../lib/types/supplierTypes";
import DashboardHeader from "../components/DashboardHeader";
import { DashboardFilter } from "../lib/types/inventoryDashboardTypes";
import { DataCard as StatCard } from "../components/DataCard";

// @ts-ignore
const ipcRenderer = window.electron?.ipcRenderer;

type ReportType =
  | "pnl"
  | "stock"
  | "stock_summary"
  | "customer_ledger"
  | "supplier_ledger"
  | "cash_book"
  | "bank_book"
  | "receivables_aging"
  | "payables_aging";

export default function AccountingDashboard() {
  const theme = useTheme();

  // Controls State
  const [reportType, setReportType] = useState<ReportType>("pnl");
  const [filters, setFilters] = useState<DashboardFilter>({
    filter: "month",
    from: "",
    to: "",
  });

  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierType[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<number | "">("");
  const [shopName, setShopName] = useState("Kosh Business");

  // Data State
  const [loading, setLoading] = useState(false);
  const [pnlData, setPnLData] = useState<PnLData | null>(null);
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [stockData, setStockData] = useState<any>(null);
  const [stockSummaryData, setStockSummaryData] =
    useState<StockSummaryData | null>(null);

  // Aging & Bill-by-Bill State
  const [agingData, setAgingData] = useState<
    ARAgingRecord[] | APAgingRecord[] | null
  >(null);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [billByBillData, setBillByBillData] = useState<
    BillByBillRecord[] | null
  >(null);
  const [loadingBills, setLoadingBills] = useState(false);

  useEffect(() => {
    getCustomers({})
      .then((res: any) => setCustomers(res.records || []))
      .catch(() => {});
    getSuppliers()
      .then((res: any) => setSuppliers(res.records || res || []))
      .catch(() => {});
    getShopData()
      .then((res) => {
        if (res?.shop_name) setShopName(res.shop_name);
      })
      .catch(() => {});
  }, []);

  const handleFetchReport = useCallback(async () => {
    if (reportType === "customer_ledger" && !selectedEntityId) return;
    if (reportType === "supplier_ledger" && !selectedEntityId) return;

    setLoading(true);
    setPnLData(null);
    setLedgerData(null);
    setStockData(null);
    setStockSummaryData(null);
    setAgingData(null);
    setExpandedRowId(null);
    setBillByBillData(null);

    const startDate = filters.from || "";
    const endDate = filters.to || "";

    try {
      if (reportType === "pnl") {
        const data = await getPnLStatement(startDate, endDate);
        setPnLData(data);
      } else if (reportType === "stock") {
        const data = await getStockValuation();
        setStockData(data);
      } else if (reportType === "stock_summary") {
        const data = await getStockSummaryReport(startDate, endDate);
        setStockSummaryData(data);
      } else if (reportType === "customer_ledger") {
        const data = await getCustomerLedger(
          Number(selectedEntityId),
          startDate,
          endDate,
        );
        setLedgerData(data);
      } else if (reportType === "supplier_ledger") {
        const data = await getSupplierLedger(
          Number(selectedEntityId),
          startDate,
          endDate,
        );
        setLedgerData(data);
      } else if (reportType === "cash_book") {
        const data = await getCashBankBook("cash", startDate, endDate);
        setLedgerData(data);
      } else if (reportType === "bank_book") {
        const data = await getCashBankBook("bank", startDate, endDate);
        setLedgerData(data);
      } else if (reportType === "receivables_aging") {
        const data = await getReceivablesAging();
        setAgingData(data);
      } else if (reportType === "payables_aging") {
        const data = await getPayablesAging();
        setAgingData(data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch report");
    } finally {
      setLoading(false);
    }
  }, [reportType, filters, selectedEntityId]);

  useEffect(() => {
    handleFetchReport();
  }, [handleFetchReport]);

  const formatCurrency = (amount: number) => {
    return (amount || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
    });
  };

  const getActiveReportData = () => {
    if (reportType === "pnl") return pnlData;
    if (reportType === "stock") return stockData;
    if (reportType === "stock_summary") return stockSummaryData;
    if (reportType === "receivables_aging" || reportType === "payables_aging")
      return agingData;
    return ledgerData;
  };

  const getEntityName = () => {
    if (reportType === "customer_ledger")
      return customers.find((c) => c.id === selectedEntityId)?.name || "";
    if (reportType === "supplier_ledger")
      return suppliers.find((s) => s.id === selectedEntityId)?.name || "";
    return "";
  };

  const handleElectronAction = async (action: "pdf" | "print") => {
    if (!ipcRenderer)
      return toast.error("Desktop app required for this feature.");
    let data = getActiveReportData();
    if (!data) return toast.error("No data available to print.");

    toast.loading(
      action === "pdf" ? "Generating PDF..." : "Sending to Printer...",
    );

    // --- DETAILED AGING REPORT LOGIC ---
    // If it's an aging report, we fetch the bill-by-bill breakdown for ALL entities
    // and attach it to the payload so the PDF generator can loop through it.
    if (reportType === "receivables_aging" || reportType === "payables_aging") {
      try {
        const isReceivable = reportType === "receivables_aging";
        const detailedData = await Promise.all(
          (data as any[]).map(async (row: any) => {
            const bills = isReceivable
              ? await getCustomerBillByBill(row.customer_id)
              : await getSupplierBillByBill(row.supplier_id);
            return { ...row, bills }; // Attach nested bills
          }),
        );
        data = detailedData; // Override payload with detailed data
      } catch (err) {
        toast.dismiss();
        return toast.error("Failed to fetch detailed bills for report.");
      }
    }

    const meta = {
      shopName,
      entityName: getEntityName(),
      period: { start: filters.from, end: filters.to },
      fileName: `${reportType.toUpperCase()}_${new Date().toISOString().slice(0, 10)}`,
    };

    try {
      const res = await ipcRenderer.invoke(
        "process-report",
        reportType,
        data,
        meta,
        action,
      );
      toast.dismiss();
      if (res.success && action === "pdf")
        toast.success("PDF saved successfully!");
      else if (!res.success) toast.error("Failed: " + res.error);
    } catch (error) {
      toast.dismiss();
      toast.error("IPC Error: Could not connect to printer service.");
    }
  };

  const handleExportExcel = async () => {
    if (!ipcRenderer) return toast.error("Desktop app required.");
    let dataToExport: any[] = [];
    if (reportType === "pnl" && pnlData) {
      dataToExport = [
        { Item: "Total Revenue", Amount: pnlData.totalRevenue },
        { Item: "Cost of Goods Sold (COGS)", Amount: pnlData.totalCogs },
        { Item: "Gross Profit", Amount: pnlData.grossProfit },
      ];
      if (pnlData.stockGain > 0)
        dataToExport.push({
          Item: "Other Income: Inventory Gain",
          Amount: pnlData.stockGain,
        });
      pnlData.expenses.forEach((e) =>
        dataToExport.push({ Item: `Expense: ${e.category}`, Amount: e.total }),
      );
      if (pnlData.stockLoss > 0)
        dataToExport.push({
          Item: "Expense: Inventory Loss (Adj.)",
          Amount: pnlData.stockLoss,
        });
      dataToExport.push(
        {
          Item: "Total Expenses (Inc. Stock Loss)",
          Amount: pnlData.totalExpenses + pnlData.stockLoss,
        },
        { Item: "NET PROFIT", Amount: pnlData.netProfit },
      );
    } else if (
      ["customer_ledger", "supplier_ledger", "cash_book", "bank_book"].includes(
        reportType,
      ) &&
      ledgerData
    ) {
      dataToExport = ledgerData.transactions.map((t) => ({
        Date: t.date,
        Type: t.record_type,
        Ref: t.reference_no,
        "Debit/Inflow": t.debit || t.inflow || 0,
        "Credit/Outflow": t.credit || t.outflow || 0,
        Balance: t.balance,
        Note: t.note,
      }));
    } else if (reportType === "stock" && stockData) {
      dataToExport = [
        { Item: "Master Stock Valuation", Value: stockData.masterValuation },
        { Item: "Batch-wise Valuation", Value: stockData.batchValuation },
      ];
    } else if (reportType === "stock_summary" && stockSummaryData) {
      dataToExport = stockSummaryData.records.map((r) => ({
        Product: r.product_name,
        "Opening Qty": r.opening_qty,
        "Purchased (+)": r.purchased_qty,
        "Sold (-)": r.sold_qty,
        "Adjusted (+/-)": r.adjusted_qty,
        "Net Change": r.net_change,
        "Closing Qty": r.closing_qty,
      }));
    } else if (
      (reportType === "receivables_aging" || reportType === "payables_aging") &&
      agingData
    ) {
      const isReceivable = reportType === "receivables_aging";
      dataToExport = agingData.map((r: any) => ({
        "Party Name": isReceivable ? r.customer_name : r.supplier_name,
        Phone: isReceivable ? r.customer_phone : r.supplier_phone,
        "0 - 30 Days": r.days_0_30,
        "31 - 60 Days": r.days_31_60,
        "61 - 90 Days": r.days_61_90,
        "Over 90 Days": r.days_90_plus,
        "Total Outstanding": r.total_outstanding,
      }));
    }

    if (dataToExport.length === 0) return toast.error("No data to export");
    toast.loading("Exporting...");
    try {
      const res = await ipcRenderer.invoke("export-excel", {
        data: dataToExport,
        fileName: `${reportType}_${Date.now()}`,
      });
      toast.dismiss();
      if (res.success) toast.success("Excel saved!");
    } catch (e) {
      toast.dismiss();
    }
  };

  const handleExpandRow = async (id: number) => {
    if (expandedRowId === id) {
      setExpandedRowId(null);
      setBillByBillData(null);
      return;
    }

    setExpandedRowId(id);
    setLoadingBills(true);
    setBillByBillData(null);
    try {
      if (reportType === "receivables_aging") {
        const data = await getCustomerBillByBill(id);
        setBillByBillData(data);
      } else {
        const data = await getSupplierBillByBill(id);
        setBillByBillData(data);
      }
    } catch (err) {
      toast.error("Failed to load bill breakdown");
    } finally {
      setLoadingBills(false);
    }
  };

  // --- RENDERERS ---

  const renderPnL = () => {
    if (!pnlData) return null;
    return (
      <Box>
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Revenue (Sales)"
              value={formatCurrency(pnlData.totalRevenue)}
              icon={<DollarSign size={20} />}
              color={theme.palette.success.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Cost of Goods (COGS)"
              value={formatCurrency(pnlData.totalCogs)}
              subtext="Inventory Expense"
              icon={<Package size={20} />}
              color={theme.palette.warning.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Gross Profit"
              value={formatCurrency(pnlData.grossProfit)}
              icon={<Briefcase size={20} />}
              color={theme.palette.primary.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Net Profit / (Loss)"
              value={formatCurrency(pnlData.netProfit)}
              subtext="Final Profit"
              icon={
                pnlData.netProfit >= 0 ? (
                  <TrendingUp size={20} />
                ) : (
                  <TrendingDown size={20} />
                )
              }
              color={
                pnlData.netProfit >= 0
                  ? theme.palette.success.main
                  : theme.palette.error.main
              }
            />
          </Grid>
        </Grid>

        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ mb: 1, textTransform: "uppercase" }}
        >
          Income & Expenses Breakdown
        </Typography>
        <TableContainer
          component={Paper}
          variant="outlined"
          elevation={0}
          sx={{ borderRadius: 2 }}
        >
          <Table size="small">
            <TableHead sx={{ bgcolor: theme.palette.action.hover }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Amount
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Other Income */}
              {pnlData.stockGain > 0 && (
                <TableRow sx={{ bgcolor: theme.palette.success.light + "20" }}>
                  <TableCell>
                    <b>Other Income: Inventory Gain (Adjustments)</b>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: "success.main", fontWeight: "bold" }}
                  >
                    {formatCurrency(pnlData.stockGain)}
                  </TableCell>
                </TableRow>
              )}

              {/* Operating Expenses */}
              {pnlData.expenses.length === 0 && pnlData.stockLoss === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    align="center"
                    sx={{ py: 3, color: "text.secondary" }}
                  >
                    No expenses or losses recorded.
                  </TableCell>
                </TableRow>
              )}
              {pnlData.expenses.map((exp, i) => (
                <TableRow key={i}>
                  <TableCell>Expense: {exp.category}</TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: "error.main", fontWeight: 500 }}
                  >
                    {formatCurrency(exp.total)}
                  </TableCell>
                </TableRow>
              ))}

              {/* Inventory Loss */}
              {pnlData.stockLoss > 0 && (
                <TableRow>
                  <TableCell>Expense: Inventory Loss (Adjustments)</TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: "error.main", fontWeight: 500 }}
                  >
                    {formatCurrency(pnlData.stockLoss)}
                  </TableCell>
                </TableRow>
              )}

              <TableRow sx={{ bgcolor: theme.palette.action.selected }}>
                <TableCell>
                  <b>Total Outflows (Expenses + Stock Loss)</b>
                </TableCell>
                <TableCell align="right">
                  <b>
                    {formatCurrency(pnlData.totalExpenses + pnlData.stockLoss)}
                  </b>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderLedger = () => {
    if (!ledgerData) return null;
    const isSupplier = reportType === "supplier_ledger";
    const debitLabel = isSupplier ? "Debit (Payment Out)" : "Debit (Invoice)";
    const creditLabel = isSupplier
      ? "Credit (Purchase Bill)"
      : "Credit (Payment In)";

    return (
      <Box>
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6}>
            <StatCard
              title="Opening Balance"
              value={formatCurrency(ledgerData.openingBalance)}
              subtext="Prior to selected period"
              icon={<Wallet size={20} />}
              color={theme.palette.text.secondary}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <StatCard
              title="Closing Balance"
              value={formatCurrency(ledgerData.closingBalance)}
              subtext="As of selected end date"
              icon={<Activity size={20} />}
              color={
                ledgerData.closingBalance > 0
                  ? isSupplier
                    ? theme.palette.error.main
                    : theme.palette.success.main
                  : theme.palette.text.primary
              }
            />
          </Grid>
        </Grid>
        <TableContainer
          component={Paper}
          variant="outlined"
          elevation={0}
          sx={{ borderRadius: 2 }}
        >
          <Table size="small">
            <TableHead sx={{ bgcolor: theme.palette.action.hover }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Reference / Note</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {reportType.includes("book") ? "Inflow (+)" : debitLabel}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {reportType.includes("book") ? "Outflow (-)" : creditLabel}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Running Balance
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow sx={{ bgcolor: theme.palette.action.selected }}>
                <TableCell colSpan={5} align="right">
                  <i>Opening Balance</i>
                </TableCell>
                <TableCell align="right">
                  <b>{formatCurrency(ledgerData.openingBalance)}</b>
                </TableCell>
              </TableRow>
              {ledgerData.transactions.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align="center"
                    sx={{ py: 3, color: "text.secondary" }}
                  >
                    No transactions found for this period.
                  </TableCell>
                </TableRow>
              )}
              {ledgerData.transactions.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>
                    {new Date(row.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{
                        bgcolor: theme.palette.action.hover,
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontWeight: 600,
                      }}
                    >
                      {row.record_type}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {row.reference_no}
                    </Typography>
                    {row.note && (
                      <Typography variant="caption" color="text.secondary">
                        {row.note}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: row.debit || row.inflow ? 600 : 400,
                      color:
                        row.debit || row.inflow
                          ? reportType.includes("book")
                            ? "success.main"
                            : "inherit"
                          : "inherit",
                    }}
                  >
                    {formatCurrency(row.debit || row.inflow || 0)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: row.credit || row.outflow ? 600 : 400,
                      color:
                        row.credit || row.outflow
                          ? reportType.includes("book")
                            ? "error.main"
                            : "inherit"
                          : "inherit",
                    }}
                  >
                    {formatCurrency(row.credit || row.outflow || 0)}
                  </TableCell>
                  <TableCell align="right">
                    <b>{formatCurrency(row.balance)}</b>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderStockValuation = () => {
    if (!stockData) return null;
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <StatCard
            title="Master Stock Valuation"
            value={formatCurrency(stockData.masterValuation)}
            subtext="Calculated via Master Qty × Avg Purchase Price"
            icon={<Calculator size={20} />}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatCard
            title="Batch-wise Valuation"
            value={formatCurrency(stockData.batchValuation)}
            subtext="Calculated via active Batch Qtys × Batch Cost"
            icon={<Package size={20} />}
            color={theme.palette.secondary.main}
          />
        </Grid>
      </Grid>
    );
  };

  const renderStockSummary = () => {
    if (!stockSummaryData) return null;
    return (
      <Box>
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ mb: 1, textTransform: "uppercase" }}
        >
          Stock Movement Summary (
          {new Date(stockSummaryData.period.start).toLocaleDateString()} -{" "}
          {new Date(stockSummaryData.period.end).toLocaleDateString()})
        </Typography>
        <TableContainer
          component={Paper}
          variant="outlined"
          elevation={0}
          sx={{ borderRadius: 2 }}
        >
          <Table size="small">
            <TableHead sx={{ bgcolor: theme.palette.action.hover }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Opening
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 600, color: "primary.main" }}
                >
                  In (+)
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 600, color: "error.main" }}
                >
                  Out (-)
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 600, color: "warning.main" }}
                >
                  Adj
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Net
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Closing
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stockSummaryData.records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    No stock data found.
                  </TableCell>
                </TableRow>
              )}
              {stockSummaryData.records.map((row) => (
                <TableRow key={row.product_id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="500">
                      {row.product_name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{row.opening_qty}</TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: "primary.main", fontWeight: 500 }}
                  >
                    {row.purchased_qty || "-"}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: "error.main", fontWeight: 500 }}
                  >
                    {row.sold_qty || "-"}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: "warning.main", fontWeight: 500 }}
                  >
                    {row.adjusted_qty || "-"}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 500,
                      color:
                        row.net_change > 0
                          ? "success.main"
                          : row.net_change < 0
                            ? "error.main"
                            : "inherit",
                    }}
                  >
                    {row.net_change > 0 ? "+" : ""}
                    {row.net_change}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {row.closing_qty}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderAgingReport = () => {
    if (!agingData) return null;
    const isReceivable = reportType === "receivables_aging";

    return (
      <Box>
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ mb: 1, textTransform: "uppercase" }}
        >
          {isReceivable
            ? "Accounts Receivable (A/R) Aging"
            : "Accounts Payable (A/P) Aging"}{" "}
          Overview
        </Typography>
        <TableContainer
          component={Paper}
          variant="outlined"
          elevation={0}
          sx={{ borderRadius: 2 }}
        >
          <Table size="small">
            <TableHead sx={{ bgcolor: theme.palette.action.hover }}>
              <TableRow>
                <TableCell width={50}></TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {isReceivable ? "Customer" : "Supplier"} Name
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  0 - 30 Days
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  31 - 60 Days
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  61 - 90 Days
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Over 90 Days
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 600,
                    color: isReceivable ? "success.main" : "error.main",
                  }}
                >
                  Total Outstanding
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {agingData.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align="center"
                    sx={{ py: 3, color: "text.secondary" }}
                  >
                    No outstanding balances found.
                  </TableCell>
                </TableRow>
              )}
              {agingData.map((row: any) => {
                const entityId = isReceivable
                  ? row.customer_id
                  : row.supplier_id;
                const isExpanded = expandedRowId === entityId;

                return (
                  <Fragment key={entityId}>
                    <TableRow hover sx={{ "& > *": { borderBottom: "unset" } }}>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleExpandRow(entityId)}
                        >
                          {isExpanded ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600">
                          {isReceivable ? row.customer_name : row.supplier_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {isReceivable
                            ? row.customer_phone
                            : row.supplier_phone}
                        </Typography>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color:
                            row.days_0_30 > 0
                              ? "text.primary"
                              : "text.disabled",
                        }}
                      >
                        {formatCurrency(row.days_0_30)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color:
                            row.days_31_60 > 0
                              ? "warning.main"
                              : "text.disabled",
                        }}
                      >
                        {formatCurrency(row.days_31_60)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color:
                            row.days_61_90 > 0
                              ? "error.light"
                              : "text.disabled",
                        }}
                      >
                        {formatCurrency(row.days_61_90)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color:
                            row.days_90_plus > 0
                              ? "error.main"
                              : "text.disabled",
                          fontWeight: row.days_90_plus > 0 ? "bold" : "normal",
                        }}
                      >
                        {formatCurrency(row.days_90_plus)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={isReceivable ? "success.main" : "error.main"}
                        >
                          {formatCurrency(row.total_outstanding)}
                        </Typography>
                      </TableCell>
                    </TableRow>

                    <TableRow sx={{ bgcolor: theme.palette.action.hover }}>
                      <TableCell
                        style={{ paddingBottom: 0, paddingTop: 0 }}
                        colSpan={7}
                      >
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box
                            sx={{
                              m: 2,
                              p: 2,
                              bgcolor: "background.paper",
                              borderRadius: 2,
                              border: `1px solid ${theme.palette.divider}`,
                            }}
                          >
                            <Typography
                              variant="caption"
                              fontWeight="bold"
                              color="text.secondary"
                              gutterBottom
                              sx={{ display: "block", mb: 1 }}
                            >
                              UNPAID BILLS BREAKDOWN
                            </Typography>
                            {loadingBills ? (
                              <Box p={2} textAlign="center">
                                <CircularProgress size={24} />
                              </Box>
                            ) : billByBillData && billByBillData.length > 0 ? (
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ fontSize: "0.75rem" }}>
                                      Date
                                    </TableCell>
                                    <TableCell sx={{ fontSize: "0.75rem" }}>
                                      Invoice / Ref No
                                    </TableCell>
                                    <TableCell sx={{ fontSize: "0.75rem" }}>
                                      Age
                                    </TableCell>
                                    <TableCell
                                      align="right"
                                      sx={{ fontSize: "0.75rem" }}
                                    >
                                      Invoice Total
                                    </TableCell>
                                    <TableCell
                                      align="right"
                                      sx={{ fontSize: "0.75rem" }}
                                    >
                                      Paid
                                    </TableCell>
                                    <TableCell
                                      align="right"
                                      sx={{
                                        fontSize: "0.75rem",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      Pending
                                    </TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {billByBillData.map((bill, j) => (
                                    <TableRow key={j}>
                                      <TableCell>
                                        {new Date(
                                          bill.date,
                                        ).toLocaleDateString()}
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 500 }}>
                                        {bill.reference_no ||
                                          bill.internal_ref_no}
                                      </TableCell>
                                      <TableCell
                                        sx={{
                                          color:
                                            bill.age_days > 30
                                              ? "error.main"
                                              : "inherit",
                                        }}
                                      >
                                        {bill.age_days} Days
                                      </TableCell>
                                      <TableCell align="right">
                                        {formatCurrency(bill.invoice_amount)}
                                      </TableCell>
                                      <TableCell
                                        align="right"
                                        sx={{ color: "text.secondary" }}
                                      >
                                        {formatCurrency(bill.paid_amount)}
                                      </TableCell>
                                      <TableCell
                                        align="right"
                                        sx={{ fontWeight: "bold" }}
                                      >
                                        {formatCurrency(bill.pending_amount)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                p={1}
                              >
                                No pending bills details found.
                              </Typography>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const isAgingReport =
    reportType === "receivables_aging" || reportType === "payables_aging";
  const hideDateFilter = reportType !== "stock" || isAgingReport;
  const hideEntityFilter = isAgingReport;

  return (
    <Box
      p={2}
      pt={3}
      sx={{ bgcolor: theme.palette.background.default, minHeight: "100vh" }}
    >
      <DashboardHeader
        title="Accounting & Financials"
        showSearch={false}
        onFilterChange={setFilters}
        onRefresh={handleFetchReport}
        initialFilter="month"
        showDateFilters={hideDateFilter}
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Printer size={16} />}
              onClick={() => handleElectronAction("print")}
              sx={{ borderRadius: 2 }}
            >
              Print
            </Button>
            <Button
              variant="contained"
              size="small"
              color="error"
              startIcon={<FileText size={16} />}
              onClick={() => handleElectronAction("pdf")}
              sx={{ borderRadius: 2 }}
            >
              PDF
            </Button>
            <Button
              variant="contained"
              size="small"
              color="success"
              startIcon={<Download size={16} />}
              onClick={handleExportExcel}
              sx={{ borderRadius: 2 }}
            >
              Excel
            </Button>
          </Stack>
        }
      />

      <Card
        elevation={0}
        sx={{
          mb: 3,
          mt: 1,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ pb: "16px !important" }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Report Type"
                size="small"
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value as ReportType);
                  setSelectedEntityId("");
                }}
              >
                <MenuItem value="pnl">
                  Profit & Loss (Income Statement)
                </MenuItem>
                <MenuItem value="customer_ledger">
                  Customer Ledger (A/R)
                </MenuItem>
                <MenuItem value="supplier_ledger">
                  Supplier Ledger (A/P)
                </MenuItem>
                <MenuItem value="receivables_aging">
                  A/R Outstanding Aging
                </MenuItem>
                <MenuItem value="payables_aging">
                  A/P Outstanding Aging
                </MenuItem>
                <MenuItem value="cash_book">Cash Book</MenuItem>
                <MenuItem value="bank_book">Bank Book</MenuItem>
                <MenuItem value="stock">Stock Valuation Report</MenuItem>
                <MenuItem value="stock_summary">
                  Stock Movement Summary
                </MenuItem>
              </TextField>
            </Grid>

            {reportType === "customer_ledger" && !hideEntityFilter && (
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  label="Select Customer"
                  size="small"
                  value={selectedEntityId}
                  onChange={(e) =>
                    setSelectedEntityId(e.target.value as unknown as number)
                  }
                >
                  {customers.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}

            {reportType === "supplier_ledger" && !hideEntityFilter && (
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  label="Select Supplier"
                  size="small"
                  value={selectedEntityId}
                  onChange={(e) =>
                    setSelectedEntityId(e.target.value as unknown as number)
                  }
                >
                  {suppliers.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      <Box id="printable-report">
        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="40vh"
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
            {!pnlData &&
              !ledgerData &&
              !stockData &&
              !stockSummaryData &&
              !agingData && (
                <Box py={10} textAlign="center" color="text.secondary">
                  <CreditCard
                    size={48}
                    opacity={0.3}
                    style={{ marginBottom: 16 }}
                  />
                  <Typography variant="h6">
                    Select parameters to view financials.
                  </Typography>
                </Box>
              )}
            {reportType === "pnl" && renderPnL()}
            {reportType === "stock" && renderStockValuation()}
            {reportType === "stock_summary" && renderStockSummary()}
            {isAgingReport && renderAgingReport()}
            {[
              "customer_ledger",
              "supplier_ledger",
              "cash_book",
              "bank_book",
            ].includes(reportType) && renderLedger()}
          </>
        )}
      </Box>
    </Box>
  );
}
