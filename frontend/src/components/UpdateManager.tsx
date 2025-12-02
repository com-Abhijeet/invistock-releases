import { useEffect } from "react";
import toast from "react-hot-toast";
import { Box, Button, Typography, LinearProgress } from "@mui/material";
import { Download, RefreshCw, AlertTriangle } from "lucide-react";

// Access the strictly typed electron object from window
const electron = window.electron;

export default function UpdateManager() {
  useEffect(() => {
    // Safety check: ensure electron API is available (prevents crash in browser)
    if (!electron?.updater) return;

    // 1. Update Available
    // Note: The callback receives 'info' (UpdateInfo), but we don't strictly need it for the toast
    electron.updater.onUpdateAvailable((_info) => {
      toast("New update available. Downloading...", {
        icon: <Download size={18} />,
        duration: 4000,
        position: "bottom-right",
      });
    });

    // 2. Download Progress
    // Typed automatically as ProgressInfo from electron.d.ts
    electron.updater.onDownloadProgress((progress) => {
      const percent = Math.round(progress.percent);

      toast.custom(
        (_t) => (
          <Box
            sx={{
              bgcolor: "background.paper",
              boxShadow: 3,
              borderRadius: 2,
              p: 2,
              minWidth: 300,
              borderLeft: "4px solid #1976d2",
            }}
          >
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Downloading Update... {percent}%
            </Typography>
            <LinearProgress variant="determinate" value={percent} />
          </Box>
        ),
        { id: "update-progress", duration: 2000, position: "bottom-right" }
      );
    });

    // 3. Update Downloaded (Ready to Install)
    electron.updater.onUpdateDownloaded((_info) => {
      // Dismiss the progress toast
      toast.dismiss("update-progress");

      // Show the "Restart" prompt
      toast.custom(
        (t) => (
          <Box
            sx={{
              bgcolor: "background.paper",
              boxShadow: 4,
              borderRadius: 2,
              p: 2,
              maxWidth: 350,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              borderLeft: "4px solid #4caf50", // Green for success
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold">
              Update Ready to Install
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A new version has been downloaded. Restart the app to apply
              changes.
            </Typography>
            <Box display="flex" gap={1} justifyContent="flex-end">
              <Button
                size="small"
                onClick={() => toast.dismiss(t.id)}
                color="inherit"
              >
                Later
              </Button>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<RefreshCw size={16} />}
                // Call the exposed safe method instead of direct IPC
                onClick={() => electron.updater.restartApp()}
              >
                Restart Now
              </Button>
            </Box>
          </Box>
        ),
        { duration: Infinity, position: "bottom-right" }
      );
    });

    // 4. Error
    electron.updater.onUpdateError((err) => {
      toast.error("Update failed. Check logs.", {
        icon: <AlertTriangle size={18} color="orange" />,
      });
      console.error("Update error:", err);
    });

    // Cleanup: Remove listeners when component unmounts
    return () => {
      // We use the raw channel names here because our preload helper wraps ipcRenderer.removeAllListeners(channel)
      electron.updater.removeAllListeners("update-available");
      electron.updater.removeAllListeners("update-progress");
      electron.updater.removeAllListeners("update-downloaded");
      electron.updater.removeAllListeners("update-error");
    };
  }, []);

  return null; // This component renders nothing by default
}
