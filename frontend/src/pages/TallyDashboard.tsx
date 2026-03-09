"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getTallySettings,
  saveTallySettings,
  getTallyStatus,
  runManualSync,
  resetSyncQueue,
  TallySettings,
  TallyStatus,
} from "../lib/api/tallyService";
import DashboardHeader from "../components/DashboardHeader";
import { DataCard as StatCard } from "../components/DataCard";
import TallySetupGuide from "../components/TallySetupGuide";

// --- INTELLIGENT ERROR TRANSLATOR ---
const getHumanReadableError = (rawError: string, _type: string) => {
  const errorLower = rawError.toLowerCase();

  if (errorLower.includes("does not exist") || errorLower.includes("ledger")) {
    const match = rawError.match(/'([^']+)'/);
    const ledgerName = match ? match[1] : "A required ledger";
    return {
      title: "Missing Tally Ledger",
      detail: `Tally rejected this because the ledger "${ledgerName}" is missing.`,
      fix: `Open Tally > Create Ledger > Name it exactly "${ledgerName}". (Or fix the spelling in Kosh Ledger Config).`,
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

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [settings, setSettings] = useState<TallySettings>({
    tally_url: "http://localhost:9000",
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, statusRes] = await Promise.all([
        getTallySettings(),
        getTallyStatus(),
      ]);
      if (settingsRes) setSettings(settingsRes);
      if (statusRes) setStatus(statusRes);
    } catch (error: any) {
      toast.error("Failed to load Tally data");
    } finally {
      setLoading(false);
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
    const loadId = toast.loading("Communicating with Tally Engine...");
    try {
      const res = await runManualSync();
      toast.success(res.details || "Sync completed successfully!", {
        id: loadId,
      });
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Sync failed. Ensure Tally is open.", {
        id: loadId,
      });
    } finally {
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

  const handleSettingChange = (field: keyof TallySettings, value: string) => {
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
            {isSyncing && (
              <LinearProgress
                sx={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
              />
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

              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  size="large"
                  color="primary"
                  onClick={handleRunSync}
                  disabled={
                    isSyncing ||
                    (status.stats.pending === 0 && status.stats.failed === 0)
                  }
                  startIcon={
                    <RefreshCw className={isSyncing ? "animate-spin" : ""} />
                  }
                  sx={{ px: 4, py: 1.5, borderRadius: 2 }}
                >
                  {isSyncing
                    ? "Executing..."
                    : status.stats.pending === 0
                      ? "Everything is up to date"
                      : "Start Sync Process"}
                </Button>
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
              </Stack>
            </CardContent>
          </Card>

          {/* Intelligent Error Log */}
          {status.recentFailed.length > 0 && (
            <Box mb={4}>
              <Typography
                variant="h6"
                fontWeight="bold"
                color="error.main"
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <AlertTriangle size={24} /> Actions Required (
                {status.recentFailed.length})
              </Typography>

              <Grid container spacing={2}>
                {status.recentFailed.map((err, idx) => {
                  const humanError = getHumanReadableError(
                    err.error_log,
                    err.entity_type,
                  );

                  return (
                    <Grid item xs={12} key={idx}>
                      <Card
                        variant="outlined"
                        sx={{
                          borderRadius: 2,
                          borderLeft: `4px solid ${theme.palette.error.main}`,
                        }}
                      >
                        <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
                          <Grid container spacing={3} alignItems="center">
                            {/* Identity Column */}
                            <Grid item xs={12} md={3}>
                              <Box
                                display="flex"
                                alignItems="center"
                                gap={1}
                                mb={0.5}
                              >
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
                              <Typography
                                variant="subtitle2"
                                color="text.secondary"
                              >
                                Record ID: #{err.entity_id}
                              </Typography>
                            </Grid>

                            {/* Error Translation Column */}
                            <Grid item xs={12} md={5}>
                              <Typography
                                variant="subtitle1"
                                fontWeight="bold"
                                color="text.primary"
                              >
                                {humanError.title}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {humanError.detail}
                              </Typography>
                            </Grid>

                            {/* Fix Action Column */}
                            <Grid item xs={12} md={4}>
                              <Box
                                bgcolor={theme.palette.primary.light + "15"}
                                p={1.5}
                                borderRadius={2}
                                display="flex"
                                alignItems="flex-start"
                                gap={1.5}
                              >
                                <Wrench
                                  size={18}
                                  color={theme.palette.primary.main}
                                  style={{ marginTop: 2 }}
                                />
                                <Box>
                                  <Typography
                                    variant="caption"
                                    fontWeight="bold"
                                    color="primary.main"
                                    display="block"
                                  >
                                    HOW TO FIX:
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.primary"
                                  >
                                    {humanError.fix}
                                  </Typography>
                                </Box>
                              </Box>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
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

              <Box
                mt={4}
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
