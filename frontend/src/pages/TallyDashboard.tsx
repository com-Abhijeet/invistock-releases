"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  Stack,
  CircularProgress,
  useTheme,
  Alert,
  AlertTitle,
  LinearProgress,
  Chip,
  Divider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Database,
  Trash2,
  BookOpen,
  Wrench,
  Info,
  UserCircle,
  Truck,
  ShoppingCart,
  CreditCard,
  Receipt,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getTallySettings,
  saveTallySettings,
  getTallyStatus,
  runManualSync,
  resetSyncQueue,
  retrySpecificSync,
  retryAllFailedSync,
  autoCreateLedgers,
  autoCreateItems,
  TallySettings,
  TallyStatus,
  pauseSync,
  resumeSync,
  stopSync,
} from "../lib/api/tallyService";
import DashboardHeader from "../components/DashboardHeader";
import { DataCard as StatCard } from "../components/DataCard";
import TallySetupGuide from "../components/TallySetupGuide";

// --- INTELLIGENT ERROR TRANSLATOR ---
const getHumanReadableError = (rawError: string, _type: string) => {
  const errorLower = rawError.toLowerCase();

  if (errorLower.includes("does not exist") || errorLower.includes("ledger")) {
    const match = rawError.match(/['"]([^'"]+)['"]/);
    const ledgerName = match ? match[1] : null;
    return {
      title: "Missing Tally Ledger",
      detail: ledgerName 
        ? `Tally rejected this because the ledger "${ledgerName}" is missing.`
        : `Tally rejected this because a ledger is missing. Tally says: "${rawError}"`,
      fix: ledgerName
        ? `Open Tally > Create Ledger > Name it exactly "${ledgerName}". (Or fix the spelling in Kosh Ledger Config).`
        : `Check the error above to see which ledger is missing. Then use the 'Auto-Create Ledgers' button in the config tab.`,
      severity: "error",
    };
  }

  if (
    errorLower.includes("date is missing") ||
    errorLower.includes("out of range")
  ) {
    return {
      title: "Educational Mode Restriction",
      detail: "Tally rejected the date on this voucher.",
      fix: "If you are using Tally Educational Mode, it only accepts the 1st, 2nd, or 31st of the month.",
      severity: "warning",
    };
  }

  if (errorLower.includes("silent failure") || errorLower.includes("balance")) {
    return {
      title: "Mathematical Mismatch",
      detail:
        "Tally rejected this bill because Debits and Credits don't equal zero (usually a fractional rounding issue).",
      fix: "Ensure you have created the 'Round Off' ledger in Tally and mapped it in Kosh settings.",
      severity: "error",
    };
  }

  if (errorLower.includes("master")) {
    return {
      title: "Master Sync Failed",
      detail: "Failed to create this customer/supplier in Tally.",
      fix: "Ensure Tally is open and ODBC port is configured to 9000.",
      severity: "warning",
    };
  }

  return {
    title: "Validation Error",
    detail: rawError,
    fix: "Review this record in Kosh and try syncing again.",
    severity: "info",
  };
};

// --- HELPER FOR ICONS ---
const getEntityIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "customer":
      return <UserCircle size={16} />;
    case "supplier":
      return <Truck size={16} />;
    case "sale":
      return <ShoppingCart size={16} />;
    case "purchase":
      return <Receipt size={16} />;
    case "transaction":
      return <CreditCard size={16} />;
    default:
      return <Database size={16} />;
  }
};

export default function TallyDashboard() {
  const theme = useTheme();
  const navigate = useNavigate();

  const getNavUrl = (entityType: string, id: number) => {
    switch (entityType.toLowerCase()) {
      case "sale": return `/view-sales-order/${id}`;
      case "purchase": return `/purchase-history`;
      case "transaction": return `/transactions`;
      case "expense": return `/expenses`;
      case "product": case "item": return `/product/${id}`;
      case "customer": return `/customer/${id}`;
      case "supplier": return `/viewSupplier/${id}`;
      default: return null;
    }
  };
  const [isPaused, setIsPaused] = useState(false);

  const handlePauseSync = async () => {
    try {
      await pauseSync();
      setIsPaused(true);
      toast.success("Sync paused");
    } catch (e) {
      toast.error("Failed to pause sync");
    }
  };

  const handleResumeSync = async () => {
    try {
      await resumeSync();
      setIsPaused(false);
      toast.success("Sync resumed");
    } catch (e) {
      toast.error("Failed to resume sync");
    }
  };

  const handleStopSync = async () => {
    try {
      await stopSync();
      setIsSyncing(false);
      setIsPaused(false);
      toast.success("Sync stopped");
    } catch (e) {
      toast.error("Failed to stop sync");
    }
  };

  const [activeTab, setActiveTab] = useState(0);
  const [errorTab, setErrorTab] = useState("all");
  const [loading, setLoading] = useState(true);

  const handleRetryAllSync = async () => {
    try {
      await retryAllFailedSync();
      toast.success("All failed records queued for retry.");
      await fetchData();
      handleRunSync();
    } catch (e) {
      toast.error("Failed to queue records");
    }
  };
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingLedgers, setIsCreatingLedgers] = useState(false);
  const [isCreatingItems, setIsCreatingItems] = useState(false);

  const [settings, setSettings] = useState<TallySettings>({
    tally_url: "http://localhost:9000",
    company_name: "My_company",
    sync_mode: "itemized",
    educational_mode: true,
    sales_ledger: "Sales Account",
    purchase_ledger: "Purchase Account",
    cash_ledger: "Cash",
    bank_ledger: "Bank Account",
    cgst_ledger: "CGST",
    sgst_ledger: "SGST",
    igst_ledger: "IGST",
    discount_ledger: "Discount Allow",
    round_off_ledger: "Round Off",
  });

  const [status, setStatus] = useState<TallyStatus>({
    stats: { pending: 0, failed: 0, synced: 0 },
    recentFailed: [],
    breakdown: [],
  });

  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncProgress, setSyncProgress] = useState<{current: number, total: number, item: string}>({current: 0, total: 0, item: ""});
  const [showConsole, setShowConsole] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSyncing) {
      interval = setInterval(() => {
        fetchData(false);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isSyncing]);

  useEffect(() => {
    const eventSource = new EventSource("http://localhost:5000/api/tally/stream");
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'log') {
          setSyncLogs((prev) => [...prev, data.message]);
        } else if (data.type === 'progress') {
          setSyncProgress({ current: data.current, total: data.total, item: data.item });
        } else if (data.type === 'complete') {
          setIsSyncing(false);
          fetchData(false);
        }
      } catch (e) {}
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [settingsRes, statusRes] = await Promise.all([
        getTallySettings(),
        getTallyStatus(),
      ]);
      if (settingsRes) setSettings(settingsRes);
      if (statusRes) setStatus(statusRes);
    } catch (error: any) {
      if (showLoading) toast.error("Failed to load Tally data");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadId = toast.loading("Saving configuration...");
    try {
      const msg = await saveTallySettings(settings);
      toast.success(msg || "Settings saved!", { id: loadId });
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings", { id: loadId });
    }
  };

  const handleRunSync = async () => {
    setIsSyncing(true);
    setSyncLogs([]);
    setSyncProgress({ current: 0, total: 0, item: "" });
    const loadId = toast.loading("Communicating with Tally Engine...");
    try {
      const res = await runManualSync();
      toast.success(res.details || "Sync completed successfully!", {
        id: loadId,
      });
      await fetchData(false);
    } catch (error: any) {
      toast.error(error.message || "Sync failed. Ensure Tally is open.", {
        id: loadId,
      });
    } finally {
      setIsSyncing(false);
    }
  };



  const handleAutoCreateLedgers = async () => {
    if (!window.confirm("This will automatically create all mapped ledgers in your Tally company. Make sure Tally is open. Continue?")) return;
    setIsCreatingLedgers(true);
    setIsSyncing(true); // Enable progress bar
    setSyncLogs([]);
    setSyncProgress({ current: 0, total: 0, item: "" });
    const loadId = toast.loading("Creating ledgers in Tally...");
    try {
      const res = await autoCreateLedgers();
      if (res.success) {
        toast.success(res.message, { id: loadId });
      } else {
        toast.error(res.message, { id: loadId });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create ledgers", { id: loadId });
    } finally {
      setIsCreatingLedgers(false);
      setIsSyncing(false); // Stop progress bar
    }
  };

  const handleAutoCreateItems = async () => {
    if (!window.confirm("This will automatically create all missing Stock Items and Units in your Tally company. Continue?")) return;
    setIsCreatingItems(true);
    setIsSyncing(true);
    setSyncLogs([]);
    setSyncProgress({ current: 0, total: 0, item: "" });
    const loadId = toast.loading("Creating stock items in Tally...");
    try {
      const res = await autoCreateItems();
      if (res.success) {
        toast.success(res.message, { id: loadId });
      } else {
        toast.error(res.message, { id: loadId });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create items", { id: loadId });
    } finally {
      setIsCreatingItems(false);
      setIsSyncing(false);
    }
  };

  const handleResetQueue = async () => {
    if (
      !window.confirm(
        "Are you sure? This will force Kosh to re-scan all data to find missing items in Tally.",
      )
    )
      return;
    const loadId = toast.loading("Resetting sync engine...");
    try {
      const msg = await resetSyncQueue();
      toast.success(msg, { id: loadId });
      await fetchData();
    } catch (error: any) {
      toast.error("Failed to reset queue", { id: loadId });
    }
  };

  const handleSettingChange = (field: keyof TallySettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      p={2}
      pt={3}
      sx={{ bgcolor: theme.palette.background.default, minHeight: "100vh" }}
    >
      <DashboardHeader
        title="Tally Prime Integration"
        showSearch={false}
        showDateFilters={false}
        actions={
          <Button
            variant="contained"
            color="primary"
            startIcon={
              <RefreshCw
                size={18}
                className={isSyncing ? "animate-spin" : ""}
              />
            }
            onClick={handleRunSync}
            disabled={isSyncing}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
        }
      />

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={activeTab} onChange={(_e, val) => setActiveTab(val)}>
          <Tab
            label="Sync Dashboard"
            icon={<Database size={18} />}
            iconPosition="start"
          />
          <Tab
            label="Ledger Configuration"
            icon={<Settings size={18} />}
            iconPosition="start"
          />
          <Tab
            label="Setup Guide"
            icon={<BookOpen size={18} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* --- TAB 0: DASHBOARD & SYNC --- */}
      {activeTab === 0 && (
        <Box>
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} md={4}>
              <StatCard
                title="Pending Operations"
                value={status.stats.pending}
                subtext="Waiting to be pushed"
                icon={<Database size={24} />}
                color={theme.palette.info.main}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard
                title="Requires Attention"
                value={status.stats.failed}
                subtext="Errors needing fixes"
                icon={<AlertTriangle size={24} />}
                color={theme.palette.error.main}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard
                title="Successfully Synced"
                value={status.stats.synced}
                subtext="Securely in Tally"
                icon={<CheckCircle size={24} />}
                color={theme.palette.success.main}
              />
            </Grid>
          </Grid>

          {/* Sync Controller Card */}
          <Card
            variant="outlined"
            sx={{
              mb: 4,
              borderRadius: 3,
              p: 1,
              borderColor: isSyncing ? theme.palette.primary.main : "divider",
              transition: "0.3s",
            }}
          >
            {isSyncing && syncProgress.total > 0 && (
              <Box sx={{ width: '100%', mb: 2, px: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Syncing: {syncProgress.item}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {syncProgress.current} / {syncProgress.total} ({Math.round((syncProgress.current / syncProgress.total) * 100)}%)
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(syncProgress.current / syncProgress.total) * 100} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            )}
            <CardContent sx={{ textAlign: "center", py: 4 }}>
              <Typography
                variant="h5"
                fontWeight="bold"
                gutterBottom
                color={isSyncing ? "primary.main" : "text.primary"}
              >
                {isSyncing ? "Pushing Data to Tally..." : "Ready to Sync"}
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                mb={3}
                maxWidth={600}
                mx="auto"
              >
                {isSyncing
                  ? "Please keep Tally Prime open and do not close this window. Kosh is currently writing vouchers into your company."
                  : "Kosh will securely transfer your newly created sales, purchases, and ledgers directly into your active Tally company."}
              </Typography>

              {/* Pending Breakdown Chips */}
              {!isSyncing && status.breakdown.length > 0 && (
                <Box
                  mb={4}
                  display="flex"
                  justifyContent="center"
                  flexWrap="wrap"
                  gap={1}
                >
                  {status.breakdown.map((b, i) => (
                    <Chip
                      key={i}
                      icon={getEntityIcon(b.entity_type)}
                      label={`${b.total} ${b.entity_type}(s) pending`}
                      variant="outlined"
                      color="primary"
                    />
                  ))}
                </Box>
              )}

              <Stack direction="row" spacing={2} justifyContent="center" mb={3}>
                {!isSyncing ? (
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleRunSync}
                    startIcon={<RefreshCw />}
                    sx={{ px: 4, py: 1.5, borderRadius: 2 }}
                  >
                    Start Full Sync
                  </Button>
                ) : (
                  <>
                    {!isPaused ? (
                      <Button
                        variant="contained"
                        color="warning"
                        size="large"
                        onClick={handlePauseSync}
                        sx={{ px: 3, py: 1.5, borderRadius: 2 }}
                      >
                        Pause
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        color="success"
                        size="large"
                        onClick={handleResumeSync}
                        sx={{ px: 3, py: 1.5, borderRadius: 2 }}
                      >
                        Resume
                      </Button>
                    )}
                    <Button
                      variant="contained"
                      color="error"
                      size="large"
                      onClick={handleStopSync}
                      sx={{ px: 3, py: 1.5, borderRadius: 2 }}
                    >
                      Cancel
                    </Button>
                  </>
                )}
                
                <Button
                  variant="outlined"
                  size="large"
                  color="inherit"
                  onClick={handleResetQueue}
                  disabled={isSyncing}
                  startIcon={<Trash2 />}
                  sx={{ borderRadius: 2 }}
                >
                  Re-Scan Database
                </Button>
                <Button
                  variant="text"
                  color="secondary"
                  onClick={() => setShowConsole(!showConsole)}
                >
                  {showConsole ? "Hide Console" : "Show Console"}
                </Button>
              </Stack>

              {showConsole && (
                <Box 
                  sx={{ 
                    mt: 3, 
                    p: 2, 
                    bgcolor: '#1e1e1e', 
                    color: '#00ff00', 
                    fontFamily: 'monospace', 
                    borderRadius: 2, 
                    textAlign: 'left',
                    maxHeight: 300,
                    overflowY: 'auto'
                  }}
                >
                  {syncLogs.length === 0 ? (
                    <Typography variant="body2" sx={{ opacity: 0.5 }}>No logs available yet...</Typography>
                  ) : (
                    syncLogs.map((log, idx) => (
                      <Typography key={idx} variant="body2" sx={{ fontSize: '0.85rem', mb: 0.5 }}>
                        {log}
                      </Typography>
                    ))
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Intelligent Error Log */}
          {status.recentFailed.length > 0 && (
            <Box mb={4}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color="error.main"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <AlertTriangle size={24} /> Actions Required (
                  {status.recentFailed.length})
                </Typography>
                <Button variant="contained" color="primary" onClick={handleRetryAllSync} startIcon={<RefreshCw size={18} />}>
                  Retry All Failed
                </Button>
              </Box>

              <Tabs value={errorTab} onChange={(_e, val) => setErrorTab(val)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
                <Tab label="All" value="all" />
                <Tab label="Sales" value="sale" />
                <Tab label="Purchases" value="purchase" />
                <Tab label="Products" value="product" />
                <Tab label="Customers" value="customer" />
                <Tab label="Transactions" value="transaction" />
              </Tabs>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: theme.palette.action.hover }}>
                    <TableRow>
                      <TableCell width="20%"><strong>Entity</strong></TableCell>
                      <TableCell width="35%"><strong>Issue</strong></TableCell>
                      <TableCell width="30%"><strong>How to Fix</strong></TableCell>
                      <TableCell width="15%" align="center"><strong>Action</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {status.recentFailed
                      .filter(err => errorTab === "all" || err.entity_type === errorTab)
                      .map((err, idx) => {
                      const humanError = getHumanReadableError(
                        err.error_log,
                        err.entity_type,
                      );
                      return (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                              <Chip
                                size="small"
                                icon={getEntityIcon(err.entity_type)}
                                label={err.entity_type.toUpperCase()}
                                sx={{ borderRadius: 1, fontWeight: "bold" }}
                              />
                              <Chip
                                size="small"
                                label={err.action_type}
                                variant="outlined"
                                sx={{ borderRadius: 1 }}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              ID: #{err.entity_id}
                            </Typography>
                          </TableCell>
                          
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold" color="error.main">
                              {humanError.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {humanError.detail}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="caption" color="text.primary" sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                              <Wrench size={14} style={{ marginTop: 2, flexShrink: 0 }} color={theme.palette.primary.main} />
                              {humanError.fix}
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            <Stack direction="column" spacing={1}>
                              {getNavUrl(err.entity_type, err.entity_id) && (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="secondary"
                                  onClick={() => navigate(getNavUrl(err.entity_type, err.entity_id)!)}
                                  startIcon={<ExternalLink size={14} />}
                                >
                                  View Item
                                </Button>
                              )}
                              <Button
                                variant="contained"
                                size="small"
                                color="primary"
                                onClick={async () => {
                                  try {
                                    await retrySpecificSync(err.entity_type, err.entity_id);
                                    toast.success("Record queued for retry.");
                                    await fetchData();
                                    handleRunSync();
                                  } catch (e) {
                                    toast.error("Failed to queue record");
                                  }
                                }}
                              >
                                Retry Sync
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      )}

      {/* --- TAB 1: LEDGER CONFIGURATION --- */}
      {activeTab === 1 && (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <form onSubmit={handleSaveSettings}>
            <CardContent sx={{ p: 4 }}>
              <Alert
                severity="info"
                icon={<Info />}
                sx={{ mb: 4, borderRadius: 2 }}
              >
                <AlertTitle>Exact Mapping Required</AlertTitle>
                The ledger names below <strong>MUST perfectly match</strong> the
                spelling of the ledgers you have created inside your Tally
                Company. Tally is case-insensitive but sensitive to spaces!
              </Alert>

              <Typography
                variant="subtitle2"
                color="primary"
                fontWeight="bold"
                sx={{
                  mb: 2,
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Settings size={16} /> Connection Settings
              </Typography>
              <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Tally Localhost URL"
                    value={settings.tally_url}
                    onChange={(e) =>
                      handleSettingChange("tally_url", e.target.value)
                    }
                    helperText="Default is http://localhost:9000. Ensure Tally F12 ODBC is enabled."
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Tally Company Name"
                    value={settings.company_name || ""}
                    onChange={(e) =>
                      handleSettingChange("company_name", e.target.value)
                    }
                    helperText="Name of your active company in Tally (e.g., Kosh Enterprises)."
                  />
                </Grid>
                
                <Grid item xs={12} md={12}>
                  <FormControl component="fieldset" sx={{ mt: 2, mb: 1 }}>
                    <FormLabel component="legend" sx={{ fontWeight: 'bold' }}>Tally Sync Mode</FormLabel>
                    <RadioGroup
                      row
                      value={settings.sync_mode || 'itemized'}
                      onChange={(e) => handleSettingChange('sync_mode', e.target.value)}
                    >
                      <FormControlLabel value="accounting" control={<Radio />} label="Accounting View (Financials & Ledgers only)" />
                      <FormControlLabel value="itemized" control={<Radio />} label="Itemized View (Detailed products, qty, and rates)" />
                    </RadioGroup>
                  </FormControl>
                  
                  <Box mt={1} display="flex" alignItems="center">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.educational_mode === 1 || settings.educational_mode === true || settings.educational_mode === '1'}
                          onChange={(e) => handleSettingChange('educational_mode', e.target.checked ? 1 : 0)}
                          color="primary"
                        />
                      }
                      label="Educational Mode Compatibility"
                    />
                    <Typography variant="caption" color="text.secondary">
                      (Forces all voucher dates to the 1st of the month so Educational Tally won't reject them)
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 4 }} />

              <Typography
                variant="subtitle2"
                color="primary"
                fontWeight="bold"
                sx={{
                  mb: 2,
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <BookOpen size={16} /> Master Ledger Mapping
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Primary Sales A/C"
                    value={settings.sales_ledger}
                    onChange={(e) =>
                      handleSettingChange("sales_ledger", e.target.value)
                    }
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Primary Purchase A/C"
                    value={settings.purchase_ledger}
                    onChange={(e) =>
                      handleSettingChange("purchase_ledger", e.target.value)
                    }
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Cash-in-Hand A/C"
                    value={settings.cash_ledger}
                    onChange={(e) =>
                      handleSettingChange("cash_ledger", e.target.value)
                    }
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Default Bank A/C"
                    value={settings.bank_ledger}
                    onChange={(e) =>
                      handleSettingChange("bank_ledger", e.target.value)
                    }
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="CGST Duties & Taxes"
                    value={settings.cgst_ledger}
                    onChange={(e) =>
                      handleSettingChange("cgst_ledger", e.target.value)
                    }
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="SGST Duties & Taxes"
                    value={settings.sgst_ledger}
                    onChange={(e) =>
                      handleSettingChange("sgst_ledger", e.target.value)
                    }
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="IGST Duties & Taxes"
                    value={settings.igst_ledger}
                    onChange={(e) =>
                      handleSettingChange("igst_ledger", e.target.value)
                    }
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Discount Allowed/Received"
                    value={settings.discount_ledger}
                    onChange={(e) =>
                      handleSettingChange("discount_ledger", e.target.value)
                    }
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Round Off (Indirect Exp)"
                    value={settings.round_off_ledger}
                    onChange={(e) =>
                      handleSettingChange("round_off_ledger", e.target.value)
                    }
                    required
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 4 }} />
              
              <Typography
                variant="subtitle2"
                color="primary"
                fontWeight="bold"
                sx={{
                  mb: 2,
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <CreditCard size={16} /> Transaction Ledgers Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Map how standalone financial transactions (payments, receipts, credit/debit notes) are logged in Tally.
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Payment Ledger A/C"
                    value={settings.payment_ledger || ""}
                    onChange={(e) =>
                      handleSettingChange("payment_ledger", e.target.value)
                    }
                    placeholder="E.g., Bank Account"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Receipt Ledger A/C"
                    value={settings.receipt_ledger || ""}
                    onChange={(e) =>
                      handleSettingChange("receipt_ledger", e.target.value)
                    }
                    placeholder="E.g., Bank Account"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Credit Note A/C"
                    value={settings.credit_note_ledger || ""}
                    onChange={(e) =>
                      handleSettingChange("credit_note_ledger", e.target.value)
                    }
                    placeholder="E.g., Sales Returns"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Debit Note A/C"
                    value={settings.debit_note_ledger || ""}
                    onChange={(e) =>
                      handleSettingChange("debit_note_ledger", e.target.value)
                    }
                    placeholder="E.g., Purchase Returns"
                    required
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 4 }} />

              <Typography
                variant="subtitle2"
                color="primary"
                fontWeight="bold"
                sx={{
                  mb: 2,
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Wrench size={16} /> Auto-Create Utilities
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                These utilities scan your entire Kosh database and automatically create any missing Ledgers, Stock Items, or Expense Categories directly in your Tally company to ensure a smooth sync.
              </Typography>
              
              <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ bgcolor: theme.palette.action.hover }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Ledgers & Expenses
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mb={2} sx={{ minHeight: 40 }}>
                        Automatically create Customers (Sundry Debtors), Suppliers (Sundry Creditors), and Expense Categories (Indirect Expenses).
                      </Typography>
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={handleAutoCreateLedgers}
                        disabled={isCreatingLedgers}
                        startIcon={<Database size={18} />}
                        fullWidth
                      >
                        {isCreatingLedgers ? "Creating..." : "Auto-Create Ledgers"}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
                
                {settings.sync_mode === 'itemized' && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ bgcolor: theme.palette.action.hover }}>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          Stock Items & Units
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={2} sx={{ minHeight: 40 }}>
                          Automatically create Products (Stock Items) and Units of Measure (e.g., pcs, kg, ltr).
                        </Typography>
                        <Button
                          variant="outlined"
                          color="secondary"
                          onClick={handleAutoCreateItems}
                          disabled={isCreatingItems}
                          startIcon={<ShoppingCart size={18} />}
                          fullWidth
                        >
                          {isCreatingItems ? "Creating..." : "Auto-Create Items"}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>

              <Box
                pt={3}
                borderTop={1}
                borderColor="divider"
                display="flex"
                justifyContent="flex-end"
              >
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  sx={{ px: 4, borderRadius: 2 }}
                  startIcon={<CheckCircle size={18} />}
                >
                  Save Configuration
                </Button>
              </Box>
            </CardContent>
          </form>
        </Card>
      )}

      {/* --- TAB 2: SETUP GUIDE --- */}
      {activeTab === 2 && (
        <Card variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
          <TallySetupGuide />
        </Card>
      )}
    </Box>
  );
}
