const fs = require('fs');

const original = fs.readFileSync('d:/FREELANCING/INVISTOCK/label-inventory-app/frontend/src/pages/TallyDashboard.tsx', 'utf8');

// We will inject the new UI code into the existing logic structure.
const newCode = `"use client";

import React, { useState, useEffect, useRef } from "react";
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
  IconButton,
  Tooltip,
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
  Terminal,
  Activity,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getTallySettings,
  saveTallySettings,
  getTallyStatus,
  runManualSync,
  resetSyncQueue,
  retrySpecificSync,
  autoCreateLedgers,
  autoCreateItems,
  TallySettings,
  TallyStatus,
} from "../lib/api/tallyService";
import DashboardHeader from "../components/DashboardHeader";
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
        ? \`Tally rejected this because the ledger "\${ledgerName}" is missing.\`
        : \`Tally rejected this because a ledger is missing. Tally says: "\${rawError}"\`,
      fix: ledgerName
        ? \`Open Tally > Create Ledger > Name it exactly "\${ledgerName}". (Or fix the spelling in Kosh Ledger Config).\`
        : \`Check the error above to see which ledger is missing. Then use the 'Auto-Create Ledgers' button in the config tab.\`,
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

// Custom Glassmorphic Card
const GlassCard = ({ children, sx = {} }: any) => (
  <Card
    sx={{
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
      color: '#fff',
      ...sx
    }}
  >
    {children}
  </Card>
);

const GlowingStatCard = ({ title, value, icon, color }: any) => (
  <GlassCard sx={{ position: 'relative', overflow: 'hidden' }}>
    <Box sx={{ 
      position: 'absolute', top: -50, right: -50, width: 100, height: 100, 
      background: \`radial-gradient(circle, \${color}55 0%, rgba(0,0,0,0) 70%)\`,
      filter: 'blur(20px)'
    }} />
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
      <Box sx={{ 
        p: 2, borderRadius: '12px', background: \`\${color}22\`, 
        color: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: \`1px solid \${color}55\`
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold' }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, textShadow: \`0 0 10px \${color}55\` }}>
          {value}
        </Typography>
      </Box>
    </CardContent>
  </GlassCard>
);

export default function TallyDashboard() {
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingLedgers, setIsCreatingLedgers] = useState(false);
  const [isCreatingItems, setIsCreatingItems] = useState(false);

  const [settings, setSettings] = useState<TallySettings>({
    tally_url: "http://localhost:9000",
    company_name: "My_company",
    sync_mode: "accounting",
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
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showConsole && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [syncLogs, showConsole]);

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
    const eventSource = new EventSource("http://localhost:9000/api/tally/stream");
    
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
    setShowConsole(true);
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
      setIsSyncing(false);
    }
  };

  const handleRetrySpecific = async (type: string, id: number) => {
    const loadId = toast.loading(\`Retrying \${type} #\${id}...\`);
    try {
      const msg = await retrySpecificSync(type, id);
      toast.success(msg, { id: loadId });
      fetchData(false);
    } catch (error: any) {
      toast.error(error.message || "Retry failed", { id: loadId });
    }
  };

  const handleAutoCreateLedgers = async () => {
    if (!window.confirm("This will automatically create all mapped ledgers in your Tally company. Make sure Tally is open. Continue?")) return;
    setIsCreatingLedgers(true);
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
    }
  };

  const handleAutoCreateItems = async () => {
    if (!window.confirm("This will automatically create all missing Stock Items and Units in your Tally company. Continue?")) return;
    setIsCreatingItems(true);
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
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh" bgcolor="#0a0a0a">
        <CircularProgress sx={{ color: '#00f2fe' }} />
      </Box>
    );
  }

  return (
    <Box
      p={3}
      sx={{ 
        minHeight: "100vh", 
        background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #0f0f1a 100%)',
        color: '#fff',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="900" sx={{ background: 'linear-gradient(45deg, #00f2fe, #4facfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Tally Prime Sync
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            Real-time bridge between Kosh and Tally
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />}
          onClick={handleRunSync}
          disabled={isSyncing}
          sx={{ 
            borderRadius: '50px', px: 4, py: 1.5, 
            background: 'linear-gradient(45deg, #00f2fe, #4facfe)',
            boxShadow: '0 4px 15px rgba(0, 242, 254, 0.4)',
            textTransform: 'none', fontWeight: 'bold', fontSize: '1rem',
            '&:hover': { background: 'linear-gradient(45deg, #4facfe, #00f2fe)' }
          }}
        >
          {isSyncing ? "Syncing..." : "Sync Now"}
        </Button>
      </Box>

      <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', mb: 4 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_e, val) => setActiveTab(val)}
          TabIndicatorProps={{ sx: { backgroundColor: '#00f2fe', height: 3, borderRadius: '3px 3px 0 0' } }}
          sx={{ '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', '&.Mui-selected': { color: '#00f2fe' }, fontWeight: 'bold', fontSize: '1rem', textTransform: 'none' } }}
        >
          <Tab label="Dashboard" icon={<Activity size={18} />} iconPosition="start" />
          <Tab label="Mapping Config" icon={<Settings size={18} />} iconPosition="start" />
          <Tab label="Setup Guide" icon={<BookOpen size={18} />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* --- TAB 0: DASHBOARD & SYNC --- */}
      {activeTab === 0 && (
        <Box>
          <Grid container spacing={4} mb={5}>
            <Grid item xs={12} md={4}>
              <GlowingStatCard
                title="Pending Queue"
                value={status.stats.pending}
                icon={<Database size={28} />}
                color="#f59e0b"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <GlowingStatCard
                title="Sync Errors"
                value={status.stats.failed}
                icon={<AlertTriangle size={28} />}
                color="#ef4444"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <GlowingStatCard
                title="Successfully Synced"
                value={status.stats.synced}
                icon={<CheckCircle size={28} />}
                color="#10b981"
              />
            </Grid>
          </Grid>

          <Grid container spacing={4}>
            {/* Left Column: Sync Controller */}
            <Grid item xs={12} lg={7}>
              <GlassCard sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 4, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <Box sx={{ 
                    width: 80, height: 80, borderRadius: '50%', 
                    background: isSyncing ? 'rgba(0, 242, 254, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3,
                    border: \`2px solid \${isSyncing ? '#00f2fe' : 'rgba(255,255,255,0.1)'}\`,
                    boxShadow: isSyncing ? '0 0 30px rgba(0, 242, 254, 0.5)' : 'none',
                    transition: 'all 0.5s ease'
                  }}>
                    <Zap size={40} color={isSyncing ? '#00f2fe' : '#888'} className={isSyncing ? 'animate-pulse' : ''} />
                  </Box>

                  <Typography variant="h5" fontWeight="900" gutterBottom>
                    {isSyncing ? "Transmission in Progress" : "System Ready"}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', mb: 4, maxWidth: 400 }}>
                    {isSyncing
                      ? "Keep Tally Prime open. The integration engine is writing vouchers securely to your active company."
                      : "Start a sync to push your recent sales, purchases, and ledgers into Tally Prime."}
                  </Typography>

                  {isSyncing && syncProgress.total > 0 && (
                    <Box sx={{ width: '100%', mb: 4, px: 2 }}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" sx={{ color: '#00f2fe', fontWeight: 'bold' }}>
                          Processing: {syncProgress.item}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 'bold' }}>
                          {syncProgress.current} / {syncProgress.total}
                        </Typography>
                      </Box>
                      <Box sx={{ position: 'relative', height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                        <Box sx={{ 
                          position: 'absolute', top: 0, left: 0, height: '100%', 
                          width: \`\${(syncProgress.current / syncProgress.total) * 100}%\`,
                          background: 'linear-gradient(90deg, #00f2fe, #4facfe)',
                          boxShadow: '0 0 10px #00f2fe',
                          transition: 'width 0.3s ease'
                        }} />
                      </Box>
                    </Box>
                  )}

                  {!isSyncing && status.breakdown.length > 0 && (
                    <Box display="flex" gap={1} flexWrap="wrap" justifyContent="center" mb={4}>
                      {status.breakdown.map((b, i) => (
                        <Chip
                          key={i}
                          icon={getEntityIcon(b.entity_type)}
                          label={\`\${b.total} \${b.entity_type}s\`}
                          sx={{ 
                            background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(5px)'
                          }}
                        />
                      ))}
                    </Box>
                  )}

                  <Stack direction="row" spacing={2} justifyContent="center">
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleRunSync}
                      disabled={isSyncing}
                      startIcon={<RefreshCw className={isSyncing ? "animate-spin" : ""} />}
                      sx={{ 
                        px: 4, py: 1.5, borderRadius: '50px',
                        background: 'linear-gradient(45deg, #00f2fe, #4facfe)', color: '#000', fontWeight: 'bold',
                        '&:hover': { background: 'linear-gradient(45deg, #4facfe, #00f2fe)' },
                        '&.Mui-disabled': { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }
                      }}
                    >
                      {isSyncing ? "Syncing..." : "Start Sync"}
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={handleResetQueue}
                      disabled={isSyncing}
                      startIcon={<Trash2 size={18} />}
                      sx={{ 
                        borderRadius: '50px', px: 3, 
                        borderColor: 'rgba(255,255,255,0.2)', color: '#fff',
                        '&:hover': { borderColor: '#fff', background: 'rgba(255,255,255,0.05)' }
                      }}
                    >
                      Re-scan Database
                    </Button>
                  </Stack>
                </Box>
              </GlassCard>
            </Grid>

            {/* Right Column: Terminal Console */}
            <Grid item xs={12} lg={5}>
              <Box sx={{ 
                height: '100%', minHeight: 400, borderRadius: 3, overflow: 'hidden',
                bgcolor: '#0d1117', border: '1px solid #30363d',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
              }}>
                <Box sx={{ 
                  bgcolor: '#161b22', p: 1.5, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderBottom: '1px solid #30363d'
                }}>
                  <Box display="flex" gap={1}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ff5f56' }} />
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#27c93f' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#8b949e', fontFamily: 'monospace', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Terminal size={14} /> tally-sync-engine
                  </Typography>
                  <IconButton size="small" onClick={() => setShowConsole(!showConsole)} sx={{ color: '#8b949e' }}>
                    <RefreshCw size={14} />
                  </IconButton>
                </Box>
                <Box sx={{ p: 2, flex: 1, overflowY: 'auto', fontFamily: '"Fira Code", monospace', fontSize: '0.85rem' }}>
                  {syncLogs.length === 0 ? (
                    <Typography variant="body2" sx={{ color: '#484f58', fontStyle: 'italic' }}>
                      Ready. Waiting for sync task...
                    </Typography>
                  ) : (
                    syncLogs.map((log, idx) => {
                      let color = '#56d364'; // green
                      if (log.toLowerCase().includes('error') || log.toLowerCase().includes('failed')) color = '#f85149'; // red
                      if (log.toLowerCase().includes('warning') || log.toLowerCase().includes('duplicate')) color = '#d29922'; // yellow
                      return (
                        <Typography key={idx} variant="body2" sx={{ color, mb: 0.5, fontFamily: 'inherit', wordBreak: 'break-all' }}>
                          <span style={{ color: '#8b949e', marginRight: 8 }}>{'>'}</span>{log}
                        </Typography>
                      );
                    })
                  )}
                  <div ref={consoleEndRef} />
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* Error Section */}
          {status.recentFailed.length > 0 && (
            <Box mt={6}>
              <Typography variant="h5" fontWeight="900" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, color: '#ff6b6b' }}>
                <AlertTriangle /> Attention Required ({status.recentFailed.length})
              </Typography>
              
              <Grid container spacing={3}>
                {status.recentFailed.map((err, idx) => {
                  const humanError = getHumanReadableError(err.error_log, err.entity_type);
                  return (
                    <Grid item xs={12} md={6} key={idx}>
                      <GlassCard sx={{ borderLeft: '4px solid #ff6b6b' }}>
                        <CardContent sx={{ p: 3 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                            <Box display="flex" gap={1} alignItems="center">
                              <Chip 
                                size="small" icon={getEntityIcon(err.entity_type)} label={err.entity_type.toUpperCase()} 
                                sx={{ bgcolor: 'rgba(255,107,107,0.1)', color: '#ff6b6b', fontWeight: 'bold' }} 
                              />
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                ID: #{err.entity_id}
                              </Typography>
                            </Box>
                            <Button 
                              size="small" variant="outlined" 
                              onClick={() => handleRetrySpecific(err.entity_type, err.entity_id)}
                              sx={{ borderColor: 'rgba(255,107,107,0.5)', color: '#ff6b6b', '&:hover': { bgcolor: 'rgba(255,107,107,0.1)' } }}
                            >
                              Retry
                            </Button>
                          </Box>
                          
                          <Typography variant="h6" fontWeight="bold" sx={{ mb: 1, color: '#fff' }}>
                            {humanError.title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}>
                            {humanError.detail}
                          </Typography>
                          
                          <Box sx={{ bgcolor: 'rgba(0,0,0,0.3)', p: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <Typography variant="caption" fontWeight="bold" sx={{ color: '#00f2fe', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Wrench size={14} /> HOW TO FIX
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                              {humanError.fix}
                            </Typography>
                          </Box>
                        </CardContent>
                      </GlassCard>
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
        <GlassCard>
          <form onSubmit={handleSaveSettings}>
            <CardContent sx={{ p: { xs: 2, md: 5 } }}>
              <Alert severity="info" sx={{ mb: 4, borderRadius: 2, bgcolor: 'rgba(0, 242, 254, 0.1)', color: '#fff', border: '1px solid rgba(0, 242, 254, 0.3)', '& .MuiAlert-icon': { color: '#00f2fe' } }}>
                <AlertTitle sx={{ fontWeight: 'bold' }}>Exact Mapping Required</AlertTitle>
                The ledger names below <strong>MUST perfectly match</strong> the spelling of the ledgers you have created inside your Tally Company. Tally is case-insensitive but sensitive to spaces!
              </Alert>

              <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1.5, color: '#00f2fe' }}>
                <Settings size={20} /> Connection Settings
              </Typography>
              
              <Grid container spacing={4} mb={6}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Tally Localhost URL"
                    value={settings.tally_url}
                    onChange={(e) => handleSettingChange("tally_url", e.target.value)}
                    helperText="Default is http://localhost:9000"
                    InputProps={{ sx: { color: '#fff', bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 } }}
                    InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.6)' } }}
                    FormHelperTextProps={{ sx: { color: 'rgba(255,255,255,0.4)' } }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Tally Company Name"
                    value={settings.company_name || ""}
                    onChange={(e) => handleSettingChange("company_name", e.target.value)}
                    helperText="Name of your active company in Tally"
                    InputProps={{ sx: { color: '#fff', bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 } }}
                    InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.6)' } }}
                    FormHelperTextProps={{ sx: { color: 'rgba(255,255,255,0.4)' } }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ p: 3, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend" sx={{ fontWeight: 'bold', color: '#fff', mb: 1 }}>Tally Sync Mode</FormLabel>
                      <RadioGroup row value={settings.sync_mode || 'accounting'} onChange={(e) => handleSettingChange('sync_mode', e.target.value)}>
                        <FormControlLabel value="accounting" control={<Radio sx={{ color: '#00f2fe', '&.Mui-checked': { color: '#00f2fe' } }} />} label="Accounting View (Financials & Ledgers only)" />
                        <FormControlLabel value="itemized" control={<Radio sx={{ color: '#00f2fe', '&.Mui-checked': { color: '#00f2fe' } }} />} label="Itemized View (Detailed products, qty, and rates)" />
                      </RadioGroup>
                    </FormControl>
                    
                    <Box mt={3} display="flex" alignItems="center">
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.educational_mode === 1 || settings.educational_mode === true || settings.educational_mode === '1'}
                            onChange={(e) => handleSettingChange('educational_mode', e.target.checked ? 1 : 0)}
                            sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#00f2fe' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#00f2fe' } }}
                          />
                        }
                        label="Educational Mode Compatibility"
                      />
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', ml: 1 }}>
                        (Forces dates to 1st of month to avoid Tally Edu restrictions)
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1.5, color: '#00f2fe' }}>
                <BookOpen size={20} /> Master Ledger Mapping
              </Typography>
              
              <Grid container spacing={3} mb={5}>
                {[
                  { label: "Primary Sales A/C", key: "sales_ledger" },
                  { label: "Primary Purchase A/C", key: "purchase_ledger" },
                  { label: "Cash Account", key: "cash_ledger" },
                  { label: "Bank Account", key: "bank_ledger" },
                  { label: "CGST Ledger", key: "cgst_ledger" },
                  { label: "SGST Ledger", key: "sgst_ledger" },
                  { label: "IGST Ledger", key: "igst_ledger" },
                  { label: "Discount Allowed", key: "discount_ledger" },
                  { label: "Round Off A/C", key: "round_off_ledger" },
                ].map((field) => (
                  <Grid item xs={12} sm={6} md={4} key={field.key}>
                    <TextField
                      fullWidth
                      label={field.label}
                      value={(settings as any)[field.key] || ""}
                      onChange={(e) => handleSettingChange(field.key as keyof TallySettings, e.target.value)}
                      InputProps={{ sx: { color: '#fff', bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 } }}
                      InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.6)' } }}
                    />
                  </Grid>
                ))}
              </Grid>

              <Box sx={{ p: 4, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)', mb: 4 }}>
                <Typography variant="subtitle1" fontWeight="bold" mb={2}>Automated Setup Tools</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 3 }}>
                  Use these tools to let Kosh automatically create the required masters inside Tally for you.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button 
                    variant="contained" onClick={handleAutoCreateLedgers} disabled={isCreatingLedgers}
                    sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                  >
                    {isCreatingLedgers ? "Creating Ledgers..." : "Auto-Create Ledgers"}
                  </Button>
                  <Button 
                    variant="contained" onClick={handleAutoCreateItems} disabled={isCreatingItems}
                    sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                  >
                    {isCreatingItems ? "Creating Items..." : "Auto-Create Stock Items"}
                  </Button>
                </Stack>
              </Box>

              <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.1)' }} />
              
              <Box display="flex" justifyContent="flex-end">
                <Button 
                  type="submit" variant="contained" size="large"
                  sx={{ 
                    px: 6, py: 1.5, borderRadius: '50px',
                    background: 'linear-gradient(45deg, #00f2fe, #4facfe)', color: '#000', fontWeight: 'bold'
                  }}
                >
                  Save Configuration
                </Button>
              </Box>
            </CardContent>
          </form>
        </GlassCard>
      )}

      {/* --- TAB 2: SETUP GUIDE --- */}
      {activeTab === 2 && (
        <GlassCard>
          <CardContent sx={{ p: { xs: 2, md: 5 } }}>
            <TallySetupGuide />
          </CardContent>
        </GlassCard>
      )}
    </Box>
  );
}
`;

fs.writeFileSync('d:/FREELANCING/INVISTOCK/label-inventory-app/frontend/src/pages/TallyDashboard.tsx', newCode);
console.log("Written successfully");
