"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Button,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  Plus,
  Trash2,
  Edit,
  TrendingDown,
  Wallet,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Column } from "../lib/types/DataTableTypes";

import DashboardHeader from "../components/DashboardHeader";
import DataTable from "../components/DataTable";
import AddEditExpenseModal from "../components/expenses/AddEditExpenseModal";
import ConfirmModal from "../components/ConfirmModal";

import {
  getExpenses,
  getExpenseStats,
  deleteExpense,
} from "../lib/api/expenseService";
import type { Expense, ExpenseStats } from "../lib/types/expenseTypes";
import { DashboardFilter } from "../lib/types/inventoryDashboardTypes";

import { DataCard } from "../components/DataCard";
import KbdButton from "../components/ui/Button";

// Get electron from window safely
const { electron } = window as any;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [addOpen, setAddOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // ✅ Export Modal States
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFrom, setExportFrom] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [exportTo, setExportTo] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Filter State
  const [filters, setFilters] = useState<DashboardFilter>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const from = new Date(start.getTime() - start.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
    const to = new Date(end.getTime() - end.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];

    return { filter: "month", from, to };
  });

  const fetchData = useCallback(async (currentFilters: DashboardFilter) => {
    setLoading(true);
    try {
      const [expenseData, statsData] = await Promise.all([
        getExpenses(currentFilters.from, currentFilters.to),
        getExpenseStats(currentFilters.from, currentFilters.to),
      ]);
      setExpenses(expenseData);
      setStats(statsData);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(filters);
  }, [fetchData, filters.filter, filters.from, filters.to]);

  const handleFilterChange = (newFilters: DashboardFilter) => {
    setFilters((prev) => {
      if (
        prev.filter === newFilters.filter &&
        prev.from === newFilters.from &&
        prev.to === newFilters.to
      ) {
        return prev;
      }
      return newFilters;
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteExpense(deleteId);
      toast.success("Expense deleted.");
      fetchData(filters);
    } catch (error) {
      toast.error("Failed to delete expense.");
    }
    setDeleteId(null);
  };

  const handleExport = async () => {
    if (!exportFrom || !exportTo) {
      return toast.error("Please select both start and end dates.");
    }

    const toastId = toast.loading("Generating export...");
    try {
      const dataToExport = await getExpenses(exportFrom, exportTo);

      if (!dataToExport || dataToExport.length === 0) {
        toast.error("No expenses found for this period.", { id: toastId });
        return;
      }

      const columnMap = {
        date: "Date",
        category: "Category",
        amount: "Amount",
        payment_mode: "Payment Mode",
        description: "Description / Notes",
        created_at: "Entry Created At",
      };

      if (!electron || !electron.ipcRenderer) {
        toast.error("Export is only available in the desktop application.", {
          id: toastId,
        });
        return;
      }

      const result = await electron.ipcRenderer.invoke(
        "generate-excel-report",
        {
          data: dataToExport,
          fileName: `Expenses_${exportFrom}_to_${exportTo}`,
          columnMap: columnMap,
        },
      );

      if (result.success) {
        toast.success("Export successful!", { id: toastId });
        setExportModalOpen(false);
      } else {
        toast.error("Export failed: " + result.message, { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during export.", { id: toastId });
    }
  };

  // Table Columns
  const columns: Column[] = [
    { key: "date", label: "Date" },
    {
      key: "category",
      label: "Category",
      format: (val: string) => <Chip label={val} size="small" />,
    },
    { key: "description", label: "Description" },
    { key: "payment_mode", label: "Mode" },
    {
      key: "amount",
      label: "Amount",
      align: "right" as const,
      format: (val: number) => (
        <Typography fontWeight="bold" color="error.main">
          ₹{val.toLocaleString("en-IN")}
        </Typography>
      ),
    },
  ];

  const actions = [
    {
      label: "Edit",
      icon: <Edit size={18} />,
      onClick: (row: Expense) => setEditExpense(row),
    },
    {
      label: "Delete",
      icon: <Trash2 size={18} />,
      onClick: (row: Expense) => setDeleteId(row.id!),
    },
  ];

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        backgroundColor: "#fff",
        minHeight: "100vh",
      }}
    >
      <DashboardHeader
        title="Expense Manager"
        showSearch={false}
        showDateFilters={true}
        onFilterChange={handleFilterChange}
        onRefresh={() => fetchData(filters)}
        actions={
          <Stack direction="row" spacing={1.5}>
            {/* ✅ Updated Export Button with KbdButton */}
            <KbdButton
              variant="secondary"
              label="Export"
              underlineChar="E"
              shortcut="ctrl+e"
              onClick={() => setExportModalOpen(true)}
              startIcon={<Download size={18} />}
            />

            {/* ✅ Updated Add Button with KbdButton */}
            <KbdButton
              variant="primary"
              label="Add Expense"
              underlineChar="A"
              shortcut="ctrl+a"
              onClick={() => setAddOpen(true)}
              startIcon={<Plus size={18} />}
              sx={{ px: 3 }}
            />
          </Stack>
        }
      />

      {/* --- STATS SECTION --- */}
      {stats && (
        <Box mb={3} mt={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <DataCard
                title="Total Expenses"
                value={`₹${stats.total.toLocaleString("en-IN")}`}
                icon={<TrendingDown />}
                color="error.main"
                subtext={`Period: ${stats.period.from} - ${stats.period.to}`}
              />
            </Grid>

            {stats.breakdown.map((cat, idx) => (
              <Grid item xs={12} sm={6} md={3} key={cat.category}>
                <DataCard
                  title={cat.category}
                  value={`₹${cat.total.toLocaleString("en-IN")}`}
                  icon={<Wallet />}
                  color={idx === 0 ? "warning.main" : "info.main"}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* --- TABLE SECTION --- */}
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <DataTable
          rows={expenses}
          columns={columns}
          actions={actions}
          loading={loading}
          total={expenses.length}
          page={0}
          rowsPerPage={expenses.length}
          onPageChange={() => {}}
          onRowsPerPageChange={() => {}}
        />
      )}

      {/* --- MODALS --- */}
      <AddEditExpenseModal
        open={addOpen || !!editExpense}
        onClose={() => {
          setAddOpen(false);
          setEditExpense(null);
        }}
        onSuccess={() => fetchData(filters)}
        initialData={editExpense}
      />

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        header="Delete Expense"
        disclaimer="Are you sure? This will permanently remove this expense record."
      />

      {/* ✅ Styled Export Date Range Modal */}
      <Dialog
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Export Expenses</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Select the date range you want to export to Excel.
          </Typography>
          <Stack spacing={3}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
            />
            <TextField
              label="End Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setExportModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            variant="contained"
            color="primary"
            startIcon={<Download size={18} />}
            sx={{
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            Export Excel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
