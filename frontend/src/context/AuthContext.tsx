import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Box, Typography } from "@mui/material";
import { setApiBaseUrl } from "../lib/api/api";
import KoshSpinningLoader from "../components/KoshSpinningLoader";

type AppStatus =
  | "loading"
  | "server"
  | "client-connecting"
  | "client-connected";

interface AuthContextType {
  appStatus: AppStatus;
  isAdminAuthenticated: boolean;
  login: (password: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AppStatus>("loading");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  const ADMIN_PASSWORD = "admin";

  useEffect(() => {
    let offMode: (() => void) | undefined;
    let offUrl: (() => void) | undefined;

    // Get current values first to avoid missing events sent before mount
    (async () => {
      try {
        const mode =
          typeof window.electron?.getAppMode === "function"
            ? await window.electron.getAppMode()
            : undefined;
        console.log("[INIT] initial mode:", mode);
        if (mode === "server") setStatus("server");
        else setStatus("client-connecting");

        const url =
          typeof window.electron?.getServerUrl === "function"
            ? await window.electron.getServerUrl()
            : undefined;
        if (url) {
          console.log("[INIT] initial server URL:", url);
          setApiBaseUrl(url);
          setStatus("client-connected");
        }
      } catch (e) {
        console.warn("[INIT] failed to read initial mode/url:", e);
        setStatus("client-connecting");
      }
    })();

    // Subscribe to updates (preload may return an unsubscribe function)
    if (typeof window.electron?.onSetAppMode === "function") {
      offMode = (
        window.electron.onSetAppMode as unknown as (
          cb: (mode: "server" | "client") => void
        ) => (() => void) | undefined
      )((mode: "server" | "client") => {
        console.log("[INIT] App mode event:", mode);
        if (mode === "server") setStatus("server");
        else
          setStatus((prev) =>
            prev === "client-connected" ? prev : "client-connecting"
          );
      });
    }

    if (typeof window.electron?.onSetServerUrl === "function") {
      offUrl = (
        window.electron.onSetServerUrl as unknown as (
          cb: (url: string) => void
        ) => (() => void) | undefined
      )((url: string) => {
        console.log("[INIT] Server URL event:", url);
        setApiBaseUrl(url);
        setStatus("client-connected");
      });
    }

    return () => {
      if (typeof offMode === "function") offMode();
      else if (typeof window.electron?.removeSetAppMode === "function")
        window.electron.removeSetAppMode?.();

      if (typeof offUrl === "function") offUrl();
      else if (typeof window.electron?.removeSetServerUrl === "function")
        window.electron.removeSetServerUrl?.();
    };
  }, []);

  const login = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      return true;
    }
    return false;
  };

  const value = { appStatus: status, isAdminAuthenticated, login };

  if (status === "loading") {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <KoshSpinningLoader />
        <Typography>Loading Auth</Typography>
      </Box>
    );
  }

  if (status === "client-connecting") {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        gap={2}
        sx={{ backgroundColor: "grey.100" }}
      >
        <KoshSpinningLoader />
        <Typography variant="h6">Searching for KOSH Server...</Typography>
        <Typography color="text.secondary">
          Please ensure the main app is running on your network.
        </Typography>
      </Box>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
