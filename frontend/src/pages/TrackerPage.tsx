"use client";

import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Chip,
  Divider,
  Stack,
  CircularProgress,
  Tab,
  Tabs,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  Search,
  Package,
  ScanBarcode,
  Truck,
  User,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  Receipt,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../lib/api/api";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader"; // Assumed path

// Updated Interface matching the provided JSON structure
interface TrackingResult {
  // Identifiers
  batch_id?: number;
  serial_id?: number;
  product_id?: number;
  purchase_id?: number;
  supplier_id?: number;

  // Root Level Data
  batch_number?: string;
  serial_number?: string;

  product_code?: string;
  product_name?: string;

  entry_date?: string;
  expiry_date?: string | null;
  status?: string;
  mrp?: number;

  // Purchase Info
  purchase_date?: string;
  purchase_ref?: string;

  // Supplier Info
  supplier_name?: string;
  supplier_phone?: string;

  // Sale Info
  sale?: {
    sale_id?: number;
    customer_id?: number;
    customer_name?: string;
    customer_phone?: string;
    sale_date?: string;
    sale_ref?: string;
    sold_rate?: number;
  } | null;

  // For Batch Search Results
  serials?: { serial_number: string; status: string }[];
  current_stock?: number;
}

const STORAGE_KEY = "kosh_tracker_state";
const HISTORY_KEY = "kosh_tracker_history";

export default function TrackerPage() {
  const [tabValue, setTabValue] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [recentSearches, setRecentSearches] = useState<
    { query: string; type: number }[]
  >([]);

  const navigate = useNavigate();

  // --- 1. Persistence & Caching Logic ---

  // Load state on mount
  useEffect(() => {
    try {
      // Restore current view state
      const savedState = sessionStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        setQuery(parsed.query || "");
        setTabValue(parsed.tabValue || 0);
        setResult(parsed.result || null);
      }

      // Restore history
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) {
        setRecentSearches(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("Failed to restore tracker state", e);
    }
  }, []);

  // Save state on change (Current View)
  useEffect(() => {
    const state = { query, tabValue, result };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [query, tabValue, result]);

  // --- 2. Search Handler ---

  const addToHistory = (q: string, t: number) => {
    setRecentSearches((prev) => {
      // Remove duplicate if exists
      const filtered = prev.filter((item) => item.query !== q);
      // Add to top, keep max 5
      const updated = [{ query: q, type: t }, ...filtered].slice(0, 5);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const handleSearch = async (overrideQuery?: string) => {
    const searchQuery = overrideQuery || query;
    if (!searchQuery.trim()) return;

    setLoading(true);
    setResult(null);

    // Update query state if called via history click
    if (overrideQuery) setQuery(overrideQuery);

    try {
      let endpoint = "";
      if (tabValue === 0) {
        endpoint = `/api/batches/trace/serial/${encodeURIComponent(
          searchQuery.trim()
        )}`;
      } else {
        endpoint = `/api/batches/trace/batch/${encodeURIComponent(
          searchQuery.trim()
        )}`;
      }

      const res = await api.get(endpoint);
      if (res.data.status === "success") {
        setResult(res.data.data);
        addToHistory(searchQuery.trim(), tabValue);
      }
    } catch (error: any) {
      console.error("Tracking Error:", error);
      toast.error(error.response?.data?.error || "Item not found");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string = "") => {
    switch (status.toLowerCase()) {
      case "available":
        return "success";
      case "sold":
        return "info";
      case "defective":
        return "error";
      case "in_repair":
        return "warning";
      default:
        return "default";
    }
  };

  // --- Navigation Handlers ---

  const goToProduct = () => {
    const pid = result?.product_id || (result as any)?.id;
    if (pid) navigate(`/product/${pid}`);
    else toast.error("Product ID missing");
  };

  const goToPurchase = () => {
    if (result?.purchase_id) navigate(`/purchase/view/${result.purchase_id}`);
    else if (result?.purchase_ref)
      navigate(`/purchase-history?search=${result.purchase_ref}`);
  };

  // const goToSupplier = () => {
  //   if (result?.supplier_id) navigate(`/viewSupplier/${result.supplier_id}`);
  // };

  const goToSale = () => {
    if (result?.sale?.sale_id) navigate(`/billing/view/${result.sale.sale_id}`);
    else if (result?.sale?.sale_ref)
      navigate(`/sales-history?search=${result.sale.sale_ref}`);
  };

  // const goToCustomer = () => {
  //   if (result?.sale?.customer_id)
  //     navigate(`/customer/${result.sale.customer_id}`);
  // };

  const handleRefresh = () => {
    if (query) handleSearch();
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f6f8" }}>
      {/* 1. Dashboard Header */}
      <Box px={3} pt={3}>
        <DashboardHeader
          title="Product Tracker"
          showDateFilters={false}
          showSearch={false}
          onRefresh={handleRefresh}
        />
      </Box>

      <Box px={3} pb={3}>
        <Grid container spacing={3}>
          {/* --- Search Panel --- */}
          <Grid
            item
            xs={12}
            md={result ? 4 : 12}
            sx={{ transition: "all 0.3s ease" }}
          >
            <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 1, height: "100%" }}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Locate Item
              </Typography>
              <Tabs
                value={tabValue}
                onChange={(_, v) => {
                  setTabValue(v);
                  setResult(null); // Clear result when switching context
                }}
                sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
                variant="fullWidth"
              >
                <Tab icon={<ScanBarcode size={18} />} label="Serial No" />
                <Tab icon={<Package size={18} />} label="Batch No" />
              </Tabs>

              <Stack spacing={2}>
                <TextField
                  fullWidth
                  placeholder={
                    tabValue === 0
                      ? "Enter Serial / IMEI"
                      : "Enter Batch Number"
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  InputProps={{
                    startAdornment: (
                      <Search color="#ccc" style={{ marginRight: 8 }} />
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => handleSearch()}
                  disabled={loading}
                  fullWidth
                  sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Track Item"
                  )}
                </Button>
              </Stack>

              {/* Recent History List */}
              {recentSearches.length > 0 && (
                <Box mt={4}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={1}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color="text.secondary"
                    >
                      RECENT SEARCHES
                    </Typography>
                    <Button
                      size="small"
                      onClick={clearHistory}
                      sx={{ fontSize: "0.7rem", minWidth: "auto" }}
                    >
                      Clear
                    </Button>
                  </Stack>
                  <List dense disablePadding>
                    {recentSearches.map((item, idx) => (
                      <ListItem key={idx} disablePadding sx={{ mb: 1 }}>
                        <ListItemButton
                          onClick={() => {
                            setTabValue(item.type);
                            handleSearch(item.query);
                          }}
                          sx={{
                            bgcolor: "grey.50",
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: "divider",
                            "&:hover": {
                              bgcolor: "primary.50",
                              borderColor: "primary.main",
                            },
                          }}
                        >
                          <Box
                            mr={2}
                            color="text.secondary"
                            display="flex"
                            alignItems="center"
                          >
                            {item.type === 0 ? (
                              <ScanBarcode size={16} />
                            ) : (
                              <Package size={16} />
                            )}
                          </Box>
                          <ListItemText
                            primary={item.query}
                            primaryTypographyProps={{
                              fontWeight: 500,
                              fontSize: "0.9rem",
                            }}
                          />
                          <ArrowRight size={14} color="#999" />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* --- Results Panel --- */}
          {result && (
            <Grid item xs={12} md={8}>
              {/* Product Header Card */}
              <Card
                sx={{
                  mb: 3,
                  borderRadius: 3,
                  borderLeft: "6px solid",
                  borderColor: "primary.main",
                }}
              >
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={700}
                      >
                        PRODUCT FOUND
                      </Typography>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={2}
                        mt={0.5}
                      >
                        <Typography variant="h5" fontWeight={700}>
                          {result.product_name}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          endIcon={<ExternalLink size={14} />}
                          onClick={goToProduct}
                          sx={{ borderRadius: 2, textTransform: "none" }}
                        >
                          View Product
                        </Button>
                      </Stack>
                      <Stack direction="row" spacing={1} mt={1.5}>
                        {result.product_code && (
                          <Chip label={result.product_code} size="small" />
                        )}
                        {result.batch_number && (
                          <Chip
                            label={`Batch: ${result.batch_number}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    </Box>
                    <Box textAlign="right">
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={700}
                      >
                        STATUS
                      </Typography>
                      <Box mt={0.5}>
                        <Chip
                          label={(result.status || "UNKNOWN").toUpperCase()}
                          color={getStatusColor(result.status) as any}
                          sx={{ fontWeight: 800 }}
                        />
                      </Box>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {/* Timeline / Details Grid */}
              <Grid container spacing={3}>
                {/* 1. Origin */}
                <Grid item xs={12} md={6}>
                  <TimelineCard
                    title="Origin / Supplier"
                    icon={<Truck size={20} />}
                    active={!!result.supplier_name}
                  >
                    {result.supplier_name ? (
                      <>
                        <Typography fontWeight={600} variant="h6">
                          {result.supplier_name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          mb={2}
                        >
                          {result.supplier_phone}
                        </Typography>

                        <Divider sx={{ my: 1.5 }} />

                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              PURCHASE REF
                            </Typography>
                            <Typography fontWeight={600}>
                              #{result.purchase_ref}
                            </Typography>
                          </Box>
                          <Button
                            variant="text"
                            size="small"
                            startIcon={<FileText size={16} />}
                            onClick={goToPurchase}
                            disabled={
                              !result.purchase_id && !result.purchase_ref
                            }
                          >
                            Open Bill
                          </Button>
                        </Stack>
                      </>
                    ) : (
                      <Typography color="text.disabled" variant="body2">
                        No supplier linked (Direct Inward)
                      </Typography>
                    )}
                  </TimelineCard>
                </Grid>

                {/* 2. Destination */}
                <Grid item xs={12} md={6}>
                  <TimelineCard
                    title="Destination / Customer"
                    icon={<User size={20} />}
                    active={!!result.sale?.customer_name}
                    color={
                      result.sale?.customer_name
                        ? "success.main"
                        : "text.disabled"
                    }
                  >
                    {result.sale?.customer_name ? (
                      <>
                        <Typography
                          fontWeight={600}
                          variant="h6"
                          color="success.main"
                        >
                          {result.sale.customer_name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          mb={2}
                        >
                          {result.sale.customer_phone}
                        </Typography>

                        <Divider sx={{ my: 1.5 }} />

                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              SALE INVOICE
                            </Typography>
                            <Typography fontWeight={600}>
                              #{result.sale.sale_ref}
                            </Typography>
                          </Box>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<Receipt size={16} />}
                            onClick={goToSale}
                            sx={{ color: "white", boxShadow: 0 }}
                            disabled={
                              !result.sale.sale_id && !result.sale.sale_ref
                            }
                          >
                            View Invoice
                          </Button>
                        </Stack>
                      </>
                    ) : (
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={1}
                        color="text.disabled"
                        py={2}
                      >
                        <AlertCircle size={18} />
                        <Typography variant="body2">
                          Product not yet sold
                        </Typography>
                      </Box>
                    )}
                  </TimelineCard>
                </Grid>

                {/* 3. Inventory Stats */}
                <Grid item xs={12}>
                  <TimelineCard
                    title="Inventory Details"
                    icon={<Package size={20} />}
                    active={true}
                  >
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <DetailBox
                          label="Batch No"
                          value={result.batch_number}
                        />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <DetailBox
                          label="Serial No"
                          value={result.serial_number}
                          highlight
                        />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <DetailBox
                          label="Expiry"
                          value={
                            result.expiry_date
                              ? new Date(
                                  result.expiry_date
                                ).toLocaleDateString()
                              : "N/A"
                          }
                        />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <DetailBox
                          label="MRP"
                          value={result.mrp ? `₹${result.mrp}` : "—"}
                          highlight
                        />
                      </Grid>
                    </Grid>
                  </TimelineCard>
                </Grid>

                {/* 4. Batch Table */}
                {result.serials && result.serials.length > 0 && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, borderRadius: 3 }}>
                      <Typography
                        variant="subtitle2"
                        gutterBottom
                        sx={{ px: 1, fontWeight: 700 }}
                      >
                        All Serials in this Batch ({result.serials.length})
                      </Typography>
                      <TableContainer sx={{ maxHeight: 300 }}>
                        <Table stickyHeader size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>#</TableCell>
                              <TableCell>Serial Number</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {result.serials.map((s, i) => (
                              <TableRow key={i} hover>
                                <TableCell>{i + 1}</TableCell>
                                <TableCell
                                  sx={{
                                    fontFamily: "monospace",
                                    fontWeight: 600,
                                  }}
                                >
                                  {s.serial_number}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={s.status.toUpperCase()}
                                    color={getStatusColor(s.status) as any}
                                    size="small"
                                    variant="outlined"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
}

// --- Helper Components ---
const TimelineCard = ({
  title,
  icon,
  children,
  active,
  color = "primary.main",
}: any) => (
  <Paper
    sx={{
      p: 2.5,
      borderRadius: 3,
      height: "100%",
      borderTop: active ? `4px solid` : "none",
      borderColor: color,
      opacity: active ? 1 : 0.8,
      boxShadow: active ? 2 : 0,
      bgcolor: active ? "white" : "#fafafa",
      transition: "all 0.2s",
      "&:hover": { boxShadow: active ? 4 : 1 },
    }}
  >
    <Stack direction="row" alignItems="center" spacing={1.5} mb={2.5}>
      <Box
        sx={{
          color: active ? color : "text.disabled",
          bgcolor: active ? `${color}15` : "transparent",
          p: 1,
          borderRadius: 2,
        }}
      >
        {icon}
      </Box>
      <Typography
        variant="subtitle2"
        fontWeight={700}
        color={active ? "text.primary" : "text.disabled"}
        sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        {title}
      </Typography>
    </Stack>
    {children}
  </Paper>
);

const DetailBox = ({ label, value, highlight }: any) => (
  <Box sx={{ p: 1.5, bgcolor: "background.default", borderRadius: 2 }}>
    <Typography
      variant="caption"
      color="text.secondary"
      display="block"
      gutterBottom
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      fontWeight={highlight ? 700 : 500}
      color={highlight ? "primary.main" : "text.primary"}
      sx={{ wordBreak: "break-all" }}
    >
      {value || "—"}
    </Typography>
  </Box>
);
