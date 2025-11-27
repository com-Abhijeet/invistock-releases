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
} from "@mui/material";
import { KeyRound, ShieldCheck, Lock } from "lucide-react";
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

  // Fetch the current license status when the page loads
  useEffect(() => {
    getLicenseStatus()
      .then((currentStatus) => {
        setStatus(currentStatus);
        // If already valid, redirect immediately
        if (
          currentStatus.status === "valid" ||
          currentStatus.status === "grace_period"
        ) {
          toast.success("License valid. Redirecting...");
          setTimeout(() => navigate("/"), 1000);
        }
      })
      .catch((err) => {
        console.error("License check failed:", err);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSubmit = async () => {
    if (!licenseKey.trim()) {
      return toast.error("Please enter a license key.");
    }
    setActivating(true);
    try {
      // Call the API to activate the new key
      const result = await activateLicense(licenseKey);
      setStatus(result);

      if (result.status === "valid" || result.status === "grace_period") {
        toast.success("License activated successfully!");

        // 1. Send signal to Electron Main to re-initialize backend/license checks if needed
        if (electron) {
          // Wait a moment for the user to see the success message
          setTimeout(() => {
            // This usually reloads the app to ensure clean state
            // If you just want to navigate, you can remove this IPC call
            // But restarting is safer for "Mode" switching (Server vs Client)
            // electron.ipcRenderer.send("license-updated-restart-app");

            // For smoother UX, we can just navigate:
            navigate("/");
            window.location.reload(); // Hard reload to refresh contexts
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
      setStatus({
        status: "invalid",
        message: errorMsg,
      });
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
        <Typography>Loading License</Typography>
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
            Need help? Contact support at support@invistock.com
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
