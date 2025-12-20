"use client";

import { useEffect, useState } from "react";
import {
  Typography,
  Stack,
  Button,
  Card,
  CardContent,
  Alert,
  Divider,
  Box,
  CircularProgress,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  Download,
  Upload,
  Database,
  AlertTriangle,
  ArchiveRestore,
  Cloud,
  Check,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

const { electron } = window;
const { ipcRenderer } = electron;

export default function BackupRestoreTab() {
  const [gdriveConnected, setGdriveConnected] = useState(false);
  const [loadingGDrive, setLoadingGDrive] = useState(true);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<Date | null>(null);
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const [reAuthLoading, setReAuthLoading] = useState(false);

  // Check Google Drive status on mount
  useEffect(() => {
    if (electron) {
      Promise.all([
        electron.getGDriveStatus().then((status: boolean) => {
          setGdriveConnected(status);
        }),
        electron.getGDriveTokenExpiry().then((expiry: number | null) => {
          if (expiry) {
            const expiryDate = new Date(expiry);
            setTokenExpiresAt(expiryDate);
            setIsTokenExpired(new Date() > expiryDate);
          }
        }),
      ]).finally(() => setLoadingGDrive(false));

      // Listen for successful login from the main process
      electron.onGDriveConnected(() => {
        setGdriveConnected(true);
        toast.success("Google Drive Connected Successfully!");
      });

      // Listen for token expiration warnings
      electron.onGDriveTokenExpiring(() => {
        setIsTokenExpired(true);
        toast.error(
          "Google Drive token expired. Please re-authenticate to resume backups."
        );
      });
    }
  }, []);

  const handleBackup = async () => {
    if (!ipcRenderer) return toast.error("Desktop features not available.");

    if (isTokenExpired) {
      return toast.error("Google Drive token expired. Please re-authenticate.");
    }

    toast.loading("Creating backup...");
    try {
      const result = await ipcRenderer.invoke("backup-database");
      toast.dismiss();

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || "Backup failed");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Backup failed: " + (error as Error).message);
    }
  };

  const handleRestore = () => {
    if (!ipcRenderer) return toast.error("Desktop features not available.");

    const isConfirmed = window.confirm(
      "ARE YOU SURE?\n\nRestoring from a backup will completely overwrite ALL current data in the application. This action cannot be undone. The application will restart automatically."
    );

    if (isConfirmed) {
      ipcRenderer.invoke("restore-database");
    }
  };

  const handleGDriveLogin = async () => {
    if (!electron) return;
    setReAuthLoading(true);
    try {
      await electron.loginGDrive();
      // Token expiry will be refreshed after successful login
      const expiry = await electron.getGDriveTokenExpiry();
      if (expiry) {
        setTokenExpiresAt(new Date(expiry));
        setIsTokenExpired(false);
      }
      toast.success("Google Drive re-authenticated successfully!");
    } catch (error) {
      toast.error("Google Drive authentication failed.");
      console.error(error);
    } finally {
      setReAuthLoading(false);
    }
  };

  const formatExpiryDate = (date: Date | null) => {
    if (!date) return "Unknown";
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days <= 0) return "Expired";
    if (days === 1) return "Expires tomorrow";
    if (days <= 7) return `Expires in ${days} days`;
    return date.toLocaleDateString();
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* --- Section 1: Local Backup --- */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                <Database size={20} color="#1976d2" />
                <Typography variant="h6">Local Backup</Typography>
              </Stack>
              <Divider sx={{ mb: 3 }} />

              <Typography variant="body2" color="text.secondary" paragraph>
                Generate a snapshot of your entire application database. This
                includes all products, sales history, customers, and settings.
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                We recommend saving backups to an external drive or cloud
                storage regularly.
              </Typography>

              <Box mt={4}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Download />}
                  onClick={handleBackup}
                  fullWidth
                >
                  Create Local Backup
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* --- Section 2: Restore --- */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                <ArchiveRestore size={20} color="#d32f2f" />
                <Typography variant="h6">Restore Data</Typography>
              </Stack>
              <Divider sx={{ mb: 3 }} />

              <Typography variant="body2" color="text.secondary" paragraph>
                Restore your application data from a previously saved backup
                file (.db).
              </Typography>

              <Alert
                severity="warning"
                icon={<AlertTriangle size={20} />}
                sx={{ mb: 3, alignItems: "center" }}
              >
                <Typography variant="body2" fontWeight="bold">
                  Warning: Destructive Action
                </Typography>
                <Typography variant="caption" display="block">
                  Restoring will <strong>permanently overwrite</strong> all
                  current data. This action cannot be undone.
                </Typography>
              </Alert>

              <Box mt="auto">
                <Button
                  variant="outlined"
                  color="error"
                  size="large"
                  startIcon={<Upload />}
                  onClick={handleRestore}
                  fullWidth
                >
                  Select File & Restore
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* --- Section 3: Cloud Backup (Google Drive) --- */}
        <Grid item xs={12}>
          <Card
            variant="outlined"
            sx={{
              borderColor: isTokenExpired ? "#d32f2f" : "inherit",
              borderWidth: isTokenExpired ? 2 : 1,
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                <Cloud size={20} color="#0F9D58" />
                <Typography variant="h6">Google Drive Backup</Typography>
              </Stack>
              <Divider sx={{ mb: 3 }} />

              {/* ✅ Token Expiry Status */}
              {gdriveConnected && tokenExpiresAt && (
                <Alert
                  severity={isTokenExpired ? "error" : "info"}
                  icon={
                    isTokenExpired ? (
                      <AlertCircle size={20} />
                    ) : (
                      <Check size={20} />
                    )
                  }
                  sx={{ mb: 2 }}
                >
                  <Typography variant="body2">
                    {isTokenExpired
                      ? "⚠️ Token Expired - Re-authentication required"
                      : "✅ Token Valid"}
                  </Typography>
                  <Typography variant="caption" display="block">
                    {formatExpiryDate(tokenExpiresAt)}
                  </Typography>
                </Alert>
              )}

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    gutterBottom
                  >
                    Automatic Cloud Sync
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Connect your Google Drive to automatically upload your daily
                    backup when the application closes. This ensures your data
                    is safe even if your computer crashes.
                  </Typography>
                </Grid>
                <Grid
                  item
                  xs={12}
                  md={4}
                  sx={{
                    display: "flex",
                    justifyContent: { xs: "flex-start", md: "flex-end" },
                    gap: 1,
                  }}
                >
                  {loadingGDrive ? (
                    <CircularProgress size={24} />
                  ) : gdriveConnected && !isTokenExpired ? (
                    <>
                      <Alert
                        icon={<Check fontSize="inherit" />}
                        severity="success"
                        variant="outlined"
                        sx={{ flex: 1 }}
                      >
                        <strong>Connected</strong>
                        <Typography variant="caption" display="block">
                          Backups will sync on exit.
                        </Typography>
                      </Alert>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshCw size={16} />}
                        onClick={handleGDriveLogin}
                        disabled={reAuthLoading}
                      >
                        Re-auth
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={
                        reAuthLoading ? (
                          <CircularProgress size={16} />
                        ) : (
                          <Cloud />
                        )
                      }
                      onClick={handleGDriveLogin}
                      disabled={reAuthLoading}
                      fullWidth
                      sx={{
                        bgcolor: "#0F9D58",
                        "&:hover": { bgcolor: "#0B874B" },
                      }}
                    >
                      {reAuthLoading
                        ? "Authenticating..."
                        : isTokenExpired
                        ? "Re-authenticate"
                        : "Sign in with Google"}
                    </Button>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
