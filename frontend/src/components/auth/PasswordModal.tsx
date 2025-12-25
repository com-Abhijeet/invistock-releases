"use client";

import { useState } from "react";
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
} from "@mui/material";
import { LockKeyhole, User, KeyRound, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function PasswordModal() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async () => {
    if (!username || !password) {
      toast.error("Please enter both ID and Password");
      return;
    }

    setLoading(true);
    try {
      // Calls the AuthContext login which uses UserApiService
      const success = await login(username, password);

      if (!success) {
        setPassword(""); // Clear password on failure so they can retry
        // Toast is handled in AuthContext usually, but safe to have here if needed
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
        {/* --- Icon Bubble --- */}
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

        {/* --- Username Input --- */}
        <TextField
          autoFocus
          fullWidth
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

        {/* --- Password Input --- */}
        <TextField
          fullWidth
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
      </DialogContent>
    </Dialog>
  );
}
