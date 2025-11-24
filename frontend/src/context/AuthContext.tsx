import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { setApiBaseUrl } from "../lib/api/api";

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

// This new component will replace your AppInitializer
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AppStatus>("loading");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // This is the hard-coded password for the server/admin.
  // In a real app, you might fetch this from a config file.
  const ADMIN_PASSWORD = "admin";

  useEffect(() => {
    // 1. Listen for the initial mode from main.js
    window.electron.onSetAppMode((mode: "server" | "client") => {
      console.log(`[INIT] App mode received: ${mode}`);
      if (mode === "server") {
        setStatus("server");
      } else {
        setStatus("client-connecting");
      }
    });

    // 2. Listen for the server URL from main.js
    window.electron.onSetServerUrl((url: string) => {
      setApiBaseUrl(url); // Redirect the API
      setStatus("client-connected"); // Unlock the app
    });
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
        <CircularProgress />
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
        <CircularProgress />
        <Typography variant="h6">Searching for InviStock Server...</Typography>
        <Typography color="text.secondary">
          Please ensure the main app is running on your network.
        </Typography>
      </Box>
    );
  }

  // If status is 'server' or 'client-connected', render the app.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to easily access the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
