"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  Chip,
  Button,
  LinearProgress,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  Link as MuiLink,
  Avatar,
  useTheme,
  alpha,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  RotateCw,
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Info,
  Mail,
  Phone,
  ShieldCheck,
  Server,
  Database,
  Globe,
  Smartphone,
  CreditCard,
  Package,
  ShoppingCart,
  BarChart3,
  Users,
} from "lucide-react";
import { useUpdate } from "../context/UpdateContext";
import DashboardHeader from "../components/DashboardHeader";
import { useNavigate } from "react-router-dom";

// Safely access electron
const electron = typeof window !== "undefined" ? window.electron : undefined;

export default function AboutPage() {
  const theme = useTheme();
  const navigate = useNavigate();

  // Access update context
  const {
    status,
    progress,
    currentVersion,
    newVersion,
    checkForUpdates,
    restartApp,
  } = useUpdate();

  const [appMode, setAppMode] = useState<string | null>(null);

  // Fetch app mode on mount
  useEffect(() => {
    if (electron?.getAppMode) {
      electron
        .getAppMode()
        .then((mode: string) => setAppMode(mode))
        .catch((err: any) => {
          console.error("Failed to get app mode:", err);
          setAppMode("Unknown");
        });
    }
  }, []);

  // Helper to format bytes
  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 MB";
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  const features = [
    {
      title: "Billing",
      desc: "Fast POS & Invoicing",
      icon: <CreditCard size={20} />,
    },
    {
      title: "Inventory",
      desc: "Real-time Tracking",
      icon: <Package size={20} />,
    },
    {
      title: "Purchases",
      desc: "Vendor Management",
      icon: <ShoppingCart size={20} />,
    },
    {
      title: "Analytics",
      desc: "In-depth Reports",
      icon: <BarChart3 size={20} />,
    },
    { title: "CRM", desc: "Customer Directory", icon: <Users size={20} /> },
    { title: "Mobile", desc: "App Companion", icon: <Smartphone size={20} /> },
  ];

  return (
    <Box
      p={3}
      sx={{
        backgroundColor: "#f9fafb",
        minHeight: "100vh",
      }}
    >
      <DashboardHeader
        title="About Application"
        showSearch={false}
        showDateFilters={false}
      />

      <Grid container spacing={3}>
        {/* --- Left Column: App Identity & Features --- */}
        <Grid item xs={12} md={7}>
          <Stack spacing={3}>
            {/* Branding Card */}
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
                  bgcolor: "primary.main",
                  color: "white",
                  p: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 3,
                    bgcolor: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "primary.main",
                    fontSize: "2.5rem",
                    fontWeight: "900",
                    boxShadow: 3,
                  }}
                >
                  K
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="800">
                    KOSH
                  </Typography>
                  <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                    Business Operating System
                  </Typography>
                </Box>
                <Box sx={{ flexGrow: 1 }} />
                <Chip
                  label={`v${currentVersion}`}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "white",
                    fontWeight: "bold",
                    backdropFilter: "blur(4px)",
                  }}
                />
              </Box>

              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Empowering Your Business
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Invistock (KOSH) is your complete solution for seamless
                  business management. Designed to streamline operations from
                  billing to the balance sheet.
                </Typography>

                <Box sx={{ mt: 4 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    color="text.secondary"
                    gutterBottom
                    sx={{
                      mb: 2,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Core Capabilities
                  </Typography>
                  <Grid container spacing={2}>
                    {features.map((feature) => (
                      <Grid item xs={12} sm={6} key={feature.title}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            transition: "all 0.2s",
                            "&:hover": {
                              bgcolor: alpha(theme.palette.primary.main, 0.08),
                            },
                          }}
                        >
                          <Box sx={{ color: "primary.main" }}>
                            {feature.icon}
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {feature.title}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {feature.desc}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 4,
              }}
            >
              <CardContent>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Developer Support
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={3}
                  sx={{ mt: 2 }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: "grey.100",
                        color: "grey.700",
                      }}
                    >
                      <Phone size={16} />
                    </Avatar>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        Phone
                      </Typography>
                      <Typography variant="body2" fontWeight="500">
                        +91 9370294078
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: "grey.100",
                        color: "grey.700",
                      }}
                    >
                      <Mail size={16} />
                    </Avatar>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        Email
                      </Typography>
                      <MuiLink
                        href="mailto:invistock@gmail.com"
                        variant="body2"
                        color="inherit"
                        fontWeight="500"
                        underline="hover"
                      >
                        invistock@gmail.com
                      </MuiLink>
                    </Box>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* --- Right Column: Update & System --- */}
        <Grid item xs={12} md={5}>
          <Stack spacing={3}>
            {/* Update Center Card */}
            <Card
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor:
                  status === "available" || status === "downloading"
                    ? "primary.main"
                    : "divider",
                borderRadius: 4,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {status === "downloading" && progress && (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    height: "4px",
                    bgcolor: "primary.main",
                    width: `${progress.percent}%`,
                    transition: "width 0.3s ease",
                  }}
                />
              )}

              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <Avatar
                    sx={{
                      bgcolor:
                        status === "ready"
                          ? "success.light"
                          : status === "available" || status === "downloading"
                          ? "primary.light"
                          : "grey.100",
                      color:
                        status === "ready"
                          ? "success.dark"
                          : status === "available" || status === "downloading"
                          ? "primary.main"
                          : "grey.600",
                    }}
                  >
                    {status === "checking" ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : status === "ready" ? (
                      <CheckCircle2 size={20} />
                    ) : status === "downloading" ? (
                      <DownloadCloud size={20} />
                    ) : status === "error" ? (
                      <AlertTriangle size={20} />
                    ) : (
                      <Zap size={20} />
                    )}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Software Update
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Current Version: v{currentVersion}
                    </Typography>
                  </Box>
                </Stack>

                <Divider sx={{ my: 2 }} />

                {/* Status: Idle / Checking */}
                {(status === "idle" || status === "checking") && (
                  <Box textAlign="center" py={2}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Stay updated to get the latest features and security
                      patches.
                    </Typography>
                    <Button
                      variant={status === "checking" ? "outlined" : "contained"}
                      onClick={checkForUpdates}
                      disabled={status === "checking"}
                      startIcon={
                        status !== "checking" && <RotateCw size={16} />
                      }
                      fullWidth
                      sx={{ borderRadius: 2 }}
                    >
                      {status === "checking"
                        ? "Checking..."
                        : "Check for Updates"}
                    </Button>
                  </Box>
                )}

                {/* Status: Update Available */}
                {status === "available" && (
                  <Box textAlign="center" py={2}>
                    <Typography
                      variant="body1"
                      fontWeight="bold"
                      color="primary"
                      gutterBottom
                    >
                      New Version Found!
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Version {newVersion} is available. Download starting...
                    </Typography>
                    <LinearProgress sx={{ borderRadius: 2 }} />
                  </Box>
                )}

                {/* Status: Downloading */}
                {status === "downloading" && progress && (
                  <Box>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      mb={1}
                    >
                      <Typography variant="body2" fontWeight="bold">
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
                      sx={{ height: 10, borderRadius: 5, mb: 2 }}
                    />
                    <Stack direction="row" justifyContent="space-between">
                      <Chip
                        icon={<DownloadCloud size={12} />}
                        label={`${formatBytes(progress.bytesPerSecond)}/s`}
                        size="small"
                        variant="outlined"
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatBytes(progress.transferred)} /{" "}
                        {formatBytes(progress.total)} MB
                      </Typography>
                    </Stack>
                  </Box>
                )}

                {/* Status: Ready */}
                {status === "ready" && (
                  <Box
                    sx={{
                      bgcolor: "success.lighter",
                      p: 2,
                      borderRadius: 2,
                      textAlign: "center",
                    }}
                  >
                    <CheckCircle2
                      size={32}
                      color="#2e7d32"
                      style={{ marginBottom: 8 }}
                    />
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      color="success.dark"
                    >
                      Update Ready
                    </Typography>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={restartApp}
                      fullWidth
                      startIcon={<RotateCw size={16} />}
                      sx={{ mt: 1 }}
                    >
                      Restart & Install Now
                    </Button>
                  </Box>
                )}

                {/* Status: Error */}
                {status === "error" && (
                  <Box
                    sx={{
                      bgcolor: "error.lighter",
                      p: 2,
                      borderRadius: 2,
                      textAlign: "center",
                    }}
                  >
                    <AlertTriangle
                      size={32}
                      color="#d32f2f"
                      style={{ marginBottom: 8 }}
                    />
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      color="error.dark"
                    >
                      Update Failed
                    </Typography>
                    <Button
                      size="small"
                      color="error"
                      onClick={checkForUpdates}
                      sx={{ mt: 1 }}
                    >
                      Try Again
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* System Info */}
            <Card
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 4,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                  <Avatar sx={{ bgcolor: "grey.100", color: "grey.700" }}>
                    <Info size={20} />
                  </Avatar>
                  <Typography variant="h6" fontWeight="bold">
                    System Information
                  </Typography>
                </Stack>
                <Stack spacing={2}>
                  <SystemRow
                    icon={<Server size={18} />}
                    label="App Mode"
                    value={appMode || "Unknown"}
                    // ✅ Updated to navigate to the new Connections Page
                    onClick={() => navigate("/connections")}
                  />
                  <SystemRow
                    icon={<Database size={18} />}
                    label="Database"
                    value="Local"
                  />
                  <SystemRow
                    icon={<ShieldCheck size={18} />}
                    label="License"
                    value="Active"
                    color="success"
                    onClick={() => navigate("/view-license")}
                  />
                  <SystemRow
                    icon={<Globe size={18} />}
                    label="Environment"
                    value="Desktop"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

// Helper Component for System Info Rows
function SystemRow({ icon, label, value, color = "default", onClick }: any) {
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      p={1.5}
      bgcolor="grey.50"
      borderRadius={2}
      onClick={onClick}
      sx={{
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease",
        "&:hover": onClick
          ? {
              bgcolor: "grey.200",
              transform: "translateX(4px)",
            }
          : {},
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ color: "#666" }}>{icon}</Box>
        <Typography variant="body2" fontWeight="500">
          {label}
        </Typography>
      </Stack>
      {color === "success" ? (
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          color="success.main"
        >
          <CheckCircle2 size={14} />
          <Typography variant="caption" fontWeight="bold">
            {value}
          </Typography>
        </Stack>
      ) : (
        <Chip
          label={value}
          size="small"
          variant={color === "default" ? "outlined" : "filled"}
          color={color === "default" ? "default" : "success"}
        />
      )}
    </Box>
  );
}
