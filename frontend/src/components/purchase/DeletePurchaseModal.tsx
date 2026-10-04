"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Stack,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { ShieldAlert, AlertTriangle, Eye, EyeOff, Lock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import userApiService from "../../lib/api/userService";
import { deletePurchase } from "../../lib/api/purchaseService";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  purchase: any | null;
  onSuccess: () => void;
}

export default function DeletePurchaseModal({
  open,
  onClose,
  purchase,
  onSuccess,
}: Props) {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isAdmin = user?.role === "admin";

  const handleClose = () => {
    setPassword("");
    setShowPassword(false);
    setErrorMessage("");
    setIsVerifying(false);
    onClose();
  };

  const handleConfirmDelete = async () => {
    if (!purchase || !user) return;

    if (!isAdmin) {
      toast.error("Only Admin users can delete purchase vouchers.");
      return;
    }

    if (!password.trim()) {
      setErrorMessage("Please enter your admin password.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage("");

    try {
      // 1. Verify Admin Password by attempting authentication
      const authRes = await userApiService.login({
        username: user.username,
        password: password.trim(),
        machineType: "client",
        ip: "127.0.0.1",
      });

      if (!authRes || !authRes.success) {
        setErrorMessage("Invalid admin password. Deletion cancelled.");
        setIsVerifying(false);
        return;
      }

      // 2. Password verified! Execute Deletion
      await deletePurchase(purchase.id);
      toast.success(`Purchase #${purchase.reference_no} deleted successfully.`);
      handleClose();
      onSuccess();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to delete purchase.";
      setErrorMessage(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!purchase) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
    >
      {!isAdmin ? (
        <>
          {/* NON-ADMIN ACCESS BLOCKED MODAL */}
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <ShieldAlert size={24} color="#d32f2f" />
              <Typography variant="h6" fontWeight={800} color="error.main">
                Admin Access Required
              </Typography>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Alert
              severity="error"
              icon={<ShieldAlert size={20} />}
              sx={{ mb: 2, borderRadius: 2 }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                Role Restriction: Employee Account
              </Typography>
            </Alert>
            <Typography variant="body2" color="text.secondary" paragraph>
              Only users with the <strong>Admin</strong> role can delete purchase vouchers.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Deleting a purchase is a <strong>permanent, non-reversible action</strong> that alters inventory stock quantities and financial ledger balances.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={handleClose}
              variant="contained"
              color="primary"
              fullWidth
              sx={{ borderRadius: 2 }}
            >
              I Understand
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          {/* ADMIN CONFIRMATION & PASSWORD VERIFICATION MODAL */}
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <AlertTriangle size={24} color="#d32f2f" />
              <Typography variant="h6" fontWeight={800} color="error.main">
                Delete Purchase Voucher
              </Typography>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You are about to permanently delete <strong>Purchase #{purchase.reference_no}</strong> (Supplier: {purchase.supplier_name || "N/A"}).
            </Typography>

            <Alert
              severity="warning"
              icon={<AlertTriangle size={20} />}
              sx={{ mb: 2, borderRadius: 2 }}
            >
              <Typography variant="caption" fontWeight={700} display="block">
                NON-REVERSIBLE ACTION
              </Typography>
              <Typography variant="caption" display="block">
                This will revert product stock levels and cancel associated ledger transactions.
              </Typography>
            </Alert>

            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {errorMessage}
              </Alert>
            )}

            <Typography
              variant="caption"
              fontWeight={700}
              color="text.primary"
              sx={{ mb: 1, display: "block" }}
            >
              ENTER ADMIN PASSWORD TO CONFIRM:
            </Typography>
            <TextField
              fullWidth
              size="small"
              type={showPassword ? "text" : "password"}
              placeholder="Admin Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && password.trim()) {
                  handleConfirmDelete();
                }
              }}
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock size={16} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1 }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={handleClose} color="inherit" disabled={isVerifying}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              variant="contained"
              color="error"
              disabled={!password.trim() || isVerifying}
            >
              {isVerifying ? "Verifying..." : "Confirm & Delete"}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
