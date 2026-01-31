"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  TextField,
  Typography,
  CircularProgress,
  Stack,
  Chip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { Download, Calendar } from "lucide-react";
import toast from "react-hot-toast";

import DashboardHeader from "../components/DashboardHeader";
import DataTable from "../components/DataTable";
import { getDayBook, DayBookEntry } from "../lib/api/reportService";
import { DataCard } from "../components/DataCard";
import KbdButton from "../components/ui/Button";

// Get electron from window safely
const { electron } = window as any;

export default function DayBookPage() {
  // Default to Today (YYYY-MM-DD)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    transactions: DayBookEntry[];
    openingBalance: number;
    closingBalance: number; // Cumulative Closing
    totalIn: number;
    totalOut: number;
  } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getDayBook(date);
      setData(res);
    } catch (error) {
      toast.error("Failed to load Day Book.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [date]);

  const handleExport = async () => {
    if (!data || data.transactions.length === 0)
      return toast.error("No data to export.");

    const toastId = toast.loading("Exporting...");
    try {
      const columnMap = {
        created_at: "Time",
        ref_no: "Ref No",
        party_name: "Particulars",
        payment_mode: "Mode",
        description: "Note",
        credit: "Credit (In)",
        debit: "Debit (Out)",
        balance: "Running Balance",
      };

      // Format data for clean export
      const exportData = data.transactions.map((t) => ({
        ...t,
        created_at: new Date(t.created_at).toLocaleTimeString(),
        credit: t.credit || "",
        debit: t.debit || "",
      }));

      // ✅ Add "Net Day Change" Row to Export
      const netDayChange = data.totalIn - data.totalOut;

      exportData.push({
        created_at: "SUMMARY",
        ref_no: "",
        party_name: "Net Day Change",
        payment_mode: "",
        description: "",
        credit: data.totalIn,
        debit: data.totalOut,
        balance: netDayChange,
      } as any);

      if (!electron || !electron.ipcRenderer) {
        toast.error("Export is only available in the desktop application.", {
          id: toastId,
        });
        return;
      }

      await electron.ipcRenderer.invoke("generate-excel-report", {
        data: exportData,
        fileName: `DayBook_${date}`,
        columnMap,
      });
      toast.success("Exported successfully!", { id: toastId });
    } catch (e) {
      toast.error("Export failed", { id: toastId });
    }
  };

  const columns = [
    {
      key: "created_at",
      label: "Time",
      format: (val: string) =>
        new Date(val).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    { key: "ref_no", label: "Ref No" },
    { key: "party_name", label: "Particulars / Party" },
    {
      key: "payment_mode",
      label: "Mode",
      format: (val: string) => (
        <Chip label={val} size="small" variant="outlined" />
      ),
    },
    {
      key: "credit",
      label: "Money In (+)",
      align: "right" as const,
      format: (val: number) =>
        val > 0 ? (
          <Typography color="success.main" fontWeight="bold">
            ₹{val.toLocaleString()}
          </Typography>
        ) : (
          "-"
        ),
    },
    {
      key: "debit",
      label: "Money Out (-)",
      align: "right" as const,
      format: (val: number) =>
        val > 0 ? (
          <Typography color="error.main" fontWeight="bold">
            ₹{val.toLocaleString()}
          </Typography>
        ) : (
          "-"
        ),
    },
    {
      key: "balance",
      label: "Running Bal",
      align: "right" as const,
      format: (val: number) => <strong>₹{val.toLocaleString()}</strong>,
    },
  ];

  // Calculate Net Change for UI
  const netDayChange = data ? data.totalIn - data.totalOut : 0;

  return (
    <Box
      p={2}
      pt={3}
      sx={{ bgcolor: "#fff", borderTopLeftRadius: "36px", minHeight: "100vh" }}
    >
      <DashboardHeader
        title="Day Book"
        showSearch={false}
        showDateFilters={false}
        actions={
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              type="date"
              size="small"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  bgcolor: "grey.50",
                },
              }}
            />
            {/* ✅ Updated Export Button with KbdButton */}
            <KbdButton
              variant="secondary"
              label="Export"
              underlineChar="E"
              shortcut="ctrl+e"
              onClick={handleExport}
              startIcon={<Download size={18} />}
            />
          </Stack>
        }
      />

      {loading || !data ? (
        <Box display="flex" justifyContent="center" mt={10}>
          <CircularProgress />
        </Box>
      ) : (
        <Box mt={2}>
          {/* Summary Cards */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={3}>
              <DataCard
                title="Opening Balance"
                value={`₹${data.openingBalance.toLocaleString()}`}
                color="primary.main"
                icon={<Calendar />}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <DataCard
                title="Total In (+)"
                value={`₹${data.totalIn.toLocaleString()}`}
                color="success.main"
                icon={<Calendar />}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <DataCard
                title="Total Out (-)"
                value={`₹${data.totalOut.toLocaleString()}`}
                color="error.main"
                icon={<Calendar />}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <DataCard
                title="Closing Balance"
                value={`₹${data.closingBalance.toLocaleString()}`}
                color="secondary.main"
                icon={<Calendar />}
                subtext="Cumulative Cash in Hand"
              />
            </Grid>
          </Grid>

          <DataTable
            rows={data.transactions}
            columns={columns}
            loading={false}
            total={data.transactions.length}
            page={0}
            rowsPerPage={1000} // Show all for the day
            hidePagination={true}
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
          />

          {/* ✅ Custom Footer for Totals */}
          <Paper
            variant="outlined"
            sx={{
              mt: -1,
              borderTop: "none",
              borderRadius: "0 0 12px 12px",
              bgcolor: "grey.50",
              p: 2,
            }}
          >
            <Stack direction="row" justifyContent="flex-end" spacing={4} pr={4}>
              <Typography variant="subtitle2">
                Total In: <strong>₹{data.totalIn.toLocaleString()}</strong>
              </Typography>
              <Typography variant="subtitle2">
                Total Out: <strong>₹{data.totalOut.toLocaleString()}</strong>
              </Typography>
              <Typography
                variant="subtitle1"
                color={netDayChange >= 0 ? "success.main" : "error.main"}
              >
                Net Day Change:{" "}
                <strong>
                  {netDayChange >= 0 ? "+" : ""}₹{netDayChange.toLocaleString()}
                </strong>
              </Typography>
            </Stack>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
