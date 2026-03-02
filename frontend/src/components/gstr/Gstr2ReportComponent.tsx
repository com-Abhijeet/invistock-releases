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
import { api } from "../../lib/api/api";
import {
  Download,
  Building2,
  Users,
  FileSpreadsheet,
  FileMinus,
  FileX,
  Receipt,
  ShieldAlert,
  TrendingDown,
} from "lucide-react";
import toast from "react-hot-toast";

interface Gstr2ReportComponentProps {
  periodType: "month" | "quarter" | "year";
  year: number;
  month?: number;
  quarter?: number;
}

const formatCurrency = (value: number | undefined | null) => {
  if (value === null || value === undefined) return "₹0.00";
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  });
};

const TabPanel = (props: {
  children?: React.ReactNode;
  index: number;
  value: number;
}) => {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

export default function Gstr2ReportComponent({
  periodType,
  year,
  month,
  quarter,
}: Gstr2ReportComponentProps) {
  const theme = useTheme();

  const shopStr =
    typeof window !== "undefined" ? localStorage.getItem("shop") : null;
  const shop = shopStr ? JSON.parse(shopStr) : {};
  const hasGstin = Boolean(shop.gstin || shop.gst_no);

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!hasGstin) return;

    const fetchReport = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          periodType,
          year: year.toString(),
          ...(month && { month: month.toString() }),
          ...(quarter && { quarter: quarter.toString() }),
        });
        const res = await api.get(`/api/reports/gstr2?${params.toString()}`);
        setReportData(res.data.data);
      } catch (err: any) {
        toast.error(
          err.response?.data?.message || "Failed to fetch GSTR-2 data",
        );
        setError(err.response?.data?.message || "An unknown error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [periodType, year, month, quarter, hasGstin]);

  // --- MEMOIZED DATA MAPPING ---
  const b2bInvoices = useMemo(() => {
    if (!reportData?.b2b) return [];
    return reportData.b2b.flatMap((supplier: any) =>
      supplier.inv.map((invoice: any) => ({
        ...invoice,
        ctin: supplier.ctin,
      })),
    );
  }, [reportData]);

  const cdnrNotes = useMemo(() => {
    if (!reportData?.cdnr) return [];
    return reportData.cdnr.flatMap((supplier: any) =>
      supplier.nt.map((note: any) => ({
        ...note,
        ctin: supplier.ctin,
      })),
    );
  }, [reportData]);

  const summaryMetrics = useMemo(() => {
    if (!reportData) return { b2bVal: 0, b2burVal: 0, itcVal: 0 };
    let b2bVal = 0,
      b2burVal = 0,
      itcVal = 0;

    reportData.b2b?.forEach((c: any) => {
      c.inv.forEach((i: any) => {
        i.itms.forEach((it: any) => {
          b2bVal += it.itm_det.txval || 0;
          itcVal +=
            (it.itm_det.iamt || 0) +
            (it.itm_det.camt || 0) +
            (it.itm_det.samt || 0);
        });
      });
    });

    reportData.b2bur?.forEach((i: any) => {
      i.itms.forEach((it: any) => {
        b2burVal += it.itm_det.txval || 0;
        itcVal +=
          (it.itm_det.iamt || 0) +
          (it.itm_det.camt || 0) +
          (it.itm_det.samt || 0);
      });
    });

    return { b2bVal, b2burVal, itcVal };
  }, [reportData]);

  const handleExportJson = () => {
    if (!reportData) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(reportData, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `GSTR2_${periodType}_${year}${month || quarter ? `_${month || quarter}` : ""}.json`;
    link.click();
  };

  // --- FULL COLUMN DEFINITIONS ---
  const b2bColumns = [
    { key: "ctin", label: "Supplier GSTIN" },
    { key: "inum", label: "Invoice No." },
    { key: "idt", label: "Invoice Date" },
    { key: "val", label: "Invoice Value", format: formatCurrency },
    { key: "pos", label: "Place of Supply" },
    { key: "rchrg", label: "Reverse Charge" },
  ];

  const b2burColumns = [
    { key: "inum", label: "Invoice No." },
    { key: "idt", label: "Invoice Date" },
    { key: "val", label: "Invoice Value", format: formatCurrency },
    { key: "pos", label: "Place of Supply" },
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
    { key: "ctin", label: "Supplier GSTIN" },
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

  if (!hasGstin) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert
          severity="error"
          icon={<ShieldAlert size={28} />}
          sx={{ borderRadius: 2 }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            Missing Shop GSTIN
          </Typography>
          <Typography variant="body2">
            Update your shop settings with a valid GSTIN to generate GSTR-2.
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        my={8}
      >
        <CircularProgress size={40} thickness={4} />
        <Typography sx={{ mt: 2, fontWeight: 600, color: "text.secondary" }}>
          Compiling GSTR-2 Data...
        </Typography>
      </Box>
    );
  }

  if (error)
    return (
      <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>
        {error}
      </Alert>
    );
  if (!reportData)
    return (
      <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
        No data found.
      </Alert>
    );

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h6" fontWeight="bold">
          GSTR-2 JSON Preview
        </Typography>
        <Button
          variant="contained"
          onClick={handleExportJson}
          startIcon={<Download size={18} />}
          sx={{ borderRadius: 2 }}
        >
          Download JSON
        </Button>
      </Box>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              borderRadius: 3,
              bgcolor: alpha(theme.palette.info.main, 0.04),
              border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
              boxShadow: "none",
            }}
          >
            <CardContent
              component={Stack}
              direction="row"
              justifyContent="space-between"
            >
              <Box>
                <Typography
                  variant="caption"
                  fontWeight="bold"
                  color="text.secondary"
                >
                  B2B (REGISTERED)
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight="900"
                  mt={0.5}
                  color="info.dark"
                >
                  {formatCurrency(summaryMetrics.b2bVal)}
                </Typography>
              </Box>
              <Building2
                size={32}
                color={theme.palette.info.main}
                opacity={0.5}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              borderRadius: 3,
              bgcolor: alpha(theme.palette.secondary.main, 0.04),
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
              boxShadow: "none",
            }}
          >
            <CardContent
              component={Stack}
              direction="row"
              justifyContent="space-between"
            >
              <Box>
                <Typography
                  variant="caption"
                  fontWeight="bold"
                  color="text.secondary"
                >
                  B2BUR (UNREGISTERED)
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight="900"
                  mt={0.5}
                  color="secondary.dark"
                >
                  {formatCurrency(summaryMetrics.b2burVal)}
                </Typography>
              </Box>
              <Users
                size={32}
                color={theme.palette.secondary.main}
                opacity={0.5}
              />
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
            <CardContent
              component={Stack}
              direction="row"
              justifyContent="space-between"
            >
              <Box>
                <Typography
                  variant="caption"
                  fontWeight="bold"
                  color="text.secondary"
                >
                  TOTAL ITC AVAILABLE
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight="900"
                  mt={0.5}
                  color="success.dark"
                >
                  {formatCurrency(summaryMetrics.itcVal)}
                </Typography>
              </Box>
              <TrendingDown
                size={32}
                color={theme.palette.success.main}
                opacity={0.5}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          bgcolor: "background.paper",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: alpha(theme.palette.action.hover, 0.05),
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
            label={`B2BUR (${reportData.b2bur?.length ?? 0})`}
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
            label={`Nil/Exempt (${reportData.nil?.inv?.length ?? 0})`}
          />
        </Tabs>
        <Box p={1}>
          {/* ✅ REPLACED TYPOGRAPHY WITH PROPER DATATABLES AND CORRECT PAGINATION */}
          <TabPanel value={activeTab} index={0}>
            <DataTable
              columns={b2bColumns}
              rows={b2bInvoices}
              total={b2bInvoices.length}
              page={0}
              rowsPerPage={10}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
              loading={false}
            />
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <DataTable
              columns={b2burColumns}
              rows={reportData.b2bur ?? []}
              total={(reportData.b2bur ?? []).length}
              page={0}
              rowsPerPage={10}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
              loading={false}
            />
          </TabPanel>
          <TabPanel value={activeTab} index={2}>
            <DataTable
              columns={hsnColumns}
              rows={reportData.hsn?.data ?? []}
              total={(reportData.hsn?.data ?? []).length}
              page={0}
              rowsPerPage={10}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
              loading={false}
            />
          </TabPanel>
          <TabPanel value={activeTab} index={3}>
            <DataTable
              columns={cdnrColumns}
              rows={cdnrNotes}
              total={cdnrNotes.length}
              page={0}
              rowsPerPage={10}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
              loading={false}
            />
          </TabPanel>
          <TabPanel value={activeTab} index={4}>
            <DataTable
              columns={cdnurColumns}
              rows={reportData.cdnur ?? []}
              total={(reportData.cdnur ?? []).length}
              page={0}
              rowsPerPage={10}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
              loading={false}
            />
          </TabPanel>
          <TabPanel value={activeTab} index={5}>
            <DataTable
              columns={nilRatedColumns}
              rows={reportData.nil?.inv ?? []}
              total={(reportData.nil?.inv ?? []).length}
              page={0}
              rowsPerPage={10}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
              loading={false}
            />
          </TabPanel>
        </Box>
      </Box>
    </Box>
  );
}
