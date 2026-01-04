"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Smartphone, Wifi, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";

const { electron } = window;

export default function MobileAccessTab() {
  const [ipAddress, setIpAddress] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (electron) {
      electron
        .getLocalIp()
        .then(setIpAddress)
        .finally(() => setLoading(false));
    }
  }, []);

  // ✅ Using HTTPS as discussed for the "Zero-Setup" workflow
  const mobileUrl = `https://${ipAddress}:5000/mobile`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mobileUrl);
    toast.success("URL copied to clipboard!");
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={5}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* --- Left Column: QR Code & Connection --- */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
          <CardContent sx={{ textAlign: "center" }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Connect Mobile Device
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Typography variant="body2" color="text.secondary" mb={3}>
              Scan this QR code with your phone's camera to instantly access the
              mobile stock checker.
            </Typography>

            {/* QR Code Box */}
            <Box
              sx={{
                display: "inline-block",
                p: 2,
                border: "1px solid #eee",
                borderRadius: 3,
                bgcolor: "#fff",
                mb: 3,
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
            >
              <QRCodeCanvas
                value={mobileUrl}
                size={220}
                level={"H"}
                includeMargin={true}
              />
            </Box>

            <Alert
              icon={<Wifi size={20} />}
              severity="info"
              sx={{ textAlign: "left", borderRadius: 2 }}
            >
              Ensure your phone is connected to the same Wi-Fi network as this
              computer.
            </Alert>
          </CardContent>
        </Card>
      </Grid>

      {/* --- Right Column: Manual URL & Help --- */}
      <Grid item xs={12} md={6}>
        <Stack spacing={3} sx={{ height: "100%" }}>
          {/* Manual Connection Card */}
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Manual Connection
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Typography variant="body2" color="text.secondary" mb={1}>
                If scanning fails, open your phone's browser (Chrome/Safari) and
                type this address exactly:
              </Typography>

              <TextField
                fullWidth
                size="small"
                value={mobileUrl}
                InputProps={{
                  readOnly: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Smartphone size={18} color="#666" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Copy URL">
                        <IconButton onClick={handleCopy}>
                          <Copy size={18} />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
                sx={{ bgcolor: "grey.50" }}
              />
            </CardContent>
          </Card>

          {/* Troubleshooting Card */}
          <Card variant="outlined" sx={{ flexGrow: 1, borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <HelpCircle size={20} color="#ed6c02" /> {/* Warning Color */}
                <Typography variant="h6" fontWeight={600}>
                  Troubleshooting
                </Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={1.5}>
                <Typography variant="body2" color="text.secondary">
                  <strong>1. Site Can't Be Reached?</strong>
                  <br />
                  Check your Windows Firewall. Ensure "Node.js" is allowed
                  through Private networks.
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  <strong>2. Camera Not Working?</strong>
                  <br />
                  Open <code>chrome://flags</code> on your phone. Enable
                  "Insecure origins treated as secure" and add{" "}
                  <code>{`https://${ipAddress}:5000`}</code>.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  );
}
