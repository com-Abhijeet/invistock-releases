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
  useTheme,
  IconButton,
  Tooltip,
} from "@mui/material";
import { getLicenseStatus, LicenseStatus } from "../lib/api/LicenseService";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Lock,
  Phone,
  Monitor, // ✅ Added
  Copy, // ✅ Added
} from "lucide-react";
import DashboardHeader from "../components/DashboardHeader";
import toast from "react-hot-toast";

const { electron } = window;

export default function ViewLicensePage() {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [machineId, setMachineId] = useState<string>("Loading..."); // ✅ State for Machine ID
  const theme = useTheme();

  // Fetch the status and machine ID when the component mounts
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get Machine ID
      if (electron && electron.getMachineId) {
        const id = await electron.getMachineId();
        setMachineId(id);
      } else {
        setMachineId("Browser Mode - No ID");
      }

      // 2. Get License Status
      const licenseStatus = await getLicenseStatus();
      setStatus(licenseStatus);
      console.log(licenseStatus);
    } catch (error) {
      setStatus({
        status: "invalid",
        message: "Could not load license status.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(machineId);
    toast.success("Machine ID copied to clipboard!");
  };

  const getStatusInfo = () => {
    if (loading || !status) {
      return {
        label: "Checking...",
        color: "default",
        icon: <CircularProgress size={20} />,
        iconColor: theme.palette.text.secondary,
      };
    }

    switch (status.status) {
      case "valid":
        return {
          label: "Active",
          color: "success",
          icon: <CheckCircle />,
          iconColor: theme.palette.success.main,
        };
      case "grace_period":
        return {
          label: "Grace Period",
          color: "warning",
          icon: <AlertTriangle />,
          iconColor: theme.palette.warning.main,
        };
      case "expired":
        return {
          label: "Expired",
          color: "error",
          icon: <XCircle />,
          iconColor: theme.palette.error.main,
        };
      default:
        return {
          label: "Not Licensed",
          color: "error",
          icon: <Info />,
          iconColor: theme.palette.error.main,
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
        sx={{ p: 3, maxWidth: 600, margin: "auto", mt: 3, borderRadius: 3 }}
      >
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Box
            sx={{
              p: 2,
              borderRadius: "50%",
              bgcolor: `${statusInfo.iconColor}15`, // 15 is hex opacity
              color: statusInfo.iconColor,
            }}
          >
            <Lock size={32} />
          </Box>

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
                sx={{ fontSize: "1rem", p: 2, fontWeight: 600 }}
              />
              <Typography variant="body1" color="text.secondary">
                {status?.message}
              </Typography>

              <Divider sx={{ width: "100%", my: 2 }} />

              {/* ✅ Machine ID Section */}
              <Box
                width="100%"
                p={2}
                bgcolor="grey.50"
                borderRadius={2}
                border="1px dashed #ccc"
                display="flex"
                flexDirection="column"
                alignItems="center"
                mb={2}
              >
                <Typography
                  variant="caption"
                  fontWeight="bold"
                  color="text.secondary"
                  gutterBottom
                >
                  YOUR MACHINE ID
                </Typography>

                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  width="100%"
                >
                  <Monitor size={16} color="#666" />
                  <Typography
                    variant="body2"
                    fontFamily="monospace"
                    fontWeight="bold"
                    sx={{
                      flexGrow: 1,
                      wordBreak: "break-all",
                      textAlign: "center",
                      fontSize: "0.85rem",
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
              </Box>

              {status?.data?.expiryDate ? (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Valid Until
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    color="primary.main"
                  >
                    {new Date(status.data.expiryDate).toLocaleDateString(
                      "en-IN",
                      {
                        day: "numeric",
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

      {/* Contact Information Section */}
      <Paper
        variant="outlined"
        sx={{ p: 3, maxWidth: 600, margin: "auto", mt: 3, borderRadius: 3 }}
      >
        <Stack spacing={1} textAlign="center">
          <Typography variant="h6" fontWeight="bold">
            Need a License?
          </Typography>
          <Typography variant="body1" color="text.secondary">
            To purchase or renew your license, please contact the developer:
          </Typography>
          <Typography variant="body1" fontWeight={600} sx={{ pt: 1 }}>
            Abhijeet Shinde
          </Typography>
          <Stack
            direction="row"
            justifyContent="center"
            alignItems="center"
            spacing={2}
            mt={1}
          >
            <Typography
              variant="body2"
              color="primary.main"
              display="flex"
              alignItems="center"
              gap={0.5}
            >
              <Phone size={16} /> +91 9370294078
            </Typography>
            <Typography variant="body2" color="primary.main">
              invistock@gmail.com
            </Typography>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
