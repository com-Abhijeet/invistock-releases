"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  Chip,
  LinearProgress,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  Button,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Mail,
  Phone,
  ShieldCheck,
  Server,
  CreditCard,
  Package,
  ShoppingCart,
  Users,
  ChevronRight,
  Database,
  HardDrive,
  Wifi,
  Cpu,
  ChevronDown,
  FileText,
  Settings,
  HelpCircle,
  Clock,
  IndianRupee,
  Notebook,
  ArrowRight,
} from "lucide-react";
import { useUpdate } from "../context/UpdateContext";
import { useNavigate } from "react-router-dom";
import { getLicenseStatus, LicenseStatus } from "../lib/api/LicenseService";
import KbdButton from "../components/ui/Button";

// Import Logo

// Safely access electron
const electron =
  typeof window !== "undefined" ? (window as any).electron : undefined;

export default function AboutPage() {
  const theme = useTheme();
  const navigate = useNavigate();

  const {
    status: updateStatus,
    progress,
    currentVersion,
    checkForUpdates,
    restartApp,
  } = useUpdate();

  const [appMode, setAppMode] = useState<string | null>(null);
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [_loadingLicense, setLoadingLicense] = useState(true);

  useEffect(() => {
    if (electron?.getAppMode) {
      electron
        .getAppMode()
        .then((mode: string) => setAppMode(mode))
        .catch(() => setAppMode("Unknown"));
    }

    // Fetch License Details
    getLicenseStatus()
      .then((res) => {
        setLicense(res);
        setLoadingLicense(false);
      })
      .catch(() => setLoadingLicense(false));
  }, []);

  const isLicenseWarning =
    license?.status === "expired" || license?.status === "grace_period";

  // Navigation Features - Expanded based on sidebar
  const features = [
    {
      title: "Billing (POS)",
      desc: "Clear the checkout rush",
      icon: <CreditCard size={20} />,
      path: "/billing",
      color: 'secondary.main', // Amber Gold accent
      shortcut: "F2",
    },
    {
      title: "Sales Register",
      desc: "Track what's making money",
      icon: <Clock size={20} />,
      path: "/sales-history",
      color: 'text.primary', // Deep Navy
      shortcut: "F3",
    },
    {
      title: "Purchase Voucher",
      desc: "Stock your shelves",
      icon: <FileText size={20} />,
      path: "/purchase",
      color: 'text.primary',
      shortcut: "F4",
    },
    {
      title: "Stock Summary",
      desc: "Unlock dead stock capital",
      icon: <Package size={20} />,
      path: "/inventory",
      color: 'text.primary',
      shortcut: "F6",
    },
    {
      title: "Payment / Receipt",
      desc: "Manage cashflow",
      icon: <IndianRupee size={20} />,
      path: "/transactions",
      color: 'text.primary',
      shortcut: "F8",
    },
    {
      title: "Debtors (Customers)",
      desc: "Know who owes you",
      icon: <Users size={20} />,
      path: "/customers",
      color: 'text.primary',
      shortcut: "F10",
    },
    {
      title: "GST Reports",
      desc: "One-click filing",
      icon: <Notebook size={20} />,
      path: "/gst",
      color: 'text.primary',
      shortcut: null,
    },
    {
      title: "Features / Settings",
      desc: "Setup aapka business",
      icon: <Settings size={20} />,
      path: "/settings",
      color: 'text.primary',
      shortcut: "F12",
    },
  ];

  const handleFeatureClick = (path: string | null) => {
    if (path) navigate(path);
  };

  // Latest Update Notes
  const latestUpdate = {
    version: "v1.2.0",
    date: "Oct 25, 2026",
    details: "Added bulk update functionality for products.",
    actionPath: "/products",
    actionLabel: "View Products",
  };

  return (
    <Box p={3} sx={{ bgcolor: 'background.default', minHeight: "100vh" }}>
      <Grid container spacing={3} sx={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Left Column: Branding & Features */}
        <Grid item xs={12} md={7}>
          <Stack spacing={3}>
            {/* Professional Branding Card - Deep Navy */}
            <Card
              elevation={0}
              sx={{
                borderRadius: 2,
                border: 'none',
                bgcolor: 'text.primary',
                color: 'white',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={3}>
                  <Box
                    component="img"
                    src="/icon.png"
                    alt="KOSH Logo"
                    sx={{
                      width: 72,
                      height: 72,
                      objectFit: "contain",
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                      p: 1
                    }}
                  />
                  <Box flex={1}>
                    <Typography
                      variant="h4"
                      fontWeight="800"
                      color="white"
                      sx={{ fontFamily: "'Nunito', 'Plus Jakarta Sans', sans-serif" }}
                    >
                      KOSH
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ color: 'secondary.main', fontWeight: 'bold', mt: -0.5 }}
                    >
                      Makes your business easy
                    </Typography>
                  </Box>

                  <Stack direction="column" alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={1}>
                    <Chip
                      label={`v${currentVersion}`}
                      size="small"
                      sx={{ fontWeight: "bold", bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
                    />
                    {appMode && (
                      <Chip
                        icon={<Server size={14} color="white" />}
                        label={appMode}
                        size="small"
                        sx={{
                          fontWeight: "bold",
                          textTransform: "capitalize",
                          bgcolor: 'rgba(255,255,255,0.1)',
                          color: 'white'
                        }}
                      />
                    )}
                  </Stack>
                </Stack>

                <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

                <Typography
                  variant="body1"
                  sx={{ lineHeight: 1.6, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}
                >
                  Business intelligence at counter speed. Know if you're making money today, not next month. <Box component="span" sx={{ color: 'secondary.main', fontWeight: 'bold' }}>Made for Bharat.</Box>
                </Typography>
              </CardContent>
            </Card>

            {/* Quick Navigation Grid */}
            <Box>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                gutterBottom
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  color: 'text.primary',
                  mb: 2,
                }}
              >
                <Zap size={18} color="#111827" fill='secondary.main' />
                Quick Navigation
              </Typography>
              <Grid container spacing={2}>
                {features.map((feature) => (
                  <Grid item xs={12} sm={6} md={4} key={feature.title}>
                    <Card
                      elevation={0}
                      onClick={() => handleFeatureClick(feature.path)}
                      sx={{
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: 'background.paper',
                        cursor: feature.path ? "pointer" : "default",
                        height: "100%",
                        "&:hover": feature.path
                          ? {
                              bgcolor: 'grey.50',
                              borderColor: theme.palette.primary.main,
                            }
                          : {},
                      }}
                    >
                      <CardContent
                        sx={{
                          p: 2,
                          "&:last-child": { pb: 2 }
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                          <Box sx={{ color: feature.color }}>
                            {feature.icon}
                          </Box>
                          {feature.shortcut && (
                            <Chip
                              label={feature.shortcut}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: "0.65rem",
                                fontWeight: "bold",
                                bgcolor: "grey.100",
                              }}
                            />
                          )}
                        </Box>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ color: 'text.primary' }}>
                          {feature.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {feature.desc}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Support Card */}
            <Card
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <CardContent
                sx={{
                  p: 2.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <HelpCircle size={24} color="#111827" />
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: 'text.primary' }}>
                      Made for Bharat
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Aapka business, humari zimmedari.
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Phone size={16} />}
                    href="tel:+918180904072"
                    sx={{ color: "text.primary", borderColor: "divider" }}
                  >
                    +91 8180904072
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Mail size={16} />}
                    href="mailto:invistock@gmail.com"
                    sx={{ color: "text.primary", borderColor: "divider" }}
                  >
                    Email Us
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Right Column: License, Update, System Environment */}
        <Grid item xs={12} md={5}>
          <Stack spacing={3}>
            {/* 🛡️ LICENSE CARD */}
            <Card
              elevation={0}
              sx={{
                borderRadius: 2,
                bgcolor: isLicenseWarning ? "#fff5f5" : "white",
                border: "1px solid",
                borderColor: isLicenseWarning ? "error.main" : "divider",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ color: isLicenseWarning ? "error.main" : "success.main" }}>
                    {isLicenseWarning ? (
                      <AlertTriangle size={24} />
                    ) : (
                      <ShieldCheck size={24} />
                    )}
                  </Box>
                  <Box flex={1}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      color={isLicenseWarning ? "error.main" : "text.primary"}
                    >
                      {isLicenseWarning
                        ? license?.status === "expired"
                          ? "License Expired"
                          : "Grace Period"
                        : "License Active"}
                    </Typography>

                    <Box sx={{ mt: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {isLicenseWarning ? "Expired On:" : "Valid Until:"}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {license?.data?.expiryDate
                          ? new Date(license.data.expiryDate).toLocaleDateString("en-IN")
                          : "Lifetime / Unlimited"}
                      </Typography>
                    </Box>

                    <Button
                      variant="text"
                      size="small"
                      onClick={() => navigate("/view-license")}
                      sx={{ mt: 2, p: 0, '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}
                      endIcon={<ChevronRight size={16} />}
                    >
                      View License Details
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Update Center */}
            <Card
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: updateStatus === "available" ? 'primary.main' : "divider",
                borderRadius: 2,
                bgcolor: 'background.paper',
                position: "relative",
              }}
            >
              {updateStatus === "downloading" && progress && (
                <LinearProgress
                  variant="determinate"
                  value={progress.percent}
                  sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 4 }}
                />
              )}

              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ color: 'text.primary' }}>
                      Update Center
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Current Version: <strong>v{currentVersion}</strong>
                    </Typography>
                  </Box>
                  <Box sx={{ color: updateStatus === "ready" ? "success.main" : "text.secondary" }}>
                    {updateStatus === "checking" ? (
                      <CircularProgress size={20} color="inherit" thickness={4} />
                    ) : updateStatus === "ready" ? (
                      <CheckCircle2 size={24} />
                    ) : (
                      <RotateCw size={24} />
                    )}
                  </Box>
                </Stack>

                <Box sx={{ mt: 2.5 }}>
                  {updateStatus === "idle" || updateStatus === "checking" ? (
                    <KbdButton
                      variant="primary"
                      label={updateStatus === "checking" ? "Checking for updates..." : "Check for Updates"}
                      underlineChar="U"
                      shortcut="ctrl+u"
                      disabled={updateStatus === "checking"}
                      onClick={checkForUpdates}
                      fullWidth
                    />
                  ) : updateStatus === "downloading" && progress ? (
                    <Box>
                      <Stack direction="row" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption">Downloading Update...</Typography>
                        <Typography variant="caption" color="primary">{Math.round(progress.percent)}%</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={progress.percent} sx={{ height: 6, borderRadius: 3 }} />
                    </Box>
                  ) : updateStatus === "ready" ? (
                    <KbdButton
                      variant="secondary"
                      color="primary"
                      label="Restart to Install"
                      underlineChar="R"
                      shortcut="ctrl+alt+r"
                      onClick={restartApp}
                      startIcon={<Zap size={18} />}
                      fullWidth
                    />
                  ) : null}
                </Box>

                {/* Latest Update Notes */}
                <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
                    <FileText size={16} color="#111827" />
                    Latest Update (v{latestUpdate.version})
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {latestUpdate.details}
                  </Typography>
                  <Button 
                    size="small" 
                    variant="text" 
                    onClick={() => navigate(latestUpdate.actionPath)}
                    sx={{ p: 0, fontWeight: 'bold', color: 'text.primary', '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}
                    endIcon={<ArrowRight size={14} />}
                  >
                    {latestUpdate.actionLabel}
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* 🖥️ SYSTEM ENVIRONMENT & HEALTH (Collapsible) */}
            <Accordion 
              elevation={0} 
              sx={{ 
                border: '1px solid', 
                borderColor: 'divider', 
                borderRadius: '8px !important', 
                bgcolor: 'background.paper',
                '&:before': { display: 'none' }
              }}
            >
              <AccordionSummary
                expandIcon={<ChevronDown size={20} />}
                sx={{
                  px: 3,
                  py: 1,
                  "& .MuiAccordionSummary-content": {
                    alignItems: "center",
                    justifyContent: "space-between",
                  },
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Cpu size={20} color="#111827" />
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ color: 'text.primary' }}>
                    Own your data, own your business
                  </Typography>
                </Stack>
                <Chip label="Private" size="small" sx={{ height: 20, fontSize: "0.65rem", fontWeight: "bold", bgcolor: 'secondary.main', color: 'text.primary' }} />
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0, borderTop: '1px solid', borderColor: 'divider' }}>
                <Stack divider={<Divider />}>
                  <Box sx={{ px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Database size={18} className="text-gray-400" />
                      <Box>
                        <Typography variant="body2" fontWeight="bold">Database Engine</Typography>
                        <Typography variant="caption" color="text.secondary">Local SQLite</Typography>
                      </Box>
                    </Stack>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main" }} />
                  </Box>

                  <Box sx={{ px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <HardDrive size={18} className="text-gray-400" />
                      <Box>
                        <Typography variant="body2" fontWeight="bold">Storage Mode</Typography>
                        <Typography variant="caption" color="text.secondary">Your data never leaves your machine.</Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <Box sx={{ px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Wifi size={18} className="text-gray-400" />
                      <Box>
                        <Typography variant="body2" fontWeight="bold">Connectivity</Typography>
                        <Typography variant="caption" color="text.secondary">Ready for Sync</Typography>
                      </Box>
                    </Stack>
                    <Chip label="Online" size="small" variant="outlined" sx={{ height: 20, fontSize: "0.65rem", fontWeight: "bold" }} />
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
