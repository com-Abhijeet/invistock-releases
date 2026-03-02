"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  InputAdornment,
  IconButton,
  Avatar,
} from "@mui/material";
import {
  LockKeyhole,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeftRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function PasswordModal() {
  // Initialize state from local storage if a user logged in previously
  const savedUsername = localStorage.getItem("lastUsername") || "";

  const [username, setUsername] = useState(savedUsername);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // If we have a saved username, we assume they are re-authenticating
  const [isRelogin, setIsRelogin] = useState(!!savedUsername);

  const { login } = useAuth();

  // Refs for auto-focusing
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Auto focus logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isRelogin && passwordRef.current) {
        passwordRef.current.focus();
      } else if (!isRelogin && usernameRef.current) {
        usernameRef.current.focus();
      }
    }, 100); // Small delay to allow Dialog transition to complete
    return () => clearTimeout(timer);
  }, [isRelogin]);

  const handleSwitchUser = () => {
    setIsRelogin(false);
    setUsername("");
    setPassword("");
  };

  const handleSubmit = async () => {
    if (!username || !password) {
      toast.error("Please enter both ID and Password");
      return;
    }

    setLoading(true);
    try {
      const success = await login(username, password);

      if (!success) {
        setPassword(""); // Clear password on failure so they can retry
        // Automatically refocus the password input
        setTimeout(() => passwordRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error(error);
      toast.error("Authentication error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={true}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          overflow: "visible",
        },
      }}
      // Prevent closing by clicking outside or escape
      disableEscapeKeyDown
    >
      <DialogContent sx={{ p: 4, textAlign: "center" }}>
        {/* --- Header Area --- */}
        {isRelogin ? (
          <Box
            sx={{
              mb: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Avatar
              sx={{
                width: 70,
                height: 70,
                mb: 2,
                bgcolor: "primary.main",
                fontSize: "1.75rem",
                fontWeight: "bold",
                boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
              }}
            >
              {username.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="h5" fontWeight="800">
              Welcome back
            </Typography>
            <Typography
              variant="subtitle1"
              color="primary.main"
              fontWeight="600"
              mt={0.5}
            >
              @{username}
            </Typography>
          </Box>
        ) : (
          <>
            <Box
              sx={{
                display: "inline-flex",
                p: 2.5,
                borderRadius: "50%",
                bgcolor: "primary.lighter",
                color: "primary.main",
                mb: 2,
                background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
              }}
            >
              <LockKeyhole size={40} strokeWidth={1.5} />
            </Box>
            <Typography variant="h5" fontWeight="800" gutterBottom>
              System Locked
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={4}>
              Enter your credentials to continue.
            </Typography>
          </>
        )}

        {/* --- Username Input (Hidden if re-logging in) --- */}
        {!isRelogin && (
          <TextField
            fullWidth
            inputRef={usernameRef}
            label="Username or ID"
            variant="outlined"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <User size={20} className="text-gray-400" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
        )}

        {/* --- Password Input --- */}
        <TextField
          fullWidth
          inputRef={passwordRef}
          type={showPassword ? "text" : "password"}
          label="Password"
          variant="outlined"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={loading}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <KeyRound size={20} className="text-gray-400" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  tabIndex={-1} // Skip focusing on this button when tabbing
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />

        {/* --- Action Button --- */}
        <Button
          onClick={handleSubmit}
          variant="contained"
          fullWidth
          size="large"
          disabled={loading || !username || !password}
          sx={{
            borderRadius: 3,
            py: 1.5,
            mb: isRelogin ? 2 : 0,
            textTransform: "none",
            fontSize: "1rem",
            fontWeight: 700,
            boxShadow: "none",
            "&:hover": {
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            },
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Unlock System"
          )}
        </Button>

        {/* --- Switch User Option --- */}
        {isRelogin && (
          <Button
            onClick={handleSwitchUser}
            disabled={loading}
            startIcon={<ArrowLeftRight size={16} />}
            sx={{
              textTransform: "none",
              color: "text.secondary",
              fontWeight: 500,
              "&:hover": { color: "primary.main", bgcolor: "transparent" },
            }}
          >
            Login as someone else
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
