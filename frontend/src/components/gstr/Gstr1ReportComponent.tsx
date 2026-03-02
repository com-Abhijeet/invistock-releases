"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  Alert,
  Card,
  CardContent,
  Stack,
  alpha,
  useTheme,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import DataTable from "../DataTable";
import { getGstr1Report } from "../../lib/api/gstrService";
import type { Gstr1ReportData } from "../../lib/types/gstrTypes";
import {
  Download,
  Building2,
  Users,
  FileSpreadsheet,
  FileMinus,
  FileX,
  Receipt,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";

// Prop types for the component
interface Gstr1ReportComponentProps {
  periodType: "month" | "quarter" | "year";
  year: number;
  month?: number;
  quarter?: number;
}

// Helper to format currency values safely
const formatCurrency = (value: number | undefined | null) => {
  if (value === null || value === undefined) return "₹0.00";
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  });
};

// Helper for Tab Panels
const TabPanel = (props: {
  children?: React.ReactNode;
  index: number;
  value: number;
}) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`gstr1-tabpanel-${index}`}
      aria-labelledby={`gstr1-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2, backgroundColor: "transparent" }}>{children}</Box>
      )}
    </div>
  );
};

export default function Gstr1ReportComponent({
  periodType,
  year,
  month,
  quarter,
}: Gstr1ReportComponentProps) {
  const theme = useTheme();

  // Guard check: Read shop details from local storage to verify GSTIN existence
  const shopStr =
    typeof window !== "undefined" ? localStorage.getItem("shop") : null;
  const shop = shopStr ? JSON.parse(shopStr) : {};
  const hasGstin = Boolean(shop.gstin || shop.gst_no);

  const [reportData, setReportData] = useState<Gstr1ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Fetch data whenever the props (date parameters) change
  useEffect(() => {
    // Prevent fetching if GSTIN is completely missing
    if (!hasGstin) return;

    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      setReportData(null);
      setActiveTab(0);

      const params = {
        periodType,
        year,
        ...(periodType === "month" && { month }),
        ...(periodType === "quarter" && { quarter }),
      };

      try {
        const data = await getGstr1Report(params);
        setReportData(data);
      } catch (err: any) {
        toast.error(err.message || "Failed to fetch GSTR-1 data");
        setError(
          err.message || "An unknown error occurred while fetching the report.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [periodType, year, month, quarter, hasGstin]);

  // Memoized data processing for B2B invoices
  const b2bInvoices = useMemo(() => {
    if (!reportData?.b2b) return [];
    return reportData.b2b.flatMap((customer) =>
      customer.inv.map((invoice) => ({
        ...invoice,
        ctin: customer.ctin,
      })),
    );
  }, [reportData]);

  // Flatten CDNR data for the DataTable
  const cdnrNotes = useMemo(() => {
    if (!reportData?.cdnr) return [];
    return reportData.cdnr.flatMap((customer) =>
      customer.nt.map((note) => ({
        ...note,
        ctin: customer.ctin,
      })),
    );
  }, [reportData]);

  // Calculate top-level summary metrics
  const summaryMetrics = useMemo(() => {
    if (!reportData) return { b2bVal: 0, b2cVal: 0, taxVal: 0 };
    let b2bVal = 0,
      b2cVal = 0,
      taxVal = 0;

    reportData.b2b?.forEach((c) => {
      c.inv.forEach((i) => {
        i.itms.forEach((it) => {
          b2bVal += it.itm_det.txval || 0;
          taxVal +=
            (it.itm_det.iamt || 0) +
            (it.itm_det.camt || 0) +
            (it.itm_det.samt || 0);
        });
      });
    });

    reportData.b2cs?.forEach((c) => {
      b2cVal += c.txval || 0;
      taxVal += (c.iamt || 0) + (c.camt || 0) + (c.samt || 0);
    });

    return { b2bVal, b2cVal, taxVal };
  }, [reportData]);

  // Handler to export data as JSON
  const handleExportJson = () => {
    if (!reportData) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(reportData, null, 2),
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `GSTR1_${periodType}_${year}${
      month || quarter ? `_${month || quarter}` : ""
    }.json`;
    link.click();
  };

  // --- Column Definitions ---
  const b2bColumns = [
    { key: "ctin", label: "Customer GSTIN" },
    { key: "inum", label: "Invoice No." },
    { key: "idt", label: "Invoice Date" },
    { key: "val", label: "Invoice Value", format: formatCurrency },
    { key: "pos", label: "Place of Supply" },
    { key: "rchrg", label: "Reverse Charge" },
  ];

  const b2csColumns = [
    { key: "pos", label: "Place of Supply" },
    { key: "rt", label: "Rate (%)" },
    { key: "txval", label: "Taxable Value", format: formatCurrency },
    { key: "iamt", label: "IGST", format: formatCurrency },
    { key: "camt", label: "CGST", format: formatCurrency },
    { key: "samt", label: "SGST", format: formatCurrency },
  ];

  const hsnColumns = [
    { key: "hsn_sc", label: "HSN Code" },
    { key: "desc", label: "Description" },
    { key: "uqc", label: "Unit" },
    { key: "qty", label: "Total Qty" },
    { key: "val", label: "Total Value", format: formatCurrency },
    { key: "txval", label: "Taxable Value", format: formatCurrency },
    { key: "iamt", label: "IGST", format: formatCurrency },
    { key: "camt", label: "CGST", format: formatCurrency },
    { key: "samt", label: "SGST", format: formatCurrency },
  ];

  const cdnrColumns = [
    { key: "ctin", label: "Customer GSTIN" },
    { key: "nt_num", label: "Note No." },
    { key: "nt_dt", label: "Note Date" },
    { key: "ntty", label: "Note Type (C/D)" },
    { key: "val", label: "Note Value", format: formatCurrency },
    { key: "p_gst", label: "Pre-GST" },
  ];

  const cdnurColumns = [
    { key: "nt_num", label: "Note No." },
    { key: "nt_dt", label: "Note Date" },
    {
      key: "ntty",
      label: "Note Type",
      format: (val: "C" | "D") => (val === "C" ? "Credit" : "Debit"),
    },
    { key: "val", label: "Note Value", format: formatCurrency },
    { key: "p_gst", label: "Pre-GST" },
    { key: "rchrg", label: "Reverse Charge" },
  ];

  const nilRatedColumns = [
    {
      key: "sply_ty",
      label: "Supply Type",
      format: (val: "INTER" | "INTRA") =>
        val === "INTER" ? "Interstate" : "Intrastate",
    },
    { key: "nil_amt", label: "Nil Rated Amount", format: formatCurrency },
    { key: "expt_amt", label: "Exempted Amount", format: formatCurrency },
    { key: "ngsup_amt", label: "Non-GST Amount", format: formatCurrency },
  ];

  // 1. Render Guard for Missing GSTIN
  if (!hasGstin) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert
          severity="error"
          icon={<ShieldAlert size={28} />}
          sx={{ "& .MuiAlert-message": { width: "100%" }, borderRadius: 2 }}
        >
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Missing Shop GSTIN
          </Typography>
          <Typography variant="body2">
            Your shop GSTIN is not configured. Please update your shop settings
            with a valid GSTIN and State to generate the legally compliant
            GSTR-1 Report.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // 2. Render Loading State
  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        my={8}
        minHeight="250px"
      >
        <CircularProgress size={40} thickness={4} />
        <Typography sx={{ mt: 2, fontWeight: 600, color: "text.secondary" }}>
          Compiling GSTR-1 Data...
        </Typography>
      </Box>
    );
  }

  // 3. Render API Errors
  if (error) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!reportData) {
    return (
      <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
        No data found for the selected period.
      </Alert>
    );
  }

  // 4. Render Main Dashboard
  return (
    <Box sx={{ mt: 1 }}>
      {/* Action Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h6" fontWeight="bold" color="text.primary">
          GSTR-1 JSON Preview
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleExportJson}
          startIcon={<Download size={18} />}
          sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
        >
          Download JSON
        </Button>
      </Box>

      {/* Summary Metrics Row */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              borderRadius: 3,
              bgcolor: alpha(theme.palette.primary.main, 0.04),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              boxShadow: "none",
            }}
          >
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight="bold"
                    color="text.secondary"
                    textTransform="uppercase"
                  >
                    B2B Taxable Value
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="900"
                    mt={0.5}
                    color="primary.dark"
                  >
                    {formatCurrency(summaryMetrics.b2bVal)}
                  </Typography>
                </Box>
                <Building2
                  size={32}
                  color={theme.palette.primary.main}
                  opacity={0.5}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              borderRadius: 3,
              bgcolor: alpha(theme.palette.success.main, 0.04),
              border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
              boxShadow: "none",
            }}
          >
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight="bold"
                    color="text.secondary"
                    textTransform="uppercase"
                  >
                    B2C Taxable Value
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="900"
                    mt={0.5}
                    color="success.dark"
                  >
                    {formatCurrency(summaryMetrics.b2cVal)}
                  </Typography>
                </Box>
                <Users
                  size={32}
                  color={theme.palette.success.main}
                  opacity={0.5}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              borderRadius: 3,
              bgcolor: alpha(theme.palette.warning.main, 0.04),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
              boxShadow: "none",
            }}
          >
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight="bold"
                    color="text.secondary"
                    textTransform="uppercase"
                  >
                    Total Tax Accumulated
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="900"
                    mt={0.5}
                    color="warning.dark"
                  >
                    {formatCurrency(summaryMetrics.taxVal)}
                  </Typography>
                </Box>
                <TrendingUp
                  size={32}
                  color={theme.palette.warning.main}
                  opacity={0.5}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs & Data Section */}
      <Box
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          backgroundColor: theme.palette.background.paper,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            backgroundColor: alpha(theme.palette.action.hover, 0.05),
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            aria-label="GSTR-1 report sections"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTab-root": {
                minHeight: 60,
                fontWeight: 600,
                textTransform: "none",
                fontSize: "0.9rem",
              },
            }}
          >
            <Tab
              icon={<Building2 size={16} />}
              iconPosition="start"
              label={`B2B (${b2bInvoices.length})`}
            />
            <Tab
              icon={<Users size={16} />}
              iconPosition="start"
              label={`B2C Small (${reportData.b2cs?.length ?? 0})`}
            />
            <Tab
              icon={<FileSpreadsheet size={16} />}
              iconPosition="start"
              label={`HSN Summary (${reportData.hsn?.data?.length ?? 0})`}
            />
            <Tab
              icon={<FileMinus size={16} />}
              iconPosition="start"
              label={`CDNR (${cdnrNotes.length})`}
            />
            <Tab
              icon={<FileX size={16} />}
              iconPosition="start"
              label={`CDNUR (${reportData.cdnur?.length ?? 0})`}
            />
            <Tab
              icon={<Receipt size={16} />}
              iconPosition="start"
              label={`Nil/Exempt (${reportData.nil?.inv.length ?? 0})`}
            />
          </Tabs>
        </Box>

        <Box sx={{ p: 1 }}>
          <TabPanel value={activeTab} index={0}>
            <DataTable
              columns={b2bColumns}
              rows={b2bInvoices}
              loading={false}
              total={0}
              page={0}
              rowsPerPage={0}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
            />
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <DataTable
              columns={b2csColumns}
              rows={reportData.b2cs ?? []}
              loading={false}
              total={0}
              page={0}
              rowsPerPage={0}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
            />
          </TabPanel>
          <TabPanel value={activeTab} index={2}>
            <DataTable
              columns={hsnColumns}
              rows={reportData.hsn?.data ?? []}
              loading={false}
              total={0}
              page={0}
              rowsPerPage={0}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
            />
          </TabPanel>
          <TabPanel value={activeTab} index={3}>
            <DataTable
              columns={cdnrColumns}
              rows={cdnrNotes}
              loading={false}
              total={0}
              page={0}
              rowsPerPage={0}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
            />
          </TabPanel>
          <TabPanel value={activeTab} index={4}>
            <DataTable
              columns={cdnurColumns}
              rows={reportData.cdnur ?? []}
              loading={false}
              total={0}
              page={0}
              rowsPerPage={0}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
            />
          </TabPanel>
          <TabPanel value={activeTab} index={5}>
            <DataTable
              columns={nilRatedColumns}
              rows={reportData.nil?.inv ?? []}
              loading={false}
              total={0}
              page={0}
              rowsPerPage={0}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
            />
          </TabPanel>
        </Box>
      </Box>
    </Box>
  );
}
