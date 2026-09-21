"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  IconButton,
  CircularProgress,
  LinearProgress,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  TablePagination,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  MessageSquare,
  Send,
  RefreshCw,
  Plus,
  Sparkles,
  CheckCircle2,
  XCircle,
  CheckCheck,
  Search,
  Smartphone,
  BookOpen,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import DashboardHeader from "../components/DashboardHeader";
import { getCustomerInsights, CustomerInsight } from "../lib/api/analyticsService";
import { fetchPendingBillsByCustomer } from "../lib/api/customerService";
import { getShopData } from "../lib/api/shopService";
import { hydrateTemplate, getResolvedShopName } from "../lib/utils/templateRenderer";

const { electron } = window;

export interface EnrichedCustomer {
  id: number;
  name: string;
  phone: string;
  city?: string;
  total_revenue: number;
  order_count: number;
  days_inactive: number;
  last_purchase_date?: string;
  pending_balance: number;
  pending_bills_count: number;
  aov: number;
  segment: "VIP" | "Regular" | "New" | "Dormant";
}

export interface CustomerSegmentRule {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: "primary" | "secondary" | "error" | "warning" | "success" | "info";
  minDaysInactive?: number;
  maxDaysInactive?: number;
  minRevenue?: number;
  minOrders?: number;
  requirePendingBills?: boolean;
  isCustom?: boolean;
}

const DEFAULT_SEGMENTS: CustomerSegmentRule[] = [
  {
    id: "all",
    name: "All Active Customers",
    description: "Every customer with a valid contact phone number",
    icon: "👥",
    color: "primary",
  },
  {
    id: "dormant_30d",
    name: "Dormant / Haven't Visited in 30+ Days",
    description: "Customers who haven't placed an order in over a month",
    icon: "⏰",
    color: "error",
    minDaysInactive: 30,
  },
  {
    id: "high_value",
    name: "High Value / VIP Spenders",
    description: "Top spending customers with lifetime value > ₹25,000",
    icon: "💎",
    color: "warning",
    minRevenue: 25000,
  },
  {
    id: "pending_bills",
    name: "Customers with Pending Dues",
    description: "Customers having unpaid pending bills or ledger balance",
    icon: "⏳",
    color: "info",
    requirePendingBills: true,
  },
  {
    id: "frequent_buyers",
    name: "Frequent Repeat Buyers",
    description: "Loyal customers with 5 or more total orders",
    icon: "🛍️",
    color: "success",
    minOrders: 5,
  },
];

const VARIABLE_HELPER_PILLS = [
  "{{Name}}",
  "{{ShopName}}",
  "{{Total}}",
  "{{PendingAmount}}",
  "{{DaysInactive}}",
  "{{City}}",
];

const SAMPLE_PREVIEW_VARS = {
  Name: "Rahul Sharma",
  CustomerName: "Rahul Sharma",
  ShopName: getResolvedShopName(),
  Total: "12,450.00",
  Amount: "12,450.00",
  PendingAmount: "4,500.00",
  DaysInactive: "45",
  City: "Mumbai",
};

export default function CustomerMessagingPage() {
  const [customers, setCustomers] = useState<EnrichedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopName, setShopName] = useState<string>(getResolvedShopName());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("all");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);

  // Custom Segments loaded from localStorage
  const [customSegments, setCustomSegments] = useState<CustomerSegmentRule[]>([]);
  const [createSegmentOpen, setCreateSegmentOpen] = useState(false);
  const [newSegmentForm, setNewSegmentForm] = useState({
    name: "",
    description: "",
    minDaysInactive: 30,
    minRevenue: 10000,
    minOrders: 3,
    requirePendingBills: false,
  });

  // Re-evaluation Prompt State
  const [refreshPromptOpen, setRefreshPromptOpen] = useState(false);
  const [pendingBroadcastSegment, setPendingBroadcastSegment] = useState<CustomerSegmentRule | null>(null);

  // Message Composition & Broadcast Drawer/Dialog
  const [messagingDialogOpen, setMessagingDialogOpen] = useState(false);
  const [broadcastRecipients, setBroadcastRecipients] = useState<EnrichedCustomer[]>([]);
  const [messageMode, setMessageMode] = useState<"template" | "freehand">("template");
  
  // Available templates from DB / Meta
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [messageBody, setMessageBody] = useState<string>("");

  // Broadcast Execution State
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [sendLogs, setSendLogs] = useState<{ name: string; phone: string; status: "success" | "error"; error?: string }[]>([]);

  // Load custom segments on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("invistock_custom_segments");
      if (saved) {
        setCustomSegments(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to parse custom segments:", e);
    }
  }, []);

  // Combined Segments List
  const allSegments = useMemo(() => {
    return [...DEFAULT_SEGMENTS, ...customSegments];
  }, [customSegments]);

  // Load Customer & Pending Bills Data
  const loadCustomerData = async (showToast: boolean = false) => {
    setLoading(true);
    const toastId = showToast ? toast.loading("Syncing & Updating Customer Data...") : null;

    try {
      // 1. Fetch customer insights (revenue, order counts, days inactive)
      const insightsRes = await getCustomerInsights(30);
      const insightsList: CustomerInsight[] = insightsRes.all || [];

      // 2. Fetch pending bills by customer
      let pendingMap: Record<number, { amount: number; count: number }> = {};
      try {
        const pendingRes = await fetchPendingBillsByCustomer();
        if (pendingRes && pendingRes.customers) {
          pendingRes.customers.forEach((c) => {
            pendingMap[c.customer_id] = {
              amount: c.total_pending_amount || 0,
              count: c.pending_bills_count || 0,
            };
          });
        }
      } catch (e) {
        console.warn("Could not fetch pending bills for messaging:", e);
      }

      // 3. Enrich customers list
      const enriched: EnrichedCustomer[] = insightsList.map((item) => {
        const pInfo = pendingMap[item.id] || { amount: 0, count: 0 };
        return {
          id: item.id,
          name: item.name || "Unnamed Customer",
          phone: item.phone || "",
          total_revenue: item.total_revenue || 0,
          order_count: item.order_count || 0,
          days_inactive: item.days_inactive || 0,
          last_purchase_date: item.last_purchase_date,
          pending_balance: pInfo.amount,
          pending_bills_count: pInfo.count,
          aov: item.aov || 0,
          segment: item.segment || "Regular",
        };
      });

      setCustomers(enriched);

      if (showToast && toastId) {
        toast.success(`Refreshed ${enriched.length} customer records with live balances!`, { id: toastId });
      }
    } catch (e: any) {
      console.error("Failed to load customer data for messaging:", e);
      if (showToast && toastId) {
        toast.error(`Error loading customer data: ${e.message}`, { id: toastId });
      }
    } finally {
      setLoading(false);
    }
  };

  // Load WhatsApp templates from DB / main process
  const loadTemplates = async () => {
    try {
      if (electron?.getWhatsAppTemplates) {
        const res = await electron.getWhatsAppTemplates();
        if (res.success && res.templates) {
          setAvailableTemplates(res.templates);
          if (res.templates.length > 0) {
            setSelectedTemplateId(String(res.templates[0].id));
            setMessageBody(res.templates[0].content);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load WhatsApp templates:", e);
    }
  };

  useEffect(() => {
    getShopData().then((s) => {
      if (s?.shop_name) setShopName(s.shop_name);
    });
    loadCustomerData();
    loadTemplates();
  }, []);

  // Table Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Pre-calculate segment matching customers in a single memoized pass to avoid re-evaluating on every keystroke
  const segmentCounts = useMemo(() => {
    const map: Record<string, EnrichedCustomer[]> = {};
    for (const rule of allSegments) {
      map[rule.id] = customers.filter((c) => {
        if (!c.phone || c.phone.trim().length < 10) return false;

        if (rule.minDaysInactive !== undefined && c.days_inactive < rule.minDaysInactive) {
          return false;
        }
        if (rule.maxDaysInactive !== undefined && c.days_inactive > rule.maxDaysInactive) {
          return false;
        }
        if (rule.minRevenue !== undefined && c.total_revenue < rule.minRevenue) {
          return false;
        }
        if (rule.minOrders !== undefined && c.order_count < rule.minOrders) {
          return false;
        }
        if (rule.requirePendingBills && c.pending_balance <= 0) {
          return false;
        }
        return true;
      });
    }
    return map;
  }, [customers, allSegments]);

  // Filter customers matching a segment rule
  const getSegmentMatchingCustomers = (rule: CustomerSegmentRule) => {
    return segmentCounts[rule.id] || [];
  };

  // Filtered customer table data based on current active tab segment & search string
  const filteredCustomers = useMemo(() => {
    const segmentMatches = segmentCounts[selectedSegmentId] || [];

    if (!searchQuery.trim()) return segmentMatches;

    const q = searchQuery.toLowerCase();
    return segmentMatches.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.city && c.city.toLowerCase().includes(q))
    );
  }, [segmentCounts, selectedSegmentId, searchQuery]);

  // Reset page to 0 on search or segment tab change
  useEffect(() => {
    setPage(0);
  }, [selectedSegmentId, searchQuery]);

  // Paginated customer slice for lag-free DOM rendering
  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredCustomers, page, rowsPerPage]);

  // Master Checkbox Handlers
  const isAllSelected =
    filteredCustomers.length > 0 &&
    filteredCustomers.every((c) => selectedCustomerIds.includes(c.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const visibleIds = filteredCustomers.map((c) => c.id);
      setSelectedCustomerIds(Array.from(new Set([...selectedCustomerIds, ...visibleIds])));
    } else {
      const visibleIds = new Set(filteredCustomers.map((c) => c.id));
      setSelectedCustomerIds(selectedCustomerIds.filter((id) => !visibleIds.has(id)));
    }
  };

  const handleToggleCustomerSelect = (id: number) => {
    if (selectedCustomerIds.includes(id)) {
      setSelectedCustomerIds(selectedCustomerIds.filter((item) => item !== id));
    } else {
      setSelectedCustomerIds([...selectedCustomerIds, id]);
    }
  };

  // Save Custom Segment
  const handleSaveCustomSegment = () => {
    if (!newSegmentForm.name.trim()) {
      toast.error("Segment name is required.");
      return;
    }

    const newRule: CustomerSegmentRule = {
      id: "custom_" + Date.now(),
      name: newSegmentForm.name,
      description: newSegmentForm.description || "Custom filter criteria segment",
      icon: "⚙️",
      color: "info",
      minDaysInactive: newSegmentForm.minDaysInactive > 0 ? newSegmentForm.minDaysInactive : undefined,
      minRevenue: newSegmentForm.minRevenue > 0 ? newSegmentForm.minRevenue : undefined,
      minOrders: newSegmentForm.minOrders > 0 ? newSegmentForm.minOrders : undefined,
      requirePendingBills: newSegmentForm.requirePendingBills,
      isCustom: true,
    };

    const updated = [...customSegments, newRule];
    setCustomSegments(updated);
    localStorage.setItem("invistock_custom_segments", JSON.stringify(updated));
    setCreateSegmentOpen(false);
    setSelectedSegmentId(newRule.id);
    toast.success(`Custom segment "${newRule.name}" created!`);
  };

  const handleDeleteCustomSegment = (segmentId: string) => {
    const updated = customSegments.filter((s) => s.id !== segmentId);
    setCustomSegments(updated);
    localStorage.setItem("invistock_custom_segments", JSON.stringify(updated));
    if (selectedSegmentId === segmentId) setSelectedSegmentId("all");
    toast.success("Custom segment removed.");
  };

  // Broadcast Trigger 1: Segment Broadcast
  const handleInitiateSegmentBroadcast = (rule: CustomerSegmentRule) => {
    setPendingBroadcastSegment(rule);
    setRefreshPromptOpen(true);
  };

  // Response to prompt: Refresh vs Send directly
  const handleConfirmSegmentBroadcast = async (shouldRefresh: boolean) => {
    setRefreshPromptOpen(false);
    if (!pendingBroadcastSegment) return;

    if (shouldRefresh) {
      await loadCustomerData(true);
    }

    const matchingRecipients = getSegmentMatchingCustomers(pendingBroadcastSegment);
    if (matchingRecipients.length === 0) {
      toast.error(`No valid recipients with phone numbers found for segment "${pendingBroadcastSegment.name}".`);
      return;
    }

    setBroadcastRecipients(matchingRecipients);
    setMessagingDialogOpen(true);
  };

  // Broadcast Trigger 2: Selection-Based Freehand Broadcast
  const handleInitiateSelectedBroadcast = () => {
    const selectedList = customers.filter((c) => selectedCustomerIds.includes(c.id));
    const validRecipients = selectedList.filter((c) => c.phone && c.phone.trim().length >= 10);

    if (validRecipients.length === 0) {
      toast.error("Please select at least 1 customer with a valid phone number.");
      return;
    }

    setBroadcastRecipients(validRecipients);
    setMessagingDialogOpen(true);
  };

  // Template Selection Change
  const handleTemplateSelectChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const found = availableTemplates.find((t) => String(t.id) === String(templateId));
    if (found) {
      setMessageBody(found.content);
    }
  };

  // Insert helper placeholder pill into message body
  const handleInsertPlaceholder = (pill: string) => {
    setMessageBody((prev) => prev + " " + pill);
  };

  // Execute Bulk Dispatch
  const handleExecuteBroadcast = async () => {
    if (!messageBody.trim()) {
      toast.error("Message body content cannot be empty.");
      return;
    }

    setIsSending(true);
    setSendProgress(0);
    setSentCount(0);
    setSendLogs([]);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < broadcastRecipients.length; i++) {
      const recipient = broadcastRecipients[i];
      const percent = Math.round(((i + 1) / broadcastRecipients.length) * 100);
      setSendProgress(percent);

      const hydratedMsg = hydrateTemplate(messageBody, {
        Name: recipient.name,
        CustomerName: recipient.name,
        ShopName: getResolvedShopName(shopName),
        Total: (recipient.total_revenue || 0).toLocaleString("en-IN"),
        PendingAmount: (recipient.pending_balance || 0).toLocaleString("en-IN"),
        DaysInactive: String(recipient.days_inactive || 0),
        City: recipient.city || "Valued Customer",
        ...recipient,
      });

      try {
        const res = await electron.sendWhatsAppMessage(recipient.phone, hydratedMsg, "marketing");
        if (res && res.success) {
          successCount++;
          setSendLogs((prev) => [...prev.slice(-99), { name: recipient.name, phone: recipient.phone, status: "success" }]);
        } else {
          failCount++;
          setSendLogs((prev) => [
            ...prev.slice(-99),
            { name: recipient.name, phone: recipient.phone, status: "error", error: res?.error || "Dispatch failed" },
          ]);
        }
      } catch (e: any) {
        failCount++;
        setSendLogs((prev) => [
          ...prev.slice(-99),
          { name: recipient.name, phone: recipient.phone, status: "error", error: e.message },
        ]);
      }

      setSentCount(i + 1);
      // Yield to UI thread & anti-spam rate limiting delay
      await new Promise((res) => setTimeout(res, 350));
    }

    setIsSending(false);

    if (successCount > 0) {
      toast.success(`Successfully dispatched ${successCount} message(s)! (${failCount} failed)`);
    } else {
      toast.error("All dispatch attempts failed. Please check WhatsApp provider status.");
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1440, margin: "0 auto" }}>
      {/* Dashboard Header Bar */}
      <DashboardHeader
        title="Customer Segmentation & WhatsApp Broadcast Center"
        showDateFilters={false}
        showSearch={false}
        onRefresh={() => loadCustomerData(true)}
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setCreateSegmentOpen(true)}
              startIcon={<Plus size={16} />}
              sx={{ fontWeight: 700, borderRadius: "12px", height: 44, textTransform: "none" }}
            >
              Create Custom Segment
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleInitiateSelectedBroadcast}
              disabled={selectedCustomerIds.length === 0}
              startIcon={<Send size={16} />}
              sx={{ fontWeight: 700, borderRadius: "12px", height: 44, px: 2.5, textTransform: "none" }}
            >
              Message Selected ({selectedCustomerIds.length})
            </Button>
          </Stack>
        }
      />

      {/* --- SEGMENTS CAROUSEL / GRID OVERVIEW --- */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5, display: "block", mb: 1.5 }}>
          TARGET CUSTOMER SEGMENTS
        </Typography>

        <Grid container spacing={2}>
          {allSegments.map((rule) => {
            const matches = getSegmentMatchingCustomers(rule);
            const isSelected = selectedSegmentId === rule.id;

            return (
              <Grid item xs={12} sm={6} md={4} lg={2.4} key={rule.id}>
                <Paper
                  elevation={0}
                  onClick={() => setSelectedSegmentId(rule.id)}
                  sx={{
                    p: 2,
                    borderRadius: "16px",
                    cursor: "pointer",
                    border: "2px solid",
                    borderColor: isSelected ? "primary.main" : "divider",
                    bgcolor: isSelected ? "primary.50" : "background.paper",
                    transition: "all 0.2s",
                    position: "relative",
                    "&:hover": { borderColor: "primary.main", transform: "translateY(-2px)" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="h6">{rule.icon}</Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Chip
                        label={`${matches.length} Customers`}
                        color={rule.color}
                        size="small"
                        sx={{ fontWeight: 800, fontSize: "0.72rem", height: 22 }}
                      />
                      {rule.isCustom && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomSegment(rule.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      )}
                    </Stack>
                  </Box>

                  <Typography fontWeight={700} variant="subtitle2" sx={{ lineHeight: 1.3, mb: 0.5 }}>
                    {rule.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 32 }}>
                    {rule.description}
                  </Typography>

                  <Button
                    fullWidth
                    size="small"
                    variant={isSelected ? "contained" : "outlined"}
                    color="primary"
                    startIcon={<Send size={14} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInitiateSegmentBroadcast(rule);
                    }}
                    sx={{ mt: 1.5, borderRadius: "10px", fontWeight: 700, textTransform: "none", py: 0.6 }}
                  >
                    Broadcast Segment
                  </Button>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* --- MASTER CUSTOMERS TABLE & SELECTION PANEL --- */}
      <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
        {/* Table Header Bar */}
        <Box sx={{ p: 2, bgcolor: "grey.50", borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="subtitle1" fontWeight={800}>
              Filtered Customer List ({filteredCustomers.length})
            </Typography>

            {selectedCustomerIds.length > 0 && (
              <Chip
                label={`${selectedCustomerIds.length} Selected`}
                color="primary"
                onDelete={() => setSelectedCustomerIds([])}
                sx={{ fontWeight: 800 }}
              />
            )}
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Search by customer name, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search size={16} style={{ marginRight: 8, color: "#888" }} />,
              }}
              sx={{ width: 300, "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "background.paper" } }}
            />

            <Button
              variant="outlined"
              size="small"
              onClick={() => loadCustomerData(true)}
              startIcon={<RefreshCw size={14} />}
              sx={{ fontWeight: 700, borderRadius: "10px", height: 40 }}
            >
              Sync Balances
            </Button>
          </Stack>
        </Box>

        {/* Customer Table */}
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table stickyHeader size="medium">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 800, bgcolor: "grey.100" } }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={
                      selectedCustomerIds.length > 0 && !isAllSelected
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell>Customer Name</TableCell>
                <TableCell>Phone Number</TableCell>
                <TableCell align="right">Lifetime Value</TableCell>
                <TableCell align="center">Orders</TableCell>
                <TableCell align="right">Days Inactive</TableCell>
                <TableCell align="right">Pending Balance</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={30} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Loading customer segment records...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      No customers match the current filter or search criteria.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((c) => {
                  const isChecked = selectedCustomerIds.includes(c.id);

                  return (
                    <TableRow key={c.id} hover selected={isChecked}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isChecked}
                          onChange={() => handleToggleCustomerSelect(c.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={700} variant="body2">
                          {c.name}
                        </Typography>
                        {c.city && (
                          <Typography variant="caption" color="text.secondary">
                            📍 {c.city}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                        {c.phone || "—"}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={700} variant="body2">
                          ₹{(c.total_revenue || 0).toLocaleString("en-IN")}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={c.order_count || 0} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{
                            color: c.days_inactive >= 60 ? "error.main" : c.days_inactive >= 30 ? "warning.main" : "text.primary",
                            fontWeight: c.days_inactive >= 30 ? 700 : 400,
                          }}
                        >
                          {c.days_inactive} days ago
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {c.pending_balance > 0 ? (
                          <Chip
                            label={`₹${c.pending_balance.toLocaleString("en-IN")}`}
                            color="error"
                            size="small"
                            sx={{ fontWeight: 800 }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            ₹0.00
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<Send size={12} />}
                          onClick={() => {
                            setBroadcastRecipients([c]);
                            setMessagingDialogOpen(true);
                          }}
                          sx={{ borderRadius: "8px", fontWeight: 700, textTransform: "none" }}
                        >
                          Send
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[25, 50, 100, 250]}
          component="div"
          count={filteredCustomers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          sx={{ borderTop: "1px solid", borderColor: "divider" }}
        />
      </Paper>

      {/* ============================================================ */}
      {/* MODAL 1: REFRESH / RE-EVALUATE CONFIRMATION PROMPT           */}
      {/* ============================================================ */}
      <Dialog
        open={refreshPromptOpen}
        onClose={() => setRefreshPromptOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          🔄 Update Customer List Before Sending?
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" paragraph>
            Would you like to refresh and re-evaluate the customer list for <strong>{pendingBroadcastSegment?.name}</strong> from the database before launching this broadcast?
          </Typography>
          <Alert severity="info" sx={{ borderRadius: "10px" }}>
            Refreshing ensures new invoices, recent payments, and updated balances are accurately reflected.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
          <Button
            variant="outlined"
            onClick={() => handleConfirmSegmentBroadcast(false)}
            sx={{ fontWeight: 700, textTransform: "none" }}
          >
            ⚡ Send to Current List
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleConfirmSegmentBroadcast(true)}
            startIcon={<RefreshCw size={14} />}
            sx={{ fontWeight: 700, textTransform: "none" }}
          >
            🔄 Refresh & Send
          </Button>
        </DialogActions>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL 2: CREATE CUSTOM SEGMENT DIALOG                        */}
      {/* ============================================================ */}
      <Dialog
        open={createSegmentOpen}
        onClose={() => setCreateSegmentOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          ✨ Create Custom Customer Segment
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <TextField
              label="Segment Name"
              fullWidth
              size="small"
              placeholder="e.g. Overdue High Spenders"
              value={newSegmentForm.name}
              onChange={(e) => setNewSegmentForm({ ...newSegmentForm, name: e.target.value })}
            />

            <TextField
              label="Description"
              fullWidth
              size="small"
              placeholder="e.g. Customers with >₹50,000 revenue and pending balance"
              value={newSegmentForm.description}
              onChange={(e) => setNewSegmentForm({ ...newSegmentForm, description: e.target.value })}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Min Days Inactive (Days Ago)"
                  type="number"
                  fullWidth
                  size="small"
                  value={newSegmentForm.minDaysInactive}
                  onChange={(e) => setNewSegmentForm({ ...newSegmentForm, minDaysInactive: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Min Lifetime Revenue (₹)"
                  type="number"
                  fullWidth
                  size="small"
                  value={newSegmentForm.minRevenue}
                  onChange={(e) => setNewSegmentForm({ ...newSegmentForm, minRevenue: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Min Orders Count"
                  type="number"
                  fullWidth
                  size="small"
                  value={newSegmentForm.minOrders}
                  onChange={(e) => setNewSegmentForm({ ...newSegmentForm, minOrders: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Pending Bills Required?</InputLabel>
                  <Select
                    value={newSegmentForm.requirePendingBills ? "yes" : "no"}
                    label="Pending Bills Required?"
                    onChange={(e) => setNewSegmentForm({ ...newSegmentForm, requirePendingBills: e.target.value === "yes" })}
                  >
                    <MenuItem value="no">No (Any Balance)</MenuItem>
                    <MenuItem value="yes">Yes (Must have Unpaid Dues)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateSegmentOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" color="primary" onClick={handleSaveCustomSegment} sx={{ fontWeight: 700 }}>
            Save Segment
          </Button>
        </DialogActions>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL 3: MESSAGE COMPOSITION & BULK BROADCAST DIALOG         */}
      {/* ============================================================ */}
      <Dialog
        open={messagingDialogOpen}
        onClose={() => (!isSending ? setMessagingDialogOpen(false) : undefined)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <MessageSquare color="#25D366" />
            <Typography variant="h6" fontWeight={800}>
              Broadcast to {broadcastRecipients.length} Recipient{broadcastRecipients.length !== 1 ? "s" : ""}
            </Typography>
          </Stack>
          {!isSending && (
            <IconButton size="small" onClick={() => setMessagingDialogOpen(false)}>
              <XCircle size={20} />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent dividers>
          {isSending ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                Dispatching Messages... ({sentCount} / {broadcastRecipients.length})
              </Typography>
              <LinearProgress variant="determinate" value={sendProgress} sx={{ height: 10, borderRadius: 5, my: 2 }} />

              <Paper variant="outlined" sx={{ p: 2, maxH: 220, overflowY: "auto", bgcolor: "grey.50", textAlign: "left", mt: 3, borderRadius: "12px" }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" sx={{ mb: 1 }}>
                  LIVE DISPATCH LOG
                </Typography>
                {sendLogs.map((log, idx) => (
                  <Box key={idx} sx={{ display: "flex", justifyContent: "space-between", py: 0.5, borderBottom: "1px border-divider" }}>
                    <Typography variant="body2">
                      {log.name} ({log.phone})
                    </Typography>
                    {log.status === "success" ? (
                      <Chip label="SENT" color="success" size="small" sx={{ height: 20, fontSize: "0.65rem" }} />
                    ) : (
                      <Chip label={`FAILED: ${log.error}`} color="error" size="small" sx={{ height: 20, fontSize: "0.65rem" }} />
                    )}
                  </Box>
                ))}
              </Paper>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {/* Left Column: Form & Mode Controls */}
              <Grid item xs={12} md={7}>
                <Stack spacing={2.5}>
                  {/* Mode Switcher */}
                  <Paper variant="outlined" sx={{ p: 0.5, borderRadius: "12px", display: "flex", gap: 0.5, bgcolor: "grey.50" }}>
                    <Button
                      fullWidth
                      size="small"
                      variant={messageMode === "template" ? "contained" : "text"}
                      onClick={() => setMessageMode("template")}
                      startIcon={<BookOpen size={16} />}
                      sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px" }}
                    >
                      Registered Template
                    </Button>
                    <Button
                      fullWidth
                      size="small"
                      variant={messageMode === "freehand" ? "contained" : "text"}
                      onClick={() => setMessageMode("freehand")}
                      startIcon={<Sparkles size={16} />}
                      sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px" }}
                    >
                      Freehand Custom Copy
                    </Button>
                  </Paper>

                  {messageMode === "template" && (
                    <FormControl fullWidth size="small">
                      <InputLabel>Select Registered Template</InputLabel>
                      <Select
                        value={selectedTemplateId}
                        label="Select Registered Template"
                        onChange={(e) => handleTemplateSelectChange(e.target.value)}
                        sx={{ borderRadius: "10px" }}
                      >
                        {availableTemplates.map((t) => (
                          <MenuItem key={t.id} value={String(t.id)}>
                            {t.name} ({t.category?.toUpperCase()})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  <Box>
                    <Typography variant="caption" fontWeight={700} sx={{ mb: 1, display: "block" }}>
                      Click to Insert Placeholders:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                      {VARIABLE_HELPER_PILLS.map((pill) => (
                        <Chip
                          key={pill}
                          label={`+ ${pill}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                          onClick={() => handleInsertPlaceholder(pill)}
                          sx={{ cursor: "pointer", fontWeight: 700 }}
                        />
                      ))}
                    </Stack>
                  </Box>

                  <TextField
                    label="Message Body"
                    multiline
                    rows={6}
                    fullWidth
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Enter message template text here..."
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                  />
                </Stack>
              </Grid>

              {/* Right Column: Live Phone Mockup Preview */}
              <Grid item xs={12} md={5}>
                <Paper elevation={4} sx={{ borderRadius: "24px", overflow: "hidden", border: "10px solid #1f2937", bgcolor: "#efeae2", height: "100%", display: "flex", flexDirection: "column" }}>
                  {/* WhatsApp Header */}
                  <Box sx={{ bgcolor: "#075e54", color: "white", px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: "50%", bgcolor: "#128c7e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                      K
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="subtitle2" fontWeight={700} color="white">
                          {shopName || "Kosh Store"}
                        </Typography>
                        <CheckCircle2 size={14} color="#25D366" fill="#25D366" />
                      </Stack>
                      <Typography variant="caption" sx={{ color: "#e0f2f1", fontSize: "0.65rem" }}>
                        Official WhatsApp Business
                      </Typography>
                    </Box>
                    <Smartphone size={18} color="white" />
                  </Box>

                  {/* WhatsApp Canvas */}
                  <Box sx={{ p: 2, flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", minHeight: 280 }}>
                    <Paper elevation={1} sx={{ p: 2, borderRadius: "14px 14px 14px 2px", bgcolor: "#ffffff", maxWidth: "95%", alignSelf: "flex-start" }}>
                      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", fontSize: "0.85rem", color: "#111827", lineHeight: 1.45 }}>
                        {hydrateTemplate(
                          messageBody,
                          broadcastRecipients[0]
                            ? {
                                Name: broadcastRecipients[0].name,
                                CustomerName: broadcastRecipients[0].name,
                                ShopName: getResolvedShopName(shopName),
                                Total: (broadcastRecipients[0].total_revenue || 0).toLocaleString("en-IN"),
                                PendingAmount: (broadcastRecipients[0].pending_balance || 0).toLocaleString("en-IN"),
                                DaysInactive: String(broadcastRecipients[0].days_inactive || 0),
                                City: broadcastRecipients[0].city || "Mumbai",
                              }
                            : SAMPLE_PREVIEW_VARS
                        )}
                      </Typography>
                      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 0.5, mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                          12:00 PM
                        </Typography>
                        <CheckCheck size={14} color="#34b7f1" />
                      </Box>
                    </Paper>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setMessagingDialogOpen(false)} color="inherit" disabled={isSending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleExecuteBroadcast}
            disabled={isSending || broadcastRecipients.length === 0}
            startIcon={<Send size={16} />}
            sx={{ fontWeight: 700, borderRadius: "10px", px: 3 }}
          >
            {isSending ? "Dispatching..." : `Send to ${broadcastRecipients.length} Recipient(s)`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
