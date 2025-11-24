import { useEffect } from "react";
import toast from "react-hot-toast";
import { Box, Button, Typography, LinearProgress } from "@mui/material";
import { Download, RefreshCw, AlertTriangle } from "lucide-react";

const { electron } = window;

export default function UpdateManager() {
  useEffect(() => {
    if (!electron) return;

    // 1. Update Available
    electron.ipcRenderer.on("update-available", () => {
      toast("New update available. Downloading...", {
        icon: <Download size={18} />,
        duration: 4000,
        position: "bottom-right",
      });
    });

    // 2. Download Progress
    // We use a custom toast ID 'update-progress' to update the SAME toast
    // instead of spamming new ones.
    electron.ipcRenderer.on("update-progress", (progress: any) => {
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
    electron.ipcRenderer.on("update-downloaded", () => {
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
                onClick={() => electron.restartApp()}
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
    electron.ipcRenderer.on("update-error", (err: string) => {
      toast.error("Update failed. Check logs.", {
        icon: <AlertTriangle size={18} color="orange" />,
      });
      console.error("Update error:", err);
    });
  }, []);

  return null; // This component renders nothing by default
}
