import { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { Box, Typography, Button } from "@mui/material";
import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PasswordModal from "./PasswordModal"; // ✅ Import PasswordModal

interface PermissionGuardProps {
  children: ReactNode;
  requiredPermission: string;
}

export default function PermissionGuard({
  children,
  requiredPermission,
}: PermissionGuardProps) {
  const { checkPermission, user } = useAuth();
  const navigate = useNavigate();

  // ✅ FIX: If no user is logged in, show the Password Modal immediately
  // instead of returning null (which caused the blank page).
  if (!user) {
    return <PasswordModal />;
  }

  const hasAccess = checkPermission(requiredPermission);

  if (!hasAccess) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="60vh"
        gap={2}
      >
        <ShieldAlert size={64} className="text-red-500" />
        <Typography variant="h5" fontWeight="bold" color="error">
          Access Denied
        </Typography>
        <Typography color="text.secondary">
          You do not have permission to view this page ({requiredPermission}).
        </Typography>
        <Button variant="outlined" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}
