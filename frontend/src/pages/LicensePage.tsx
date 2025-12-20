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

  // Fetch status and Machine ID
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Get Machine ID & Mode
        if (electron) {
          const id = await electron.getMachineId();
          setMachineId(id);
          const mode = await electron.getAppMode();
          setAppMode(mode);
        }

        // 2. Check License based on Mode
        let currentStatus: LicenseStatus;
        if (appMode === "client" && electron) {
          // For client, we assume invalid initially if we are on this page,
          // but strictly we could add an IPC 'check-client-license' if needed.
          // For now, if the app opened this page, it means license failed.
          currentStatus = {
            status: "unlicensed",
            message: "Client activation required.",
          };
        } else {
          // Server mode checks API
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
  }, [navigate, appMode]); // Added appMode to dependency to re-run if it updates

  const handleCopyId = () => {
    navigator.clipboard.writeText(machineId);
    toast.success("Machine ID copied!");
  };

  const handleSubmit = async () => {
    if (!licenseKey.trim()) return toast.error("Please enter a license key.");
    setActivating(true);
    try {
      let result;

      // ✅ Conditional Activation Logic
      if (appMode === "client") {
        console.log("[frontend] : saving license key");
        // Client: Use IPC to save to local file
        const response = await electron.ipcRenderer.invoke(
          "activate-client-license",
          licenseKey
        );
        if (response.success) {
          result = response.status; // { status: 'valid', ... }
        } else {
          throw { response: { data: { error: response.error } } };
        }
      } else {
        // Server: Use API to save to DB
        result = await activateLicense(licenseKey);
        console.log("[frontend] : Saved license key", result);
      }

      setStatus(result);

      if (result.status === "valid" || result.status === "grace_period") {
        toast.success("License activated successfully!");
        if (electron) {
          setTimeout(() => {
            // Restarting allows main process to re-run startup checks
            if (electron.restartApp) electron.restartApp();
            else {
              navigate("/");
              window.location.reload();
            }
          }, 1500);
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

  // Helper component to show the current status
  const StatusDisplay = () => {
    if (!status) return null;

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
      // Check for specific keywords to show Ban icon
      if (
        status.message?.toLowerCase().includes("banned") ||
        status.message?.toLowerCase().includes("revoked")
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
        bgcolor="grey.100"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Check if banned to conditionally disable input
  const isBanned =
    status?.message?.toLowerCase().includes("banned") ||
    status?.message?.toLowerCase().includes("revoked");

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      sx={{
        backgroundColor: "grey.100",
        p: 2,
      }}
    >
      <Card
        variant="outlined"
        sx={{
          width: "100%",
          maxWidth: 480,
          borderRadius: 4,
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box textAlign="center" mb={3}>
            <Box
              sx={{
                display: "inline-flex",
                p: 2,
                borderRadius: "50%",
                bgcolor: isBanned ? "error.light" : "primary.light", // Red if banned
                color: isBanned ? "error.main" : "primary.main",
                mb: 2,
              }}
            >
              {isBanned ? <Ban size={32} /> : <KeyRound size={32} />}
            </Box>
            <Typography variant="h5" fontWeight="800" gutterBottom>
              {isBanned ? "Access Denied" : "Activate KOSH"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isBanned
                ? "Your access has been revoked. Please contact support."
                : "Enter your product license key to unlock the full potential of your inventory management system."}
            </Typography>
            {/* Added Mode Badge */}
            <Chip
              label={appMode === "client" ? "Client Mode" : "Server Mode"}
              size="small"
              sx={{ mt: 1, fontWeight: "bold" }}
            />
          </Box>

          <Divider />

          {/* Machine ID Section */}
          <Box
            mt={3}
            p={2}
            bgcolor="grey.50"
            borderRadius={2}
            border="1px dashed #ccc"
            display="flex"
            flexDirection="column"
            alignItems="center"
          >
            <Typography
              variant="caption"
              fontWeight="bold"
              color="text.secondary"
              gutterBottom
            >
              YOUR MACHINE ID
            </Typography>

            <Stack direction="row" alignItems="center" spacing={1} width="100%">
              <Monitor size={16} color="#666" />
              <Typography
                variant="body2"
                fontFamily="monospace"
                fontWeight="bold"
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
                  <Copy size={16} />
                </IconButton>
              </Tooltip>
            </Stack>

            <Typography variant="caption" color="text.disabled" mt={1}>
              This ID is required for generating your license key.
            </Typography>
          </Box>

          <StatusDisplay />

          <Box mt={3}>
            <Typography variant="subtitle2" fontWeight="bold" mb={1} ml={0.5}>
              License Key
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="Paste your license key here..."
              variant="outlined"
              disabled={activating || status?.status === "valid" || isBanned}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: 3 },
                backgroundColor: "grey.50",
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
              fontWeight: 600,
              boxShadow: "none",
              "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
            }}
          >
            {activating ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Activate License"
            )}
          </Button>

          {/* Purchase / Upgrade Section */}
          <Box mt={3} textAlign="center">
            <Typography variant="caption" color="text.secondary">
              Don't have a license key?
            </Typography>
            <Button
              fullWidth
              variant="outlined"
              size="medium"
              startIcon={<CreditCard size={18} />}
              onClick={() => navigate("/plans")}
              sx={{
                mt: 1,
                py: 1,
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 600,
                borderColor: "primary.main",
                color: "primary.main",
              }}
            >
              View Plans & Buy Now
            </Button>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            align="center"
            display="block"
            mt={3}
          >
            Need help? Contact support at email : support@invistock.com
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
