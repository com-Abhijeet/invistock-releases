"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { KeyRound } from "lucide-react";
import {
  getLicenseStatus,
  activateLicense,
  LicenseStatus,
} from "../lib/api/LicenseService";
import toast from "react-hot-toast";

// Get the ipcRenderer from your preload script
const { ipcRenderer } = window.electron;

export default function LicensePage() {
  const [licenseKey, setLicenseKey] = useState("");
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch the current license status when the page loads
  useEffect(() => {
    getLicenseStatus()
      .then(setStatus)
      .catch((err) => {
        setStatus({
          status: "invalid",
          message: err.response?.data?.error || "Could not connect to service.",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!licenseKey.trim()) {
      return toast.error("Please enter a license key.");
    }
    setLoading(true);
    try {
      // Call the API to activate the new key
      const result = await activateLicense(licenseKey);
      setStatus(result); // Update the status message

      if (result.status === "valid" || result.status === "grace_period") {
        toast.success("License activated! The application will now restart.");

        // Signal the main process to restart the app
        setTimeout(() => {
          ipcRenderer.send("license-updated-restart-app");
        }, 2000);
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Activation failed.");
      setStatus(
        err.response?.data || {
          status: "invalid",
          message: "Activation failed.",
        }
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper component to show the current status
  const StatusDisplay = () => {
    if (!status) return null;
    let severity: "success" | "warning" | "error" | "info" = "info";
    if (status.status === "valid") severity = "success";
    if (status.status === "grace_period") severity = "warning";
    if (
      status.status === "expired" ||
      status.status === "invalid" ||
      status.status === "unlicensed"
    )
      severity = "error";

    return (
      <Alert severity={severity} sx={{ mt: 2, textAlign: "left" }}>
        {status.message}
        {status.data?.expiryDate && (
          <Typography variant="caption" display="block">
            Expires on: {new Date(status.data.expiryDate).toLocaleDateString()}
          </Typography>
        )}
      </Alert>
    );
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      height="100vh"
      sx={{ backgroundColor: "grey.100" }}
    >
      <Paper sx={{ p: 4, width: "100%", maxWidth: 500, textAlign: "center" }}>
        <KeyRound size={48} color="#1976d2" />
        <Typography variant="h5" fontWeight="bold" mt={2}>
          Activate Your License
        </Typography>
        <Typography color="text.secondary" mb={3}>
          Enter the license key you received to activate the application.
        </Typography>

        {loading ? <CircularProgress sx={{ my: 4 }} /> : <StatusDisplay />}

        <TextField
          fullWidth
          multiline
          rows={4}
          label="License Key"
          value={licenseKey}
          onChange={(e) => setLicenseKey(e.target.value)}
          placeholder="Paste your license key here..."
          sx={{ my: 3 }}
          disabled={loading}
        />

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Activating..." : "Activate"}
        </Button>
      </Paper>
    </Box>
  );
}
