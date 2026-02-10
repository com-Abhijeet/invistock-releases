"use client";

import { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Typography,
  Button,
} from "@mui/material";
import { Edit, Eye, Trash2, Plus, Download, FileText } from "lucide-react";
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
import { useNavigate } from "react-router-dom";
import KbdButton from "../components/ui/Button";

// Get electron from window
const { electron } = window;

// ✅ Helper to get the complete initial filter state
const getInitialFilters = (): DashboardFilter => {
  return {
    from: "", // Default to no date filter
    to: "",
    filter: "all" as DashboardFilterType,
  };
};

export default function TransactionsPage() {
  const navigate = useNavigate();
  // ✅ Simplified Filter States
  const [activeFilters, setActiveFilters] =
    useState<DashboardFilter>(getInitialFilters);
  const [searchQuery, setSearchQuery] = useState("");

  // Table States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  // ✅ Export Modal States
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFrom, setExportFrom] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [exportTo, setExportTo] = useState(
    new Date().toISOString().split("T")[0],
  );

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

  const handleExport = async () => {
    if (!exportFrom || !exportTo) {
      return toast.error("Please select both start and end dates.");
    }

    const toastId = toast.loading("Generating export...");
    try {
      const res = await getAllTransactions({
        filter: "custom",
        startDate: exportFrom,
        endDate: exportTo,
        page: 1,
        limit: 0,
        all: true,
      });

      const dataToExport = res.data || [];

      if (dataToExport.length === 0) {
        toast.error("No transactions found for this period.", { id: toastId });
        return;
      }

      const columnMap = {
        reference_no: "Transaction Ref No",
        transaction_date: "Transaction Date",
        type: "Transaction Type",
        entity_type: "Party Type",
        entity_name: "Party Name",
        entity_phone: "Party Phone",
        bill_type: "Linked Bill Type",
        bill_ref_no: "Linked Bill Ref No",
        amount: "Total Amount",
        payment_mode: "Payment Mode",
        gst_amount: "GST Tax Amount",
        discount: "Discount Given",
        status: "Status",
        note: "Remarks / Narration",
        created_at: "Entry Created At",
      };

      const result = await (electron as any).ipcRenderer.invoke(
        "generate-excel-report",
        {
          data: dataToExport,
          fileName: `Transactions_${exportFrom}_to_${exportTo}`,
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
    {
      key: "created_at",
      label: "Time",
      format: (val: string) => new Date(val).toLocaleTimeString("en-IN"),
    },
  ];

  const actions: Action[] = [
    {
      label: "View Transaction",
      icon: <Eye size={18} />,
      onClick: (row: Transaction) => handleOpenModal(row),
    },
    {
      label: "View Bill",
      icon: <FileText size={18} color="#1976d2" />,
      onClick: (row: Transaction) => {
        if (row.bill_id && row.bill_type) {
          if (row.bill_type === "sale") {
            navigate(`/billing/view/${row.bill_id}`);
          } else if (row.bill_type === "purchase") {
            navigate(`/purchase/view/${row.bill_id}`);
          } else {
            toast.error("Unknown bill type linked.");
          }
        } else {
          toast.error("No bill linked to this transaction.");
        }
      },
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
              label="Add Transaction"
              underlineChar="A"
              shortcut="ctrl+a"
              onClick={() => handleOpenModal()}
              startIcon={<Plus size={18} />}
              sx={{ px: 3 }}
            />
          </Stack>
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

      {/* ✅ Styled Export Date Range Modal */}
      <Dialog
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Export Transactions</DialogTitle>
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
