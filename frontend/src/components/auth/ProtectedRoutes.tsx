import { Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ClientAccessDenied from "../../pages/ClientAccessDenied";
import PasswordModal from "./PasswordModal";

export default function ProtectedRoutes() {
  const { appStatus, isAdminAuthenticated } = useAuth();

  if (appStatus === "client-connected") {
    // Clients can never access protected routes
    return <ClientAccessDenied />;
  }

  if (appStatus === "server") {
    if (isAdminAuthenticated) {
      // Server is logged in, show the content
      return <Outlet />;
    } else {
      // Server is not logged in, show the password modal
      return <PasswordModal />;
    }
  }

  // Fallback for other states (e.g., loading)
  return null;
}
