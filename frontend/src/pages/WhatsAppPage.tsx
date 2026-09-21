"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Send,
  FileText,
  BookOpen,
  Megaphone,
  Clock,
  ShieldCheck,
  Zap,
  Plus,
  Trash2,
  Edit,
  Check,
  XCircle,
  LayoutGrid,
  Columns,
  Smartphone,
  CheckCircle2,
  CheckCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import DashboardHeader from "../components/DashboardHeader";
import { getShopData } from "../lib/api/shopService";
import { hydrateTemplate, getResolvedShopName } from "../lib/utils/templateRenderer";

const { electron } = window;

const CATEGORY_OPTIONS = [
  { value: "invoice", label: "📄 Invoices & Bills" },
  { value: "ledgers", label: "📒 Customer/Supplier Ledgers" },
  { value: "marketing", label: "📣 Marketing Broadcasts" },
  { value: "outstandings", label: "⏰ Outstanding Dues" },
  { value: "sales_return", label: "🔄 Sales Returns" },
  { value: "purchase_return", label: "📦 Purchase Returns" },
];

const VARIABLE_HELPER_PILLS = [
  "{{name}}",
  "{{shop_name}}",
  "{{total}}",
  "{{bills}}",
  "{{invoice_no}}",
  "{{amount}}",
  "{{reference_no}}",
  "{{supplier_name}}",
];

const validateMetaTemplate = (content: string): { valid: boolean; error?: string } => {
  const trimmed = content.trim();
  if (!trimmed) return { valid: false, error: "Template content cannot be empty." };

  // Rule 1: No variable at start or end
  if (/^\s*\{\{/.test(content)) {
    return {
      valid: false,
      error: "Meta Rule Violation: Template content cannot start with a variable ({{var}}). Please add introductory text (e.g., 'Hello {{name}}').",
    };
  }
  if (/\}\}\s*$/.test(content)) {
    return {
      valid: false,
      error: "Meta Rule Violation: Template content cannot end with a variable ({{var}}). Please add closing text (e.g., 'Thank you!').",
    };
  }

  // Rule 2: All variables in small case only (no uppercase/camelCase)
  const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
  for (const match of matches) {
    const varName = match.replace(/[\{\}]/g, "").trim();
    if (/[A-Z]/.test(varName)) {
      return {
        valid: false,
        error: `Meta Rule Violation: Variable '${match}' contains uppercase letters. Meta requires all variable names in small case (e.g., '{{${varName.toLowerCase()}}}').`,
      };
    }
  }

  // Rule 3: No consecutive variables without text in between
  if (/\{\{[^}]+\}\}\s*\{\{[^}]+\}\}/.test(content)) {
    return {
      valid: false,
      error: "Meta Rule Violation: Cannot have consecutive variables next to each other. Please insert text or punctuation between them.",
    };
  }

  return { valid: true };
};

interface WhatsAppPageProps {
  defaultTab?: "setup" | "templates" | "analytics";
}

export default function WhatsAppPage({ defaultTab = "setup" }: WhatsAppPageProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "setup" | "templates" | "analytics"
  >(defaultTab);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);
  const [guideDialogOpen, setGuideDialogOpen] = useState(false);

  // --- TAB 1: Provider Setup & Routing ---
  const [status, setStatus] = useState("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);

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
  const [testingOfficial, setTestingOfficial] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    displayPhoneNumber?: string;
    verifiedName?: string;
    error?: string;
  } | null>(null);

  const [testingMsg91, setTestingMsg91] = useState(false);
  const [msg91TestResult, setMsg91TestResult] = useState<{
    success: boolean;
    displayPhoneNumber?: string;
    verifiedName?: string;
    error?: string;
  } | null>(null);

  // --- TAB 2: Template Library ---
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [verifyingMeta, setVerifyingMeta] = useState(false);
  const [registeringMeta, setRegisteringMeta] = useState(false);
  const [singleProcessingId, setSingleProcessingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "split">("grid");
  const [previewTemplateId, setPreviewTemplateId] = useState<number | null>(null);
  const [shopName, setShopName] = useState<string>(getResolvedShopName());

  const SAMPLE_PREVIEW_VARS = {
    name: "Rahul Sharma",
    customer_name: "Rahul Sharma",
    shop_name: getResolvedShopName(shopName),
    total: "14,500.00",
    amount: "14,500.00",
    reference_no: "INV/2026-27/00084",
    due_date: "15 Sep 2026",
    pay_link: "https://upi.link/kosh",
    supplier_name: "Apex Logistics",
    bills: "INV/001, INV/002",
    invoice_no: "INV/2026-27/00084",
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory =
      selectedCategory === "all" ||
      t.category?.toLowerCase() === selectedCategory.toLowerCase();
    const st = (t.meta_status || "LOCAL_ONLY").toUpperCase();
    let matchesStatus = true;
    if (selectedStatus === "APPROVED") matchesStatus = st === "APPROVED";
    else if (selectedStatus === "PENDING") matchesStatus = st === "PENDING" || st === "IN_REVIEW";
    else if (selectedStatus === "REJECTED") matchesStatus = st === "REJECTED";
    else if (selectedStatus === "LOCAL_ONLY")
      matchesStatus = st === "LOCAL_ONLY" || st === "UNVERIFIED" || st === "NOT_SUBMITTED" || !t.meta_status;
    return matchesCategory && matchesStatus;
  });

  const handleRegisterAllMetaTemplates = async () => {
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

    const providerName = isMsg91 ? "MSG91" : "Meta API";
    setRegisteringMeta(true);
    const toastId = toast.loading(
      `Submitting & Registering All Templates with ${providerName}...`
    );

    try {
      const res = await electron.registerAllWhatsAppTemplates();
      if (res.success) {
        if (res.templates) setTemplates(res.templates);
        toast.success(
          `Successfully registered ${res.registeredCount || 0} templates with ${providerName}!`,
          { id: toastId }
        );
      } else {
        toast.error(`Registration failed: ${res.error}`, { id: toastId });
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`, { id: toastId });
    } finally {
      setRegisteringMeta(false);
    }
  };

  // Add/Edit Template Dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    category: "marketing",
    content: "",
    meta_template_name: "",
    language: "en_US",
  });

  // --- TAB 4: Usage Analytics ---
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    // 1. Get Baileys Status & listener
    if (electron?.getWhatsAppStatus) {
      electron.getWhatsAppStatus().then((data: any) => {
        if (data) {
          setStatus(data.status);
          setQrCode(data.qr);
        }
      });
    }

    if (electron?.onWhatsAppUpdate) {
      electron.onWhatsAppUpdate((data: any) => {
        if (data) {
          setStatus(data.status);
          setQrCode(data.qr);
        }
      });
    }

    if (electron?.onMsg91SignupCaptured) {
      electron.onMsg91SignupCaptured((data: any) => {
        if (data) {
          setSettings((prev) => ({
            ...prev,
            msg91_auth_key: data.authKey || prev.msg91_auth_key,
            msg91_integrated_number:
              data.integratedNumber || prev.msg91_integrated_number,
          }));
          toast.success(
            "Auto-captured MSG91 credentials from Embedded Signup window!"
          );
        }
      });
    }

    // 2. Load settings, templates, analytics, shop data
    getShopData().then((s) => {
      if (s?.shop_name) setShopName(s.shop_name);
    });
    loadSettings();
    loadTemplates();
    loadAnalytics();
  }, []);

  const loadSettings = async () => {
    try {
      if (electron?.getWhatsAppSettings) {
        const res = await electron.getWhatsAppSettings();
        if (res.success && res.settings) {
          setSettings({
            ...res.settings,
            official_provider: res.settings.official_provider || "msg91",
          });
        }
      }
    } catch (e) {
      console.error("Error loading WhatsApp settings:", e);
    }
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      if (electron?.getWhatsAppTemplates) {
        const res = await electron.getWhatsAppTemplates();
        if (res.success && res.templates) {
          setTemplates(res.templates);
        }
      }
    } catch (e) {
      console.error("Error loading WhatsApp templates:", e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      if (electron?.getWhatsAppAnalytics) {
        const res = await electron.getWhatsAppAnalytics(30);
        if (res.success && res.stats) {
          setAnalyticsData(res.stats);
        }
      }
    } catch (e) {
      console.error("Error loading WhatsApp analytics:", e);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // --- Actions ---
  const handleRestartSocket = async () => {
    if (restarting) return;
    setRestarting(true);
    const toastId = toast.loading("Restarting Baileys WhatsApp Socket...");

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

  const handleTestOfficial = async () => {
    if (!settings.official_phone_number_id || !settings.official_access_token) {
      toast.error("Please enter Phone Number ID and Access Token.");
      return;
    }

    setTestingOfficial(true);
    setTestResult(null);
    const toastId = toast.loading("Verifying Meta Cloud API Credentials...");

    try {
      const res = await electron.testWhatsAppOfficial({
        phoneNumberId: settings.official_phone_number_id,
        accessToken: settings.official_access_token,
      });

      setTestResult(res);
      if (res.success) {
        toast.success(
          `Connected! Business Name: ${res.verifiedName || "WhatsApp Business"} (${res.displayPhoneNumber})`,
          { id: toastId }
        );
      } else {
        toast.error(`Meta Test Failed: ${res.error}`, { id: toastId });
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`, { id: toastId });
    } finally {
      setTestingOfficial(false);
    }
  };

  const handleOpenMsg91Signup = async () => {
    try {
      if (electron?.openMsg91EmbeddedSignup) {
        await electron.openMsg91EmbeddedSignup();
        toast("Opening MSG91 Embedded Signup window...", { icon: "🚀" });
      } else {
        window.open("https://control.msg91.com/signup/", "_blank");
      }
    } catch (e: any) {
      window.open("https://control.msg91.com/signup/", "_blank");
    }
  };

  const handleTestMsg91 = async () => {
    if (!settings.msg91_auth_key) {
      toast.error("Please enter MSG91 Auth Key before testing.");
      return;
    }

    setTestingMsg91(true);
    setMsg91TestResult(null);
    const toastId = toast.loading("Verifying MSG91 API Credentials...");

    try {
      const res = await electron.testWhatsAppMsg91({
        authKey: settings.msg91_auth_key,
        integratedNumber: settings.msg91_integrated_number,
      });

      setMsg91TestResult(res);
      if (res.success) {
        toast.success(
          `Connected! Business Name: ${res.verifiedName || "MSG91 Account"} (${res.displayPhoneNumber})`,
          { id: toastId }
        );
      } else {
        toast.error(`MSG91 Test Failed: ${res.error}`, { id: toastId });
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`, { id: toastId });
    } finally {
      setTestingMsg91(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const toastId = toast.loading("Saving WhatsApp Configuration...");

    try {
      const res = await electron.saveWhatsAppSettings(settings);
      if (res.success && res.settings) {
        setSettings(res.settings);
        toast.success("WhatsApp Configuration saved!", { id: toastId });
      } else {
        toast.error(`Failed to save: ${res.error}`, { id: toastId });
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`, { id: toastId });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleVerifyMetaTemplates = async () => {
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

    const providerName = isMsg91 ? "MSG91" : "Meta API";
    setVerifyingMeta(true);
    const toastId = toast.loading(`Syncing Live Template Status with ${providerName}...`);

    try {
      const res = await electron.verifyMetaTemplates();
      if (res.success && res.templates) {
        setTemplates(res.templates);
        toast.success(
          `Synced with ${providerName}! Processed ${res.syncedCount || 0} remote templates.`,
          { id: toastId }
        );
      } else {
        toast.error(`Sync failed: ${res.error}`, { id: toastId });
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`, { id: toastId });
    } finally {
      setVerifyingMeta(false);
    }
  };

  const handleRegisterSingleTemplate = async (templateId: number) => {
    const isMsg91 = settings.official_provider === "msg91";
    if (isMsg91 ? !settings.msg91_auth_key : (!settings.official_waba_id || !settings.official_access_token)) {
      toast.error(`Please configure your ${isMsg91 ? 'MSG91' : 'Meta Cloud API'} credentials in Setup tab.`);
      return;
    }
    setSingleProcessingId(templateId);
    const toastId = toast.loading("Submitting & Registering template with provider...");
    try {
      const res = await electron.registerSingleWhatsAppTemplate(templateId);
      if (res.success && res.templates) {
        setTemplates(res.templates);
        toast.success("Template registered successfully!", { id: toastId });
      } else {
        toast.error(`Registration failed: ${res.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`, { id: toastId });
    } finally {
      setSingleProcessingId(null);
    }
  };

  const handleVerifySingleTemplate = async (templateId: number) => {
    const isMsg91 = settings.official_provider === "msg91";
    if (isMsg91 ? !settings.msg91_auth_key : (!settings.official_waba_id || !settings.official_access_token)) {
      toast.error(`Please configure your ${isMsg91 ? 'MSG91' : 'Meta Cloud API'} credentials in Setup tab.`);
      return;
    }
    setSingleProcessingId(templateId);
    const toastId = toast.loading("Checking live template status...");
    try {
      const res = await electron.verifySingleWhatsAppTemplate(templateId);
      if (res.success && res.templates) {
        setTemplates(res.templates);
        toast.success("Template status updated!", { id: toastId });
      } else {
        toast.error(`Verification failed: ${res.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`, { id: toastId });
    } finally {
      setSingleProcessingId(null);
    }
  };

  // --- Template Form Dialog Handlers ---
  const handleOpenAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: "",
      category: "marketing",
      content: "",
      meta_template_name: "",
      language: "en_US",
    });
    setTemplateDialogOpen(true);
  };

  const handleOpenEditTemplate = (tpl: any) => {
    setEditingTemplate(tpl);
    setTemplateForm({
      name: tpl.name,
      category: tpl.category,
      content: tpl.content,
      meta_template_name: tpl.meta_template_name || "",
      language: tpl.language || "en_US",
    });
    setTemplateDialogOpen(true);
  };

  const handleInsertVariable = (variable: string) => {
    setTemplateForm((prev) => ({
      ...prev,
      content: prev.content + " " + variable,
    }));
  };

  const handleSaveTemplateForm = async () => {
    if (!templateForm.name.trim() || !templateForm.content.trim()) {
      toast.error("Template Name and Content body are required.");
      return;
    }

    // Enforce Meta Template Rules
    const validation = validateMetaTemplate(templateForm.content);
    if (!validation.valid) {
      toast.error(validation.error || "Meta Rule Violation");
      return;
    }

    const toastId = toast.loading("Saving Template...");

    try {
      const payload = {
        id: editingTemplate ? editingTemplate.id : undefined,
        ...templateForm,
      };

      const res = await electron.saveWhatsAppTemplate(payload);
      if (res.success) {
        toast.success("Template saved successfully!", { id: toastId });
        setTemplateDialogOpen(false);
        loadTemplates();
      } else {
        toast.error(`Failed: ${res.error}`, { id: toastId });
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`, { id: toastId });
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Are you sure you want to delete this custom template?"))
      return;

    const toastId = toast.loading("Deleting Template...");
    try {
      const res = await electron.deleteWhatsAppTemplate(id);
      if (res.success) {
        toast.success("Template deleted!", { id: toastId });
        loadTemplates();
      } else {
        toast.error(`Delete failed: ${res.error}`, { id: toastId });
      }
    } catch (e: any) {
      toast.error(`Error: ${e.message}`, { id: toastId });
    }
  };

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
    <Box sx={{ p: 3, maxWidth: 1400, margin: "0 auto" }}>
      {/* --- Dashboard Header Bar --- */}
      <DashboardHeader
        title="WhatsApp Center & Template Library"
        showDateFilters={false}
        showSearch={false}
        onRefresh={() => {
          loadSettings();
          loadTemplates();
        }}
        actions={
          <Button
            variant="contained"
            color="secondary"
            size="small"
            onClick={handleVerifyMetaTemplates}
            disabled={verifyingMeta}
            startIcon={verifyingMeta ? <CircularProgress size={14} color="inherit" /> : <RefreshCw size={14} />}
            sx={{ fontWeight: 700, borderRadius: "12px", px: 2, height: 44 }}
          >
            {verifyingMeta ? "Syncing..." : "SYNC TEMPLATES & STATUS"}
          </Button>
        }
      />

      {/* --- Unified Segmented Tab Bar --- */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Paper
          elevation={0}
          sx={{
            p: 0.5,
            borderRadius: "14px",
            bgcolor: "grey.100",
            border: "1px solid",
            borderColor: "divider",
            display: "inline-flex",
            alignItems: "center",
            height: 46,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{
              minHeight: 38,
              "& .MuiTabs-indicator": {
                height: "100%",
                borderRadius: "10px",
                bgcolor: "background.paper",
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                zIndex: 0,
              },
            }}
          >
            <Tab
              value="setup"
              label="⚙️ Provider Setup & Routing"
              sx={{
                fontWeight: 700,
                textTransform: "none",
                fontSize: "0.875rem",
                minHeight: 38,
                px: 2.5,
                borderRadius: "10px",
                zIndex: 1,
                color: activeTab === "setup" ? "primary.main" : "text.secondary",
                "&.Mui-selected": { color: "primary.main" },
              }}
            />
            <Tab
              value="templates"
              label="📚 Template Library & Verification"
              sx={{
                fontWeight: 700,
                textTransform: "none",
                fontSize: "0.875rem",
                minHeight: 38,
                px: 2.5,
                borderRadius: "10px",
                zIndex: 1,
                color: activeTab === "templates" ? "primary.main" : "text.secondary",
                "&.Mui-selected": { color: "primary.main" },
              }}
            />
            <Tab
              value="analytics"
              label="📊 Daily Usage & Billing Log"
              sx={{
                fontWeight: 700,
                textTransform: "none",
                fontSize: "0.875rem",
                minHeight: 38,
                px: 2.5,
                borderRadius: "10px",
                zIndex: 1,
                color: activeTab === "analytics" ? "primary.main" : "text.secondary",
                "&.Mui-selected": { color: "primary.main" },
              }}
            />
          </Tabs>
        </Paper>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            color="success"
            onClick={() => navigate("/messaging")}
            startIcon={<Send size={16} />}
            sx={{ fontWeight: 700, borderRadius: "14px", px: 2.5, height: 46, textTransform: "none" }}
          >
            🚀 Customer Broadcast Center
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={() => setGuideDialogOpen(true)}
            startIcon={<BookOpen size={16} />}
            sx={{ fontWeight: 700, borderRadius: "14px", px: 2.5, height: 46, textTransform: "none" }}
          >
            📘 Meta Setup Guide & Credentials
          </Button>
        </Stack>
      </Box>

      {/* ============================================================ */}
      {/* TAB 1: PROVIDER SETUP & DISPATCH ROUTING                     */}
      {/* ============================================================ */}
      {activeTab === "setup" && (
        <Stack spacing={3}>
          <Grid container spacing={3}>
            {/* --- Unofficial Baileys Card --- */}
            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  borderRadius: "16px",
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    px: 2.5,
                    bgcolor: "grey.900",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <QrCode size={18} color="#4ade80" />
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, letterSpacing: 0.5, color: "white" }}
                  >
                    UNOFFICIAL WHATSAPP (BAILEYS)
                  </Typography>
                </Box>
                <CardContent
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    p: 3,
                    minHeight: 400,
                  }}
                >
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
                        size={64}
                        strokeWidth={1.5}
                        style={{ marginBottom: 12 }}
                      />
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Baileys Socket Active
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2.5 }}
                      >
                        Websocket ready for outgoing invoices & messages.
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={handleRestartSocket}
                        disabled={restarting}
                        startIcon={
                          restarting ? (
                            <CircularProgress size={14} />
                          ) : (
                            <RefreshCw size={14} />
                          )
                        }
                        sx={{ borderRadius: "10px", fontWeight: 700 }}
                      >
                        {restarting ? "Restarting..." : "Restart Socket"}
                      </Button>
                    </Box>
                  ) : (
                    <Stack spacing={2} alignItems="center" sx={{ width: "100%" }}>
                      <Box
                        sx={{
                          height: 220,
                          width: 220,
                          mx: "auto",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: "grey.50",
                          borderRadius: "16px",
                          border: "2px dashed",
                          borderColor: "divider",
                          p: 1,
                        }}
                      >
                        {qrCode ? (
                          <img
                            src={qrCode}
                            alt="WhatsApp QR"
                            style={{
                              width: "100%",
                              height: "100%",
                              borderRadius: 12,
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <Stack alignItems="center" spacing={1}>
                            <CircularProgress size={28} color="primary" />
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
                        spacing={1.5}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Chip
                          label={`Status: ${status?.toUpperCase()}`}
                          color={status === "scanning" ? "warning" : "default"}
                          variant="outlined"
                          size="small"
                          sx={{ fontWeight: 700, height: 28 }}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={handleRestartSocket}
                          disabled={restarting}
                          startIcon={
                            restarting ? (
                              <CircularProgress size={14} />
                            ) : (
                              <RefreshCw size={14} />
                            )
                          }
                          sx={{ borderRadius: "8px", fontWeight: 700, height: 28 }}
                        >
                          {restarting ? "Restarting..." : "Restart Socket"}
                        </Button>
                      </Stack>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* --- Official Meta WhatsApp API Card (MSG91 BSP or Direct Meta) --- */}
            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  borderRadius: "16px",
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    px: 2.5,
                    bgcolor: "grey.900",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Globe size={18} color="#38bdf8" />
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, letterSpacing: 0.5, color: "white" }}
                  >
                    OFFICIAL META WHATSAPP API & BSP
                  </Typography>
                </Box>
                <CardContent sx={{ flexGrow: 1, p: 3, minHeight: 400 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Select your official Meta provider gateway. <b>MSG91</b> supports Indian Rupee (INR) UPI/GPay wallet top-ups and WhatsApp App coexistence.
                  </Typography>

                  <Stack spacing={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Official Gateway Provider</InputLabel>
                      <Select
                        value={settings.official_provider || "msg91"}
                        label="Official Gateway Provider"
                        onChange={(e) => {
                          setTestResult(null);
                          setMsg91TestResult(null);
                          setSettings((prev) => ({
                            ...prev,
                            official_provider: e.target.value,
                          }));
                        }}
                        sx={{ borderRadius: "10px" }}
                      >
                        <MenuItem value="msg91">
                          🚀 MSG91 (Recommended for India - UPI/GPay & App Coexistence)
                        </MenuItem>
                        <MenuItem value="meta_direct">
                          🌐 Direct Meta Cloud API (Requires USD Credit Card)
                        </MenuItem>
                      </Select>
                    </FormControl>

                    {settings.official_provider === "msg91" ? (
                      <>
                        <Button
                          variant="contained"
                          color="success"
                          fullWidth
                          onClick={handleOpenMsg91Signup}
                          startIcon={<Globe size={18} />}
                          sx={{ py: 1.2, fontWeight: 700, borderRadius: "10px" }}
                        >
                          🚀 Register / Connect with MSG91 Embedded Signup
                        </Button>

                        <Alert severity="info" sx={{ py: 0.5, borderRadius: "10px", fontSize: "0.8rem" }}>
                          <b>Where to find your MSG91 Auth Key:</b> In your MSG91 dashboard (left sidebar), go to <b>Account → Settings → Authkey</b>. Click <b>"Copy Authkey"</b> and paste below.
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
                          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
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
                          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                        />

                        {msg91TestResult && (
                          <Alert
                            severity={msg91TestResult.success ? "success" : "error"}
                            sx={{ py: 0.5, borderRadius: "10px" }}
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
                          onClick={handleTestMsg91}
                          disabled={testingMsg91}
                          startIcon={
                            testingMsg91 ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <Zap size={14} />
                            )
                          }
                          sx={{ py: 1, fontWeight: 700, borderRadius: "10px" }}
                        >
                          {testingMsg91
                            ? "Testing MSG91 Connection..."
                            : "Test MSG91 API Connection"}
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
                          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                        />

                        <TextField
                          label="WABA Account ID (WhatsApp Business Account ID)"
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
                          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                        />

                        <TextField
                          label="System User Access Token"
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
                          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
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
                          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                        />

                        {testResult && (
                          <Alert
                            severity={testResult.success ? "success" : "error"}
                            sx={{ py: 0.5, borderRadius: "10px" }}
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
                          onClick={handleTestOfficial}
                          disabled={testingOfficial}
                          startIcon={
                            testingOfficial ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <Zap size={14} />
                            )
                          }
                          sx={{ py: 1, fontWeight: 700, borderRadius: "10px" }}
                        >
                          {testingOfficial
                            ? "Testing Credentials..."
                            : "Test Meta API Connection"}
                        </Button>
                      </>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* --- Multi-Channel Routing Strategy Matrix --- */}
          <Card
            elevation={0}
            sx={{
              borderRadius: "16px",
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
            }}
          >
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
                <ShieldCheck size={18} color="#a7f3d0" />
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, letterSpacing: 0.5, color: "white" }}
                >
                  FEATURE DISPATCH ROUTING MATRIX
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
                sx={{ fontWeight: 700, borderRadius: "10px" }}
              >
                {savingSettings ? "Saving..." : "Save Preferences"}
              </Button>
            </Box>

            <CardContent sx={{ p: 3 }}>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, borderRadius: "12px", bgcolor: "grey.50", height: "100%" }}
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
                          sx={{ borderRadius: "8px" }}
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

                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, borderRadius: "12px", bgcolor: "grey.50", height: "100%" }}
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
                          sx={{ borderRadius: "8px" }}
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

                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, borderRadius: "12px", bgcolor: "grey.50", height: "100%" }}
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
                          sx={{ borderRadius: "8px" }}
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

                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, borderRadius: "12px", bgcolor: "grey.50", height: "100%" }}
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
                          sx={{ borderRadius: "8px" }}
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
      {/* TAB 2: TEMPLATE LIBRARY & META LIVE VERIFICATION             */}
      {/* ============================================================ */}
      {activeTab === "templates" && (
        <Grid container spacing={3}>
          {/* LEFT SIDEBAR: Categories & Status Filters (3.2 Cols) */}
          <Grid item xs={12} md={3.5} lg={3.2}>
            <Stack spacing={2.5}>
              {/* Category Filter Sidebar Paper */}
              <Paper elevation={1} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5, display: "block", mb: 1.5 }}>
                  TEMPLATE CATEGORIES
                </Typography>
                <Stack spacing={0.5}>
                  <Button
                    fullWidth
                    onClick={() => setSelectedCategory("all")}
                    variant={selectedCategory === "all" ? "contained" : "text"}
                    color={selectedCategory === "all" ? "primary" : "inherit"}
                    sx={{ justifyContent: "space-between", borderRadius: 2, textTransform: "none", py: 1, px: 1.5, fontWeight: 700 }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <BookOpen size={16} />
                      <span>All Categories</span>
                    </Box>
                    <Chip label={templates.length} size="small" color={selectedCategory === "all" ? "default" : "primary"} sx={{ height: 20, fontSize: "0.7rem", fontWeight: 800 }} />
                  </Button>

                  {CATEGORY_OPTIONS.map((cat) => {
                    const count = templates.filter((t) => (t.category || "").toLowerCase() === cat.value.toLowerCase()).length;
                    const isSelected = selectedCategory.toLowerCase() === cat.value.toLowerCase();
                    return (
                      <Button
                        key={cat.value}
                        fullWidth
                        onClick={() => setSelectedCategory(cat.value)}
                        variant={isSelected ? "contained" : "text"}
                        color={isSelected ? "primary" : "inherit"}
                        sx={{ justifyContent: "space-between", borderRadius: 2, textTransform: "none", py: 1, px: 1.5, fontWeight: 600 }}
                      >
                        <span>{cat.label}</span>
                        <Chip label={count} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }} />
                      </Button>
                    );
                  })}
                </Stack>
              </Paper>

              {/* Meta Approval Status Sidebar Paper */}
              <Paper elevation={1} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5, display: "block", mb: 1.5 }}>
                  META APPROVAL STATUS
                </Typography>
                <Stack spacing={0.5}>
                  {[
                    { value: "all", label: "All Statuses", count: templates.length },
                    { value: "APPROVED", label: "✔ Approved", count: templates.filter((t) => (t.meta_status || "").toUpperCase() === "APPROVED").length },
                    { value: "PENDING", label: "⏳ In Review / Pending", count: templates.filter((t) => { const st = (t.meta_status || "").toUpperCase(); return st === "PENDING" || st === "IN_REVIEW"; }).length },
                    { value: "REJECTED", label: "✖ Rejected", count: templates.filter((t) => (t.meta_status || "").toUpperCase() === "REJECTED").length },
                    { value: "LOCAL_ONLY", label: "🔘 Local / Unverified", count: templates.filter((t) => { const st = (t.meta_status || "").toUpperCase(); return st === "LOCAL_ONLY" || st === "UNVERIFIED" || st === "NOT_SUBMITTED" || !t.meta_status; }).length },
                  ].map((st) => {
                    const isSelected = selectedStatus === st.value;
                    return (
                      <Button
                        key={st.value}
                        fullWidth
                        onClick={() => setSelectedStatus(st.value)}
                        variant={isSelected ? "contained" : "text"}
                        color={isSelected ? "secondary" : "inherit"}
                        sx={{ justifyContent: "space-between", borderRadius: 2, textTransform: "none", py: 1, px: 1.5, fontWeight: 600 }}
                      >
                        <span>{st.label}</span>
                        <Chip label={st.count} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }} />
                      </Button>
                    );
                  })}
                </Stack>
              </Paper>
            </Stack>
          </Grid>

          {/* RIGHT MAIN AREA: Mode 1 (Grid) vs Mode 2 (Split with Preview) (8.8 Cols) */}
          <Grid item xs={12} md={8.5} lg={8.8}>
            <Stack spacing={2.5}>
              {/* Header Action Bar & Mode Switcher */}
              <Paper elevation={1} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
                <Typography variant="subtitle1" fontWeight={800}>
                  Templates ({filteredTemplates.length})
                </Typography>

                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                  {/* Mode Switcher Toggle Group */}
                  <Paper variant="outlined" sx={{ p: 0.5, borderRadius: 2, display: "flex", gap: 0.5, bgcolor: "grey.50" }}>
                    <Tooltip title="Mode 1: All Templates Grid">
                      <Button
                        size="small"
                        variant={viewMode === "grid" ? "contained" : "text"}
                        color={viewMode === "grid" ? "primary" : "inherit"}
                        onClick={() => setViewMode("grid")}
                        startIcon={<LayoutGrid size={16} />}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 1.5, py: 0.5, px: 1.5 }}
                      >
                        Grid Mode
                      </Button>
                    </Tooltip>
                    <Tooltip title="Mode 2: Templates + Live WhatsApp Preview">
                      <Button
                        size="small"
                        variant={viewMode === "split" ? "contained" : "text"}
                        color={viewMode === "split" ? "primary" : "inherit"}
                        onClick={() => setViewMode("split")}
                        startIcon={<Columns size={16} />}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 1.5, py: 0.5, px: 1.5 }}
                      >
                        Preview Mode
                      </Button>
                    </Tooltip>
                  </Paper>

                  <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    onClick={handleRegisterAllMetaTemplates}
                    disabled={registeringMeta}
                    startIcon={registeringMeta ? <CircularProgress size={14} color="inherit" /> : <Send size={14} />}
                    sx={{ fontWeight: 700, borderRadius: 2, px: 2 }}
                  >
                    {registeringMeta ? "Registering..." : `REGISTER WITH ${settings.official_provider === "msg91" ? "MSG91" : "META"}`}
                  </Button>

                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    onClick={handleVerifyMetaTemplates}
                    disabled={verifyingMeta}
                    startIcon={verifyingMeta ? <CircularProgress size={14} color="inherit" /> : <RefreshCw size={14} />}
                    sx={{ fontWeight: 700, borderRadius: 2, px: 2 }}
                  >
                    {verifyingMeta ? "Syncing..." : "SYNC STATUS"}
                  </Button>

                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={handleOpenAddTemplate}
                    startIcon={<Plus size={14} />}
                    sx={{ fontWeight: 700, borderRadius: 2, px: 2 }}
                  >
                    Create Template
                  </Button>
                </Stack>
              </Paper>

              {/* MODE 1: GRID VIEW */}
              {viewMode === "grid" && (
                <>
                  {loadingTemplates ? (
                    <Box sx={{ textAlign: "center", py: 6 }}>
                      <CircularProgress size={30} />
                    </Box>
                  ) : filteredTemplates.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
                      <Typography color="text.secondary">
                        No templates found for this filter criteria. Click <b>Create Template</b> to add one!
                      </Typography>
                    </Paper>
                  ) : (
                    <Grid container spacing={3}>
                      {filteredTemplates.map((tpl) => (
                        <Grid item xs={12} md={6} lg={4} key={tpl.id}>
                          <Card
                            elevation={2}
                            sx={{
                              height: "100%",
                              borderRadius: 3,
                              display: "flex",
                              flexDirection: "column",
                            }}
                          >
                            <Box
                              sx={{
                                p: 2,
                                bgcolor: tpl.is_default ? "grey.100" : "primary.50",
                                borderBottom: "1px solid #eee",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <Box>
                                <Typography fontWeight={700} variant="subtitle1">
                                  {tpl.name}
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                  <Chip
                                    label={tpl.category?.toUpperCase()}
                                    size="small"
                                    variant="outlined"
                                    color="default"
                                  />
                                  <Chip
                                    label={tpl.is_default ? "Built-In" : "User Created"}
                                    size="small"
                                    color={tpl.is_default ? "default" : "secondary"}
                                  />
                                </Stack>
                              </Box>
                              {!tpl.is_default && (
                                <Stack direction="row" spacing={0.5}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenEditTemplate(tpl)}
                                  >
                                    <Edit size={16} />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteTemplate(tpl.id)}
                                  >
                                    <Trash2 size={16} />
                                  </IconButton>
                                </Stack>
                              )}
                            </Box>

                            <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                              <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Meta Approval:
                                </Typography>
                                {tpl.meta_status === "APPROVED" ? (
                                  <Chip icon={<Check size={12} />} label="APPROVED" color="success" size="small" />
                                ) : tpl.meta_status === "PENDING" || tpl.meta_status === "IN_REVIEW" ? (
                                  <Chip icon={<Clock size={12} />} label="PENDING REVIEW" color="warning" size="small" />
                                ) : tpl.meta_status === "REJECTED" ? (
                                  <Chip icon={<XCircle size={12} />} label="REJECTED" color="error" size="small" />
                                ) : (
                                  <Chip label="LOCAL / UNVERIFIED" variant="outlined" size="small" />
                                )}
                              </Box>

                              <Paper
                                variant="outlined"
                                sx={{
                                  p: 1.5,
                                  bgcolor: "#fcfcfc",
                                  borderRadius: 2,
                                  whiteSpace: "pre-wrap",
                                  fontFamily: "monospace",
                                  fontSize: "0.85rem",
                                  maxHeight: 180,
                                  overflowY: "auto",
                                }}
                              >
                                {tpl.content}
                              </Paper>

                              {tpl.meta_template_name && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
                                  Meta Code: <code>{tpl.meta_template_name}</code>
                                </Typography>
                              )}

                              {/* Individual Template Controls for Registration and Verification */}
                              <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid #eee", display: "flex", gap: 1, justifyContent: "space-between" }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="secondary"
                                  disabled={singleProcessingId === tpl.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRegisterSingleTemplate(tpl.id);
                                  }}
                                  startIcon={singleProcessingId === tpl.id ? <CircularProgress size={12} color="inherit" /> : <Send size={12} />}
                                  sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700, fontSize: "0.75rem", flex: 1 }}
                                >
                                  Register
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  disabled={singleProcessingId === tpl.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVerifySingleTemplate(tpl.id);
                                  }}
                                  startIcon={singleProcessingId === tpl.id ? <CircularProgress size={12} color="inherit" /> : <RefreshCw size={12} />}
                                  sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700, fontSize: "0.75rem", flex: 1 }}
                                >
                                  Verify Status
                                </Button>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </>
              )}

              {/* MODE 2: SPLIT MODE (TEMPLATES LIST + LIVE WHATSAPP PHONE PREVIEW) */}
              {viewMode === "split" && (
                <Grid container spacing={2.5}>
                  {/* Left Column: Filtered Templates List (Width 5.5) */}
                  <Grid item xs={12} md={5.5}>
                    <Stack spacing={1.5} sx={{ maxHeight: 620, overflowY: "auto", pr: 0.5 }}>
                      {filteredTemplates.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                          No templates found for this filter.
                        </Alert>
                      ) : (
                        filteredTemplates.map((tpl) => {
                          const activeId = previewTemplateId || filteredTemplates[0]?.id;
                          const isSelected = activeId === tpl.id;
                          return (
                            <Paper
                              key={tpl.id}
                              variant="outlined"
                              onClick={() => setPreviewTemplateId(tpl.id)}
                              sx={{
                                p: 2,
                                borderRadius: 3,
                                cursor: "pointer",
                                border: "2px solid",
                                borderColor: isSelected ? "primary.main" : "divider",
                                bgcolor: isSelected ? "primary.50" : "background.paper",
                                transition: "all 0.2s",
                                "&:hover": { borderColor: "primary.main" },
                              }}
                            >
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 1 }}>
                                <Typography fontWeight={700} variant="subtitle2">
                                  {tpl.name}
                                </Typography>
                                {tpl.meta_status === "APPROVED" ? (
                                  <Chip icon={<Check size={12} />} label="APPROVED" color="success" size="small" />
                                ) : tpl.meta_status === "PENDING" || tpl.meta_status === "IN_REVIEW" ? (
                                  <Chip icon={<Clock size={12} />} label="IN REVIEW" color="warning" size="small" />
                                ) : tpl.meta_status === "REJECTED" ? (
                                  <Chip icon={<XCircle size={12} />} label="REJECTED" color="error" size="small" />
                                ) : (
                                  <Chip label="LOCAL" variant="outlined" size="small" />
                                )}
                              </Box>
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                Category: <b>{tpl.category}</b>
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {tpl.content}
                              </Typography>

                              {/* Action buttons on split view item */}
                              <Box sx={{ display: "flex", gap: 1, mt: 1.5, pt: 1, borderTop: "1px dashed #eee" }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="secondary"
                                  disabled={singleProcessingId === tpl.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRegisterSingleTemplate(tpl.id);
                                  }}
                                  startIcon={singleProcessingId === tpl.id ? <CircularProgress size={12} color="inherit" /> : <Send size={12} />}
                                  sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700, fontSize: "0.72rem", py: 0.2 }}
                                >
                                  Register
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  disabled={singleProcessingId === tpl.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVerifySingleTemplate(tpl.id);
                                  }}
                                  startIcon={singleProcessingId === tpl.id ? <CircularProgress size={12} color="inherit" /> : <RefreshCw size={12} />}
                                  sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700, fontSize: "0.72rem", py: 0.2 }}
                                >
                                  Verify
                                </Button>
                              </Box>
                            </Paper>
                          );
                        })
                      )}
                    </Stack>
                  </Grid>

                  {/* Right Column: Authentic WhatsApp Live Message Phone Frame */}
                  <Grid item xs={12} md={6.5}>
                    {(() => {
                      const activeTpl = templates.find((t) => t.id === (previewTemplateId || filteredTemplates[0]?.id)) || filteredTemplates[0];
                      return (
                        <Paper elevation={4} sx={{ borderRadius: "24px", overflow: "hidden", border: "10px solid #1f2937", bgcolor: "#efeae2", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
                          {/* WhatsApp Phone Header Bar */}
                          <Box sx={{ bgcolor: "#075e54", color: "white", px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Box sx={{ width: 38, height: 38, borderRadius: "50%", bgcolor: "#128c7e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "white" }}>
                              K
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Typography variant="subtitle2" fontWeight={700} color="white">
                                  {shopName || "Kosh Store"}
                                </Typography>
                                <CheckCircle2 size={14} color="#25D366" fill="#25D366" />
                              </Stack>
                              <Typography variant="caption" sx={{ color: "#e0f2f1", fontSize: "0.68rem" }}>
                                Official WhatsApp Business Account
                              </Typography>
                            </Box>
                            <Smartphone size={20} color="white" />
                          </Box>

                          {/* WhatsApp Message Canvas */}
                          <Box sx={{ p: 2.5, minHeight: 400, bgcolor: "#efeae2", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                            {activeTpl ? (
                              <Paper elevation={1} sx={{ p: 2, borderRadius: "14px 14px 14px 2px", bgcolor: "#ffffff", maxWidth: "92%", alignSelf: "flex-start", position: "relative" }}>
                                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: "0.9rem", color: "#111827", lineHeight: 1.45 }}>
                                  {hydrateTemplate(activeTpl.content, SAMPLE_PREVIEW_VARS)}
                                </Typography>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mt: 1.5, pt: 1, borderTop: "1px dashed #eee" }}>
                                  <Chip label={activeTpl.meta_template_name || activeTpl.name} size="small" variant="outlined" sx={{ fontSize: "0.65rem", height: 18 }} />
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                                      10:42 AM
                                    </Typography>
                                    <CheckCheck size={14} color="#34b7f1" />
                                  </Box>
                                </Box>
                              </Paper>
                            ) : (
                              <Typography color="text.secondary" align="center">Select a template on the left to preview message</Typography>
                            )}
                          </Box>
                        </Paper>
                      );
                    })()}
                  </Grid>
                </Grid>
              )}
            </Stack>
          </Grid>
        </Grid>
      )}

      {/* ============================================================ */}
      {/* MODAL: META SETUP & CREDENTIALS GUIDE DIALOG                  */}
      {/* ============================================================ */}
      <Dialog
        open={guideDialogOpen}
        onClose={() => setGuideDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            📘 Meta WhatsApp Setup & Credentials Guide
          </Typography>
          <IconButton size="small" onClick={() => setGuideDialogOpen(false)}>
            <XCircle size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Alert severity="info" sx={{ borderRadius: 3 }}>
              Follow this official guide to obtain your <strong>Phone Number ID</strong>, <strong>WABA ID</strong>, and <strong>Permanent Access Token</strong> from Meta for Developers.
            </Alert>

            <Grid container spacing={3}>
              {/* Step 1 */}
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ p: 3, borderRadius: 3, height: "100%", border: "1px solid", borderColor: "divider" }}>
                  <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
                    Step 1: Create Meta Developer App & Select Use Case
                  </Typography>
                  <Stack spacing={1.5} sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                    <Typography>
                      1. Go to Meta Developers Portal: <code>developers.facebook.com</code>
                    </Typography>
                    <Typography>
                      2. Click <strong>My Apps</strong> &gt; <strong>Create App</strong>.
                    </Typography>
                    <Typography>
                      3. Under <strong>Add use cases</strong>, select:
                    </Typography>
                    <Alert severity="success" sx={{ py: 0.5, borderRadius: 2 }}>
                      💬 <strong>Connect with customers through WhatsApp</strong><br />
                      (Found under <em>Featured</em> or <em>Business messaging</em>)
                    </Alert>
                    <Typography>
                      4. In your App Dashboard, navigate to <strong>WhatsApp</strong> &gt; <strong>API Setup</strong>.
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>

              {/* Step 2 */}
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ p: 3, borderRadius: 3, height: "100%", border: "1px solid", borderColor: "divider" }}>
                  <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
                    Step 2: Find Phone Number ID & WABA ID
                  </Typography>
                  <Stack spacing={1.5} sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                    <Typography>
                      1. Go to <strong>WhatsApp</strong> &gt; <strong>API Setup</strong> in left sidebar.
                    </Typography>
                    <Typography>
                      2. Under <strong>Send and receive messages</strong>, locate:
                    </Typography>
                    <Alert severity="success" sx={{ py: 0.5, borderRadius: 2 }}>
                      • <strong>Phone Number ID</strong> (e.g., 100609345912345)<br />
                      • <strong>WhatsApp Business Account ID</strong> (WABA ID)
                    </Alert>
                    <Typography>
                      3. Copy both values into Kosh WhatsApp Hub Setup tab.
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>

              {/* Step 3 */}
              <Grid item xs={12} md={12}>
                <Paper elevation={1} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                  <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
                    Step 3: Generate Permanent System User Access Token
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Meta temporary tokens expire in 24 hours. To make your integration permanent without re-logging in, generate a System User Token:
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Alert severity="info" sx={{ height: "100%", borderRadius: 2 }}>
                        <strong>1. Business Manager</strong><br />
                        Go to <code>business.facebook.com</code> &gt; Settings &gt; Users &gt; <strong>System Users</strong>.
                      </Alert>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Alert severity="info" sx={{ height: "100%", borderRadius: 2 }}>
                        <strong>2. Assign Assets</strong><br />
                        Add a System User (Admin Role), then click <strong>Add Assets</strong> and grant full control to your Meta App.
                      </Alert>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Alert severity="info" sx={{ height: "100%", borderRadius: 2 }}>
                        <strong>3. Token Permissions</strong><br />
                        Click <strong>Generate Token</strong> and check permissions:<br />
                        <code>whatsapp_business_messaging</code><br />
                        <code>whatsapp_business_management</code>
                      </Alert>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Coexistence & BSP Section */}
              <Grid item xs={12} md={12}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: "#f0f7ff",
                    border: "1px solid #bae0ff",
                  }}
                >
                  <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
                    💡 Meta WhatsApp Coexistence & UPI Regional Billing (BSPs)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Want to use your physical mobile number in your phone's <strong>WhatsApp Business App</strong> AND send automated invoices via Cloud API at the same time?
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Alert severity="success" sx={{ borderRadius: 2 }}>
                        <strong>Coexistence Mode Features:</strong>
                        <br />
                        • Keep your phone app logged in for manual customer chats.
                        <br />
                        • Simultaneously route automated invoices & ledger PDFs via API.
                        <br />
                        • Scan QR code during BSP onboarding to pair without disconnecting.
                      </Alert>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Alert severity="warning" sx={{ borderRadius: 2 }}>
                        <strong>Bypass Credit Card & Regional Billing Errors:</strong>
                        <br />
                        • Onboard via an Official Meta BSP (e.g., <strong>MSG91</strong>, Twilio, Interakt, Wati).
                        <br />
                        • MSG91 accepts <strong>UPI, Netbanking & INR Debit Cards</strong> inside India.
                        <br />
                        • Copy your Auth Key into Kosh for instant access.
                      </Alert>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" onClick={() => setGuideDialogOpen(false)}>
            Close Guide
          </Button>
        </DialogActions>
      </Dialog>

      {/* ============================================================ */}
      {/* TAB 4: DAILY USAGE & BILLING ANALYTICS                       */}
      {/* ============================================================ */}
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
                  Tracked for Meta billing
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

      {/* ============================================================ */}
      {/* MODAL: ADD / EDIT TEMPLATE DIALOG                            */}
      {/* ============================================================ */}
      <Dialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingTemplate ? "Edit Custom Template" : "Create New Custom Template"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Alert severity="warning" sx={{ borderRadius: "10px", fontSize: "0.8rem", py: 0.75 }}>
              <b>Meta WhatsApp Template Policy Rules:</b>
              <br />• <b>No variables at start or end:</b> Content cannot start or end with a <code>{"{{variable}}"}</code>.
              <br />• <b>Small case variable names:</b> All variables must be lowercase with underscores (e.g., <code>{"{{name}}"}</code>, <code>{"{{shop_name}}"}</code>, <code>{"{{total}}"}</code>).
              <br />• <b>No consecutive variables:</b> Always place static text or punctuation between placeholders.
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Template Display Name"
                  fullWidth
                  size="small"
                  placeholder="e.g. Festival Offer Discount"
                  value={templateForm.name}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={templateForm.category}
                    label="Category"
                    onChange={(e) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <MenuItem key={c.value} value={c.value}>
                        {c.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              label="Meta Template Name (Optional, for Cloud API verification)"
              fullWidth
              size="small"
              placeholder="e.g. festival_offer_discount"
              value={templateForm.meta_template_name}
              onChange={(e) =>
                setTemplateForm((prev) => ({
                  ...prev,
                  meta_template_name: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                }))
              }
              helperText="Must match exact template name registered in Meta WhatsApp Manager (lowercase_with_underscores)."
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
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
                    onClick={() => handleInsertVariable(pill)}
                    sx={{ cursor: "pointer" }}
                  />
                ))}
              </Stack>
            </Box>

            <TextField
              label="Message Body Content"
              multiline
              rows={6}
              fullWidth
              value={templateForm.content}
              onChange={(e) =>
                setTemplateForm((prev) => ({
                  ...prev,
                  content: e.target.value,
                }))
              }
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTemplateDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveTemplateForm}
          >
            Save Template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
