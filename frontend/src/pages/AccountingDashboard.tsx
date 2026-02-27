"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getPnLStatement,
  getStockValuation,
  getStockSummaryReport,
  getCustomerLedger,
  getSupplierLedger,
  getCashBankBook,
  PnLData,
  LedgerData,
  StockSummaryData,
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
  | "bank_book";

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
  const [shopName, setShopName] = useState("");

  // Data State
  const [loading, setLoading] = useState(false);
  const [pnlData, setPnLData] = useState<PnLData | null>(null);
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [stockData, setStockData] = useState<any>(null);
  const [stockSummaryData, setStockSummaryData] =
    useState<StockSummaryData | null>(null);

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
        console.log("Shop name fetched:", res?.shop_name);
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

  // ----------------------------------------------------------------------
  // HANDLERS FOR ELECTRON PRINT / PDF / EXCEL
  // ----------------------------------------------------------------------

  const getActiveReportData = () => {
    if (reportType === "pnl") return pnlData;
    if (reportType === "stock") return stockData;
    if (reportType === "stock_summary") return stockSummaryData;
    return ledgerData; // For all ledgers & books
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
    const data = getActiveReportData();
    if (!data) return toast.error("No data available to print.");

    toast.loading(
      action === "pdf" ? "Generating PDF..." : "Sending to Printer...",
    );

    const meta = {
      shopName,
      entityName: getEntityName(),
      period: { start: filters.from, end: filters.to },
      fileName: `${reportType.toUpperCase()}_${new Date().toISOString().slice(0, 10)}`,
    };

    console.log("META", meta);

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
    // ... [existing excel logic remains unchanged] ...
    let dataToExport: any[] = [];
    if (reportType === "pnl" && pnlData) {
      dataToExport = [
        { Item: "Total Revenue", Amount: pnlData.totalRevenue },
        { Item: "Cost of Goods Sold (COGS)", Amount: pnlData.totalCogs },
        { Item: "Gross Profit", Amount: pnlData.grossProfit },
        ...pnlData.expenses.map((e) => ({
          Item: `Expense: ${e.category}`,
          Amount: e.total,
        })),
        { Item: "Total Expenses", Amount: pnlData.totalExpenses },
        { Item: "NET PROFIT", Amount: pnlData.netProfit },
      ];
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
    }

    if (dataToExport.length === 0) return toast.error("No data to export");
    toast.loading("Exporting...");
    try {
      const res = await ipcRenderer.invoke("generate-excel-report", {
        data: dataToExport,
        fileName: `${reportType}_${Date.now()}`,
      });
      toast.dismiss();
      if (res.success) toast.success("Excel saved!");
    } catch (e) {
      toast.dismiss();
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
              subtext="After Operating Expenses"
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
          Operating Expenses Breakdown
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
                <TableCell sx={{ fontWeight: 600 }}>Expense Category</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Amount
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pnlData.expenses.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    align="center"
                    sx={{ py: 3, color: "text.secondary" }}
                  >
                    No expenses recorded in this period.
                  </TableCell>
                </TableRow>
              )}
              {pnlData.expenses.map((exp, i) => (
                <TableRow key={i}>
                  <TableCell>{exp.category}</TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: "error.main", fontWeight: 500 }}
                  >
                    {formatCurrency(exp.total)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: theme.palette.action.selected }}>
                <TableCell>
                  <b>Total Operating Expenses</b>
                </TableCell>
                <TableCell align="right">
                  <b>{formatCurrency(pnlData.totalExpenses)}</b>
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

  return (
    <Box
      p={2}
      pt={3}
      sx={{ bgcolor: theme.palette.background.default, minHeight: "100vh" }}
    >
      {/* Unified Dashboard Header */}
      <DashboardHeader
        title="Accounting & Financials"
        showSearch={false}
        onFilterChange={setFilters}
        onRefresh={handleFetchReport}
        initialFilter="month"
        showDateFilters={reportType !== "stock"}
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

      {/* Control Panel (Entity & Report Selection) */}
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
                <MenuItem value="cash_book">Cash Book</MenuItem>
                <MenuItem value="bank_book">Bank Book</MenuItem>
                <MenuItem value="stock">Stock Valuation Report</MenuItem>
                <MenuItem value="stock_summary">
                  Stock Movement Summary
                </MenuItem>
              </TextField>
            </Grid>

            {reportType === "customer_ledger" && (
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

            {reportType === "supplier_ledger" && (
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

      {/* Main Content Area */}
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
            {!pnlData && !ledgerData && !stockData && !stockSummaryData && (
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
