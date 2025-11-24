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
import UpdateManager from "./components/UpdateManager";

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
      <Route path="/license" element={<LicensePage />} />
      {/* The mobile view route is handled by the backend now, but keeping for reference if needed */}
      {/* <Route path="/mobile-view" element={<MobileProductView />} /> */}

      {mode === "gst" ? (
        <Route
          path="/*"
          element={
            <SidebarLayout>
              <Toaster position="bottom-center" />
              <Routes>
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
                  <Route path="/view-license" element={<ViewLicensePage />} />
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

// ✅ FIXED AppInitializer
function AppInitializer() {
  // 1. Use STATE for the status, so updates trigger re-renders
  const [status, setStatus] = useState<
    "loading" | "server" | "client-connecting" | "client-connected"
  >("loading");

  useEffect(() => {
    console.log("[INIT] Starting AppInitializer...");

    // 2. Initial Async Check
    // We check both the persistent store AND ask the main process
    const init = async () => {
      try {
        // Check if we are in Server mode
        const mode = await window.electron.getAppMode();
        console.log("[INIT] App Mode from Main:", mode);

        if (mode === "Admin (Server) Mode" || mode === "server") {
          setStatus("server");
          return;
        }

        // We are in Client Mode. Do we have a URL?
        // First, check if main process already found one
        const serverUrlFromMain = await window.electron.getServerUrl(); // You need to expose this in preload if not already
        if (serverUrlFromMain) {
          console.log("[INIT] Got URL from Main:", serverUrlFromMain);
          setApiBaseUrl(serverUrlFromMain);
          setStatus("client-connected");
          return;
        }

        // Fallback: Check localStorage
        const storedUrl = localStorage.getItem("serverUrl");
        if (storedUrl) {
          console.log("[INIT] Got URL from Storage:", storedUrl);
          setApiBaseUrl(storedUrl);
          // Optional: We can set status to connected, or wait for verification
          // For now, let's set it to connected to unlock UI
          setStatus("client-connected");
        } else {
          setStatus("client-connecting");
        }
      } catch (e) {
        console.error("[INIT] Error during init:", e);
        setStatus("client-connecting");
      }
    };

    init();

    // 3. Event Listeners (for live updates)
    const handleSetMode = (mode: "server" | "client") => {
      console.log("[INIT] Event: Mode ->", mode);
      if (mode === "server") setStatus("server");
      else
        setStatus((prev) =>
          prev === "client-connected" ? prev : "client-connecting"
        );
    };

    const handleSetUrl = (url: string) => {
      console.log("[INIT] Event: URL ->", url);
      setApiBaseUrl(url);
      localStorage.setItem("serverUrl", url); // Persist it
      setStatus("client-connected");
    };

    window.electron.onSetAppMode(handleSetMode);
    window.electron.onSetServerUrl(handleSetUrl);
  }, []);

  // --- Render Logic ---

  if (status === "loading") {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Starting InviStock...</Typography>
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
          Please ensure the main app is running.
        </Typography>
      </Box>
    );
  }

  // Server or Client-Connected -> Render App
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
        <UpdateManager />
        <AppInitializer />
      </Router>
    </ThemeProvider>
  );
}

export default App;
