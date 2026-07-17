"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Stack,
  IconButton,
  Tooltip,
  Chip,
  useTheme,
  Collapse,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  ShieldCheck,
  Lock,
  Copy,
  Monitor,
  Ban,
  AlertTriangle,
  WifiOff,
  Phone,
  Mail,
  Server,
  MessageCircle,
} from "lucide-react";
import {
  getLicenseStatus,
  activateLicense,
  LicenseStatus,
} from "../lib/api/LicenseService";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

// Get the ipcRenderer from your preload script
const { electron } = window;

const parseLicenseMessage = (message: string = "") => {
  const msg = message.toLowerCase();

  if (msg.includes("banned") || msg.includes("suspicious")) {
    return {
      title: "Device Banned",
      cause:
        "Suspicious activity or multiple failed activation attempts were detected from this device.",
      action:
        "Please contact support to appeal the ban or investigate the issue.",
    };
  }
  if (
    msg.includes("invalid license") ||
    msg.includes("invalid key") ||
    msg.includes("invalid")
  ) {
    return {
      title: "Invalid License Signature",
      cause:
        "The signature entered does not exist in our system or is incorrect.",
      action:
        "Double-check the data you entered. If you bought a new license, ensure it is copied correctly.",
    };
  }
  if (msg.includes("revoked") || msg.includes("deactivated")) {
    return {
      title: "License Revoked",
      cause:
        "This license key was manually disabled by an administrator or due to a refund/cancellation.",
      action:
        "You will need to purchase a new license key to continue using the software.",
    };
  }
  if (msg.includes("no plan")) {
    return {
      title: "No Subscription Plan",
      cause:
        "The license is active but does not have a subscription or software plan linked to it.",
      action:
        "Contact support to correctly map your purchase to a valid software plan.",
    };
  }
  if (
    msg.includes("different device") ||
    msg.includes("machine mismatch") ||
    msg.includes("locked to a different")
  ) {
    return {
      title: "Device Mismatch",
      cause:
        "This license signature is already registered and locked to another computer.",
      action:
        "Use the license on the original computer, or request a license transfer from support.",
    };
  }
  if (msg.includes("location mismatch") || msg.includes("network")) {
    return {
      title: "Network Mismatch",
      cause: "This license is restricted to a specific office IP or network.",
      action:
        "Ensure you are connected to the correct office WiFi or contact support to update your IP address.",
    };
  }
  if (
    msg.includes("connection check failed") ||
    msg.includes("could not load") ||
    msg.includes("network error") ||
    msg.includes("failed to fetch")
  ) {
    return {
      title: "Connection Failed",
      cause:
        "We couldn't reach the Kosh licensing server to verify your device.",
      action: "Check your internet connection and try again.",
    };
  }
  if (msg.includes("client activation required")) {
    return {
      title: "Client Activation Required",
      cause:
        "This app is running in client mode and needs a license to connect to the server.",
      action: "Enter your license signature below.",
    };
  }

  return {
    title: message || "Unknown Status",
    cause: "",
    action: "",
  };
};

export default function LicensePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [licenseKey, setLicenseKey] = useState("");
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [showManual, setShowManual] = useState(false);

  // State for Machine ID & App Mode
  const [machineId, setMachineId] = useState<string>("Loading...");
  const [appMode, setAppMode] = useState<string>("server");

  useEffect(() => {
    const init = async () => {
      try {
        if (electron) {
          const id = await electron.getMachineId();
          setMachineId(id);
          const mode = await electron.getAppMode();
          setAppMode(mode);
        }

        let currentStatus: any;
        if (appMode === "client" && electron) {
          currentStatus = {
            status: "unlicensed",
            message: "Client activation required.",
          };
        } else {
          currentStatus = await getLicenseStatus();
        }

        setStatus(currentStatus);

        if (
          currentStatus.status === "valid" ||
          currentStatus.status === "grace_period"
        ) {
          toast.success("License valid. Redirecting...");
          setTimeout(() => navigate("/"), 1000);
        }
      } catch (error) {
        console.error(error);
        setStatus({ status: "invalid", message: "Connection check failed." });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate, appMode]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(machineId);
    toast.success("Machine ID copied!");
  };

  const handleSubmit = async (overrideKey?: string) => {
    const keyToSubmit =
      overrideKey && typeof overrideKey === "string" ? overrideKey : licenseKey;
    if (!keyToSubmit.trim())
      return toast.error("Please enter your license signature.");
    setActivating(true);
    try {
      let result;

      if (appMode === "client") {
        const response = await electron.ipcRenderer.invoke(
          "activate-client-license",
          keyToSubmit,
        );
        if (response.success) {
          result = response.status;
        } else {
          throw { response: { data: { error: response.error } } };
        }
      } else {
        result = await activateLicense(keyToSubmit);
      }

      setStatus(result);

      if (result.status === "valid" || result.status === "grace_period") {
        toast.success("License activated successfully!");

        if (electron) {
          setTimeout(async () => {
            if (electron.launchMainApp) {
              await electron.launchMainApp();
            } else {
              window.location.reload();
            }
          }, 1000);
        } else {
          navigate("/");
        }
      } else {
        const parsed = parseLicenseMessage(result.message);
        toast.error(parsed.title);
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error || err.message || "Activation failed.";
      const parsed = parseLicenseMessage(errorMsg);
      toast.error(parsed.title);
      setStatus({ status: "invalid", message: errorMsg });
    } finally {
      setActivating(false);
    }
  };

  useEffect(() => {
    if (electron && electron.onLicenseKeyReceived) {
      electron.onLicenseKeyReceived((key: string) => {
        setLicenseKey(key);
        // Automatically submit when the key is received from URI
        handleSubmit(key);
      });
    }
    return () => {
      if (
        electron &&
        electron.ipcRenderer &&
        electron.ipcRenderer.removeAllListeners
      ) {
        electron.ipcRenderer.removeAllListeners("license-key-received");
      }
    };
  }, [appMode]);

  const StatusDisplay = () => {
    if (!status) return null;

    // Handle New Backend Logic: Valid local license, but Cancelled Subscription
    const isCancelledSub =
      (status.data as any)?.subscriptionStatus === "CANCELLED";

    if (isCancelledSub) {
      return (
        <Alert
          severity="warning"
          icon={<WifiOff size={20} />}
          sx={{
            textAlign: "left",
            alignItems: "flex-start",
            borderRadius: 2,
            bgcolor: "#fffbeb",
            color: "#b45309",
            border: "1px solid #fde68a",
            mb: 3,
          }}
        >
          <Typography variant="body2" fontWeight={800} mb={0.5}>
            Subscription Suspended (Offline Mode)
          </Typography>
          <Typography variant="caption" display="block">
            Your device license is verified for offline use, but cloud sync and
            new activations have been disabled.
            <strong> Please renew via the web platform.</strong>
          </Typography>
        </Alert>
      );
    }

    let severity: "success" | "warning" | "error" | "info" = "info";
    let icon = <Lock size={18} />;

    if (status.status === "valid") {
      severity = "success";
      icon = <ShieldCheck size={18} />;
    } else if (status.status === "grace_period") {
      severity = "warning";
      icon = <AlertTriangle size={18} />;
    } else if (["expired", "invalid", "unlicensed"].includes(status.status)) {
      severity = "error";
      if (
        status.message?.toLowerCase().includes("banned") ||
        status.message?.toLowerCase().includes("revoked") ||
        status.message?.toLowerCase().includes("denied")
      ) {
        icon = <Ban size={18} />;
      }
    }

    const parsedMsg = parseLicenseMessage(status.message);

    return (
      <Alert
        severity={severity}
        icon={icon}
        sx={{
          mb: 3,
          textAlign: "left",
          alignItems: "flex-start",
          borderRadius: 2,
        }}
      >
        <Typography variant="subtitle2" fontWeight={700}>
          {parsedMsg.title}
        </Typography>
        {parsedMsg.cause && (
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            <strong>Why:</strong> {parsedMsg.cause}
          </Typography>
        )}
        {parsedMsg.action && (
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            <strong>Action:</strong> {parsedMsg.action}
          </Typography>
        )}
        {status.data?.expiryDate && (
          <Typography
            variant="caption"
            display="block"
            mt={1}
            fontWeight="bold"
          >
            Expires on:{" "}
            {new Date(status.data.expiryDate).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Typography>
        )}
      </Alert>
    );
  };

  if (loading) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="100vh"
        bgcolor="background.default"
      >
        <CircularProgress sx={{ color: theme.palette.primary.main }} />
      </Box>
    );
  }

  const isBanned =
    status?.message?.toLowerCase().includes("banned") ||
    status?.message?.toLowerCase().includes("revoked") ||
    status?.message?.toLowerCase().includes("denied");

  return (
    <Box
      p={{ xs: 2, md: 4 }}
      sx={{
        bgcolor: "background.default",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Grid
        container
        spacing={4}
        sx={{ maxWidth: 1200, margin: "0 auto", alignItems: "stretch" }}
      >
        {/* Left Column: Branding & Machine ID */}
        <Grid item xs={12} md={5} sx={{ display: "flex" }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: "none",
              bgcolor: "primary.main",
              color: "white",
              width: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CardContent
              sx={{
                p: { xs: 3, md: 4 },
                flex: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box mb={4}>
                <Box
                  component="img"
                  src="./icon.png"
                  alt="KOSH Logo"
                  sx={{
                    width: 64,
                    height: 64,
                    objectFit: "contain",
                    bgcolor: "background.paper",
                    borderRadius: 2,
                    p: 1,
                    mb: 2,
                  }}
                />
                <Typography
                  variant="h4"
                  fontWeight="800"
                  color="white"
                  gutterBottom
                  sx={{
                    fontFamily: "'Nunito', 'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  KOSH
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{ color: "secondary.main", fontWeight: "bold" }}
                >
                  Makes your business easy
                </Typography>
              </Box>

              <Typography
                variant="body1"
                sx={{
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.9)",
                  fontWeight: 500,
                  mb: 4,
                }}
              >
                Activate your product to unlock the full potential of your
                inventory management system.{" "}
                <Box
                  component="span"
                  sx={{ color: "secondary.main", fontWeight: "bold" }}
                >
                  Made for Bharat.
                </Box>
              </Typography>

              <Box mt="auto">
                {appMode && (
                  <Chip
                    icon={<Server size={14} color="white" />}
                    label={appMode}
                    size="small"
                    sx={{
                      fontWeight: "bold",
                      textTransform: "capitalize",
                      bgcolor: "rgba(255,255,255,0.1)",
                      color: "white",
                      mb: 2,
                    }}
                  />
                )}
                <Box bgcolor="rgba(0,0,0,0.2)" p={2} borderRadius={3}>
                  <Typography
                    variant="caption"
                    fontWeight="bold"
                    color="rgba(255,255,255,0.6)"
                    letterSpacing={1}
                    display="block"
                    gutterBottom
                  >
                    YOUR MACHINE ID
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Monitor size={16} color="rgba(255,255,255,0.8)" />
                    <Typography
                      variant="body2"
                      fontFamily="monospace"
                      fontWeight="bold"
                      color="white"
                      sx={{ flexGrow: 1, wordBreak: "break-all" }}
                    >
                      {machineId}
                    </Typography>
                    <Tooltip title="Copy ID">
                      <IconButton
                        size="small"
                        onClick={handleCopyId}
                        sx={{ color: "white", p: 0.5 }}
                      >
                        <Copy size={16} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Activation & Support */}
        <Grid item xs={12} md={7} sx={{ display: "flex" }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              width: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CardContent
              sx={{
                p: { xs: 3, md: 5 },
                flex: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box mb={4}>
                <Typography
                  variant="h4"
                  fontWeight="800"
                  color="text.primary"
                  gutterBottom
                >
                  {isBanned ? "Access Denied" : "Activate KOSH"}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {isBanned
                    ? "Your access has been revoked. Please contact support."
                    : "Complete your purchase online to automatically authorize this device."}
                </Typography>
              </Box>

              <StatusDisplay />

              {/* Main CTA */}
              <Box mb={2}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={() => {
                    const encodedId = btoa(machineId);
                    const url = `https://getkosh.co.in/checkout?m=${encodedId}`;
                    if (electron && electron.openExternalUrl) {
                      electron.openExternalUrl(url);
                    } else {
                      window.open(url, "_blank");
                    }
                  }}
                  disabled={machineId === "Loading..." || isBanned}
                  sx={{
                    py: 2,
                    borderRadius: 3,
                    textTransform: "none",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    bgcolor: theme.palette.primary.main,
                    boxShadow: `0 8px 24px ${theme.palette.primary.main}40`,
                    "&:hover": {
                      bgcolor: theme.palette.primary.dark,
                      boxShadow: `0 8px 32px ${theme.palette.primary.main}60`,
                    },
                  }}
                >
                  Buy / Activate Online
                </Button>
              </Box>

              {!isBanned && (
                <>
                  <Box textAlign="center" my={2}>
                    <Button
                      variant="text"
                      color="inherit"
                      onClick={() => setShowManual(!showManual)}
                      sx={{
                        textTransform: "none",
                        color: "text.secondary",
                        fontWeight: "bold",
                      }}
                    >
                      {showManual
                        ? "Hide manual activation"
                        : "Have an offline activation signature? Enter manually"}
                    </Button>
                  </Box>

                  <Collapse in={showManual}>
                    <Box
                      p={3}
                      bgcolor="background.default"
                      borderRadius={3}
                      border="1px dashed"
                      borderColor="divider"
                      mb={2}
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        color="text.primary"
                        mb={1}
                        ml={0.5}
                      >
                        Activation Signature
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value)}
                        placeholder="Paste your activation signature here..."
                        variant="outlined"
                        disabled={activating || status?.status === "valid"}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            bgcolor: "background.paper",
                            "&.Mui-focused fieldset": {
                              borderColor: theme.palette.primary.main,
                            },
                          },
                        }}
                      />
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => handleSubmit()}
                        disabled={
                          activating ||
                          !licenseKey ||
                          status?.status === "valid"
                        }
                        sx={{
                          mt: 2,
                          py: 1.2,
                          borderRadius: 2,
                          textTransform: "none",
                          fontWeight: 700,
                          borderColor: theme.palette.primary.main,
                          color: theme.palette.primary.main,
                        }}
                      >
                        {activating ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          "Verify Signature"
                        )}
                      </Button>
                    </Box>
                  </Collapse>
                </>
              )}

              {/* Push support to bottom */}
              <Box mt="auto" pt={3}>
                <Divider sx={{ mb: 3 }} />
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  color="text.secondary"
                  gutterBottom
                  textAlign="center"
                >
                  Need Help? Contact Support
                </Typography>
                <Stack
                  direction="row"
                  spacing={2}
                  justifyContent="center"
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<MessageCircle size={16} />}
                    onClick={() => {
                      const msg = `Hello, please activate the copy of software on my hardware with ID: ${machineId}`;
                      const url = `https://wa.me/918180904072?text=${encodeURIComponent(msg)}`;
                      if (electron && electron.openExternalUrl) {
                        electron.openExternalUrl(url);
                      } else {
                        window.open(url, "_blank");
                      }
                    }}
                    sx={{
                      textTransform: "none",
                      color: "#047857",
                      fontWeight: 600,
                    }}
                  >
                    WhatsApp Support
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<Phone size={16} />}
                    href="tel:+918180904072"
                    sx={{
                      textTransform: "none",
                      color: "text.primary",
                      fontWeight: 600,
                    }}
                  >
                    +91 8180904072
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<Mail size={16} />}
                    href="mailto:contact@getkosh.co.in"
                    sx={{
                      textTransform: "none",
                      color: "text.primary",
                      fontWeight: 600,
                    }}
                  >
                    contact@getkosh.co.in
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
