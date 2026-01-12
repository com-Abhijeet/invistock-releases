import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { ThemeProvider, CssBaseline, Box, Typography } from "@mui/material";
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

// --- Menu Configuration ---
import { menuSections } from "./config/menu"; // Ensure path is correct

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
import PermissionGuard from "./components/auth/PermissionGuard";
import AboutPage from "./pages/AboutPage";
import ExpensesPage from "./pages/ExpensePage";
import StockAdjustmentsPage from "./pages/StockAdjustmentsPage";
import { UpdateProvider } from "./context/UpdateContext";
import KoshSpinningLoader from "./components/KoshSpinningLoader";
import SmartRestockPage from "./pages/SmartRestockPage";
import DeadStockPage from "./pages/DeadStockPage";
import CustomerAnalyticsPage from "./pages/CustomerAnalyticsPage";
import ProductABCPage from "./pages/ProductABCPage";
import DayBookPage from "./pages/DayBookPage";
import PlansPage from "./pages/PlansPage";
import SalesTablePage from "./pages/SalesHistory";
import PurchaseTablePage from "./pages/PurchaseHistory";
import UserManagement from "./pages/UserManagement";
import AccessLogs from "./pages/AccessLogs";
import ConnectionsPage from "./pages/ConnectionsPage";
import CustomerLedgerPage from "./pages/CustomerLedgerPage";
import TitleBar from "./components/TitleBar";
import TrackerPage from "./pages/TrackerPage";
import ProductBatchesPage from "./pages/ProductBatchesPage";
import BatchAnalysisPage from "./pages/BatchAnalysisPage";

// Global component for handling F-key and mode-switch shortcuts
function GlobalShortcuts() {
  const navigate = useNavigate();
  const { toggleAppMode } = useAppMode();

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      // Toggle App Mode (GST <-> Non-GST)
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        toggleAppMode();
        return;
      }

      // Check for F-keys (F1-F12)
      if (e.key.startsWith("F") && !isNaN(Number(e.key.substring(1)))) {
        // Flatten the menu to find a matching shortcut
        // We use a loop here for efficiency since the menu is small
        for (const section of menuSections) {
          for (const item of section.items) {
            // Check if item has a shortcut defined and it matches the pressed key
            if ((item as any).shortcut === e.key) {
              e.preventDefault();
              navigate(item.path);
              return; // Stop after finding the match
            }
          }
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
      {mode === "gst" ? (
        <Route
          path="/*"
          element={
            <SidebarLayout>
              <Toaster position="bottom-center" />
              <Routes>
                {/* --- Public / License Pages --- */}
                <Route path="/view-license" element={<ViewLicensePage />} />
                <Route path="/" element={<AboutPage />} />

                {/* --- Protected Routes Wrapper --- */}
                <Route element={<ProtectedRoutes />}>
                  {/* --- Analytics & Reports --- */}
                  <Route
                    path="/dashboard"
                    element={
                      <PermissionGuard requiredPermission="dashboard">
                        <Dashboard />
                      </PermissionGuard>
                    }
                  />

                  {/* --- Sales & Billing --- */}
                  <Route
                    path="/billing"
                    element={
                      <PermissionGuard requiredPermission="billing">
                        <SalesPOS />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/billing/:action/:id"
                    element={
                      <PermissionGuard requiredPermission="billing">
                        <SalesPOS />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/sales"
                    element={
                      <PermissionGuard requiredPermission="sales">
                        <SalesDashboard />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/sales-history"
                    element={
                      <PermissionGuard requiredPermission="sales-history">
                        <SalesTablePage />
                      </PermissionGuard>
                    }
                  />

                  {/* --- Purchasing & Vendors --- */}
                  <Route
                    path="/purchase/:action?/:id?"
                    element={
                      <PermissionGuard requiredPermission="purchase">
                        <PurchasePage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/purchase-dashboard"
                    element={
                      <PermissionGuard requiredPermission="purchase-dashboard">
                        <PurchaseDashboardPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/purchase-history"
                    element={
                      <PermissionGuard requiredPermission="purchase-history">
                        <PurchaseTablePage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/suppliers"
                    element={
                      <PermissionGuard requiredPermission="suppliers">
                        <SuppliersPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/viewSupplier/:id"
                    element={
                      <PermissionGuard requiredPermission="suppliers">
                        <SupplierPage />
                      </PermissionGuard>
                    }
                  />

                  {/* --- Inventory & Products --- */}
                  <Route
                    path="/inventory"
                    element={
                      <PermissionGuard requiredPermission="inventory">
                        <InventoryDashboardPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/products"
                    element={
                      <PermissionGuard requiredPermission="products">
                        <Products />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/products/:id/batches"
                    element={
                      <PermissionGuard requiredPermission="products">
                        <ProductBatchesPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/products/:id/analysis"
                    element={
                      <PermissionGuard requiredPermission="products">
                        <BatchAnalysisPage />
                      </PermissionGuard>
                    }
                  />

                  <Route
                    path="/tracker"
                    element={
                      <PermissionGuard requiredPermission="products">
                        <TrackerPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/product/:id"
                    element={
                      <PermissionGuard requiredPermission="products">
                        <ProductDetailPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/adjustments"
                    element={
                      <PermissionGuard requiredPermission="adjustments">
                        <StockAdjustmentsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/categories"
                    element={
                      <PermissionGuard requiredPermission="categories">
                        <CategoriesPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/stock-restock"
                    element={
                      <PermissionGuard requiredPermission="stock-restock">
                        <SmartRestockPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/dead-stock"
                    element={
                      <PermissionGuard requiredPermission="dead-stock">
                        <DeadStockPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/product-abc-page"
                    element={
                      <PermissionGuard requiredPermission="product-abc-page">
                        <ProductABCPage />
                      </PermissionGuard>
                    }
                  />

                  {/* --- Payments & Transactions --- */}
                  <Route
                    path="/transactions"
                    element={
                      <PermissionGuard requiredPermission="transactions">
                        <TransactionsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/expenses"
                    element={
                      <PermissionGuard requiredPermission="expenses">
                        <ExpensesPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/daybook"
                    element={
                      <PermissionGuard requiredPermission="daybook">
                        <DayBookPage />
                      </PermissionGuard>
                    }
                  />

                  {/* --- CRM & Customers --- */}
                  <Route
                    path="/customers"
                    element={
                      <PermissionGuard requiredPermission="customers">
                        <CustomersPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/customer/:id"
                    element={
                      <PermissionGuard requiredPermission="customers">
                        <CustomerPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/customers/ledger/:id"
                    element={
                      <PermissionGuard requiredPermission="customers">
                        <CustomerLedgerPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/customer-analytics"
                    element={
                      <PermissionGuard requiredPermission="customer-analytics">
                        <CustomerAnalyticsPage />
                      </PermissionGuard>
                    }
                  />

                  {/* --- Reports --- */}
                  <Route
                    path="/gst"
                    element={
                      <PermissionGuard requiredPermission="gst">
                        <Gstr1ReportPage />
                      </PermissionGuard>
                    }
                  />

                  {/* --- Administration --- */}
                  <Route
                    path="/users"
                    element={
                      <PermissionGuard requiredPermission="users">
                        <UserManagement />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/access-logs"
                    element={
                      <PermissionGuard requiredPermission="access-logs">
                        <AccessLogs />
                      </PermissionGuard>
                    }
                  />

                  {/* --- System --- */}
                  <Route
                    path="/settings"
                    element={
                      <PermissionGuard requiredPermission="settings">
                        <SettingsPage />
                      </PermissionGuard>
                    }
                  />

                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/connections" element={<ConnectionsPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </SidebarLayout>
          }
        />
      ) : (
        <Route path="/non-gst" element={<NonGstLayout />}>
          {/* Non-GST routes can also be protected if needed */}
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
    const handleSetMode = async (mode: "server" | "client") => {
      console.log("[INIT] Event: Mode ->", mode);
      if (!isMounted) return;

      if (mode === "server") {
        setStatus("server");
        return;
      }

      // For 'client' mode: check if we already have a server URL before forcing 'client-connecting'
      try {
        const url = await window.electron.getServerUrl();
        if (url) {
          setApiBaseUrl(url);
          localStorage.setItem("serverUrl", url);
          setStatus("client-connected");
        } else {
          setStatus("client-connecting");
        }
      } catch (e) {
        setStatus("client-connecting");
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
        <KoshSpinningLoader />
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
        <KoshSpinningLoader />
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
      <TitleBar />
      <Router>
        <UpdateProvider>
          <Routes>
            {/* ✅ License routes FIRST - no providers, no AppInitializer */}

            <Route path="/license" element={<LicensePage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/*" element={<AppInitializer />} />
          </Routes>
        </UpdateProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
