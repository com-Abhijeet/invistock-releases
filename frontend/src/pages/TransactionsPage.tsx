"use client";

import { useEffect, useState } from "react";
import { Box, Button, CircularProgress } from "@mui/material";
import { Edit, Eye, Trash2, Plus } from "lucide-react";
import AddEditTransactionModal from "../components/transactions/AddEditTransactionModal";
import {
  getAllTransactions,
  deleteTransaction,
} from "../lib/api/transactionService";
import type { Transaction } from "../lib/types/transactionTypes";
import DataTable from "../components/DataTable";
import type { Action } from "../lib/types/DataTableTypes";
import DashboardHeader from "../components/DashboardHeader";
import type {
  DashboardFilter,
  DashboardFilterType,
} from "../lib/types/inventoryDashboardTypes";
import toast from "react-hot-toast";

const getInitialFilters = (): DashboardFilter => {
  return {
    from: "",
    to: "",
    filter: "all" as DashboardFilterType,
  };
};

export default function TransactionsPage() {
  const [activeFilters, setActiveFilters] =
    useState<DashboardFilter>(getInitialFilters);
  const [searchQuery, setSearchQuery] = useState("");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await getAllTransactions({
        ...activeFilters,
        query: searchQuery,
        page: page + 1,
        limit: rowsPerPage,
      });
      setTransactions(res.data || []);
      setTotalRecords(res.totalRecords || 0);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      toast.error("Failed to fetch transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      fetchTransactions();
    }, 500);
    return () => clearTimeout(debounceTimeout);
  }, [activeFilters, searchQuery, page, rowsPerPage]);

  const handleOpenModal = (transaction?: Transaction) => {
    setSelectedTransaction(transaction ?? null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedTransaction(null);
    setModalOpen(false);
    fetchTransactions();
  };

  const handleDelete = async (transaction: Transaction) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        await deleteTransaction(transaction.id);
        toast.success("Transaction deleted successfully.");
        fetchTransactions();
      } catch (e) {
        toast.error("Failed to delete transaction.");
      }
    }
  };

  const columns = [
    { key: "reference_no", label: "Ref No." },
    { key: "type", label: "Type" },
    {
      key: "transaction_date",
      label: "Date",
      format: (val: string) => new Date(val).toLocaleDateString("en-IN"),
    },
    { key: "entity_type", label: "Entity Type" },
    {
      key: "amount",
      label: "Amount",
      format: (val: number) => `₹${val.toLocaleString("en-IN")}`,
    },
    { key: "status", label: "Status" },
  ];

  const actions: Action[] = [
    {
      label: "View",
      icon: <Eye size={18} />,
      onClick: (row: Transaction) => handleOpenModal(row),
    },
    {
      label: "Edit",
      icon: <Edit size={18} />,
      onClick: (row: Transaction) => handleOpenModal(row),
    },
    {
      label: "Delete",
      icon: <Trash2 size={18} />,
      onClick: (row: Transaction) => handleDelete(row),
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
        title="Transactions"
        showSearch={true}
        showDateFilters={true}
        onSearch={setSearchQuery}
        onRefresh={fetchTransactions}
        onFilterChange={setActiveFilters}
        actions={
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleOpenModal()}
            startIcon={<Plus size={18} />}
            // ✅ Updated styles to match Product Page
            sx={{
              borderRadius: "12px", // Matching rounded corners
              textTransform: "none", // Removes all-caps
              fontWeight: 600,
              px: 3,
              whiteSpace: "nowrap",
              minWidth: "fit-content",
              boxShadow: "none",
              "&:hover": {
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              },
            }}
          >
            Add Transaction
          </Button>
        }
      />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DataTable
          rows={transactions}
          columns={columns}
          actions={actions}
          loading={loading}
          total={totalRecords}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(val) => {
            setRowsPerPage(val);
            setPage(0);
          }}
        />
      )}

      <AddEditTransactionModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSuccess={fetchTransactions}
        initialData={selectedTransaction}
      />
    </Box>
  );
}
