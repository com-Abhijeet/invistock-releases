"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  LinearProgress,
  Typography,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material";
import {
  FileDownIcon as FileDownloadIcon,
  X,
  Download,
  FileText,
} from "lucide-react";
import DashboardHeader from "../components/DashboardHeader";
import type { DashboardFilter } from "../lib/types/inventoryDashboardTypes";
import SalesTable from "../components/sales/SalesTable";
import theme from "../../theme";
import toast from "react-hot-toast";
import ExportDateRangeModal from "../components/ExportDateRangeModal";
import AddEditTransactionModal from "../components/transactions/AddEditTransactionModal";
import type { Transaction } from "../lib/types/transactionTypes";
import KbdButton from "../components/ui/Button";

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

  // --- Modal States ---
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionInitialData, setTransactionInitialData] =
    useState<Partial<Transaction> | null>(null);

  // Format selection pop-up
  const [formatSelectorOpen, setFormatSelectorOpen] = useState(false);

  // Date range modal for export
  const [exportModal, setExportModal] = useState<{
    open: boolean;
    type: "excel" | "pdf" | null;
  }>({ open: false, type: null });

  const [exportLoading, setExportLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const openExportDateModal = (type: "excel" | "pdf") => {
    setExportModal({ open: true, type });
    setFormatSelectorOpen(false);
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

    if (result && result.success) {
      toast.success(result.message || "Export successful!");
    } else {
      toast.error(result?.error || "Export failed.");
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

  const handleMarkPayment = (sale: any) => {
    const pending = (sale.total || 0) - (sale.paid_amount || 0);

    if (pending <= 0.9) {
      toast("This bill is already fully paid.", { icon: "ℹ️" });
    }

    setTransactionInitialData({
      type: "payment_in",
      bill_type: "sale",
      entity_type: "customer",
      entity_id: sale.customer_id,
      bill_id: sale.id,
      amount: pending > 0 ? pending : 0,
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
          <KbdButton
            variant="primary"
            label="Export Records"
            underlineChar="E"
            shortcut="ctrl+e"
            onClick={() => setFormatSelectorOpen(true)}
            startIcon={<FileDownloadIcon size={18} />}
          />
        }
      />

      {/* Format Selector Pop-up */}
      <Dialog
        open={formatSelectorOpen}
        onClose={() => setFormatSelectorOpen(false)}
        PaperProps={{
          sx: { borderRadius: "20px", width: "100%", maxWidth: 400 },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Choose Export Format
          </Typography>
          <IconButton onClick={() => setFormatSelectorOpen(false)}>
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pb: 4 }}>
          <Stack spacing={2} mt={1}>
            <Box
              onClick={() => openExportDateModal("excel")}
              sx={{
                p: 2.5,
                borderRadius: "16px",
                border: "2px solid",
                borderColor: "divider",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 2,
                "&:hover": {
                  borderColor: "primary.main",
                  backgroundColor: "rgba(25, 118, 210, 0.04)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "12px",
                  bgcolor: "#E8F5E9",
                  color: "#2E7D32",
                }}
              >
                <Download size={24} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Excel Spreadsheet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Detailed list of all sales data
                </Typography>
              </Box>
            </Box>

            <Box
              onClick={() => openExportDateModal("pdf")}
              sx={{
                p: 2.5,
                borderRadius: "16px",
                border: "2px solid",
                borderColor: "divider",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 2,
                "&:hover": {
                  borderColor: "primary.main",
                  backgroundColor: "rgba(25, 118, 210, 0.04)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "12px",
                  bgcolor: "#FFEBEE",
                  color: "#C62828",
                }}
              >
                <FileText size={24} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  PDF Batch
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Download individual invoice copies
                </Typography>
              </Box>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>

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

      <SalesTable filters={finalFilters} onMarkPayment={handleMarkPayment} />

      <AddEditTransactionModal
        open={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        onSuccess={() => {
          setActiveFilters((prev) => ({ ...prev }));
        }}
        initialData={transactionInitialData}
      />
    </Box>
  );
}
