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
import { getBusinessProfile, updateBusinessProfile } from "./lib/api/businessService";

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
import { TallySyncProvider } from "./context/TallySyncContext";
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
import CustomerAccountsPage from "./pages/CustomerAccountsPage";
import PendingBillsByCustomerPage from "./pages/PendingBillsByCustomerPage";
import SalesOrderPage from "./pages/SalesOrderPage";
import SalesOrdersList from "./pages/SalesOrdersList";
import ViewSalesOrderPage from "./pages/ViewSalesOrderPage";
import SupplierLedgerPage from "./pages/SupplierLedgerPage";
import EmployeeListPage from "./pages/EmployeeListPage";
import EmployeeDetailPage from "./pages/EmployeeDetailPage";
import AccountingDashboard from "./pages/AccountingDashboard";
import ExpiryReportPage from "./pages/ExpiryReportPage";
import TallyDashboard from "./pages/setup/TallyDashboard";
import TallyLedgerConfig from "./pages/setup/TallyLedgerConfig";
import BusinessSettings from "./pages/BusinessSettingsPage";
import MissingBatchesPage from "./pages/MissingBatchesPage";
import CheckPrintingPage from "./pages/CheckPrintingPage";

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

    // --- Global Number Input Fixes ---
    // Fixes the Material UI / React issue where "0" persists and causes inputs like "0159".
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement;
      if (target && target.tagName === "INPUT" && target.type === "number") {
        if (target.value === "0") {
          target.select();
        }
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLInputElement;
      if (target && target.tagName === "INPUT" && target.type === "number") {
        if (target.value === "0") {
          target.select();
        }
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement;
      if (target && target.tagName === "INPUT" && target.type === "number") {
        const val = target.value;
        // Removes leading zeros if followed by another digit (e.g., "0159" -> "159", "00" -> "0")
        if (val && /^0+(?=\d)/.test(val)) {
          const cleaned = val.replace(/^0+(?=\d)/, "");
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value",
          )?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(target, cleaned);
            target.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      }
    };

    window.addEventListener("keydown", handleShortcut);
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("click", handleClick);
    window.addEventListener("focusout", handleFocusOut);
    
    return () => {
      window.removeEventListener("keydown", handleShortcut);
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("focusout", handleFocusOut);
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
                  <Route
                    path="/accounting"
                    element={
                      <PermissionGuard requiredPermission="dashboard">
                        <AccountingDashboard />
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
                    path="/sales-order"
                    element={
                      <PermissionGuard requiredPermission="sales">
                        <SalesOrderPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/sales-order/:action/:id"
                    element={
                      <PermissionGuard requiredPermission="sales">
                        <SalesOrderPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/view-sales-order/:id"
                    element={<ViewSalesOrderPage />}
                  />

                  <Route
                    path="/sales-order-list"
                    element={
                      <PermissionGuard requiredPermission="sales">
                        <SalesOrdersList />
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
                  <Route
                    path="/quotations"
                    element={
                      <PermissionGuard requiredPermission="sales-history">
                        <SalesTablePage isQuotePage={true} />
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

                  <Route
                    path="/suppliers/ledger/:id"
                    element={
                      <PermissionGuard requiredPermission="suppliers">
                        <SupplierLedgerPage />
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
                    path="/missing-batches"
                    element={
                      <PermissionGuard requiredPermission="products">
                        <MissingBatchesPage />
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
                  <Route
                    path="/expiry-report"
                    element={
                      <PermissionGuard requiredPermission="expiry-report">
                        <ExpiryReportPage />
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
                    path="/customers/accounts"
                    element={
                      <PermissionGuard requiredPermission="customers">
                        <CustomerAccountsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/customers/pending-bills"
                    element={
                      <PermissionGuard requiredPermission="customers">
                        <PendingBillsByCustomerPage />
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
                  <Route
                    path="/employees"
                    element={
                      <PermissionGuard requiredPermission="users">
                        <EmployeeListPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/employees/:id"
                    element={
                      <PermissionGuard requiredPermission="users">
                        <EmployeeDetailPage />
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
                  <Route
                    path="/tally"
                    element={
                      <PermissionGuard requiredPermission="settings">
                        <TallyDashboard />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/tally-config"
                    element={
                      <PermissionGuard requiredPermission="settings">
                        <TallyLedgerConfig />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/business-settings"
                    element={
                      <PermissionGuard requiredPermission="settings">
                        <BusinessSettings />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/cheque-printing"
                    element={
                      <PermissionGuard requiredPermission="transactions">
                        <CheckPrintingPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/check-printing"
                    element={<Navigate to="/cheque-printing" replace />}
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

    let pollingInterval: ReturnType<typeof setInterval> | null = null;
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

          // Cloud Sync initialization
          try {
            const profile = await getBusinessProfile();
            let businessId = profile?.kosh_business_id;

            if (!businessId) {
              const machineId = await window.electron.getMachineId();
              try {
                // Attempt to fetch from kosh platform by machineId
                const res = await fetch(`https://api.getkosh.co.in/api/v1/business/machine/${machineId}`);
                if (res.ok) {
                  const data = await res.json();
                  if (data && data.businessId) {
                    businessId = data.businessId;
                    await updateBusinessProfile({ ...profile, kosh_business_id: businessId });
                  }
                }
              } catch (e) {
                console.error("[INIT] Failed to fetch business id from platform:", e);
              }
            }

            if (businessId) {
              window.electron.connectCloudSync(businessId);
              // Clear any missing business id warning if we use global state, 
              // for now we use localStorage to pass state to Action Center
              localStorage.removeItem("kosh_missing_business_id");
            } else {
              localStorage.setItem("kosh_missing_business_id", "true");
              // Dispatch an event so Action Center can re-render immediately
              window.dispatchEvent(new Event("kosh_missing_business_id_event"));
            }
          } catch (e) {
            console.error("[INIT] Cloud sync setup failed:", e);
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
        <TallySyncProvider>
          <GlobalShortcuts />
          <AppLayout />
        </TallySyncProvider>
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
