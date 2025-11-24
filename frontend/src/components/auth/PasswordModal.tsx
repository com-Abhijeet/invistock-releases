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
} from "@mui/material";
import { Lock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function PasswordModal() {
  const [password, setPassword] = useState("");
  const { login } = useAuth();

  const handleSubmit = () => {
    const success = login(password);
    if (!success) {
      toast.error("Incorrect Password");
    }
  };

  return (
    <Dialog open={true} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Lock />
          <Typography variant="h6">Admin Access Required</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography gutterBottom>
          Please enter the admin password to access this section.
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          label="Password"
          type="password"
          fullWidth
          variant="outlined"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleSubmit} variant="contained">
          Unlock
        </Button>
      </DialogActions>
    </Dialog>
  );
}
