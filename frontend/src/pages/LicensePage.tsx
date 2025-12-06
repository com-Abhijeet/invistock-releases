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
} from "@mui/material";
import { KeyRound, ShieldCheck, Lock, Copy, Monitor } from "lucide-react";
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

  // ✅ State for Machine ID
  const [machineId, setMachineId] = useState<string>("Loading...");

  // Fetch status and Machine ID
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Get Machine ID
        if (electron) {
          const id = await electron.getMachineId();
          setMachineId(id);
        }

        // 2. Check License
        const currentStatus = await getLicenseStatus();
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
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(machineId);
    toast.success("Machine ID copied!");
  };

  const handleSubmit = async () => {
    if (!licenseKey.trim()) return toast.error("Please enter a license key.");
    setActivating(true);
    try {
      const result = await activateLicense(licenseKey);
      setStatus(result);

      if (result.status === "valid" || result.status === "grace_period") {
        toast.success("License activated successfully!");
        if (electron) {
          setTimeout(() => {
            navigate("/");
            window.location.reload();
          }, 1500);
        } else {
          navigate("/");
        }
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Activation failed.";
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
    }
    if (status.status === "grace_period") severity = "warning";
    if (["expired", "invalid", "unlicensed"].includes(status.status))
      severity = "error";

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
                bgcolor: "primary.light",
                color: "primary.main",
                mb: 2,
              }}
            >
              <KeyRound size={32} />
            </Box>
            <Typography variant="h5" fontWeight="800" gutterBottom>
              Activate KOSH
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your product license key to unlock the full potential of
              your inventory management system.
            </Typography>
          </Box>

          <Divider />

          {/* ✅ Machine ID Section */}
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
              Send this ID to support to get your key.
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
              disabled={activating || status?.status === "valid"}
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
            disabled={activating || !licenseKey || status?.status === "valid"}
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

          <Typography
            variant="caption"
            color="text.secondary"
            align="center"
            display="block"
            mt={3}
          >
            Need help? Contact support at @ email : support@invistock.com
            whatsapp : +91 9370294078
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
