"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  Stack,
  Card,
  CardContent,
  Divider,
  Alert,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { CheckCircle, Smartphone, HelpCircle, QrCode } from "lucide-react";

const { electron } = window;

export default function WhatsAppTab() {
  const [status, setStatus] = useState("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    // 1. Get initial status
    electron.getWhatsAppStatus().then((data: any) => {
      setStatus(data.status);
      setQrCode(data.qr);
    });

    // 2. Listen for live updates
    electron.onWhatsAppUpdate((data: any) => {
      setStatus(data.status);
      setQrCode(data.qr);
    });
  }, []);

  return (
    <Grid container spacing={3}>
      {/* --- Left Column: Connection Status & QR --- */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined" sx={{ height: "100%" }}>
          <CardContent sx={{ textAlign: "center" }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="center"
              spacing={1.5}
              mb={1}
            >
              <QrCode size={20} color="#25D366" />
              <Typography variant="h6">Connection Status</Typography>
            </Stack>
            <Divider sx={{ mb: 3 }} />

            {status === "ready" ? (
              <Box
                sx={{
                  color: "success.main",
                  py: 6,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <CheckCircle
                  size={80}
                  strokeWidth={1.5}
                  style={{ marginBottom: 16 }}
                />
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  Connected
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Automated messaging system is active and ready to send
                  invoices.
                </Typography>
              </Box>
            ) : (
              <Box>
                {/* QR Container */}
                <Box
                  sx={{
                    height: 280,
                    width: 280,
                    mx: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "#f5f5f5",
                    borderRadius: 2,
                    mb: 3,
                    border: "1px dashed #ddd",
                  }}
                >
                  {qrCode ? (
                    <img
                      src={qrCode}
                      alt="WhatsApp QR"
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: 8,
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <Stack alignItems="center" spacing={1}>
                      <CircularProgress size={30} color="inherit" />
                      <Typography variant="caption" color="text.secondary">
                        Generating QR Code...
                      </Typography>
                    </Stack>
                  )}
                </Box>

                <Chip
                  label={`Status: ${status.toUpperCase()}`}
                  color={status === "scanning" ? "warning" : "default"}
                  variant="outlined"
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* --- Right Column: Instructions & Help --- */}
      <Grid item xs={12} md={6}>
        <Stack spacing={3} sx={{ height: "100%" }}>
          {/* Instructions Card */}
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                <Smartphone size={20} color="#1976d2" />
                <Typography variant="h6">How to Connect</Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />

              <Typography variant="body2" color="text.secondary" paragraph>
                Link this application to your WhatsApp account to enable
                automatic invoice sending.
              </Typography>

              <Stack spacing={1}>
                <Alert severity="info" sx={{ py: 0, alignItems: "center" }}>
                  1. Open <strong>WhatsApp</strong> on your phone.
                </Alert>
                <Alert severity="info" sx={{ py: 0, alignItems: "center" }}>
                  2. Tap <strong>Menu</strong> (⋮) or <strong>Settings</strong>.
                </Alert>
                <Alert severity="info" sx={{ py: 0, alignItems: "center" }}>
                  3. Select <strong>Linked Devices</strong> &gt;{" "}
                  <strong>Link a Device</strong>.
                </Alert>
                <Alert severity="info" sx={{ py: 0, alignItems: "center" }}>
                  4. Point your phone at the QR code on the left.
                </Alert>
              </Stack>
            </CardContent>
          </Card>

          {/* Troubleshooting Card */}
          <Card variant="outlined" sx={{ flexGrow: 1 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                <HelpCircle size={20} color="#ed6c02" />
                <Typography variant="h6">Troubleshooting</Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={1.5}>
                <Typography variant="body2" color="text.secondary">
                  <strong>QR Code not loading?</strong>
                  <br />
                  Ensure your PC is connected to the internet. The background
                  service needs to download the WhatsApp client data.
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  <strong>Stuck on "Scanning"?</strong>
                  <br />
                  If the QR code expires or doesn't work, try navigating away
                  from this tab and coming back to refresh the session.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  );
}
