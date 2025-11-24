"use client";

import { useEffect, useState } from "react";
import {
  Typography,
  Paper,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Divider,
  useTheme, // ✅ Import useTheme
} from "@mui/material";
import { getLicenseStatus, LicenseStatus } from "../lib/api/LicenseService";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Lock,
  Phone,
} from "lucide-react";
import DashboardHeader from "../components/DashboardHeader";

export default function ViewLicensePage() {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme(); // ✅ Get the theme object

  // Fetch the status when the component mounts
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setLoading(true);
    getLicenseStatus()
      .then(setStatus)
      .catch(() => {
        setStatus({
          status: "invalid",
          message: "Could not load license status.",
        });
      })
      .finally(() => setLoading(false));
  };

  const getStatusInfo = () => {
    if (loading || !status) {
      return {
        label: "Checking...",
        color: "default",
        icon: <CircularProgress size={20} />,
        iconColor: theme.palette.text.secondary, // ✅ Use theme color
      };
    }

    switch (status.status) {
      case "valid":
        return {
          label: "Active",
          color: "success",
          icon: <CheckCircle />,
          iconColor: theme.palette.success.main, // ✅ Use theme color
        };
      case "grace_period":
        return {
          label: "Grace Period",
          color: "warning",
          icon: <AlertTriangle />,
          iconColor: theme.palette.warning.main, // ✅ Use theme color
        };
      case "expired":
        return {
          label: "Expired",
          color: "error",
          icon: <XCircle />,
          iconColor: theme.palette.error.main, // ✅ Use theme color
        };
      default:
        return {
          label: "Not Licensed",
          color: "error",
          icon: <Info />,
          iconColor: theme.palette.error.main, // ✅ Use theme color
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        backgroundColor: "#fff",

        minHeight: "100vh",
      }}
    >
      <DashboardHeader
        title="License Information"
        onRefresh={fetchData}
        showDateFilters={false}
      />

      <Paper
        variant="outlined"
        sx={{ p: 3, maxWidth: 600, margin: "auto", mt: 3 }}
      >
        <Stack spacing={2} alignItems="center" textAlign="center">
          {/* ✅ Use the correct iconColor variable */}
          <Lock size={48} color={statusInfo.iconColor} />
          <Typography variant="h5" fontWeight="bold">
            License Status
          </Typography>

          {loading ? (
            <CircularProgress sx={{ my: 2 }} />
          ) : (
            <>
              <Chip
                icon={statusInfo.icon}
                label={statusInfo.label}
                color={statusInfo.color as any}
                sx={{ fontSize: "1rem", p: 2 }}
              />
              <Typography variant="body1" color="text.secondary">
                {status?.message}
              </Typography>
              <Divider sx={{ width: "100%", my: 2 }} />
              {status?.data?.expiryDate ? (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Valid Until
                  </Typography>
                  <Typography variant="h6" fontWeight={500}>
                    {new Date(status.data.expiryDate).toLocaleDateString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No license is currently active.
                </Typography>
              )}
            </>
          )}
        </Stack>
      </Paper>

      {/* ✅ ADDED: Contact Information Section */}
      <Paper
        variant="outlined"
        sx={{ p: 3, maxWidth: 600, margin: "auto", mt: 3 }}
      >
        <Stack spacing={1} textAlign="center">
          <Typography variant="h6" fontWeight="bold">
            Need a License?
          </Typography>
          <Typography variant="body1" color="text.secondary">
            To purchase or renew your license, please contact the developer:
          </Typography>
          <Typography variant="body1" fontWeight={500} sx={{ pt: 1 }}>
            Abhijeet Shinde
          </Typography>
          <Typography variant="body2" color="primary.main">
            <Phone size={16} /> +91 9370294078
          </Typography>
          <Typography variant="body2" color="primary.main">
            invistock@gmail.com
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
