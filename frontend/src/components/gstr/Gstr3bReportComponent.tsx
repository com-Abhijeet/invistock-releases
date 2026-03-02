"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
  useTheme,
} from "@mui/material";
import { api } from "../../lib/api/api";
import { ShieldAlert, Download, PieChart } from "lucide-react";
import toast from "react-hot-toast";

interface Gstr3bReportComponentProps {
  periodType: "month" | "quarter" | "year";
  year: number;
  month?: number;
  quarter?: number;
}

const formatCurrency = (value: number | undefined | null) => {
  if (!value) return "0.00";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function Gstr3bReportComponent({
  periodType,
  year,
  month,
  quarter,
}: Gstr3bReportComponentProps) {
  const theme = useTheme();
  const shopStr =
    typeof window !== "undefined" ? localStorage.getItem("shop") : null;
  const shop = shopStr ? JSON.parse(shopStr) : {};
  const hasGstin = Boolean(shop.gstin || shop.gst_no);

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasGstin) return;
    const fetchReport = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          periodType,
          year: year.toString(),
          ...(month && { month: month.toString() }),
          ...(quarter && { quarter: quarter.toString() }),
        });
        const res = await api.get(`/api/gst/gstr3b?${params.toString()}`);
        setReportData(res.data.data);
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to fetch GSTR-3B");
        setError(err.response?.data?.message || "Error generating GSTR-3B");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [periodType, year, month, quarter, hasGstin]);

  const handleExportJson = () => {
    if (!reportData) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(reportData, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `GSTR3B_${periodType}_${year}.json`;
    link.click();
  };

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
            Update your shop settings with a valid GSTIN to generate GSTR-3B.
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (loading)
    return (
      <Box display="flex" flexDirection="column" alignItems="center" my={8}>
        <CircularProgress size={40} thickness={4} />
        <Typography sx={{ mt: 2, fontWeight: 600, color: "text.secondary" }}>
          Compiling GSTR-3B Summary...
        </Typography>
      </Box>
    );

  if (error)
    return (
      <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>
        {error}
      </Alert>
    );
  if (!reportData) return null;

  const thStyle = {
    fontWeight: 800,
    bgcolor: alpha(theme.palette.primary.main, 0.05),
    py: 1.5,
  };
  const tdStyle = { fontWeight: 600 };

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography
          variant="h6"
          fontWeight="bold"
          display="flex"
          alignItems="center"
          gap={1}
        >
          <PieChart color={theme.palette.primary.main} /> GSTR-3B Monthly Return
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

      {/* 3.1 Outward Supplies Table */}
      <Card
        sx={{
          borderRadius: 3,
          mb: 4,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: "none",
        }}
      >
        <Box px={3} py={2} borderBottom={`1px solid ${theme.palette.divider}`}>
          <Typography variant="subtitle1" fontWeight="bold">
            3.1 Details of Outward Supplies & Inward Supplies liable to Reverse
            Charge
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={thStyle}>Nature of Supplies</TableCell>
                <TableCell align="right" sx={thStyle}>
                  Total Taxable Value
                </TableCell>
                <TableCell align="right" sx={thStyle}>
                  Integrated Tax (IGST)
                </TableCell>
                <TableCell align="right" sx={thStyle}>
                  Central Tax (CGST)
                </TableCell>
                <TableCell align="right" sx={thStyle}>
                  State Tax (SGST)
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow hover>
                <TableCell>(a) Outward taxable supplies</TableCell>
                <TableCell align="right" sx={tdStyle}>
                  {formatCurrency(reportData.outward_supplies.os_tax.txval)}
                </TableCell>
                <TableCell align="right" sx={tdStyle}>
                  {formatCurrency(reportData.outward_supplies.os_tax.iamt)}
                </TableCell>
                <TableCell align="right" sx={tdStyle}>
                  {formatCurrency(reportData.outward_supplies.os_tax.camt)}
                </TableCell>
                <TableCell align="right" sx={tdStyle}>
                  {formatCurrency(reportData.outward_supplies.os_tax.samt)}
                </TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell>(c) Other outward supplies (Nil/Exempt)</TableCell>
                <TableCell align="right" sx={tdStyle}>
                  {formatCurrency(
                    reportData.outward_supplies.os_nil_exmp.txval,
                  )}
                </TableCell>
                <TableCell align="right" sx={tdStyle}>
                  -
                </TableCell>
                <TableCell align="right" sx={tdStyle}>
                  -
                </TableCell>
                <TableCell align="right" sx={tdStyle}>
                  -
                </TableCell>
              </TableRow>
              <TableRow hover>
                <TableCell>
                  (d) Inward supplies (liable to reverse charge)
                </TableCell>
                <TableCell align="right" sx={tdStyle}>
                  {formatCurrency(reportData.outward_supplies.is_rc.txval)}
                </TableCell>
                <TableCell align="right" sx={tdStyle}>
                  {formatCurrency(reportData.outward_supplies.is_rc.iamt)}
                </TableCell>
                <TableCell align="right" sx={tdStyle}>
                  {formatCurrency(reportData.outward_supplies.is_rc.camt)}
                </TableCell>
                <TableCell align="right" sx={tdStyle}>
                  {formatCurrency(reportData.outward_supplies.is_rc.samt)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* 4. Eligible ITC Table */}
      <Card
        sx={{
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: "none",
        }}
      >
        <Box px={3} py={2} borderBottom={`1px solid ${theme.palette.divider}`}>
          <Typography variant="subtitle1" fontWeight="bold">
            4. Eligible ITC (Input Tax Credit)
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={thStyle}>Details</TableCell>
                <TableCell align="right" sx={thStyle}>
                  Integrated Tax (IGST)
                </TableCell>
                <TableCell align="right" sx={thStyle}>
                  Central Tax (CGST)
                </TableCell>
                <TableCell align="right" sx={thStyle}>
                  State Tax (SGST)
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow hover>
                <TableCell>(A) ITC Available (All other ITC)</TableCell>
                <TableCell
                  align="right"
                  sx={{ ...tdStyle, color: "success.main" }}
                >
                  {formatCurrency(reportData.itc_eligible.itc_avl.iamt)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ ...tdStyle, color: "success.main" }}
                >
                  {formatCurrency(reportData.itc_eligible.itc_avl.camt)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ ...tdStyle, color: "success.main" }}
                >
                  {formatCurrency(reportData.itc_eligible.itc_avl.samt)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
