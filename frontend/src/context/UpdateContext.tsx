"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import toast from "react-hot-toast";
import { Box, Typography, Button } from "@mui/material";
import { Download, RefreshCw } from "lucide-react";

const { electron } = window;

export interface UpdateProgress {
  bytesPerSecond: number;
  percent: number;
  total: number;
  transferred: number;
}

interface UpdateContextType {
  status: "idle" | "checking" | "available" | "downloading" | "ready" | "error";
  progress: UpdateProgress | null;
  newVersion: string | null;
  currentVersion: string;
  checkForUpdates: () => void;
  restartApp: () => void;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<UpdateContextType["status"]>("idle");
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState("Loading...");

  useEffect(() => {
    // DEBUG: Check what is actually available in window.electron
    console.log("UpdateProvider Mounted");
    console.log("window.electron:", electron);
    console.log("window.electron.updater:", electron?.updater);

    if (!electron?.updater) {
      console.error(
        "CRITICAL: electron.updater is UNDEFINED. Check preload.js!"
      );
      setCurrentVersion("Web/Dev Mode");
      return;
    }

    // Get Current Version
    electron.updater
      .getAppVersion()
      .then((ver: string) => {
        console.log("Current App Version:", ver);
        setCurrentVersion(ver);
      })
      .catch((err: any) => {
        console.error("Failed to get version:", err);
        setCurrentVersion("Unknown");
      });

    // --- Listeners ---
    electron.updater.onUpdateAvailable((info: any) => {
      console.log("EVENT: Update Available", info);
      setStatus("available");
      setNewVersion(info.version);
      toast(`New version v${info.version} available. Downloading...`, {
        icon: <Download size={18} />,
        duration: 4000,
      });
    });

    electron.updater.onUpdateNotAvailable(() => {
      console.log("EVENT: Update Not Available");
      setStatus("idle");
      toast.success("You are on the latest version.");
    });

    electron.updater.onDownloadProgress((prog: UpdateProgress) => {
      setStatus("downloading");
      setProgress(prog);
    });

    electron.updater.onUpdateDownloaded((info: any) => {
      console.log("EVENT: Update Downloaded", info);
      setStatus("ready");
      setNewVersion(info.version);

      toast.custom(
        (t) => (
          <Box
            sx={{
              bgcolor: "background.paper",
              boxShadow: 4,
              borderRadius: 2,
              p: 2,
              maxWidth: 350,
              borderLeft: "4px solid #2e7d32",
            }}
          >
            <Typography variant="subtitle2" fontWeight="bold">
              Update Ready
            </Typography>
            <Typography
              variant="caption"
              display="block"
              mb={1}
              color="text.secondary"
            >
              Version {info.version} is ready to install.
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
                startIcon={<RefreshCw size={14} />}
                onClick={() => electron.updater.restartApp()}
              >
                Restart
              </Button>
            </Box>
          </Box>
        ),
        { duration: Infinity, position: "bottom-right" }
      );
    });

    electron.updater.onUpdateError((err: any) => {
      console.error("EVENT: Update Error", err);
      setStatus("error");
      toast.error("Update check failed.");
    });

    return () => {
      if (electron?.updater?.removeAllListeners) {
        electron.updater.removeAllListeners("update-available");
        electron.updater.removeAllListeners("update-not-available");
        electron.updater.removeAllListeners("update-progress");
        electron.updater.removeAllListeners("update-downloaded");
        electron.updater.removeAllListeners("update-error");
      }
    };
  }, []);

  const checkForUpdates = () => {
    console.log("ACTION: User clicked Check for Updates");

    if (!electron?.updater) {
      console.error("ACTION FAILED: electron.updater is missing.");
      toast.error("Updater API not found");
      return;
    }

    setStatus("checking");
    electron.updater
      .checkForUpdates()
      .then(() => console.log("ACTION: Check started successfully"))
      .catch((err: any) => {
        console.error("ACTION ERROR: Failed to check:", err);
        setStatus("error");
        toast.error("Could not start check");
      });
  };

  const restartApp = () => {
    if (!electron?.updater) return;
    electron.updater.restartApp();
  };

  return (
    <UpdateContext.Provider
      value={{
        status,
        progress,
        newVersion,
        currentVersion,
        checkForUpdates,
        restartApp,
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
}

export const useUpdate = () => {
  const context = useContext(UpdateContext);
  if (!context) throw new Error("useUpdate must be used within UpdateProvider");
  return context;
};
