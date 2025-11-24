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
} from "lucide-react";
import toast from "react-hot-toast";

// Get the ipcRenderer exposed by your preload script
const { electron } = window;
const { ipcRenderer } = electron;

export default function BackupRestoreTab() {
  const [gdriveConnected, setGdriveConnected] = useState(false);
  const [loadingGDrive, setLoadingGDrive] = useState(true);

  // Check Google Drive status on mount
  useEffect(() => {
    if (electron) {
      electron.getGDriveStatus().then((status: boolean) => {
        setGdriveConnected(status);
        setLoadingGDrive(false);
      });

      // Listen for successful login from the main process
      electron.onGDriveConnected(() => {
        setGdriveConnected(true);
        toast.success("Google Drive Connected Successfully!");
      });
    }
  }, []);

  const handleBackup = async () => {
    if (!ipcRenderer) return toast.error("Desktop features not available.");

    toast.loading("Creating backup...");
    const result = await ipcRenderer.invoke("backup-database");
    toast.dismiss();

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleRestore = () => {
    if (!ipcRenderer) return toast.error("Desktop features not available.");

    // Use a confirmation dialog before proceeding with a destructive action
    const isConfirmed = window.confirm(
      "ARE YOU SURE?\n\nRestoring from a backup will completely overwrite ALL current data in the application. This action cannot be undone. The application will restart automatically."
    );

    if (isConfirmed) {
      ipcRenderer.invoke("restore-database");
    }
  };

  const handleGDriveLogin = () => {
    if (!electron) return;
    electron.loginGDrive();
    toast.loading("Please complete login in your browser...", {
      duration: 5000,
    });
  };

  // Optional: You might want a logout function in the future,
  // but usually deleting the token file manually is the way for now.

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
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                <Cloud size={20} color="#0F9D58" />
                <Typography variant="h6">Google Drive Backup</Typography>
              </Stack>
              <Divider sx={{ mb: 3 }} />

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
                  }}
                >
                  {loadingGDrive ? (
                    <CircularProgress size={24} />
                  ) : gdriveConnected ? (
                    <Alert
                      icon={<Check fontSize="inherit" />}
                      severity="success"
                      variant="outlined"
                      sx={{ width: "100%" }}
                    >
                      <strong>Connected</strong>
                      <Typography variant="caption" display="block">
                        Backups will sync on exit.
                      </Typography>
                    </Alert>
                  ) : (
                    <Button
                      variant="contained"
                      color="success" // Google Green-ish
                      startIcon={<Cloud />}
                      onClick={handleGDriveLogin}
                      fullWidth
                      sx={{
                        bgcolor: "#0F9D58",
                        "&:hover": { bgcolor: "#0B874B" },
                      }}
                    >
                      Sign in with Google
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
