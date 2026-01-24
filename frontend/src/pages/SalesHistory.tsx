"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Button,
  LinearProgress,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import DashboardHeader from "../components/DashboardHeader";
import type { DashboardFilter } from "../lib/types/inventoryDashboardTypes";
import SalesTable from "../components/sales/SalesTable";
import theme from "../../theme";
import toast from "react-hot-toast";
import ExportDateRangeModal from "../components/ExportDateRangeModal";
import { FileDownIcon as FileDownloadIcon } from "lucide-react"; // Wallet icon for payment
import AddEditTransactionModal from "../components/transactions/AddEditTransactionModal"; // ✅ Import Modal
import type { Transaction } from "../lib/types/transactionTypes";

const { ipcRenderer } = window.electron || {};

const getInitialFilters = (): DashboardFilter => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    from: formatDate(start),
    to: formatDate(end),
    filter: "month",
  };
};

export default function SalesTablePage() {
  const [activeFilters, setActiveFilters] =
    useState<DashboardFilter>(getInitialFilters);
  const [searchQuery, setSearchQuery] = useState("");
  const shop = JSON.parse(localStorage.getItem("shop") || "{}");

  // ✅ Stability wrapper
  const handleFilterChange = useCallback((newFilters: DashboardFilter) => {
    setActiveFilters((prev) => {
      if (
        prev.filter === newFilters.filter &&
        prev.from === newFilters.from &&
        prev.to === newFilters.to
      ) {
        return prev;
      }
      return newFilters;
    });
  }, []);

  // --- Payment Modal State ---
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionInitialData, setTransactionInitialData] =
    useState<Partial<Transaction> | null>(null);

  // --- Export State ---
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [exportModal, setExportModal] = useState<{
    open: boolean;
    type: "excel" | "pdf" | null;
  }>({ open: false, type: null });
  const [exportLoading, setExportLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const handleExportMenuClick = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const handleExportMenuClose = () => setAnchorEl(null);

  const openExportModal = (type: "excel" | "pdf") => {
    setExportModal({ open: true, type });
    handleExportMenuClose();
  };

  const handleExport = async ({
    startDate,
    endDate,
  }: {
    startDate: string;
    endDate: string;
  }) => {
    if (!ipcRenderer) {
      toast.error("Export not available in browser mode.");
      return;
    }

    setExportLoading(true);
    let result;

    if (exportModal.type === "excel") {
      result = await ipcRenderer.invoke("export-sales-to-excel", {
        startDate,
        endDate,
      });
    } else if (exportModal.type === "pdf") {
      setPdfProgress({ current: 0, total: 0 });
      result = await ipcRenderer.invoke("export-sales-to-pdfs", {
        startDate,
        endDate,
        shop,
      });
    }

    setExportLoading(false);
    setExportModal({ open: false, type: null });

    if (result.success) {
      toast.success(result.message || "Export successful!");
    } else {
      toast.error(result.error || "Export failed.");
    }
  };

  useEffect(() => {
    if (!ipcRenderer) return;

    const handleProgressUpdate = (progress: {
      current: number;
      total: number;
    }) => {
      setPdfProgress(progress);
      if (progress.current > 0 && progress.current === progress.total) {
        setTimeout(() => setPdfProgress(null), 2000);
      }
    };

    ipcRenderer.on("export-progress", handleProgressUpdate);
    return () => {
      ipcRenderer.removeAllListeners("export-progress");
    };
  }, []);

  // ✅ Action Handler for "Mark Payment"
  const handleMarkPayment = (sale: any) => {
    console.log("sale mark payment :", sale);
    // Check if fully paid first?
    const pending = (sale.total || 0) - (sale.paid_amount || 0);

    if (pending <= 0.9) {
      // Using standard buffer
      toast("This bill is already fully paid.", { icon: "ℹ️" });
      // We allow opening anyway in case they want to overpay or record a specific adjustment,
      // but typically we'd return. Let's proceed but warn or just set amount to 0.
    }

    setTransactionInitialData({
      type: "payment_in",
      bill_type: "sale",
      entity_type: "customer",
      entity_id: sale.customer_id,
      bill_id: sale.id,
      amount: pending > 0 ? pending : 0, // Auto-fill pending amount
      transaction_date: new Date().toISOString().split("T")[0],
      status: "paid",
      payment_mode: "cash",
    });
    setTransactionModalOpen(true);
  };

  const finalFilters = {
    from: activeFilters.from,
    to: activeFilters.to,
    filter: activeFilters.filter || "month",
    query: searchQuery,
  };

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        backgroundColor: theme.palette.background.default,
        minHeight: "100vh",
      }}
    >
      <DashboardHeader
        title="Sales History"
        showSearch={true}
        showDateFilters={true}
        onSearch={setSearchQuery}
        onFilterChange={handleFilterChange}
        actions={
          <>
            <Button
              variant="contained"
              onClick={handleExportMenuClick}
              startIcon={<FileDownloadIcon size={18} />}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                fontWeight: 600,
                boxShadow: "none",
                "&:hover": {
                  boxShadow: "none",
                },
              }}
            >
              Export Records
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleExportMenuClose}
            >
              <MenuItem onClick={() => openExportModal("excel")}>
                Export All to Excel
              </MenuItem>
              <MenuItem onClick={() => openExportModal("pdf")}>
                Export Invoices as PDF
              </MenuItem>
            </Menu>
          </>
        }
      />

      <ExportDateRangeModal
        open={exportModal.open}
        onClose={() => setExportModal({ open: false, type: null })}
        onExport={handleExport}
        title={
          exportModal.type === "excel"
            ? "Export Sales to Excel"
            : "Export Invoices to PDF"
        }
        loading={exportLoading}
      />

      {pdfProgress && (
        <Box
          sx={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 1400,
            bgcolor: "background.paper",
            p: 2,
            borderRadius: 2,
            boxShadow: 3,
            minWidth: 250,
          }}
        >
          <Typography variant="body2" gutterBottom>
            Exporting PDFs: {pdfProgress.current} / {pdfProgress.total}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(pdfProgress.current / pdfProgress.total) * 100}
          />
        </Box>
      )}

      {/* ✅ Pass the custom action to SalesTable */}
      <SalesTable filters={finalFilters} onMarkPayment={handleMarkPayment} />

      {/* ✅ Add Edit Transaction Modal */}
      <AddEditTransactionModal
        open={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        onSuccess={() => {
          // Force refresh of table?
          // SalesTable uses its own internal fetch based on props.
          // We might need to trigger a refetch.
          // Since activeFilters is state, we can toggle it slightly or add a refresh trigger prop.
          // For now, reloading the page or relying on user refresh is simple,
          // but ideally we pass a 'refreshTrigger' prop to SalesTable.
          // We'll update state to trigger re-render:
          setActiveFilters((prev) => ({ ...prev }));
        }}
        initialData={transactionInitialData}
      />
    </Box>
  );
}
