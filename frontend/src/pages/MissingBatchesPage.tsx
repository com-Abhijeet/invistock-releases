"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Chip,
  Stack,
  Avatar,
  useTheme,
  alpha,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import {
  Wrench,
  ArrowRight,
  CheckCircle2,
  PackageX,
  AlertTriangle,
  ShoppingCart,
  PackageOpen,
  ScanLine,
  ShieldAlert,
  FilePlus2,
  X,
  PackagePlus,
  PackageMinus,
  CheckCircle,
  CopyXIcon as CopyAll,
} from "lucide-react";
import toast from "react-hot-toast";

// Standard components & services
import DashboardHeader from "../components/DashboardHeader";
import DataTable from "../components/DataTable";
import { UNIT_FAMILIES, getUnitFamily } from "../lib/services/unitService";
import { api } from "../lib/api/api";

// --- Standard Metric Conversions for Smart Pricing ---
const STANDARD_CONVERSIONS: Record<string, number> = {
  kg: 1,
  g: 0.001,
  mg: 0.000001,
  quintal: 100,
  tonne: 1000,
  l: 1,
  ml: 0.001,
  m: 1,
  cm: 0.01,
  ft: 0.3048,
  in: 0.0254,
  pcs: 1,
  doz: 12,
  gross: 144,
};

interface BulkBatchRow {
  product_id: number;
  name: string;
  batch_number: string;
  quantity: number | string;
  unit: string;
  mrp: number | string;
  mop: number | string;
  expiry_date: string;
  base_unit: string;
  secondary_unit: string | null;
  conversion_factor: number;
  base_mrp: number;
  base_mop: number;
}

// ============================================================================
// COMPONENT 1: The Detached Bulk Review Modal
// ============================================================================

interface BulkBatchReviewModalProps {
  open: boolean;
  onClose: () => void;
  selectedProducts: any[];
  onSuccess: () => void;
}

const BulkBatchReviewModal = ({
  open,
  onClose,
  selectedProducts,
  onSuccess,
}: BulkBatchReviewModalProps) => {
  const theme = useTheme();
  const [gridData, setGridData] = useState<BulkBatchRow[]>([]);
  const [globalQty, setGlobalQty] = useState("");
  const [globalExp, setGlobalExp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize Grid Data when modal opens
  useEffect(() => {
    if (open && selectedProducts.length > 0) {
      const initialGrid: BulkBatchRow[] = selectedProducts.map((p) => {
        const baseMrp = Number(p.mrp || 0);
        const baseMop = Number(p.average_purchase_price || p.mop || 0);
        const baseUnit = (p.base_unit || "pcs").toLowerCase();

        return {
          product_id: p.id,
          name: p.name,
          batch_number: "OPENING-STOCK",
          quantity: p.quantity || "",
          unit: baseUnit,
          mrp: baseMrp,
          mop: baseMop,
          expiry_date: "",
          base_unit: baseUnit,
          secondary_unit: p.secondary_unit
            ? p.secondary_unit.toLowerCase()
            : null,
          conversion_factor: Number(p.conversion_factor || 1),
          base_mrp: baseMrp,
          base_mop: baseMop,
        };
      });
      setGridData(initialGrid);
      setGlobalQty("");
      setGlobalExp("");
    }
  }, [open, selectedProducts]);

  // Math Handlers
  const getUnitMultiplier = (newUnit: string, row: BulkBatchRow) => {
    if (newUnit === row.base_unit) return 1;
    if (row.secondary_unit && newUnit === row.secondary_unit)
      return row.conversion_factor || 1;
    const baseVal = STANDARD_CONVERSIONS[row.base_unit];
    const newVal = STANDARD_CONVERSIONS[newUnit];
    if (baseVal && newVal) return newVal / baseVal;
    return 1;
  };

  const handleGridChange = (
    index: number,
    field: keyof BulkBatchRow,
    value: any,
  ) => {
    const newData = [...gridData];
    const row = newData[index];

    if (field === "unit") {
      const multiplier = getUnitMultiplier(value, row);
      row.mrp = Number((row.base_mrp * multiplier).toFixed(2));
      row.mop = Number((row.base_mop * multiplier).toFixed(2));
      row.unit = value;
    } else {
      row[field] = value as never;
    }
    setGridData(newData);
  };

  const handleApplyToAll = () => {
    const newData = gridData.map((row) => ({
      ...row,
      quantity: globalQty !== "" ? globalQty : row.quantity,
      expiry_date: globalExp !== "" ? globalExp : row.expiry_date,
    }));
    setGridData(newData);
    toast.success("Defaults applied to all rows");
  };

  const getAvailableUnitsForRow = (row: BulkBatchRow) => {
    const familyKey = getUnitFamily(row.base_unit);
    let options: { value: string; label: string }[] = [];

    if (familyKey && UNIT_FAMILIES[familyKey as keyof typeof UNIT_FAMILIES]) {
      options = [
        ...UNIT_FAMILIES[familyKey as keyof typeof UNIT_FAMILIES].units,
      ];
    } else {
      options = [{ value: row.base_unit, label: row.base_unit }];
    }

    if (
      row.secondary_unit &&
      !options.find((o) => o.value === row.secondary_unit)
    ) {
      options.push({
        value: row.secondary_unit,
        label: `${row.secondary_unit} (Custom)`,
      });
    }
    return options;
  };

  // Submit to Backend
  const handleSubmit = async () => {
    const invalidRows = gridData.filter(
      (r) => !r.quantity || Number(r.quantity) <= 0,
    );
    if (invalidRows.length > 0) {
      toast.error(
        `Please fix the quantity for ${invalidRows.length} highlighted row(s).`,
      );
      return;
    }

    setIsSubmitting(true);
    const loadId = toast.loading(
      `Saving ${gridData.length} opening batches...`,
    );

    try {
      const token = localStorage.getItem("authToken");
      await api.post(
        "/api/batches/bulk-create",
        { batches: gridData },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );

      toast.success(`Successfully configured opening stock!`, { id: loadId });
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.error || "Failed to create batches.", {
        id: loadId,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalQty = gridData.reduce(
    (acc, row) => acc + (Number(row.quantity) || 0),
    0,
  );

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          height: "85vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: "#fff",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: "primary.main",
              width: 40,
              height: 40,
            }}
          >
            <FilePlus2 size={24} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
              Review & Configure Opening Stock
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
            >
              You are configuring opening batches for {gridData.length}{" "}
              products.
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} disabled={isSubmitting} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          p: 0,
          display: "flex",
          flexDirection: "column",
          bgcolor: "grey.50",
        }}
      >
        {/* Top Toolbar */}
        <Box
          sx={{
            p: 2,
            bgcolor: "#fff",
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
          >
            <Box display="flex" gap={1.5} flex={1}>
              <CheckCircle
                size={24}
                color={theme.palette.success.main}
                style={{ marginTop: 2 }}
              />
              <Box>
                <Typography
                  variant="subtitle2"
                  fontWeight={800}
                  color="text.primary"
                >
                  Smart Pre-fill Active
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Prices are automatically translating based on the unit you
                  select.
                </Typography>
              </Box>
            </Box>

            <Box
              display="flex"
              gap={1.5}
              p={1.5}
              bgcolor={alpha(theme.palette.primary.main, 0.03)}
              borderRadius={2}
              border={`1px dashed ${theme.palette.divider}`}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                mr={1}
                color="text.secondary"
              >
                <CopyAll size={18} />
                <Typography variant="caption" fontWeight={700}>
                  MASS APPLY:
                </Typography>
              </Stack>
              <TextField
                size="small"
                placeholder="Qty"
                type="number"
                value={globalQty}
                onChange={(e) => setGlobalQty(e.target.value)}
                sx={{ width: 100, bgcolor: "#fff" }}
              />
              <TextField
                size="small"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={globalExp}
                onChange={(e) => setGlobalExp(e.target.value)}
                sx={{ width: 150, bgcolor: "#fff" }}
              />
              <Button
                variant="contained"
                disableElevation
                color="primary"
                onClick={handleApplyToAll}
                sx={{ fontWeight: 700 }}
              >
                Apply
              </Button>
            </Box>
          </Stack>
        </Box>

        {/* Data Grid */}
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            flexGrow: 1,
            borderRadius: 0,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>
                  Product Details
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 800, bgcolor: "#f1f5f9", width: 180 }}
                >
                  Batch Reference
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 800, bgcolor: "#f1f5f9", width: 200 }}
                >
                  Opening Qty *
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 800, bgcolor: "#f1f5f9", width: 140 }}
                >
                  Retail (MRP) *
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 800, bgcolor: "#f1f5f9", width: 140 }}
                >
                  Cost (MOP)
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 800, bgcolor: "#f1f5f9", width: 160 }}
                >
                  Expiry Date
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gridData.map((row, index) => {
                const isError = !row.quantity || Number(row.quantity) <= 0;
                return (
                  <TableRow
                    key={row.product_id}
                    hover
                    sx={{
                      bgcolor: isError
                        ? alpha(theme.palette.error.main, 0.05)
                        : "inherit",
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {row.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {row.product_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        variant="outlined"
                        value={row.batch_number}
                        onChange={(e) =>
                          handleGridChange(
                            index,
                            "batch_number",
                            e.target.value,
                          )
                        }
                        inputProps={{
                          style: {
                            fontSize: "0.8rem",
                            fontFamily: "monospace",
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          variant="outlined"
                          value={row.quantity}
                          onChange={(e) =>
                            handleGridChange(index, "quantity", e.target.value)
                          }
                          error={isError}
                          inputProps={{ style: { fontWeight: "bold" } }}
                        />
                        <TextField
                          select
                          size="small"
                          variant="outlined"
                          value={row.unit}
                          onChange={(e) =>
                            handleGridChange(index, "unit", e.target.value)
                          }
                          sx={{ minWidth: 90 }}
                        >
                          {getAvailableUnitsForRow(row).map((u) => (
                            <MenuItem key={u.value} value={u.value}>
                              {u.label || u.value}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        variant="outlined"
                        value={row.mrp}
                        onChange={(e) =>
                          handleGridChange(index, "mrp", e.target.value)
                        }
                        InputProps={{ startAdornment: "₹" }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        variant="outlined"
                        value={row.mop}
                        onChange={(e) =>
                          handleGridChange(index, "mop", e.target.value)
                        }
                        InputProps={{ startAdornment: "₹" }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        variant="outlined"
                        value={row.expiry_date}
                        onChange={(e) =>
                          handleGridChange(index, "expiry_date", e.target.value)
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* UX Footer Summary */}
        <Box
          sx={{
            px: 3,
            py: 1.5,
            bgcolor: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            Pending Creation:{" "}
            <Typography component="span" color="primary.main" fontWeight={800}>
              {gridData.length} Batches
            </Typography>
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            Total Net Items:{" "}
            <Typography component="span" color="text.primary" fontWeight={800}>
              {totalQty}
            </Typography>
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          p: 2.5,
          bgcolor: "#fafafa",
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button
          onClick={onClose}
          disabled={isSubmitting}
          sx={{ color: "text.secondary", fontWeight: 600 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          size="large"
          disabled={isSubmitting}
          disableElevation
          sx={{ fontWeight: 700, px: 4, minWidth: 160 }}
        >
          {isSubmitting ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Save All Batches"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================================================
// COMPONENT 2: Main Missing Batches Page
// ============================================================================

export default function MissingBatchesPage() {
  const theme = useTheme();
  const navigate = useNavigate();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);

  // --- Bulk Actions State ---
  const [selectedBulkProducts, setSelectedBulkProducts] = useState<any[]>([]);
  const [bulkUntrackOpen, setBulkUntrackOpen] = useState(false);
  const [bulkCreateOpen, setBulkCreateOpen] = useState(false);

  const fetchMissingBatches = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await api.get("/api/products/missing-batches", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const payload = response.data;
      if (Array.isArray(payload)) {
        setProducts(payload);
      } else if (payload?.status === "success" || payload?.data) {
        setProducts(payload.data || []);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Failed to fetch missing batches:", error);
      toast.error("Failed to load missing batches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMissingBatches();
  }, [fetchMissingBatches]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const lowerQ = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQ) ||
        (p.product_code && p.product_code.toLowerCase().includes(lowerQ)) ||
        (p.barcode && p.barcode.toLowerCase().includes(lowerQ)),
    );
  }, [products, searchQuery]);

  // Bulk Submit untrack
  const handleConfirmBulkUntrack = async () => {
    const loadId = toast.loading(
      `Untracking ${selectedBulkProducts.length} items...`,
    );
    try {
      const token = localStorage.getItem("authToken");
      await api.post(
        "/api/batches/bulk-untrack",
        { productIds: selectedBulkProducts.map((p) => p.id) },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      toast.success(`Successfully untracked items!`, { id: loadId });
      setBulkUntrackOpen(false);
      setSelectedBulkProducts([]);
      fetchMissingBatches(); // Refresh table
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.error || "Failed to untrack items.", {
        id: loadId,
      });
    }
  };

  const bulkActionsList = [
    {
      label: "Configure Batches",
      icon: <PackagePlus size={16} />,
      onClick: (selected: any[]) => {
        setSelectedBulkProducts(selected);
        setBulkCreateOpen(true);
      },
    },
    {
      label: "Untrack / Mark Standard",
      icon: <PackageMinus size={16} />,
      onClick: (selected: any[]) => {
        setSelectedBulkProducts(selected);
        setBulkUntrackOpen(true);
      },
    },
  ];

  const columns = [
    {
      key: "name",
      label: "Product Details",
      format: (_: any, row: any) => (
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            variant="rounded"
            sx={{
              width: 40,
              height: 40,
              bgcolor: "error.50",
              color: "error.main",
            }}
          >
            <PackageX size={20} />
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={700} color="text.primary">
              {row.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={500}
            >
              {row.product_code || "No Code"}{" "}
              {row.barcode ? `• ${row.barcode}` : ""}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: "tracking_type",
      label: "Requirement",
      align: "center" as const,
      format: () => (
        <Chip
          label="Batch Tracked"
          size="small"
          sx={{
            fontWeight: 700,
            bgcolor: "error.50",
            color: "error.dark",
            border: "1px solid",
            borderColor: "error.light",
          }}
        />
      ),
    },
    {
      key: "quantity",
      label: "Untracked Stock",
      align: "center" as const,
      format: (val: number, row: any) => (
        <Typography variant="body2" fontWeight={800} color="error.main">
          {val} {row.base_unit || "pcs"}
        </Typography>
      ),
    },
    {
      key: "status",
      label: "Action Needed",
      align: "left" as const,
      format: () => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Wrench size={14} color={theme.palette.error.main} />
          <Typography variant="caption" fontWeight={700} color="error.main">
            Assign Batches
          </Typography>
        </Stack>
      ),
    },
  ];

  const actions = [
    {
      label: "Fix / Add Batch",
      icon: <Wrench size={16} color="#d32f2f" />,
      onClick: (row: any) => navigate(`/product/${row.id}?tab=batches`),
    },
    {
      label: "Open Profile",
      icon: <ArrowRight size={16} />,
      onClick: (row: any) => navigate(`/product/${row.id}`),
    },
  ];

  return (
    <Box p={2} pt={3} sx={{ backgroundColor: "#fff", minHeight: "100vh" }}>
      <DashboardHeader
        title="Missing Batch Configurations"
        showSearch={true}
        onSearch={setSearchQuery}
        showDateFilters={false}
        onRefresh={fetchMissingBatches}
        initialFilter="today"
        actions={
          <Button
            variant="contained"
            color="error"
            startIcon={<AlertTriangle size={18} />}
            onClick={() => setInfoOpen(true)}
            sx={{
              borderRadius: "8px",
              fontWeight: 800,
              textTransform: "none",
              boxShadow: "0 4px 14px 0 rgba(211, 47, 47, 0.39)",
              "&:hover": { bgcolor: "error.dark" },
            }}
          >
            Important Info
          </Button>
        }
      />

      <Box mt={3}>
        {products.length === 0 && !loading ? (
          <Box
            textAlign="center"
            py={10}
            px={3}
            bgcolor="#fafafa"
            borderRadius="16px"
            border={`1px dashed ${theme.palette.divider}`}
            display="flex"
            flexDirection="column"
            alignItems="center"
          >
            <Avatar
              sx={{ bgcolor: "success.50", width: 64, height: 64, mb: 2 }}
            >
              <CheckCircle2 size={32} color={theme.palette.success.main} />
            </Avatar>
            <Typography variant="h6" color="text.primary" fontWeight={800}>
              All caught up!
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              mt={1}
              maxWidth={400}
            >
              There are currently no batch-tracked products missing their
              initial batch configurations. Your inventory is perfectly synced.
            </Typography>
          </Box>
        ) : !loading ? (
          <DataTable
            rows={filteredProducts}
            columns={columns}
            actions={actions}
            loading={loading}
            total={filteredProducts.length}
            page={0}
            rowsPerPage={100}
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
            bulkActions={true}
            bulkActionsList={bulkActionsList}
          />
        ) : (
          <Box display="flex" justifyContent="center" py={10} />
        )}
      </Box>

      {/* --- WARNING INFO DIALOG --- */}
      <Dialog
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px", overflow: "hidden" } }}
      >
        <DialogTitle
          sx={{
            bgcolor: alpha(theme.palette.error.main, 0.08),
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            p: 2.5,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AlertTriangle size={24} color={theme.palette.error.main} />
            <Box>
              <Typography
                variant="subtitle1"
                fontWeight={800}
                color="error.dark"
                lineHeight={1.2}
              >
                Action Required: Batch Setup Incomplete
              </Typography>
              <Typography variant="caption" fontWeight={600} color="error.main">
                Why fixing missing batches is critical for your shop.
              </Typography>
            </Box>
          </Stack>
          <IconButton
            onClick={() => setInfoOpen(false)}
            size="small"
            sx={{ color: "error.main" }}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 3 }}>
            <Typography
              variant="subtitle2"
              fontWeight={800}
              color="text.primary"
              mb={2}
            >
              How this affects your shop right now:
            </Typography>
            <Box
              display="grid"
              gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }}
              gap={3}
            >
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box sx={{ mt: 0.5, color: theme.palette.text.secondary }}>
                  <ShoppingCart size={18} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color="text.primary"
                  >
                    1. Sales are Blocked
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    You cannot make a sale for these products. The billing
                    screen requires a specific batch to deduct stock from.
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box sx={{ mt: 0.5, color: theme.palette.text.secondary }}>
                  <PackageOpen size={18} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color="text.primary"
                  >
                    2. Idle / Invisible Inventory
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    The product is sitting idle. Without a batch, the software
                    cannot track its expiry date, exact purchase cost (MOP), or
                    retail price (MRP).
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box sx={{ mt: 0.5, color: theme.palette.text.secondary }}>
                  <ScanLine size={18} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color="text.primary"
                  >
                    3. Barcode Scanning Will Fail
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Scanning the barcode at the POS counter will return an error
                    because the system cannot resolve which exact batch the
                    customer is picking up.
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box sx={{ mt: 0.5, color: theme.palette.text.secondary }}>
                  <ShieldAlert size={18} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color="text.primary"
                  >
                    4. Manual Adjustments Restricted
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    You cannot manually add stock via the "Stock Adjustments"
                    page. Stock can only be safely adjusted on pre-existing
                    batches.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Box>
          <Divider />
          <Box
            sx={{
              bgcolor: "#fafafa",
              p: 3,
              display: "flex",
              gap: 2,
              alignItems: "flex-start",
            }}
          >
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.success.main, 0.1),
                color: "success.main",
              }}
            >
              <FilePlus2 size={24} />
            </Avatar>
            <Box>
              <Typography
                variant="subtitle2"
                fontWeight={800}
                color="success.dark"
              >
                How to fix this instantly:
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                mt={0.5}
                sx={{ lineHeight: 1.6 }}
              >
                Navigate to <b>Purchases &rarr; New Purchase</b>. Mark a
                purchase bill against the product from your supplier. The system
                will automatically create a new batch with the purchased
                quantity and unlock the item for sales.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* --- DETACHED BULK CREATE REVIEW MODAL --- */}
      <BulkBatchReviewModal
        open={bulkCreateOpen}
        onClose={() => setBulkCreateOpen(false)}
        selectedProducts={selectedBulkProducts}
        onSuccess={() => {
          setBulkCreateOpen(false);
          setSelectedBulkProducts([]);
          fetchMissingBatches();
        }}
      />

      {/* --- BULK UNTRACK MODAL --- */}
      <Dialog
        open={bulkUntrackOpen}
        onClose={() => setBulkUntrackOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          <Typography variant="h6" fontWeight={800}>
            Untrack Products (Bulk)
          </Typography>
          <IconButton onClick={() => setBulkUntrackOpen(false)} size="small">
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              p: 2,
              mb: 2,
              bgcolor: alpha(theme.palette.error.main, 0.08),
              border: `1px solid ${theme.palette.error.main}`,
              borderRadius: 2,
              display: "flex",
              gap: 1.5,
            }}
          >
            <ShieldAlert
              size={24}
              color={theme.palette.error.main}
              style={{ flexShrink: 0 }}
            />
            <Box>
              <Typography
                variant="subtitle2"
                color="error.dark"
                fontWeight={800}
              >
                Feature Disable Warning
              </Typography>
              <Typography variant="body2" color="error.dark" mt={0.5}>
                The standard Product MRP will take precedence.{" "}
                <b>All batch-related tracking features</b> (like expiry dates
                and exact purchase costs) will be permanently disabled for these{" "}
                {selectedBulkProducts.length} items.
              </Typography>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to change the tracking requirement from "Batch
            Tracked" to "Standard/None" for the selected products?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button
            onClick={() => setBulkUntrackOpen(false)}
            sx={{ color: "text.secondary", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmBulkUntrack}
            variant="contained"
            color="error"
            disableElevation
            sx={{ fontWeight: 700 }}
          >
            Confirm Untrack
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
