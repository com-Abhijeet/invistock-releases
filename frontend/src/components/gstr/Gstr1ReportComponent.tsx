// /components/Gstr1ReportComponent.tsx (or your file path)
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
} from "@mui/material";
import DataTable from "../DataTable"; // Assuming this is your DataTable component
import { getGstr1Report } from "../../lib/api/gstrService";
import type { Gstr1ReportData } from "../../lib/types/gstrTypes";
import { FileOutput } from "lucide-react";
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
        <Box sx={{ pt: 2.5, backgroundColor: "transparent" }}>{children}</Box>
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
  const [reportData, setReportData] = useState<Gstr1ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Fetch data whenever the props (date parameters) change
  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      setReportData(null); // Clear previous data
      setActiveTab(0); // Reset tab on new report

      const params = {
        periodType,
        year,
        ...(periodType === "month" && { month }),
        ...(periodType === "quarter" && { quarter }),
      };

      try {
        const data = await getGstr1Report(params);
        setReportData(data);
        console.log(data);
      } catch (err: any) {
        toast(err);
        setError(
          err.message || "An unknown error occurred while fetching the report."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [periodType, year, month, quarter]); // Dependency array ensures this runs on prop change

  // Memoized data processing for B2B invoices
  const b2bInvoices = useMemo(() => {
    if (!reportData?.b2b) return [];
    return reportData.b2b.flatMap((customer) =>
      customer.inv.map((invoice) => ({
        ...invoice,
        ctin: customer.ctin,
      }))
    );
  }, [reportData]);

  // Handler to export data as JSON
  const handleExportJson = () => {
    if (!reportData) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(reportData, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `GSTR1_${periodType}_${year}${
      month || quarter ? `_${month || quarter}` : ""
    }.json`;
    link.click();
  };

  // ✅ Flatten CDNR data for the DataTable
  const cdnrNotes = useMemo(() => {
    if (!reportData?.cdnr) return [];
    return reportData.cdnr.flatMap((customer) =>
      customer.nt.map((note) => ({
        ...note,
        ctin: customer.ctin, // Add the customer GSTIN to each note row
      }))
    );
  }, [reportData]);

  // Column definitions remain inside this component as they are tied to the data
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
      // Format for better readability
      format: (val: "INTER" | "INTRA") =>
        val === "INTER" ? "Interstate" : "Intrastate",
    },
    {
      key: "nil_amt",
      label: "Nil Rated Amount",
      format: formatCurrency,
    },
    {
      key: "expt_amt",
      label: "Exempted Amount",
      format: formatCurrency,
    },
    {
      key: "ngsup_amt",
      label: "Non-GST Amount",
      format: formatCurrency,
    },
  ];

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        my={5}
        minHeight="300px"
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Fetching GSTR-1 data...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!reportData) {
    return (
      <Alert severity="info">No data found for the selected period.</Alert>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Report Preview</Typography>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleExportJson}
          startIcon={<FileOutput size={18} />}
        >
          Export JSON
        </Button>
      </Box>

      {/* A modern, contained look for the report without using Paper elevation */}
      <Box
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            backgroundColor: "action.hover",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            aria-label="GSTR-1 report sections"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label={`B2B (${b2bInvoices.length})`} id="gstr1-tab-0" />
            <Tab
              label={`B2C Small (${reportData.b2cs?.length ?? 0})`}
              id="gstr1-tab-1"
            />
            <Tab
              label={`HSN Summary (${reportData.hsn?.data?.length ?? 0})`}
              id="gstr1-tab-2"
            />
            <Tab label={`CDNR (${cdnrNotes.length})`} id="gstr1-tab-3" />
            <Tab
              label={`CDNUR (${reportData.cdnur?.length ?? 0})`}
              id="gstr1-tab-4"
            />
            <Tab
              label={`Nil/Exempt (${reportData.nil?.inv.length ?? 0})`}
              id="gstr1-tab-5"
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <DataTable
            columns={b2bColumns}
            rows={b2bInvoices}
            loading={false}
            total={0}
            page={0}
            rowsPerPage={0}
            onPageChange={function (_newPage: number): void {
              throw new Error("Function not implemented.");
            }}
            onRowsPerPageChange={function (_newLimit: number): void {
              throw new Error("Function not implemented.");
            }}
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
            onPageChange={function (_newPage: number): void {
              throw new Error("Function not implemented.");
            }}
            onRowsPerPageChange={function (_newLimit: number): void {
              throw new Error("Function not implemented.");
            }}
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
            onPageChange={function (_newPage: number): void {
              throw new Error("Function not implemented.");
            }}
            onRowsPerPageChange={function (_newLimit: number): void {
              throw new Error("Function not implemented.");
            }}
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
            onPageChange={function (_newPage: number): void {
              throw new Error("Function not implemented.");
            }}
            onRowsPerPageChange={function (_newLimit: number): void {
              throw new Error("Function not implemented.");
            }}
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
            onPageChange={function (_newPage: number): void {
              throw new Error("Function not implemented.");
            }}
            onRowsPerPageChange={function (_newLimit: number): void {
              throw new Error("Function not implemented.");
            }}
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
            onPageChange={function (_newPage: number): void {
              throw new Error("Function not implemented.");
            }}
            onRowsPerPageChange={function (_newLimit: number): void {
              throw new Error("Function not implemented.");
            }}
          />
        </TabPanel>
      </Box>
    </Box>
  );
}
