"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  LinearProgress,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
// ... other imports
import DashboardHeader from "../components/DashboardHeader";
import type { DashboardFilter } from "../lib/types/inventoryDashboardTypes";
import SalesCategoryPieChart from "../components/sales/SalesCategoryPieChart";
import SalesStatistics from "../components/sales/SalesStatistics";
import SalesTable from "../components/sales/SalesTable";
import SalesTrendChart from "../components/sales/SalesTrendChart";
import theme from "../../theme";
import toast from "react-hot-toast";
import ExportDateRangeModal from "../components/ExportDateRangeModal";
import { FileDownIcon as FileDownloadIcon } from "lucide-react";

const { ipcRenderer } = window.electron;

// ✅ Helper corrected to use 'filter' to match your DashboardFilter type
const getInitialFilters = (): DashboardFilter => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const formatDate = (date: Date) => {
    // ... formatDate logic is unchanged
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    from: formatDate(start),
    to: formatDate(end),
    filter: "month", // ✅ Corrected from filterType
  };
};

const SalesDashboard = () => {
  const [activeFilters, setActiveFilters] =
    useState<DashboardFilter>(getInitialFilters);
  const [searchQuery, setSearchQuery] = useState("");
  const shop = JSON.parse(localStorage.getItem("shop") || "{}");
  // --- ✅ State for Export Functionality ---
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

  // --- ✅ Handlers for Export Menu ---
  const handleExportMenuClick = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const handleExportMenuClose = () => setAnchorEl(null);

  const openExportModal = (type: "excel" | "pdf") => {
    setExportModal({ open: true, type });
    handleExportMenuClose();
  };

  // --- ✅ Handlers for Export Logic ---
  const handleExport = async ({
    startDate,
    endDate,
  }: {
    startDate: string;
    endDate: string;
  }) => {
    setExportLoading(true);
    let result;

    if (exportModal.type === "excel") {
      result = await ipcRenderer.invoke("export-sales-to-excel", {
        startDate,
        endDate,
      });
    } else if (exportModal.type === "pdf") {
      setPdfProgress({ current: 0, total: 0 }); // Reset progress
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

  // --- ✅ Listener for PDF Export Progress ---
  useEffect(() => {
    // The callback function that will handle the progress data
    const handleProgressUpdate = (progress: {
      current: number;
      total: number;
    }) => {
      setPdfProgress(progress);
      if (progress.current > 0 && progress.current === progress.total) {
        // Reset progress when done
        setTimeout(() => setPdfProgress(null), 2000);
      }
    };

    // Register the listener using the exposed 'on' method
    window.electron.ipcRenderer.on("export-progress", handleProgressUpdate);

    // Cleanup listener when the component unmounts to prevent memory leaks
    return () => {
      window.electron.ipcRenderer.removeAllListeners("export-progress");
    };
  }, []);

  const finalFilters = {
    from: activeFilters.from,
    to: activeFilters.to,
    filter: activeFilters.filter || "month",
    query: searchQuery,
  };

  const handleRefresh = () => {
    console.log("Refreshing sales data with filters:", finalFilters);
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
      {/* ✅ Replaced the old floating filter bar and title */}
      <DashboardHeader
        title="Sales Dashboard"
        showSearch={true}
        showDateFilters={true}
        onSearch={setSearchQuery}
        onRefresh={handleRefresh}
        onFilterChange={setActiveFilters}
      />

      {/* --- Export Menu --- */}
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

      {/* --- Export Modal --- */}
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

      {/* --- PDF Progress Indicator --- */}
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

      {/* 📈 Statistics and Charts */}
      <Box
        sx={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          p: 2.5,
          mb: 3,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <SalesStatistics filters={finalFilters} />

        <Box display="flex" gap={2.5} flexWrap="wrap" mt={3}>
          <Box flex={1} minWidth={{ xs: "100%", md: 400 }}>
            <SalesTrendChart filters={finalFilters} />
          </Box>
          <Box flex={1} minWidth={{ xs: "100%", md: 400 }}>
            <SalesCategoryPieChart filters={finalFilters} />
          </Box>
        </Box>
      </Box>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          onClick={handleExportMenuClick}
          startIcon={<FileDownloadIcon />}
        >
          Export
        </Button>
      </Box>

      {/* 📋 Table */}
      <SalesTable filters={finalFilters} />
    </Box>
  );
};

export default SalesDashboard;
