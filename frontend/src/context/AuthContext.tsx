import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { Box, Typography } from "@mui/material";
import { setApiBaseUrl } from "../lib/api/api";
import KoshSpinningLoader from "../components/KoshSpinningLoader";
import { User } from "../lib/types/UserTypes"; // Ensure you have this type defined
import userApiService from "../lib/api/userService";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

type AppStatus =
  | "loading"
  | "server"
  | "client-connecting"
  | "client-connected";

interface AuthContextType {
  user: User | null;
  appStatus: AppStatus;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [appStatus, setAppStatus] = useState<AppStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const navigate = useNavigate();

  // --- Inactivity Timer ---
  const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(async () => {
    if (user) {
      try {
        const machineType = appStatus === "server" ? "server" : "client";
        await userApiService.logout(user.id, machineType);
      } catch (error) {
        console.error("Logout log failed", error);
      }
    }
    // ✅ Clear Token
    localStorage.removeItem("authToken");
    setUser(null);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    navigate("/");
  }, [user, appStatus, navigate]);

  const resetInactivityTimer = useCallback(() => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (user) {
      logoutTimerRef.current = setTimeout(() => {
        toast.error("Session expired due to inactivity");
        logout();
      }, INACTIVITY_LIMIT_MS);
    }
  }, [user, logout, INACTIVITY_LIMIT_MS]);

  // --- Electron IPC Init ---
  useEffect(() => {
    let offMode: (() => void) | undefined;
    let offUrl: (() => void) | undefined;

    (async () => {
      try {
        const mode = window.electron?.getAppMode
          ? await window.electron.getAppMode()
          : undefined;
        if (mode === "server") setAppStatus("server");
        else setAppStatus("client-connecting");

        const url = window.electron?.getServerUrl
          ? await window.electron.getServerUrl()
          : undefined;
        if (url) {
          setApiBaseUrl(url);
          setAppStatus("client-connected");
        }
      } catch (e) {
        setAppStatus("client-connecting");
      }
    })();

    if (window.electron?.onSetAppMode) {
      offMode = (window.electron.onSetAppMode as any)(
        (mode: "server" | "client") => {
          setAppStatus(
            mode === "server"
              ? "server"
              : (prev) =>
                  prev === "client-connected" ? prev : "client-connecting"
          );
        }
      );
    }
    if (window.electron?.onSetServerUrl) {
      offUrl = (window.electron.onSetServerUrl as any)((url: string) => {
        setApiBaseUrl(url);
        setAppStatus("client-connected");
      });
    }

    return () => {
      offMode?.();
      offUrl?.();
    };
  }, []);

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll"];
    const handleActivity = () => resetInactivityTimer();
    if (user) {
      events.forEach((event) => window.addEventListener(event, handleActivity));
      resetInactivityTimer();
    }
    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [user, resetInactivityTimer]);

  // --- Login ---
  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    setAuthLoading(true);
    try {
      const machineType = appStatus === "server" ? "server" : "client";
      const response = await userApiService.login({
        username,
        password,
        machineType,
        ip: "127.0.0.1",
      });

      if (response.success && response.user) {
        // ✅ SAVE TOKEN
        if (response.token) {
          localStorage.setItem("authToken", response.token);
        }
        setUser(response.user);
        toast.success(`Welcome, ${response.user.name}`);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Login failed", error);
      toast.error(error.message || "Login failed");
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const checkPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return user.permissions.includes(permission);
  };

  const value = {
    user,
    appStatus,
    loading: authLoading,
    login,
    logout,
    checkPermission,
  };

  if (appStatus === "loading") {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <KoshSpinningLoader />
        <Typography sx={{ ml: 2 }}>Initializing System...</Typography>
      </Box>
    );
  }

  if (appStatus === "client-connecting") {
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
      </Box>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
