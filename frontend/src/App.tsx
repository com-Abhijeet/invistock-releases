// src/App.tsx
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import {
  ThemeProvider,
  CssBaseline,
  Box,
  CircularProgress,
  Typography,
} from "@mui/material";
import theme from "../theme";
import { Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";

// --- Context ---
import { ModeProvider, useAppMode } from "./context/ModeContext";

// --- API ---
import { setApiBaseUrl } from "./lib/api/api";

// --- Layouts ---
import SidebarLayout from "./components/SidebarLayout";
import NonGstLayout from "./components/NonGstLayout";

// --- Global ---
import { flattenedMenu } from "./lib/navigation";
import LicensePage from "./pages/LicensePage";
import ViewLicensePage from "./pages/ViewLicensePage";

// --- (All your other page imports) ---
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductDetailPage from "./pages/ProductDetailsPage";
import CategoriesPage from "./pages/CategoryPage";
import SuppliersPage from "./pages/SuppliersPage";
import SupplierPage from "./pages/SupplierPage";
import CustomersPage from "./pages/CustomersPage";
import CustomerPage from "./pages/CustomerPage";
import SalesPOS from "./pages/SalesPos";
import SalesDashboard from "./pages/SalesDashboard";
import PurchasePage from "./pages/PurchasePage";
import PurchaseDashboardPage from "./pages/PurchaseDashboard";
import InventoryDashboardPage from "./pages/InventoryDashboardPage";
import TransactionsPage from "./pages/TransactionsPage";
import Gstr1ReportPage from "./pages/GstReportPage";
import SettingsPage from "./pages/Setting";
import NGSalesPos from "./pages/NGSalesPos";
import NGSalesPage from "./pages/NGSalesPage";
import ViewNGSalePage from "./pages/ViewNGSalePage";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoutes from "./components/auth/ProtectedRoutes";
import AboutPage from "./pages/AboutPage";
import ExpensesPage from "./pages/ExpensePage";
import StockAdjustmentsPage from "./pages/StockAdjustmentsPage";
import { UpdateProvider } from "./context/UpdateContext";

// /**
//  * Represents the current status of the application persistence layer.
//  *
//  * - `"loading"`: The application is initializing or loading resources.
//  * - `"server"`: The server is active and handling requests.
//  * - `"client-connected"`: The client has successfully connected to the server.
//  * - `"client-connecting"`: The client is in the process of connecting to the server.
//  */
// let persistedAppStatus:
//   | "loading"
//   | "server"
//   | "client-connected"
//   | "client-connecting" = "loading";
// let persistedServerUrl: string | null = null;

// Global component for handling F-key and mode-switch shortcuts
function GlobalShortcuts() {
  const navigate = useNavigate();
  const { toggleAppMode } = useAppMode();

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        toggleAppMode();
        return;
      }
      if (e.key.startsWith("F") && !isNaN(Number(e.key.substring(1)))) {
        const keyIndex = parseInt(e.key.substring(1), 10) - 1;
        if (keyIndex >= 0 && keyIndex < flattenedMenu.length) {
          e.preventDefault();
          const targetItem = flattenedMenu[keyIndex];
          navigate(targetItem.path);
        }
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => {
      window.removeEventListener("keydown", handleShortcut);
    };
  }, [navigate, toggleAppMode]);

  return null;
}

function AppLayout() {
  const { mode } = useAppMode();

  return (
    <Routes>
      {/* The mobile view route is handled by the backend now, but keeping for reference if needed */}
      {/* <Route path="/mobile-view" element={<MobileProductView />} /> */}

      {mode === "gst" ? (
        <Route
          path="/*"
          element={
            <SidebarLayout>
              <Toaster position="bottom-center" />
              <Routes>
                <Route path="/view-license" element={<ViewLicensePage />} />
                <Route path="/" element={<AboutPage />} />
                <Route path="/inventory" element={<InventoryDashboardPage />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:id" element={<ProductDetailPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/viewSupplier/:id" element={<SupplierPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/customer/:id" element={<CustomerPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/billing/:action?/:id?" element={<SalesPOS />} />
                <Route path="/sales" element={<SalesDashboard />} />
                <Route path="/billing/view/:id" element={<SalesPOS />} />

                <Route path="*" element={<Navigate to="/" />} />

                {/* Protected Routes (Require Admin PIN) */}
                <Route element={<ProtectedRoutes />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route
                    path="/purchase/:action?/:id?"
                    element={<PurchasePage />}
                  />
                  <Route
                    path="/purchase-dashboard"
                    element={<PurchaseDashboardPage />}
                  />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/gst" element={<Gstr1ReportPage />} />
                  <Route path="/settings" element={<SettingsPage />} />

                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/expenses" element={<ExpensesPage />} />
                  <Route
                    path="/adjustments"
                    element={<StockAdjustmentsPage />}
                  />
                </Route>
              </Routes>
            </SidebarLayout>
          }
        />
      ) : (
        <Route path="/non-gst" element={<NonGstLayout />}>
          <Route path="pos" element={<NGSalesPos />} />
          <Route path="history" element={<NGSalesPage />} />
          <Route path="view-sale/:id" element={<ViewNGSalePage />} />
          <Route index element={<Navigate to="/non-gst/pos" />} />
        </Route>
      )}

      <Route
        path="*"
        element={<Navigate to={mode === "gst" ? "/" : "/non-gst/pos"} />}
      />
    </Routes>
  );
}

function AppInitializer() {
  const [status, setStatus] = useState<
    "loading" | "server" | "client-connecting" | "client-connected"
  >("loading");

  console.log("[INIT] AppInitializer render, status =", status);

  useEffect(() => {
    console.log("[INIT] Starting AppInitializer...");

    let pollingInterval: NodeJS.Timeout | null = null;
    let isMounted = true;

    // 2. Initial Async Check
    const init = async () => {
      try {
        const mode = await window.electron.getAppMode();
        console.log("[INIT] App Mode from Main:", mode);

        if (mode === "server") {
          console.log("[INIT] Server mode detected");
          if (isMounted) {
            console.log("Setting status server");
            setStatus("server");
          }
          return true;
        }

        // We are in Client Mode. Do we have a URL?
        const serverUrlFromMain = await window.electron.getServerUrl();
        console.log("[INIT] Server URL from Main:", serverUrlFromMain);

        if (serverUrlFromMain) {
          console.log("[INIT] Got URL from Main, setting to client-connected");
          setApiBaseUrl(serverUrlFromMain);
          if (isMounted) {
            setStatus("client-connected"); // ✅ This MUST update state
          }
          return true;
        }

        // Fallback: Check localStorage
        const storedUrl = localStorage.getItem("serverUrl");
        if (storedUrl) {
          console.log("[INIT] Got URL from Storage:", storedUrl);
          setApiBaseUrl(storedUrl);
          if (isMounted) {
            setStatus("client-connected");
          }
          return true;
        }

        console.log("[INIT] No URL found, entering client-connecting mode");
        if (isMounted) {
          setStatus("client-connecting");
        }
        return false;
      } catch (e) {
        console.error("[INIT] Error during init:", e);
        if (isMounted) {
          setStatus("client-connecting");
        }
        return false;
      }
    };

    // Run initial check
    init().then((success) => {
      if (!success && isMounted) {
        console.log("[INIT] Starting polling for server URL...");
        pollingInterval = setInterval(async () => {
          const serverUrl = await window.electron.getServerUrl();
          if (serverUrl && isMounted) {
            console.log("[INIT] Polling found URL:", serverUrl);
            setApiBaseUrl(serverUrl);
            localStorage.setItem("serverUrl", serverUrl);
            setStatus("client-connected");
            if (pollingInterval) clearInterval(pollingInterval);
          }
        }, 2000);
      }
    });

    // 3. Event Listeners (with proper cleanup)
    const handleSetMode = (mode: "server" | "client") => {
      console.log("[INIT] Event: Mode ->", mode);
      if (isMounted) {
        setStatus(mode === "server" ? "server" : "client-connecting");
      }
    };

    const handleSetUrl = (url: string) => {
      console.log("[INIT] Event: URL ->", url);
      if (isMounted) {
        setApiBaseUrl(url);
        localStorage.setItem("serverUrl", url);
        setStatus("client-connected");
        if (pollingInterval) clearInterval(pollingInterval);
      }
    };

    // ✅ IMPORTANT: Remove old listeners before adding new ones
    window.electron.onSetAppMode(handleSetMode);
    window.electron.onSetServerUrl(handleSetUrl);

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, []);

  // -------------------- UI Rendering --------------------

  if (status === "loading") {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Starting KOSH...</Typography>
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
        <Typography variant="h6">Searching for KOSH Server...</Typography>
        <Typography color="text.secondary">
          Please ensure the main app is running on your network.
        </Typography>
      </Box>
    );
  }

  // ✅ Render app when status is "server" or "client-connected"
  return (
    <AuthProvider>
      <ModeProvider>
        <GlobalShortcuts />
        <AppLayout />
      </ModeProvider>
    </AuthProvider>
  );
}
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <UpdateProvider>
          <Routes>
            {/* ✅ License routes FIRST - no providers, no AppInitializer */}

            <Route path="/license" element={<LicensePage />} />
            <Route path="/*" element={<AppInitializer />} />
          </Routes>
        </UpdateProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
