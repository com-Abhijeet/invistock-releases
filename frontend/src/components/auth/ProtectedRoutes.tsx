import { Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PasswordModal from "./PasswordModal";
import { Box, CircularProgress } from "@mui/material";

export default function ProtectedRoutes() {
  const { appStatus, user, loading } = useAuth();

  // 1. Loading State (Prevents flickering while checking auth)
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // 2. Auth Check for BOTH Server and Client
  // We allow "client-connected" to reach this block so employees can login from client machines.
  if (appStatus === "server" || appStatus === "client-connected") {
    if (user) {
      // User is logged in, show the content
      return <Outlet />;
    } else {
      // User is NOT logged in, show the login modal
      // This will now appear on ANY protected route (Dashboard, Billing, Users, etc.)
      return <PasswordModal />;
    }
  }

  // Fallback for initializing/loading states
  return null;
}
