"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
} from "@mui/material";
import { Eye, Trash2, Download } from "lucide-react"; // ✅ Import Download icon
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getNonGstSales, NonGstSaleRow } from "../lib/api/nonGstSalesService";
import DataTable from "../components/DataTable";
import DashboardHeader from "../components/DashboardHeader";

// Get the ipcRenderer from your preload script
const { ipcRenderer } = window.electron;

// Helper function to get dates in YYYY-MM-DD format
const getISODate = (date = new Date()) => {
  return date.toISOString().split("T")[0];
};

export default function NGSalesPage() {
  const [sales, setSales] = useState<NonGstSaleRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // ✅ State for export menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const exportMenuOpen = Boolean(anchorEl);

  // ✅ State for date range modal
  const [modalOpen, setModalOpen] = useState(false);
  const [exportType, setExportType] = useState<"pdf" | "excel" | null>(null);
  const [startDate, setStartDate] = useState(
    getISODate(new Date(new Date().setMonth(new Date().getMonth() - 1)))
  );
  const [endDate, setEndDate] = useState(getISODate());

  const navigate = useNavigate();

  // Fetch data from the API
  const fetchSales = async () => {
    setLoading(true);
    try {
      const data = await getNonGstSales({
        page: page + 1,
        limit: rowsPerPage,
        query: searchTerm,
      });
      setSales(data.records);
      setTotalRecords(data.totalRecords);
    } catch (error) {
      toast.error("Failed to fetch non-GST sales.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Refetch when pagination or search term changes
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchSales();
    }, 500); // Debounce search
    return () => clearTimeout(handler);
  }, [page, rowsPerPage, searchTerm]);

  // --- Export Handlers ---

  const handleExportMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setAnchorEl(null);
  };

  const handleOpenDateModal = (type: "pdf" | "excel") => {
    setExportType(type);
    setModalOpen(true);
    handleExportMenuClose(); // Close the menu
  };

  const handleCloseDateModal = () => {
    setModalOpen(false);
    setExportType(null);
  };

  const handleConfirmExport = async () => {
    if (!exportType) return;

    const toastId = toast.loading(
      `Exporting ${exportType === "pdf" ? "PDFs" : "Excel file"}...`
    );
    handleCloseDateModal();

    const ipcHandler =
      exportType === "pdf"
        ? "export-non-gst-sales-to-pdfs"
        : "export-non-gst-items-to-excel";

    try {
      const result = await ipcRenderer.invoke(ipcHandler, {
        startDate,
        endDate,
      });

      toast.dismiss(toastId);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error || "Export failed.");
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(`Export failed: ${err.message}`);
    }
  };

  const columns = [
    { key: "reference", label: "Reference No." },
    { key: "customer", label: "Customer" },
    {
      key: "total",
      label: "Total Amount",
      format: (val: number) => `₹${val.toLocaleString("en-IN")}`,
    },
    {
      key: "paid_amount",
      label: "Amount Paid",
      format: (val: number) => `₹${val.toLocaleString("en-IN")}`,
    },
    { key: "payment_mode", label: "Payment Mode" },
    { key: "status", label: "Status" },
    {
      key: "created_at",
      label: "Date",
      format: (val: string) => new Date(val).toLocaleDateString("en-IN"),
    },
  ];

  // Define actions for each row
  const actions = [
    {
      label: "View Details",
      icon: <Eye size={18} />,
      onClick: (row: NonGstSaleRow) => {
        navigate(`/non-gst/view-sale/${row.id}`);
      },
    },
    {
      label: "Delete Sale",
      icon: <Trash2 size={18} />,
      onClick: (_row: NonGstSaleRow) => {
        // TODO: You'll need to create a delete API endpoint
        // handleDelete(row.id)
        toast("Delete functionality not yet implemented.");
      },
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
        title="Non-GST Sales History"
        showSearch={true}
        onSearch={setSearchTerm}
        onRefresh={fetchSales}
        showDateFilters={false} // We use the modal for date filters
        actions={
          // ✅ Add the Export Button and Menu
          <>
            <Button
              variant="outlined"
              onClick={handleExportMenuClick}
              startIcon={<Download size={18} />}
            >
              Export
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={exportMenuOpen}
              onClose={handleExportMenuClose}
            >
              <MenuItem onClick={() => handleOpenDateModal("excel")}>
                Export Items to Excel
              </MenuItem>
              <MenuItem onClick={() => handleOpenDateModal("pdf")}>
                Export Receipts to PDF
              </MenuItem>
            </Menu>
          </>
        }
      />

      <DataTable
        rows={sales}
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

      {/* ✅ Add the Date Range Modal */}
      <Dialog open={modalOpen} onClose={handleCloseDateModal}>
        <DialogTitle>Select Export Date Range</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Please select the date range for the export.
          </Typography>
          <Stack spacing={2} sx={{ pt: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDateModal} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmExport} variant="contained">
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
