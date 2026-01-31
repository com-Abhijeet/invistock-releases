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
  alpha,
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
  Smartphone,
  CreditCard,
  Package,
  ShoppingCart,
  BarChart3,
  Users,
  ChevronRight,
  Database,
  HardDrive,
  Wifi,
  Cpu,
} from "lucide-react";
import { useUpdate } from "../context/UpdateContext";
import { useNavigate } from "react-router-dom";
import { getLicenseStatus, LicenseStatus } from "../lib/api/LicenseService";
import KbdButton from "../components/ui/Button";

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

  // Navigation Features (Restored)
  const features = [
    {
      title: "Billing (POS)",
      desc: "Fast Invoicing",
      icon: <CreditCard size={20} />,
      path: "/billing",
      color: "#6366f1",
      shortcut: "F2",
    },
    {
      title: "Inventory",
      desc: "Stock Tracking",
      icon: <Package size={20} />,
      path: "/inventory",
      color: "#8b5cf6",
      shortcut: "F6",
    },
    {
      title: "Purchases",
      desc: "Vendor Mgmt",
      icon: <ShoppingCart size={20} />,
      path: "/purchase",
      color: "#ec4899",
      shortcut: "F4",
    },
    {
      title: "Analytics",
      desc: "Sales Insights",
      icon: <BarChart3 size={20} />,
      path: "/sales",
      color: "#14b8a6",
      shortcut: "F3",
    },
    {
      title: "CRM",
      desc: "Customers",
      icon: <Users size={20} />,
      path: "/customers",
      color: "#f59e0b",
      shortcut: "F10",
    },
    {
      title: "Mobile App",
      desc: "Companion",
      icon: <Smartphone size={20} />,
      path: null,
      color: "#3b82f6",
      shortcut: null,
    },
  ];

  const handleFeatureClick = (path: string | null) => {
    if (path) navigate(path);
  };

  return (
    <Box p={3} sx={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <Grid container spacing={3}>
        {/* Left Column: Branding & Features */}
        <Grid item xs={12} md={7}>
          <Stack spacing={3}>
            {/* Branding Card */}
            <Card
              elevation={0}
              sx={{
                borderRadius: 4,
                overflow: "hidden",
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: "white",
                boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)",
                position: "relative",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: -50,
                  right: -50,
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  bgcolor: "rgba(255,255,255,0.05)",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  bottom: -30,
                  left: -30,
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  bgcolor: "rgba(255,255,255,0.05)",
                }}
              />

              <CardContent sx={{ p: 4, position: "relative", zIndex: 1 }}>
                <Stack direction="row" alignItems="center" spacing={3}>
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 3,
                      bgcolor: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "primary.main",
                      fontSize: "2rem",
                      fontWeight: "900",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                  >
                    K
                  </Box>
                  <Box flex={1}>
                    <Typography
                      variant="h4"
                      fontWeight="800"
                      sx={{ letterSpacing: -0.5 }}
                    >
                      KOSH
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ opacity: 0.9, fontWeight: 500 }}
                    >
                      Business Operating System
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Chip
                      label={`v${currentVersion}`}
                      size="small"
                      sx={{
                        bgcolor: "rgba(255,255,255,0.2)",
                        color: "white",
                        fontWeight: "bold",
                        border: "1px solid rgba(255,255,255,0.3)",
                        backdropFilter: "blur(4px)",
                      }}
                    />
                    {appMode && (
                      <Chip
                        icon={
                          <Server
                            size={14}
                            style={{ color: "white", opacity: 0.8 }}
                          />
                        }
                        label={appMode}
                        size="small"
                        sx={{
                          bgcolor: "rgba(0,0,0,0.2)",
                          color: "white",
                          fontWeight: "bold",
                          border: "1px solid rgba(255,255,255,0.1)",
                          textTransform: "capitalize",
                          "& .MuiChip-icon": { color: "white" },
                        }}
                      />
                    )}
                  </Stack>
                </Stack>

                <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.1)" }} />

                <Typography
                  variant="body1"
                  sx={{ opacity: 0.95, lineHeight: 1.6 }}
                >
                  Invistock (KOSH) is your complete solution for seamless
                  business management. Designed to streamline operations from
                  billing to the balance sheet.
                </Typography>
              </CardContent>
            </Card>

            {/* Quick Navigation Grid (Restored) */}
            <Box>
              <Typography
                variant="h6"
                fontWeight="700"
                gutterBottom
                sx={{
                  px: 1,
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Zap
                  size={20}
                  fill="currentColor"
                  className="text-yellow-500"
                />
                Quick Navigation
              </Typography>
              <Grid container spacing={2}>
                {features.map((feature) => (
                  <Grid item xs={12} sm={6} md={4} key={feature.title}>
                    <Card
                      elevation={0}
                      onClick={() => handleFeatureClick(feature.path)}
                      sx={{
                        borderRadius: 3,
                        border: "1px solid",
                        borderColor: "divider",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        cursor: feature.path ? "pointer" : "default",
                        height: "100%",
                        position: "relative",
                        overflow: "hidden",
                        "&:hover": feature.path
                          ? {
                              transform: "translateY(-4px)",
                              boxShadow: "0 12px 24px -10px rgba(0,0,0,0.1)",
                              borderColor: feature.color,
                              "& .icon-box": {
                                bgcolor: feature.color,
                                color: "white",
                              },
                            }
                          : {},
                      }}
                    >
                      <CardContent
                        sx={{
                          p: 2,
                          display: "flex",
                          flexDirection: "column",
                          gap: 1.5,
                        }}
                      >
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="flex-start"
                        >
                          <Box
                            className="icon-box"
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 2,
                              bgcolor: alpha(feature.color, 0.1),
                              color: feature.color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.2s ease",
                            }}
                          >
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
                                color: "text.secondary",
                              }}
                            />
                          )}
                        </Box>

                        <Box>
                          <Typography
                            variant="subtitle2"
                            fontWeight="700"
                            lineHeight={1.2}
                          >
                            {feature.title}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight="500"
                          >
                            {feature.desc}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Single Line Support Card */}
            <Card
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <CardContent
                sx={{
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      bgcolor: "primary.50",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "primary.main",
                    }}
                  >
                    <Phone size={20} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="700">
                      Developer Support
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Support is available Mon-Sat
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Phone size={14} />}
                    href="tel:+918180904072"
                    sx={{
                      borderRadius: 2,
                      borderColor: "divider",
                      color: "text.primary",
                      fontWeight: 600,
                      "&:hover": { borderColor: "primary.main" },
                    }}
                  >
                    Call: +91 8180904072
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Mail size={14} />}
                    href="mailto:invistock@gmail.com"
                    sx={{
                      borderRadius: 2,
                      borderColor: "divider",
                      color: "text.primary",
                      fontWeight: 600,
                      "&:hover": { borderColor: "secondary.main" },
                    }}
                  >
                    Email
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Right Column: License, Update, System Environment */}
        <Grid item xs={12} md={5}>
          <Stack spacing={3}>
            {/* 🛡️ LICENSE CARD (Dynamic Status) */}
            <Card
              elevation={isLicenseWarning ? 6 : 0}
              sx={{
                borderRadius: 4,
                position: "relative",
                overflow: "hidden",
                bgcolor: isLicenseWarning ? "#b91c1c" : "white",
                color: isLicenseWarning ? "white" : "text.primary",
                border: isLicenseWarning ? "none" : "1px solid",
                borderColor: "divider",
              }}
            >
              {isLicenseWarning && (
                <Box
                  sx={{
                    position: "absolute",
                    right: -20,
                    top: -20,
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    bgcolor: "rgba(255,255,255,0.1)",
                    zIndex: 0,
                  }}
                />
              )}
              <CardContent sx={{ p: 3, position: "relative", zIndex: 1 }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      display: "flex",
                      bgcolor: isLicenseWarning
                        ? "rgba(255,255,255,0.2)"
                        : "success.lighter",
                      color: isLicenseWarning ? "white" : "success.main",
                    }}
                  >
                    {isLicenseWarning ? (
                      <AlertTriangle size={24} strokeWidth={2.5} />
                    ) : (
                      <ShieldCheck size={24} strokeWidth={2.5} />
                    )}
                  </Box>
                  <Box flex={1}>
                    <Typography
                      variant="h6"
                      fontWeight="800"
                      sx={{
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        color: isLicenseWarning ? "white" : "text.primary",
                      }}
                    >
                      {isLicenseWarning
                        ? license?.status === "expired"
                          ? "License Expired"
                          : "Grace Period"
                        : "License Active"}
                    </Typography>

                    <Box
                      sx={{
                        mt: 2,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: isLicenseWarning
                          ? "rgba(0,0,0,0.2)"
                          : "grey.50",
                        border: isLicenseWarning ? "none" : "1px solid #e0e0e0",
                      }}
                    >
                      <Typography
                        variant="caption"
                        display="block"
                        sx={{
                          opacity: 0.8,
                          textTransform: "uppercase",
                          fontWeight: "bold",
                        }}
                      >
                        {isLicenseWarning ? "Expired On" : "Valid Until"}
                      </Typography>
                      <Typography variant="subtitle1" fontWeight="700">
                        {license?.data?.expiryDate
                          ? new Date(
                              license.data.expiryDate,
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : "Lifetime / Unknown"}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} mt={2}>
                      <Button
                        variant={isLicenseWarning ? "contained" : "outlined"}
                        size="small"
                        onClick={() => navigate("/view-license")}
                        sx={{
                          flex: 1,
                          fontWeight: "bold",
                          bgcolor: isLicenseWarning ? "white" : "transparent",
                          color: isLicenseWarning ? "#b91c1c" : "primary.main",
                          borderColor: isLicenseWarning
                            ? "transparent"
                            : "divider",
                          "&:hover": {
                            bgcolor: isLicenseWarning
                              ? "rgba(255,255,255,0.9)"
                              : "grey.50",
                            borderColor: "primary.main",
                          },
                        }}
                        endIcon={
                          !isLicenseWarning && <ChevronRight size={16} />
                        }
                      >
                        View Details
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Update Center */}
            <Card
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor:
                  updateStatus === "available" ? "primary.main" : "divider",
                borderRadius: 4,
                position: "relative",
                overflow: "hidden",
                transition: "border-color 0.3s",
              }}
            >
              {updateStatus === "downloading" && progress && (
                <LinearProgress
                  variant="determinate"
                  value={progress.percent}
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                  }}
                />
              )}

              <CardContent sx={{ p: 3 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                >
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Update Center
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Current Version:{" "}
                      <Box
                        component="span"
                        fontWeight="700"
                        color="text.primary"
                      >
                        v{currentVersion}
                      </Box>
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      bgcolor:
                        updateStatus === "ready"
                          ? "success.light"
                          : "primary.50",
                      color:
                        updateStatus === "ready"
                          ? "success.main"
                          : "primary.main",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {updateStatus === "checking" ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : updateStatus === "ready" ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <RotateCw size={20} />
                    )}
                  </Box>
                </Stack>

                <Box sx={{ mt: 3 }}>
                  {updateStatus === "idle" || updateStatus === "checking" ? (
                    <KbdButton
                      variant="primary"
                      label={
                        updateStatus === "checking"
                          ? "Checking..."
                          : "Check for Updates"
                      }
                      underlineChar="U"
                      shortcut="ctrl+u"
                      disabled={updateStatus === "checking"}
                      onClick={checkForUpdates}
                      fullWidth
                      sx={{ py: 1.2 }}
                    />
                  ) : updateStatus === "downloading" && progress ? (
                    <Box>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        mb={1}
                      >
                        <Typography variant="caption" fontWeight="bold">
                          Downloading...
                        </Typography>
                        <Typography
                          variant="caption"
                          fontWeight="bold"
                          color="primary"
                        >
                          {Math.round(progress.percent)}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={progress.percent}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  ) : updateStatus === "ready" ? (
                    <KbdButton
                      variant="primary"
                      color="success"
                      label="Restart to Install"
                      underlineChar="R"
                      shortcut="ctrl+alt+r"
                      onClick={restartApp}
                      startIcon={<Zap size={18} />}
                      fullWidth
                      sx={{ py: 1.2 }}
                    />
                  ) : null}
                </Box>
              </CardContent>
            </Card>

            {/* 🖥️ SYSTEM ENVIRONMENT & HEALTH (Fills the space nicely) */}
            <Card
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  bgcolor: "grey.50",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Cpu size={18} className="text-gray-500" />
                  <Typography variant="subtitle2" fontWeight="700">
                    System Environment
                  </Typography>
                </Stack>
                <Chip
                  label="Healthy"
                  size="small"
                  color="success"
                  sx={{
                    height: 20,
                    fontSize: "0.65rem",
                    fontWeight: "bold",
                    borderRadius: 1,
                  }}
                />
              </Box>
              <CardContent sx={{ p: 0 }}>
                <Stack divider={<Divider />}>
                  {/* Row 1: Database */}
                  <Box
                    sx={{
                      px: 3,
                      py: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Database size={18} className="text-gray-400" />
                      <Box>
                        <Typography variant="body2" fontWeight="600">
                          Database Engine
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Local SQLite
                        </Typography>
                      </Box>
                    </Stack>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "success.main",
                        boxShadow: "0 0 0 4px rgba(46, 125, 50, 0.1)",
                      }}
                    />
                  </Box>

                  {/* Row 3: Disk */}
                  <Box
                    sx={{
                      px: 3,
                      py: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <HardDrive size={18} className="text-gray-400" />
                      <Box>
                        <Typography variant="body2" fontWeight="600">
                          Storage Mode
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Offline / Local First
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  {/* Row 4: Network */}
                  <Box
                    sx={{
                      px: 3,
                      py: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Wifi size={18} className="text-gray-400" />
                      <Box>
                        <Typography variant="body2" fontWeight="600">
                          Connectivity
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Ready for Sync
                        </Typography>
                      </Box>
                    </Stack>
                    <Chip
                      label="Online"
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 20,
                        fontSize: "0.65rem",
                        fontWeight: "bold",
                        borderColor: "divider",
                      }}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
