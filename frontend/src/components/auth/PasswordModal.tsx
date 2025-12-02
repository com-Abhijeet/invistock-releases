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
} from "@mui/material";
import { LockKeyhole } from "lucide-react";
import { useAuth } from "../../context/AuthContext"; // Adjust path if needed
import toast from "react-hot-toast";

export default function PasswordModal() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async () => {
    if (!password) return;

    setLoading(true);
    try {
      // Ensure we await the login if it's async (which it should be for IPC)
      const success = await login(password);

      if (!success) {
        toast.error("Incorrect PIN or Password");
        setPassword(""); // Clear input on failure
        // Shake animation logic could go here
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
          borderRadius: 4, // Modern rounded corners
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)", // Deep shadow for modal pop
          overflow: "visible", // Allow content to breathe
        },
      }}
      // Prevent closing by clicking outside
      disableEscapeKeyDown
    >
      <DialogContent sx={{ p: 4, textAlign: "center" }}>
        {/* --- Icon Bubble --- */}
        <Box
          sx={{
            display: "inline-flex",
            p: 2.5,
            borderRadius: "50%",
            bgcolor: "primary.lighter", // Light blue background
            color: "primary.main",
            mb: 2,
            background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
          }}
        >
          <LockKeyhole size={40} strokeWidth={1.5} />
        </Box>

        {/* --- Title & Subtitle --- */}
        <Typography variant="h5" fontWeight="800" gutterBottom>
          Admin Access
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={4}>
          This section is protected. Enter your secure PIN to continue.
        </Typography>

        {/* --- Password Input --- */}
        <TextField
          autoFocus
          fullWidth
          type="password"
          placeholder="••••"
          variant="outlined"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={loading}
          sx={{
            mb: 3,
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              backgroundColor: "grey.50",
              fontSize: "1.5rem", // Larger text for PIN feel
              fontWeight: "bold",
              letterSpacing: "8px", // Spacing for PIN masking dots
              textAlign: "center",
              "& input": {
                textAlign: "center", // Center the cursor/text
                py: 1.5,
              },
            },
          }}
        />

        {/* --- Action Button --- */}
        <Button
          onClick={handleSubmit}
          variant="contained"
          fullWidth
          size="large"
          disabled={loading || !password}
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
