"use client";

import { useEffect, useState, useCallback } from "react";
import { Box, Button, Typography, Chip, CircularProgress } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { Plus, Trash2, Edit, TrendingDown, Wallet } from "lucide-react";
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
import { DataCard as StatisticCard } from "../components/DataCard";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [addOpen, setAddOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // ✅ FIX: Calculate initial dates for "This Month" so the page loads data immediately
  const [filters, setFilters] = useState<DashboardFilter>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    // Simple ISO string YYYY-MM-DD (Adjust for timezone if strictly needed, but usually fine for reports)
    const from = new Date(start.getTime() - start.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
    const to = new Date(end.getTime() - end.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];

    return {
      filter: "month",
      from,
      to,
    };
  });

  // ✅ Stabilized fetchData
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

  // ✅ Proper useEffect dependencies
  useEffect(() => {
    // This will now run on mount because 'filters' has valid dates
    fetchData(filters);
  }, [fetchData, filters.filter, filters.from, filters.to]);

  // ✅ Handler to prevent loop
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

  // Table Actions
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
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={18} />}
            onClick={() => setAddOpen(true)}
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
          >
            Add Expense
          </Button>
        }
      />

      {/* --- STATS SECTION --- */}
      {stats && (
        <Box mb={3} mt={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <StatisticCard
                title="Total Expenses"
                value={`₹${stats.total.toLocaleString("en-IN")}`}
                icon={<TrendingDown />}
                color="error.main"
                subtext={`Period: ${stats.period.from} - ${stats.period.to}`}
              />
            </Grid>

            {/* Top Spending Categories */}
            {stats.breakdown.map((cat, idx) => (
              <Grid item xs={12} sm={6} md={3} key={cat.category}>
                <StatisticCard
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
    </Box>
  );
}
