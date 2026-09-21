"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  Stack,
  Card,
  CardContent,
  Alert,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  CheckCircle,
  QrCode,
  RefreshCw,
  Globe,
  Settings2,
  BarChart3,
  Send,
  FileText,
  BookOpen,
  Megaphone,
  Clock,
  ShieldCheck,
  Zap,
  Plus,
  Star,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const { electron } = window;

export default function WhatsAppTab() {
  const [activeTab, setActiveTab] = useState<"setup" | "templates" | "analytics">("setup");

  // Template Library State
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [templateFilter, setTemplateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    category: "marketing",
    content: "",
    meta_template_name: "",
  });

  // Unofficial Baileys State
  const [status, setStatus] = useState("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);

  // Official Meta / MSG91 Cloud API Settings State
  const [settings, setSettings] = useState({
    official_enabled: false,
    official_provider: "msg91",
    official_phone_number_id: "",
    official_waba_id: "",
    official_access_token: "",
    official_business_number: "",
    msg91_auth_key: "",
    msg91_integrated_number: "",
    route_invoice: "unofficial",
    route_ledgers: "unofficial",
    route_marketing: "unofficial",
    route_outstandings: "unofficial",
  });

  const [savingSettings, setSavingSettings] = useState(false);

  // Meta API Test State
  const [testingOfficial, setTestingOfficial] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    displayPhoneNumber?: string;
    verifiedName?: string;
    error?: string;
  } | null>(null);

  // MSG91 Test State
  const [testingMsg91, setTestingMsg91] = useState(false);
  const [msg91TestResult, setMsg91TestResult] = useState<{
    success: boolean;
    displayPhoneNumber?: string;
    verifiedName?: string;
    error?: string;
  } | null>(null);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    // 1. Get initial status for Baileys
    electron.getWhatsAppStatus().then((data: any) => {
      setStatus(data.status);
      setQrCode(data.qr);
    });

    // 2. Listen for live updates
    electron.onWhatsAppUpdate((data: any) => {
      setStatus(data.status);
      setQrCode(data.qr);
    });

    // 3. Load Settings from backend
    loadSettings();

    // 4. Load Analytics
    loadAnalytics();

    // 5. Load Templates
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await electron.getWhatsAppTemplates("all");
      if (res.success && res.templates) {
        setTemplates(res.templates);
      }
    } catch (e: any) {
      console.error("Failed to load WhatsApp templates:", e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSetDefaultTemplate = async (id: number, category: string) => {
    try {
      const res = await electron.setDefaultWhatsAppTemplate(id, category);
      if (res.success) {
        toast.success("Default template updated for " + category);
        loadTemplates();
      } else {
        toast.error("Failed to set default: " + res.error);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleVerifyAndRegisterTemplates = async () => {
    const isMsg91 = settings.official_provider === "msg91";
    if (isMsg91) {
      if (!settings.msg91_auth_key) {
        toast.error("MSG91 Auth Key is required in Setup tab.");
        return;
      }
    } else {
      if (!settings.official_waba_id || !settings.official_access_token) {
        toast.error("WABA Account ID and Access Token are required in Setup tab.");
        return;
      }
    }

    const providerName = isMsg91 ? "MSG91" : "Meta Cloud API";
    setSyncingTemplates(true);
    const toastId = toast.loading(`Verifying & Registering Templates on ${providerName}...`);
    try {
      const registerRes = await electron.registerAllWhatsAppTemplates();
      const verifyRes = await electron.verifyMetaTemplates();

      if (registerRes.success || verifyRes.success) {
        toast.success(
          `Synced! Registered: ${registerRes.registeredCount || 0}, Statuses updated.`,
          { id: toastId }
        );
        loadTemplates();
      } else {
        toast.error(`Sync warning: ${registerRes.error || verifyRes.error}`, { id: toastId });
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`, { id: toastId });
    } finally {
      setSyncingTemplates(false);
    }
  };

  const handleOpenCreateTemplateModal = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: "",
      category: "marketing",
      content: "",
      meta_template_name: "",
    });
    setTemplateModalOpen(true);
  };

  const handleOpenEditTemplateModal = (tpl: any) => {
    setEditingTemplate(tpl);
    setTemplateForm({
      name: tpl.name,
      category: tpl.category,
      content: tpl.content,
      meta_template_name: tpl.meta_template_name || "",
    });
    setTemplateModalOpen(true);
  };

  const handleSaveTemplateForm = async () => {
    if (!templateForm.name.trim() || !templateForm.content.trim()) {
      toast.error("Template Name and Content are required.");
      return;
    }

    try {
      const payload: any = {
        name: templateForm.name,
        category: templateForm.category,
        content: templateForm.content,
        meta_template_name: templateForm.meta_template_name,
      };

      if (editingTemplate) {
        payload.id = editingTemplate.id;
      }

      const res = await electron.saveWhatsAppTemplate(payload);
      if (res.success) {
        toast.success(editingTemplate ? "Template Updated!" : "Template Created!");
        setTemplateModalOpen(false);
        loadTemplates();
      } else {
        toast.error("Failed to save template: " + res.error);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDeleteTemplateItem = async (id: number) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await electron.deleteWhatsAppTemplate(id);
      if (res.success) {
        toast.success("Template deleted.");
        loadTemplates();
      } else {
        toast.error("Failed to delete template: " + res.error);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await electron.getWhatsAppSettings();
      if (res.success && res.settings) {
        setSettings(res.settings);
      }
    } catch (e: any) {
      console.error("Failed to load WhatsApp settings:", e);
    }
  };

  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await electron.getWhatsAppAnalytics(30);
      if (res.success && res.stats) {
        setAnalyticsData(res.stats);
      }
    } catch (e: any) {
      console.error("Failed to load WhatsApp analytics:", e);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleRestart = async () => {
    if (restarting) return;
    setRestarting(true);
    const toastId = toast.loading("Restarting Baileys WhatsApp Service...");

    try {
      setQrCode(null);
      setStatus("disconnected");

      const res = await electron.ipcRenderer.invoke("whatsapp-restart");
      if (res.success) {
        toast.success("Service restarted. Please wait for QR code.", {
          id: toastId,
        });
      } else {
        toast.error("Failed to restart: " + res.error, { id: toastId });
      }
    } catch (e: any) {
      toast.error("Error invoking restart: " + e.message, { id: toastId });
    } finally {
      setRestarting(false);
    }
  };

  const handleTestOfficialConnection = async () => {
    if (
      !settings.official_phone_number_id ||
      !settings.official_access_token
    ) {
      toast.error(
        "Please enter both Phone Number ID and Access Token before testing."
      );
      return;
    }

    setTestingOfficial(true);
    setTestResult(null);
    const toastId = toast.loading("Testing Meta WhatsApp Cloud API...");

    try {
      const res = await electron.testWhatsAppOfficial({
        phoneNumberId: settings.official_phone_number_id,
        accessToken: settings.official_access_token,
      });

      setTestResult(res);

      if (res.success) {
        toast.success(
          `Connected! Verified: ${res.verifiedName || "Business"} (${res.displayPhoneNumber})`,
          { id: toastId }
        );
      } else {
        toast.error(`Connection failed: ${res.error}`, { id: toastId });
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`, { id: toastId });
    } finally {
      setTestingOfficial(false);
    }
  };

  const handleTestMsg91Connection = async () => {
    if (!settings.msg91_auth_key) {
      toast.error("Please enter your MSG91 Auth Key before testing.");
      return;
    }

    setTestingMsg91(true);
    setMsg91TestResult(null);
    const toastId = toast.loading("Testing MSG91 WhatsApp API Connection...");

    try {
      const res = await electron.testWhatsAppMsg91({
        authKey: settings.msg91_auth_key,
        integratedNumber: settings.msg91_integrated_number,
      });

      setMsg91TestResult(res);

      if (res.success) {
        toast.success(
          `Connected! Verified: ${res.verifiedName || "MSG91 Account"} (${res.displayPhoneNumber})`,
          { id: toastId }
        );
        loadSettings();
      } else {
        toast.error(`Connection failed: ${res.error}`, { id: toastId });
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`, { id: toastId });
    } finally {
      setTestingMsg91(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const toastId = toast.loading("Saving WhatsApp Preferences...");

    try {
      const res = await electron.saveWhatsAppSettings(settings);
      if (res.success && res.settings) {
        setSettings(res.settings);
        toast.success("WhatsApp configuration saved successfully!", {
          id: toastId,
        });
      } else {
        toast.error(`Failed to save: ${res.error}`, { id: toastId });
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`, { id: toastId });
    } finally {
      setSavingSettings(false);
    }
  };

  // Aggregated totals for analytics summary
  const totalOfficialSent = analyticsData.reduce(
    (acc, item) => acc + (item.official_count || 0),
    0
  );
  const totalUnofficialSent = analyticsData.reduce(
    (acc, item) => acc + (item.unofficial_count || 0),
    0
  );
  const totalAllSent = analyticsData.reduce(
    (acc, item) => acc + (item.total_sent || 0),
    0
  );

  return (
    <Box sx={{ width: "100%" }}>
      {/* --- Top Sub-Tabs Navigation --- */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newVal) => setActiveTab(newVal)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab
            value="setup"
            label="API Setup & Routing"
            icon={<Settings2 size={18} />}
            iconPosition="start"
            sx={{ fontWeight: 600 }}
          />
          <Tab
            value="templates"
            label="Template Library & Verification"
            icon={<BookOpen size={18} />}
            iconPosition="start"
            sx={{ fontWeight: 600 }}
          />
          <Tab
            value="analytics"
            label="Daily Usage & Billing Log"
            icon={<BarChart3 size={18} />}
            iconPosition="start"
            sx={{ fontWeight: 600 }}
          />
        </Tabs>
      </Box>

      {/* ============================================================ */}
      {/* TAB 1: SETUP & CHANNEL ROUTING                               */}
      {/* ============================================================ */}
      {activeTab === "setup" && (
        <Stack spacing={3}>
          <Grid container spacing={3}>
            {/* --- Left Card: Unofficial Baileys WhatsApp --- */}
            <Grid item xs={12} md={6}>
              <Card
                elevation={2}
                sx={{ height: "100%", borderRadius: 3, overflow: "hidden" }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    px: 2.5,
                    bgcolor: "success.dark",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <QrCode size={20} color="white" />
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, letterSpacing: 0.5 }}
                  >
                    UNOFFICIAL WHATSAPP (BAILEYS)
                  </Typography>
                </Box>
                <CardContent sx={{ textAlign: "center", p: 3 }}>
                  {status === "ready" ? (
                    <Box
                      sx={{
                        color: "success.main",
                        py: 4,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <CheckCircle
                        size={70}
                        strokeWidth={1.5}
                        style={{ marginBottom: 12 }}
                      />
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Baileys Connected
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                      >
                        Websocket instance active. No Meta subscription required.
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={handleRestart}
                        disabled={restarting}
                        startIcon={
                          restarting ? (
                            <CircularProgress size={14} />
                          ) : (
                            <RefreshCw size={14} />
                          )
                        }
                      >
                        {restarting ? "Restarting..." : "Restart Socket"}
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      <Box
                        sx={{
                          height: 240,
                          width: 240,
                          mx: "auto",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: "#f5f5f5",
                          borderRadius: 3,
                          mb: 2,
                          border: "1px dashed #ddd",
                        }}
                      >
                        {qrCode ? (
                          <img
                            src={qrCode}
                            alt="WhatsApp QR"
                            style={{
                              width: "100%",
                              height: "100%",
                              borderRadius: 8,
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <Stack alignItems="center" spacing={1}>
                            <CircularProgress size={28} color="inherit" />
                            <Typography variant="caption" color="text.secondary">
                              {restarting
                                ? "Restarting Service..."
                                : "Generating QR Code..."}
                            </Typography>
                          </Stack>
                        )}
                      </Box>

                      <Stack
                        direction="row"
                        spacing={2}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Chip
                          label={`Status: ${status?.toUpperCase()}`}
                          color={status === "scanning" ? "warning" : "default"}
                          variant="outlined"
                          size="small"
                        />

                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={handleRestart}
                          disabled={restarting}
                          startIcon={
                            restarting ? (
                              <CircularProgress size={14} />
                            ) : (
                              <RefreshCw size={14} />
                            )
                          }
                        >
                          {restarting ? "Restarting..." : "Restart Socket"}
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* --- Right Card: Official WhatsApp Business API (MSG91 BSP or Direct Meta) --- */}
            <Grid item xs={12} md={6}>
              <Card
                elevation={2}
                sx={{ height: "100%", borderRadius: 3, overflow: "hidden" }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    px: 2.5,
                    bgcolor: "primary.main",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Globe size={20} color="white" />
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, letterSpacing: 0.5 }}
                  >
                    OFFICIAL META WHATSAPP API & BSP
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Choose your official gateway. <b>MSG91</b> allows local Indian UPI/GPay billing & WhatsApp App coexistence without international credit cards.
                  </Typography>

                  <Stack spacing={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Official Provider Gateway</InputLabel>
                      <Select
                        value={settings.official_provider || "msg91"}
                        label="Official Provider Gateway"
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            official_provider: e.target.value,
                          }))
                        }
                      >
                        <MenuItem value="msg91">
                          🚀 MSG91 (Recommended - Indian UPI/GPay & App Coexistence)
                        </MenuItem>
                        <MenuItem value="meta_direct">
                          🌐 Meta Direct Cloud API (Requires USD Credit Card)
                        </MenuItem>
                      </Select>
                    </FormControl>

                    {settings.official_provider === "msg91" ? (
                      <>
                        <Alert severity="info" sx={{ py: 0.5, borderRadius: 2 }}>
                          Top up via UPI/GPay/Netbanking in INR inside your MSG91 panel.
                        </Alert>

                        <TextField
                          label="MSG91 Auth Key"
                          size="small"
                          fullWidth
                          type="password"
                          placeholder="e.g. 381920A..."
                          value={settings.msg91_auth_key || ""}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              msg91_auth_key: e.target.value,
                            }))
                          }
                        />

                        <TextField
                          label="Integrated WhatsApp Business Number"
                          size="small"
                          fullWidth
                          placeholder="e.g. +919876543210"
                          value={settings.msg91_integrated_number || ""}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              msg91_integrated_number: e.target.value,
                            }))
                          }
                        />

                        {msg91TestResult && (
                          <Alert
                            severity={msg91TestResult.success ? "success" : "error"}
                            sx={{ py: 0.5, borderRadius: 2 }}
                          >
                            {msg91TestResult.success
                              ? `Verified: ${msg91TestResult.verifiedName} (${msg91TestResult.displayPhoneNumber})`
                              : `Connection error: ${msg91TestResult.error}`}
                          </Alert>
                        )}

                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={handleTestMsg91Connection}
                          disabled={testingMsg91}
                          startIcon={
                            testingMsg91 ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <Zap size={14} />
                            )
                          }
                        >
                          {testingMsg91
                            ? "Verifying MSG91 API..."
                            : "Test MSG91 Connection"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <TextField
                          label="Phone Number ID"
                          size="small"
                          fullWidth
                          placeholder="e.g. 100609345912345"
                          value={settings.official_phone_number_id}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              official_phone_number_id: e.target.value,
                            }))
                          }
                        />

                        <TextField
                          label="WABA Account ID (Optional)"
                          size="small"
                          fullWidth
                          placeholder="e.g. 10892345912345"
                          value={settings.official_waba_id}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              official_waba_id: e.target.value,
                            }))
                          }
                        />

                        <TextField
                          label="System User / Permanent Access Token"
                          size="small"
                          fullWidth
                          type="password"
                          placeholder="EAAG..."
                          value={settings.official_access_token}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              official_access_token: e.target.value,
                            }))
                          }
                        />

                        <TextField
                          label="Registered Business Phone Number"
                          size="small"
                          fullWidth
                          placeholder="+919876543210"
                          value={settings.official_business_number}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              official_business_number: e.target.value,
                            }))
                          }
                        />

                        {testResult && (
                          <Alert
                            severity={testResult.success ? "success" : "error"}
                            sx={{ py: 0.5, borderRadius: 2 }}
                          >
                            {testResult.success
                              ? `Verified: ${testResult.verifiedName} (${testResult.displayPhoneNumber})`
                              : `Connection error: ${testResult.error}`}
                          </Alert>
                        )}

                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={handleTestOfficialConnection}
                          disabled={testingOfficial}
                          startIcon={
                            testingOfficial ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <Zap size={14} />
                            )
                          }
                        >
                          {testingOfficial
                            ? "Verifying Meta API..."
                            : "Test Meta API Connection"}
                        </Button>
                      </>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* --- Bottom Card: 4-Way Multi-Channel Routing Strategy --- */}
          <Card elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Box
              sx={{
                p: 1.5,
                px: 2.5,
                bgcolor: "grey.900",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <ShieldCheck size={20} color="white" />
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, letterSpacing: 0.5 }}
                >
                  FEATURE DISPATCH STRATEGY (ROUTING MATRIX)
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                startIcon={
                  savingSettings ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <Send size={14} />
                  )
                }
              >
                {savingSettings ? "Saving..." : "Save Preferences"}
              </Button>
            </Box>

            <CardContent sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary" paragraph>
                Assign which WhatsApp provider to use for each of the 4 key
                application features. Both providers can operate simultaneously!
              </Typography>

              <Grid container spacing={3}>
                {/* 1. Invoices */}
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 2.5, bgcolor: "#fafafa" }}
                  >
                    <Stack spacing={1.5}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <FileText size={18} color="#1976d2" />
                        <Typography fontWeight={600} variant="subtitle2">
                          1. Invoices & Bills
                        </Typography>
                      </Box>
                      <FormControl fullWidth size="small">
                        <InputLabel>Route Provider</InputLabel>
                        <Select
                          value={settings.route_invoice}
                          label="Route Provider"
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              route_invoice: e.target.value,
                            }))
                          }
                        >
                          <MenuItem value="unofficial">
                            Unofficial (Baileys)
                          </MenuItem>
                          <MenuItem value="official">
                            Official Meta API
                          </MenuItem>
                          <MenuItem value="none">Disabled</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>
                  </Paper>
                </Grid>

                {/* 2. Ledgers */}
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 2.5, bgcolor: "#fafafa" }}
                  >
                    <Stack spacing={1.5}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <BookOpen size={18} color="#2e7d32" />
                        <Typography fontWeight={600} variant="subtitle2">
                          2. Account Ledgers
                        </Typography>
                      </Box>
                      <FormControl fullWidth size="small">
                        <InputLabel>Route Provider</InputLabel>
                        <Select
                          value={settings.route_ledgers}
                          label="Route Provider"
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              route_ledgers: e.target.value,
                            }))
                          }
                        >
                          <MenuItem value="unofficial">
                            Unofficial (Baileys)
                          </MenuItem>
                          <MenuItem value="official">
                            Official Meta API
                          </MenuItem>
                          <MenuItem value="none">Disabled</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>
                  </Paper>
                </Grid>

                {/* 3. Marketing */}
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 2.5, bgcolor: "#fafafa" }}
                  >
                    <Stack spacing={1.5}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Megaphone size={18} color="#ed6c02" />
                        <Typography fontWeight={600} variant="subtitle2">
                          3. Marketing Broadcasts
                        </Typography>
                      </Box>
                      <FormControl fullWidth size="small">
                        <InputLabel>Route Provider</InputLabel>
                        <Select
                          value={settings.route_marketing}
                          label="Route Provider"
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              route_marketing: e.target.value,
                            }))
                          }
                        >
                          <MenuItem value="unofficial">
                            Unofficial (Baileys)
                          </MenuItem>
                          <MenuItem value="official">
                            Official Meta API
                          </MenuItem>
                          <MenuItem value="none">Disabled</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>
                  </Paper>
                </Grid>

                {/* 4. Outstandings */}
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 2.5, bgcolor: "#fafafa" }}
                  >
                    <Stack spacing={1.5}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Clock size={18} color="#d32f2f" />
                        <Typography fontWeight={600} variant="subtitle2">
                          4. Due Reminders
                        </Typography>
                      </Box>
                      <FormControl fullWidth size="small">
                        <InputLabel>Route Provider</InputLabel>
                        <Select
                          value={settings.route_outstandings}
                          label="Route Provider"
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              route_outstandings: e.target.value,
                            }))
                          }
                        >
                          <MenuItem value="unofficial">
                            Unofficial (Baileys)
                          </MenuItem>
                          <MenuItem value="official">
                            Official Meta API
                          </MenuItem>
                          <MenuItem value="none">Disabled</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* ============================================================ */}
      {/* TAB 2: TEMPLATE LIBRARY & 1-CLICK VERIFICATION                */}
      {/* ============================================================ */}
      {activeTab === "templates" && (
        <Stack spacing={3}>
          <Card elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Box
              sx={{
                p: 2,
                px: 3,
                bgcolor: "grey.900",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <BookOpen size={22} color="white" />
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    WHATSAPP TEMPLATE LIBRARY & API VERIFICATION
                  </Typography>
                  <Typography variant="caption" sx={{ color: "grey.400" }}>
                    Create custom templates, set category defaults, and register on MSG91 / Meta Cloud API with 1-click.
                  </Typography>
                </Box>
              </Box>

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="contained"
                  color="secondary"
                  size="small"
                  onClick={handleVerifyAndRegisterTemplates}
                  disabled={syncingTemplates}
                  startIcon={
                    syncingTemplates ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <RefreshCw size={14} />
                    )
                  }
                  sx={{ fontWeight: 600 }}
                >
                  {syncingTemplates ? "Syncing API & Status..." : "SYNC TEMPLATES & STATUS"}
                </Button>

                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  onClick={handleOpenCreateTemplateModal}
                  startIcon={<Plus size={14} />}
                >
                  Create Template
                </Button>
              </Stack>
            </Box>

            <CardContent sx={{ p: 3 }}>
              {/* Category Filter Chips */}
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 1 }}>
                CATEGORY FILTERS:
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: "auto", pb: 1 }}>
                {["all", "invoice", "ledgers", "outstandings", "marketing", "sales_return", "purchase_return"].map((cat) => (
                  <Chip
                    key={cat}
                    label={cat === "all" ? "All Categories" : cat.toUpperCase().replace("_", " ")}
                    color={templateFilter === cat ? "primary" : "default"}
                    onClick={() => setTemplateFilter(cat)}
                    variant={templateFilter === cat ? "filled" : "outlined"}
                    clickable
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Stack>

              {/* Status Categorization Filter Chips */}
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 1 }}>
                META STATUS FILTERS:
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: "wrap", gap: 1 }}>
                <Chip
                  label={`All Statuses (${templates.length})`}
                  color={statusFilter === "all" ? "primary" : "default"}
                  onClick={() => setStatusFilter("all")}
                  variant={statusFilter === "all" ? "filled" : "outlined"}
                  clickable
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  icon={<CheckCircle2 size={12} />}
                  label={`Approved (${templates.filter((t) => (t.meta_status || "").toUpperCase() === "APPROVED").length})`}
                  color={statusFilter === "APPROVED" ? "success" : "default"}
                  onClick={() => setStatusFilter("APPROVED")}
                  variant={statusFilter === "APPROVED" ? "filled" : "outlined"}
                  clickable
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  icon={<Clock size={12} />}
                  label={`In Review / Pending (${templates.filter((t) => {
                    const st = (t.meta_status || "").toUpperCase();
                    return st === "PENDING" || st === "IN_REVIEW";
                  }).length})`}
                  color={statusFilter === "PENDING" ? "warning" : "default"}
                  onClick={() => setStatusFilter("PENDING")}
                  variant={statusFilter === "PENDING" ? "filled" : "outlined"}
                  clickable
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  icon={<AlertCircle size={12} />}
                  label={`Rejected (${templates.filter((t) => (t.meta_status || "").toUpperCase() === "REJECTED").length})`}
                  color={statusFilter === "REJECTED" ? "error" : "default"}
                  onClick={() => setStatusFilter("REJECTED")}
                  variant={statusFilter === "REJECTED" ? "filled" : "outlined"}
                  clickable
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  label={`Local / Unverified (${templates.filter((t) => {
                    const st = (t.meta_status || "").toUpperCase();
                    return st === "LOCAL_ONLY" || st === "UNVERIFIED" || st === "NOT_SUBMITTED" || !t.meta_status;
                  }).length})`}
                  color={statusFilter === "LOCAL_ONLY" ? "secondary" : "default"}
                  onClick={() => setStatusFilter("LOCAL_ONLY")}
                  variant={statusFilter === "LOCAL_ONLY" ? "filled" : "outlined"}
                  clickable
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Stack>

              {/* Template Cards Grid */}
              {loadingTemplates ? (
                <Box sx={{ textAlign: "center", py: 5 }}>
                  <CircularProgress size={30} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Loading template library...
                  </Typography>
                </Box>
              ) : templates.filter((t) => {
                  const matchesCat = templateFilter === "all" || t.category === templateFilter;
                  const st = (t.meta_status || "LOCAL_ONLY").toUpperCase();
                  let matchesSt = true;
                  if (statusFilter === "APPROVED") matchesSt = st === "APPROVED";
                  else if (statusFilter === "PENDING") matchesSt = st === "PENDING" || st === "IN_REVIEW";
                  else if (statusFilter === "REJECTED") matchesSt = st === "REJECTED";
                  else if (statusFilter === "LOCAL_ONLY") matchesSt = st === "LOCAL_ONLY" || st === "UNVERIFIED" || st === "NOT_SUBMITTED" || !t.meta_status;
                  return matchesCat && matchesSt;
                }).length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No templates found for this filter criteria. Click <b>Create Template</b> to add one or click <b>SYNC TEMPLATES & STATUS</b> to pull live templates from MSG91/Meta!
                </Alert>
              ) : (
                <Grid container spacing={2.5}>
                  {templates
                    .filter((t) => {
                      const matchesCat = templateFilter === "all" || t.category === templateFilter;
                      const st = (t.meta_status || "LOCAL_ONLY").toUpperCase();
                      let matchesSt = true;
                      if (statusFilter === "APPROVED") matchesSt = st === "APPROVED";
                      else if (statusFilter === "PENDING") matchesSt = st === "PENDING" || st === "IN_REVIEW";
                      else if (statusFilter === "REJECTED") matchesSt = st === "REJECTED";
                      else if (statusFilter === "LOCAL_ONLY") matchesSt = st === "LOCAL_ONLY" || st === "UNVERIFIED" || st === "NOT_SUBMITTED" || !t.meta_status;
                      return matchesCat && matchesSt;
                    })
                    .map((tpl) => (
                      <Grid item xs={12} md={6} lg={4} key={tpl.id}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            borderColor: tpl.is_default ? "primary.main" : "divider",
                            bgcolor: tpl.is_default ? "#f4f8ff" : "#ffffff",
                            position: "relative",
                          }}
                        >
                          <Box>
                            {/* Card Header */}
                            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 1 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Tooltip title={tpl.is_default ? "Default Template for category" : "Click to set as default"}>
                                  <IconButton
                                    size="small"
                                    color={tpl.is_default ? "warning" : "default"}
                                    onClick={() => handleSetDefaultTemplate(tpl.id, tpl.category)}
                                  >
                                    <Star size={18} fill={tpl.is_default ? "#ffb400" : "none"} />
                                  </IconButton>
                                </Tooltip>

                                <Box>
                                  <Typography fontWeight={700} variant="subtitle2" sx={{ lineHeight: 1.2 }}>
                                    {tpl.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Cat: <b>{tpl.category}</b>
                                  </Typography>
                                </Box>
                              </Box>

                              <Stack direction="row" spacing={0.5} alignItems="center">
                                {tpl.meta_status === "APPROVED" ? (
                                  <Chip label="Approved" size="small" color="success" icon={<CheckCircle2 size={12} />} variant="outlined" />
                                ) : tpl.meta_status === "PENDING" ? (
                                  <Chip label="Pending" size="small" color="warning" icon={<Clock size={12} />} variant="outlined" />
                                ) : tpl.meta_status === "REJECTED" ? (
                                  <Chip label="Rejected" size="small" color="error" icon={<AlertCircle size={12} />} variant="outlined" />
                                ) : (
                                  <Chip label="Local" size="small" color="default" variant="outlined" />
                                )}
                              </Stack>
                            </Box>

                            {/* Meta Template Name */}
                            {tpl.meta_template_name && (
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, fontStyle: "italic" }}>
                                Meta ID: <code>{tpl.meta_template_name}</code>
                              </Typography>
                            )}

                            {/* Content Body Preview */}
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 1.5,
                                my: 1,
                                borderRadius: 2,
                                bgcolor: "#fafafa",
                                fontSize: "0.82rem",
                                fontFamily: "monospace",
                                whiteSpace: "pre-wrap",
                                maxHeight: 130,
                                overflowY: "auto",
                                color: "#333",
                              }}
                            >
                              {tpl.content}
                            </Paper>
                          </Box>

                          {/* Footer Actions */}
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1.5, pt: 1, borderTop: "1px solid #f0f0f0" }}>
                            <Button
                              size="small"
                              variant="text"
                              color="primary"
                              startIcon={<Edit3 size={14} />}
                              onClick={() => handleOpenEditTemplateModal(tpl)}
                            >
                              Edit
                            </Button>

                            {tpl.is_default === 0 ? (
                              <Button
                                size="small"
                                variant="text"
                                color="error"
                                startIcon={<Trash2 size={14} />}
                                onClick={() => handleDeleteTemplateItem(tpl.id)}
                              >
                                Delete
                              </Button>
                            ) : (
                              <Typography variant="caption" color="primary" fontWeight={600}>
                                ★ Active Default
                              </Typography>
                            )}
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* --- Template Create / Edit Modal Dialog --- */}
      <Dialog open={templateModalOpen} onClose={() => setTemplateModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingTemplate ? "Edit WhatsApp Template" : "Create New WhatsApp Template"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Template Display Name"
              size="small"
              fullWidth
              placeholder="e.g. Festival Special Offer"
              value={templateForm.name}
              onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={templateForm.category}
                    label="Category"
                    onChange={(e) => setTemplateForm((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    <MenuItem value="invoice">Invoice Delivery</MenuItem>
                    <MenuItem value="ledgers">Account Ledgers</MenuItem>
                    <MenuItem value="outstandings">Payment Reminders</MenuItem>
                    <MenuItem value="marketing">Marketing Broadcast</MenuItem>
                    <MenuItem value="retention">Customer Retention</MenuItem>
                    <MenuItem value="sales_return">Sales Return</MenuItem>
                    <MenuItem value="purchase_return">Purchase Return</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Meta/MSG91 Template Identifier"
                  size="small"
                  fullWidth
                  placeholder="e.g. festival_special_offer"
                  value={templateForm.meta_template_name}
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, meta_template_name: e.target.value }))}
                  helperText="Lowercase & underscores only for API registration"
                />
              </Grid>
            </Grid>

            {/* Quick Variable Tag Insertion Bar */}
            <Box>
              <Typography variant="caption" fontWeight={600} color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Click to Insert Dynamic Placeholders:
              </Typography>
              <Stack direction="row" spacing={0.8} flexWrap="wrap" gap={0.5}>
                {["{{Name}}", "{{ShopName}}", "{{Total}}", "{{Bills}}", "{{ReferenceNo}}", "{{Amount}}", "{{DueDate}}", "{{PayLink}}"].map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    color="primary"
                    variant="outlined"
                    clickable
                    onClick={() =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        content: prev.content + " " + tag,
                      }))
                    }
                  />
                ))}
              </Stack>
            </Box>

            <TextField
              label="Template Message Content"
              multiline
              rows={5}
              fullWidth
              placeholder="Dear {{Name}}, thank you for shopping at {{ShopName}}! Your total is ₹{{Total}}."
              value={templateForm.content}
              onChange={(e) => setTemplateForm((prev) => ({ ...prev, content: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={() => setTemplateModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSaveTemplateForm}>
            {editingTemplate ? "Update Template" : "Save & Add Template"}
          </Button>
        </DialogActions>
      </Dialog>
      {activeTab === "analytics" && (
        <Stack spacing={3}>
          {/* Summary Metric Cards */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Paper
                elevation={1}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  borderLeft: "5px solid #1976d2",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Official Meta API Delivered
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {totalOfficialSent}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tracked for API billing
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Paper
                elevation={1}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  borderLeft: "5px solid #2e7d32",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Unofficial Baileys Delivered
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {totalUnofficialSent}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Zero external cost
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Paper
                elevation={1}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  borderLeft: "5px solid #ed6c02",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Total WhatsApp Sent
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {totalAllSent}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Combined deliveries
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Daily Usage Table */}
          <Card elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Box
              sx={{
                p: 1.5,
                px: 2.5,
                bgcolor: "primary.main",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, letterSpacing: 0.5 }}
              >
                DAILY MESSAGE USAGE LOG (META API VS BAILEYS)
              </Typography>
              <Button
                size="small"
                variant="outlined"
                sx={{ color: "white", borderColor: "white" }}
                onClick={loadAnalytics}
                startIcon={<RefreshCw size={14} />}
              >
                Refresh Log
              </Button>
            </Box>

            <TableContainer>
              <Table size="medium">
                <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      Official Meta API Sent
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      Unofficial Baileys Sent
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      Total Sent
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      Failed Attempts
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingAnalytics ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : analyticsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          No messages logged yet. Sent messages will automatically appear here!
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    analyticsData.map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {row.date}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${row.official_count || 0} msgs`}
                            color="primary"
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${row.unofficial_count || 0} msgs`}
                            color="success"
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                          {row.total_sent || 0}
                        </TableCell>
                        <TableCell align="center">
                          {row.failed_count > 0 ? (
                            <Chip
                              label={`${row.failed_count} failed`}
                              color="error"
                              size="small"
                            />
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              0
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Stack>
      )}
    </Box>
  );
}
