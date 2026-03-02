"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Stack,
  Breadcrumbs,
  Button,
  Tabs,
  Tab,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { ArrowLeft, ExternalLink, FileMinus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api/api";
import DataTable from "../components/DataTable"; // Adjust import if needed
import DashboardHeader from "../components/DashboardHeader"; // Adjust import if needed
import toast from "react-hot-toast";

// --- Types mapping backend response ---
interface ExpiryReportData {
  expired: any[];
  expiring_in_7_days: any[];
  expiring_in_14_days: any[];
  expiring_in_1_month: any[];
  expiring_in_3_months: any[];
  safe: any[];
}

interface ExpiryReportSummary {
  total_tracked_batches: number;
  expired_count: number;
  critical_count: number;
}

const TAB_KEYS: (keyof ExpiryReportData)[] = [
  "expired",
  "expiring_in_7_days",
  "expiring_in_14_days",
  "expiring_in_1_month",
  "expiring_in_3_months",
  "safe",
];

const TAB_LABELS = [
  "Expired",
  "≤ 7 Days",
  "≤ 14 Days",
  "≤ 1 Month",
  "≤ 3 Months",
  "Safe (>3 Mo)",
];

const ADJUSTMENT_CATEGORIES = [
  "Expired",
  "Damaged Goods",
  "Theft / Loss",
  "Stocktaking Correction",
  "Other",
];

export default function ExpiryReportPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Data State
  const [summary, setSummary] = useState<ExpiryReportSummary | null>(null);
  const [reportData, setReportData] = useState<ExpiryReportData | null>(null);

  // UI/Table State
  const [currentTab, setCurrentTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    qty: 1,
    category: "Expired",
    reason: "Written off from Expiry Report",
  });

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/batches/expiry/report", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      if (response.data.success) {
        setSummary(response.data.summary);
        setReportData(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch expiry report:", error);
      toast.error("Failed to load expiry report data");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    setPage(0); // Reset pagination when switching tabs
  };

  const handleOpenAdjustModal = (batch: any) => {
    if (batch.quantity <= 0) {
      toast.error("No quantity available to write off.");
      return;
    }
    setSelectedBatch(batch);
    setAdjustForm({
      qty: batch.quantity, // Default to writing off all remaining items
      category: "Expired",
      reason: `Batch ${batch.batch_number} expired/expiring soon.`,
    });
    setAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async () => {
    if (!selectedBatch) return;

    if (adjustForm.qty <= 0 || adjustForm.qty > selectedBatch.quantity) {
      toast.error(`Quantity must be between 1 and ${selectedBatch.quantity}`);
      return;
    }

    setAdjusting(true);
    try {
      await api.post("/api/inventory/adjust", {
        productId: selectedBatch.product_id,
        batchId: selectedBatch.id, // ID from the expiry report query maps to the batch ID
        adjustment: -Math.abs(adjustForm.qty), // Negative for write-off
        category: adjustForm.category,
        reason: adjustForm.reason,
      });

      toast.success("Stock written off successfully");
      setAdjustModalOpen(false);
      fetchReport(); // Refresh report data
    } catch (error: any) {
      console.error("Adjustment error:", error);
      toast.error(error.response?.data?.error || "Failed to adjust stock");
    } finally {
      setAdjusting(false);
    }
  };

  // Extract the specific array for the active tab
  const activeCategoryKey = TAB_KEYS[currentTab];
  const activeItems = reportData ? reportData[activeCategoryKey] : [];

  // Client-side pagination slice
  const paginatedRows = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return activeItems.slice(startIndex, startIndex + rowsPerPage);
  }, [activeItems, page, rowsPerPage]);

  // Define Columns for the DataTable
  const columns = [
    { key: "product_name", label: "Product Name" },
    { key: "batch_number", label: "Batch #" },
    {
      key: "quantity",
      label: "Qty",
      format: (val: number) => <strong>{val}</strong>,
    },
    { key: "location", label: "Location" },
    {
      key: "expiry_date",
      label: "Expiry Date",
      format: (val: string) =>
        val ? new Date(val).toLocaleDateString() : "--",
    },
    {
      key: "days_left",
      label: "Status",
      format: (val: number) => {
        if (val < 0)
          return (
            <Chip
              size="small"
              color="error"
              label={`Expired ${Math.abs(val)} days ago`}
            />
          );
        if (val <= 7)
          return (
            <Chip size="small" color="warning" label={`${val} days left`} />
          );
        if (val <= 30)
          return (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={`${val} days left`}
            />
          );
        return (
          <Chip
            size="small"
            color="success"
            variant="outlined"
            label={`${val} days left`}
          />
        );
      },
    },
  ];

  // Actions for the DataTable
  const tableActions = [
    {
      label: "Write Off / Adjust",
      icon: <FileMinus size={16} />,
      onClick: handleOpenAdjustModal,
    },
    {
      label: "View Product",
      icon: <ExternalLink size={16} />,
      onClick: (row: any) => navigate(`/product/${row.product_id}`),
    },
  ];

  return (
    <Box p={3} sx={{ minHeight: "100vh", bgcolor: "#f9fafb" }}>
      {/* Navigation Breadcrumbs */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <Button
          startIcon={<ArrowLeft />}
          onClick={() => navigate(-1)}
          sx={{ color: "text.secondary" }}
        >
          Back
        </Button>
        <Breadcrumbs>
          <Typography color="text.primary" fontWeight={600}>
            Expiry & Stock Report
          </Typography>
        </Breadcrumbs>
      </Stack>

      <DashboardHeader
        title="Inventory Expiry Tracker"
        showDateFilters={false}
      />

      {/* Summary Cards */}
      <Stack direction="row" spacing={3} mb={4}>
        <Paper
          sx={{
            p: 2,
            flex: 1,
            borderLeft: "4px solid",
            borderColor: "text.disabled",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Total Tracked Batches
          </Typography>
          <Typography variant="h5" fontWeight="bold">
            {summary?.total_tracked_batches || 0}
          </Typography>
        </Paper>
        <Paper
          sx={{
            p: 2,
            flex: 1,
            borderLeft: "4px solid",
            borderColor: "warning.main",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Critical (≤ 7 Days)
          </Typography>
          <Typography variant="h5" fontWeight="bold" color="warning.main">
            {summary?.critical_count || 0}
          </Typography>
        </Paper>
        <Paper
          sx={{
            p: 2,
            flex: 1,
            borderLeft: "4px solid",
            borderColor: "error.main",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Already Expired
          </Typography>
          <Typography variant="h5" fontWeight="bold" color="error.main">
            {summary?.expired_count || 0}
          </Typography>
        </Paper>
      </Stack>

      {/* Main Content Area */}
      <Paper sx={{ borderRadius: 2 }}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2, pt: 1 }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            textColor="primary"
            indicatorColor="primary"
          >
            {TAB_KEYS.map((key, index) => {
              const count = reportData ? reportData[key].length : 0;
              return (
                <Tab
                  key={key}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {TAB_LABELS[index]}
                      <Chip
                        label={count}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.7rem",
                          fontWeight: "bold",
                        }}
                        color={
                          index === 0
                            ? "error"
                            : index === 1
                              ? "warning"
                              : "default"
                        }
                      />
                    </Box>
                  }
                  sx={{ textTransform: "none", fontWeight: 600, minHeight: 48 }}
                />
              );
            })}
          </Tabs>
        </Box>

        {/* Data Table */}
        <Box sx={{ p: 2 }}>
          <DataTable
            columns={columns}
            rows={paginatedRows}
            actions={tableActions}
            loading={loading}
            total={activeItems.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(newRows) => {
              setRowsPerPage(newRows);
              setPage(0); // Reset to first page when changing page size
            }}
          />
        </Box>
      </Paper>

      {/* Adjustment / Write-off Modal */}
      <Dialog
        open={adjustModalOpen}
        onClose={() => !adjusting && setAdjustModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>Write Off Stock</DialogTitle>
        <DialogContent dividers>
          {selectedBatch && (
            <Box mb={3}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Product:{" "}
                <strong style={{ color: "#000" }}>
                  {selectedBatch.product_name}
                </strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Batch:{" "}
                <strong style={{ color: "#000" }}>
                  {selectedBatch.batch_number}
                </strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Available Qty:{" "}
                <strong style={{ color: "#000" }}>
                  {selectedBatch.quantity}
                </strong>
              </Typography>
            </Box>
          )}

          <Stack spacing={3}>
            <TextField
              label="Quantity to Deduct"
              type="number"
              fullWidth
              value={adjustForm.qty}
              onChange={(e) =>
                setAdjustForm({
                  ...adjustForm,
                  qty: parseInt(e.target.value) || 0,
                })
              }
              InputProps={{
                inputProps: { min: 1, max: selectedBatch?.quantity || 1 },
              }}
              helperText="How many units are you writing off from this batch?"
            />

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={adjustForm.category}
                label="Category"
                onChange={(e) =>
                  setAdjustForm({ ...adjustForm, category: e.target.value })
                }
              >
                {ADJUSTMENT_CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Reason (Optional)"
              fullWidth
              multiline
              rows={2}
              value={adjustForm.reason}
              onChange={(e) =>
                setAdjustForm({ ...adjustForm, reason: e.target.value })
              }
              placeholder="e.g. Disposed of expired stock."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setAdjustModalOpen(false)}
            color="inherit"
            disabled={adjusting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdjustSubmit}
            variant="contained"
            color="error"
            disabled={
              adjusting ||
              adjustForm.qty <= 0 ||
              adjustForm.qty > (selectedBatch?.quantity || 0)
            }
            startIcon={
              adjusting ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <FileMinus size={18} />
              )
            }
          >
            Confirm Write-off
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
