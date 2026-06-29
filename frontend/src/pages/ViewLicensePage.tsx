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
  TextField,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import Grid  from "@mui/material/GridLegacy"
import { getLicenseStatus, activateLicense, LicenseStatus } from "../lib/api/LicenseService";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Lock,
  Phone,
  Monitor,
  Copy,
  Mail,
  KeyRound,
  ShieldCheck,
  Share2,
} from "lucide-react";
import DashboardHeader from "../components/DashboardHeader";
import toast from "react-hot-toast";

const { electron } = window;

export default function ViewLicensePage() {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [machineId, setMachineId] = useState<string>("Loading...");
  
  // Activation State
  const [licenseKey, setLicenseKey] = useState("");
  const [activating, setActivating] = useState(false);

  // Share Menu State
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openShare = Boolean(anchorEl);

  const theme = useTheme();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (electron && electron.getMachineId) {
        const id = await electron.getMachineId();
        setMachineId(id);
      } else {
        setMachineId("Browser Mode - No ID");
      }

      const licenseStatus = await getLicenseStatus();
      setStatus(licenseStatus);
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

  const handleShareClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleShareClose = () => {
    setAnchorEl(null);
  };

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=Here is my Machine ID: ${machineId}`, '_blank');
    handleShareClose();
  };

  const handleShareEmail = () => {
    window.open(`mailto:contact@getkosh.co.in?subject=Machine ID for License&body=Here is my Machine ID: ${machineId}`, '_self');
    handleShareClose();
  };

  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) {
      toast.error("Please enter a valid license key");
      return;
    }

    setActivating(true);
    try {
      const response = await activateLicense(licenseKey);
      if (response.status === "valid") {
        toast.success("License activated successfully!");
        setLicenseKey("");
      } else {
        toast.error(response.message || "Failed to activate license.");
      }
      setStatus(response);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Error activating license. Please check your key.";
      toast.error(errorMsg);
    } finally {
      setActivating(false);
    }
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
          icon: <ShieldCheck />,
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
      p={3}
      sx={{
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",
      }}
    >
      <Box maxWidth="xl" margin="0 auto">
        <DashboardHeader
          title="License Management"
          onRefresh={fetchData}
          showDateFilters={false}
        />

        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Top Full Width Row: Machine Identity */}
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: "#1A2744",
                color: "white",
                border: "none",
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: { xs: "flex-start", md: "center" },
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box flex={1} minWidth={0}>
                <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
                  <Monitor size={24} color="#F0A500" />
                  <Typography variant="h6" fontWeight="bold">
                    Machine Identity
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Your license is strictly bound to this machine. Provide this ID when purchasing or renewing a license.
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 1.5,
                  bgcolor: "rgba(255,255,255,0.1)",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  minWidth: { xs: "100%", md: "450px" },
                  maxWidth: { md: "50%" },
                }}
              >
                <Box flex={1} minWidth={0}>
                  <Typography variant="caption" sx={{ color: "#F0A500", fontWeight: "bold", letterSpacing: 1, display: "block", mb: 0.5 }}>
                    YOUR MACHINE ID
                  </Typography>
                  <Typography
                    variant="body1"
                    fontFamily="monospace"
                    fontWeight="bold"
                    sx={{ color: "white", wordBreak: "break-all" }}
                  >
                    {machineId}
                  </Typography>
                </Box>
                
                <Stack direction="row" spacing={0.5} flexShrink={0}>
                  <Tooltip title="Copy ID">
                    <IconButton size="small" onClick={handleCopyId} sx={{ color: "#F0A500", bgcolor: "rgba(240, 165, 0, 0.1)" }}>
                      <Copy size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Share ID">
                    <IconButton size="small" onClick={handleShareClick} sx={{ color: "#F0A500", bgcolor: "rgba(240, 165, 0, 0.1)" }}>
                      <Share2 size={18} />
                    </IconButton>
                  </Tooltip>
                </Stack>
                
                {/* Share Menu */}
                <Menu
                  anchorEl={anchorEl}
                  open={openShare}
                  onClose={handleShareClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <MenuItem onClick={handleShareWhatsApp}>
                    <ListItemIcon>
                      <Phone size={18} />
                    </ListItemIcon>
                    <ListItemText>Share via WhatsApp</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleShareEmail}>
                    <ListItemIcon>
                      <Mail size={18} />
                    </ListItemIcon>
                    <ListItemText>Share via Email</ListItemText>
                  </MenuItem>
                </Menu>
              </Box>
            </Paper>
          </Grid>

          {/* Bottom Left: Status (Taller to balance right side) */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                height: "100%",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Stack spacing={2} alignItems="center">
                <Box
                  sx={{
                    p: 2,
                    borderRadius: "50%",
                    bgcolor: `${statusInfo.iconColor}15`,
                    color: statusInfo.iconColor,
                  }}
                >
                  {loading ? <CircularProgress size={48} /> : statusInfo.icon}
                </Box>

                <Typography variant="h4" fontWeight="800" sx={{ color: "#1A2744" }}>
                  License Status
                </Typography>

                {!loading && (
                  <>
                    <Chip
                      icon={statusInfo.icon}
                      label={statusInfo.label}
                      color={statusInfo.color as any}
                      sx={{ fontSize: "1.1rem", p: 2, fontWeight: "bold", mt: 1 }}
                    />
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                      {status?.message}
                    </Typography>

                    {status?.data?.expiryDate && (
                      <Box mt={4}>
                        <Typography variant="body2" color="text.secondary" fontWeight="bold">
                          VALID UNTIL
                        </Typography>
                        <Typography
                          variant="h5"
                          fontWeight={800}
                          sx={{ color: "#1A2744" }}
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
                    )}
                  </>
                )}
              </Stack>
            </Paper>
          </Grid>

          {/* Bottom Right: Activate + Support (Stacked) */}
          <Grid item xs={12} md={6}>
            <Stack spacing={3} height="100%">
              {/* Activate License Form */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Stack spacing={2}>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <KeyRound size={22} color="#1A2744" />
                    <Typography variant="h6" fontWeight="bold" sx={{ color: "#1A2744" }}>
                      Update License Key
                    </Typography>
                  </Box>

                  <TextField
                    fullWidth
                    label="License Key"
                    variant="outlined"
                    size="small"
                    placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                    disabled={activating}
                    inputProps={{
                      style: { fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '1px', textAlign: 'center' }
                    }}
                  />
                  
                  <Button
                    variant="contained"
                    onClick={handleActivateLicense}
                    disabled={activating || !licenseKey}
                    sx={{
                      bgcolor: "#1A2744",
                      color: "white",
                      fontWeight: "bold",
                      py: 1,
                      "&:hover": {
                        bgcolor: "#111a2e",
                      }
                    }}
                  >
                    {activating ? <CircularProgress size={24} color="inherit" /> : "Activate License"}
                  </Button>
                </Stack>
              </Paper>

              {/* Contact Support Card */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  flexGrow: 1,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "white",
                }}
              >
                <Stack spacing={2} height="100%">
                  <Typography variant="h6" fontWeight="bold" sx={{ color: "#1A2744" }}>
                    Need a License?
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    To purchase or renew your license, please contact our support team.
                  </Typography>

                  <Box sx={{ mt: 'auto' }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: "#1A2744", mb: 1 }}>
                      Contact Abhijeet Shinde
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<Phone size={18} />}
                        href="tel:+918180904072"
                        sx={{ color: "#1A2744", borderColor: "divider", textTransform: 'none' }}
                      >
                        +91 8180904072
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<Mail size={18} />}
                        href="mailto:contact@getkosh.co.in"
                        sx={{ color: "#1A2744", borderColor: "divider", textTransform: 'none' }}
                      >
                        contact@getkosh.co.in
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
