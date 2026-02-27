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
} from "@mui/material";
import {
  KeyRound,
  ShieldCheck,
  Lock,
  Copy,
  Monitor,
  CreditCard,
  Ban,
  AlertTriangle,
  WifiOff,
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

export default function LicensePage() {
  const navigate = useNavigate();
  const [licenseKey, setLicenseKey] = useState("");
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  // State for Machine ID & App Mode
  const [machineId, setMachineId] = useState<string>("Loading...");
  const [appMode, setAppMode] = useState<string>("server");

  // Theme Colors matching Kosh website
  const themeColors = {
    primary: "#115e59", // Deep Emerald
    primaryLight: "#ecfdf5",
    slateText: "#334155",
    slateBorder: "#e2e8f0",
  };

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

  const handleSubmit = async () => {
    if (!licenseKey.trim()) return toast.error("Please enter a license key.");
    setActivating(true);
    try {
      let result;

      if (appMode === "client") {
        const response = await electron.ipcRenderer.invoke(
          "activate-client-license",
          licenseKey,
        );
        if (response.success) {
          result = response.status;
        } else {
          throw { response: { data: { error: response.error } } };
        }
      } else {
        result = await activateLicense(licenseKey);
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
        toast.error(result.message);
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error || err.message || "Activation failed.";
      toast.error(errorMsg);
      setStatus({ status: "invalid", message: errorMsg });
    } finally {
      setActivating(false);
    }
  };

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
            mt: 3,
            textAlign: "left",
            alignItems: "flex-start",
            borderRadius: 2,
            bgcolor: "#fffbeb",
            color: "#b45309",
            border: "1px solid #fde68a",
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

    return (
      <Alert
        severity={severity}
        icon={icon}
        sx={{ mt: 3, textAlign: "left", alignItems: "center", borderRadius: 2 }}
      >
        <Typography variant="body2" fontWeight={600}>
          {status.message}
        </Typography>
        {status.data?.expiryDate && (
          <Typography variant="caption" display="block" mt={0.5}>
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
        bgcolor="#f8fafc"
      >
        <CircularProgress sx={{ color: themeColors.primary }} />
      </Box>
    );
  }

  const isBanned =
    status?.message?.toLowerCase().includes("banned") ||
    status?.message?.toLowerCase().includes("revoked") ||
    status?.message?.toLowerCase().includes("denied");

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      sx={{ backgroundColor: "#f8fafc", p: 2 }}
    >
      <Card
        variant="outlined"
        sx={{
          width: "100%",
          maxWidth: 480,
          borderRadius: 4,
          boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
          borderColor: themeColors.slateBorder,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box textAlign="center" mb={3}>
            <Box
              sx={{
                display: "inline-flex",
                p: 2,
                borderRadius: "50%",
                bgcolor: isBanned ? "#fee2e2" : themeColors.primaryLight,
                color: isBanned ? "#dc2626" : themeColors.primary,
                mb: 2,
              }}
            >
              {isBanned ? <Ban size={32} /> : <KeyRound size={32} />}
            </Box>
            <Typography
              variant="h5"
              fontWeight="800"
              color="#0f172a"
              gutterBottom
            >
              {isBanned ? "Access Denied" : "Activate KOSH"}
            </Typography>
            <Typography variant="body2" color="#64748b">
              {isBanned
                ? "Your access has been revoked. Please contact support."
                : "Enter your product license key to unlock the full potential of your inventory management system."}
            </Typography>
            <Chip
              label={appMode === "client" ? "Client Mode" : "Server Mode"}
              size="small"
              sx={{
                mt: 1.5,
                fontWeight: "bold",
                bgcolor: "#f1f5f9",
                color: "#475569",
              }}
            />
          </Box>

          <Divider sx={{ borderColor: themeColors.slateBorder }} />

          {/* Machine ID Section */}
          <Box
            mt={3}
            p={2}
            bgcolor="#f8fafc"
            borderRadius={2}
            border={`1px dashed #cbd5e1`}
            display="flex"
            flexDirection="column"
            alignItems="center"
          >
            <Typography
              variant="caption"
              fontWeight="bold"
              color="#64748b"
              letterSpacing={1}
              gutterBottom
            >
              YOUR MACHINE ID
            </Typography>

            <Stack direction="row" alignItems="center" spacing={1} width="100%">
              <Monitor size={16} color="#64748b" />
              <Typography
                variant="body2"
                fontFamily="monospace"
                fontWeight="bold"
                color="#0f172a"
                sx={{
                  flexGrow: 1,
                  wordBreak: "break-all",
                  textAlign: "center",
                }}
              >
                {machineId}
              </Typography>
              <Tooltip title="Copy ID">
                <IconButton size="small" onClick={handleCopyId}>
                  <Copy size={16} color={themeColors.primary} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          <StatusDisplay />

          <Box mt={3}>
            <Typography
              variant="subtitle2"
              fontWeight="bold"
              color="#334155"
              mb={1}
              ml={0.5}
            >
              License Key
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="Paste your 16-digit license key..."
              variant="outlined"
              disabled={activating || status?.status === "valid" || isBanned}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  bgcolor: "#fff",
                  "&.Mui-focused fieldset": {
                    borderColor: themeColors.primary,
                  },
                },
              }}
            />
          </Box>

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={
              activating ||
              !licenseKey ||
              status?.status === "valid" ||
              isBanned
            }
            sx={{
              mt: 3,
              py: 1.5,
              borderRadius: 3,
              textTransform: "none",
              fontSize: "1rem",
              fontWeight: 700,
              bgcolor: themeColors.primary,
              boxShadow: "0 4px 14px rgba(17, 94, 89, 0.2)",
              "&:hover": {
                bgcolor: "#0f4c4a",
                boxShadow: "0 6px 20px rgba(17, 94, 89, 0.3)",
              },
              "&:disabled": { bgcolor: "#cbd5e1", color: "#94a3b8" },
            }}
          >
            {activating ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Activate License"
            )}
          </Button>

          <Box mt={4} textAlign="center">
            <Typography variant="caption" color="#64748b" fontWeight="medium">
              Don't have a license key?
            </Typography>
            <Button
              fullWidth
              variant="outlined"
              size="medium"
              startIcon={<CreditCard size={18} />}
              onClick={() => navigate("/plans")}
              sx={{
                mt: 1.5,
                py: 1.2,
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 700,
                borderColor: themeColors.slateBorder,
                color: themeColors.slateText,
                "&:hover": {
                  borderColor: themeColors.primary,
                  color: themeColors.primary,
                  bgcolor: themeColors.primaryLight,
                },
              }}
            >
              View Plans & Buy Now
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
