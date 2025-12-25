import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  Button,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import {
  Wifi,
  Monitor,
  Server,
  Edit2,
  CheckCircle2,
  Network,
  ArrowLeft,
} from "lucide-react";
import DashboardHeader from "../components/DashboardHeader";
import { useNavigate } from "react-router-dom";

// Safely access electron
const electron = (window as any).electron;

export default function ConnectionsPage() {
  const navigate = useNavigate();
  const [appMode, setAppMode] = useState<string | null>(null);
  const [networkIfaces, setNetworkIfaces] = useState<any[]>([]);
  const [currentServer, setCurrentServer] = useState<string>("");

  // Manual Config State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!electron) return;

    // 1. Get Mode
    const mode = await electron.getAppMode();
    setAppMode(mode);

    // 2. Get Network Info (for both modes)
    const ifaces = await electron.getNetworkDetails();
    setNetworkIfaces(ifaces);

    // 3. Get Current Connection (Client Only)
    const serverUrl = await electron.getServerUrl();
    setCurrentServer(serverUrl || "");

    // 4. Check if Manual config exists to populate the modal
    const savedManual = await electron.getManualServer();
    if (savedManual) setManualInput(savedManual);
  };

  const handleSaveManual = async () => {
    if (!electron) return;
    await electron.setManualServer(manualInput);
    setIsEditOpen(false);
    setIsSaved(true);
    // Reload app to apply new connection settings
    setTimeout(() => {
      // In electron, we can just reload the window or ask user to restart
      window.location.reload();
    }, 1500);
  };

  const handleClearManual = async () => {
    if (!electron) return;
    await electron.setManualServer(""); // Empty string clears it
    setManualInput("");
    setIsEditOpen(false);
    window.location.reload();
  };

  return (
    <Box p={3} sx={{ bgcolor: "#f9fafb", minHeight: "100vh" }}>
      <Button
        startIcon={<ArrowLeft size={18} />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2, color: "text.secondary" }}
      >
        Back to About
      </Button>

      <DashboardHeader
        title="Connection Status"
        showSearch={false}
        showDateFilters={false}
      />

      <Stack spacing={3} maxWidth={800}>
        {/* --- CLIENT MODE VIEW --- */}
        {appMode === "client" && (
          <Card
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 4,
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                <Network size={32} color="#2563eb" />
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Client Connection
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Status of your connection to the main server.
                  </Typography>
                </Box>
              </Stack>

              <Box bgcolor="grey.50" p={3} borderRadius={2} mb={3}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight="bold"
                >
                  CURRENT SERVER URL
                </Typography>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  mt={1}
                >
                  <Typography
                    variant="h5"
                    fontWeight="500"
                    sx={{ fontFamily: "monospace" }}
                  >
                    {currentServer || "Searching / Not Connected"}
                  </Typography>
                  <Chip
                    label={currentServer ? "Connected" : "Disconnected"}
                    color={currentServer ? "success" : "error"}
                    size="small"
                  />
                </Stack>
              </Box>

              <Button
                variant="outlined"
                startIcon={<Edit2 size={16} />}
                onClick={() => setIsEditOpen(true)}
              >
                Configure Manually
              </Button>
            </CardContent>
          </Card>
        )}

        {/* --- SERVER MODE VIEW --- */}
        {appMode === "server" && (
          <Card
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 4,
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                <Server size={32} color="#2563eb" />
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Server Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Share these details with clients to connect manually.
                  </Typography>
                </Box>
              </Stack>

              <Alert severity="info" sx={{ mb: 3 }}>
                Clients on the same network (WiFi or Ethernet) can enter these
                addresses to connect.
              </Alert>

              <Typography variant="subtitle2" fontWeight="bold" mb={2}>
                AVAILABLE CONNECTION ADDRESSES
              </Typography>

              <Stack spacing={2}>
                {networkIfaces.map((iface, idx) => (
                  <Box
                    key={idx}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    p={2}
                    bgcolor="white"
                    border="1px solid"
                    borderColor="grey.200"
                    borderRadius={2}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      {iface.type === "WiFi" ? (
                        <Wifi size={20} />
                      ) : (
                        <Monitor size={20} />
                      )}
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {iface.type} Connection
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {iface.name}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography
                      variant="h6"
                      fontFamily="monospace"
                      color="primary.main"
                    >
                      http://{iface.address}:3000
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* --- NETWORK DIAGNOSTICS (BOTH MODES) --- */}
        <Card
          elevation={0}
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 4 }}
        >
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              This Device
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Current network interfaces active on this machine.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {networkIfaces.map((iface, idx) => (
                <Chip
                  key={idx}
                  icon={
                    iface.type === "WiFi" ? (
                      <Wifi size={14} />
                    ) : (
                      <Monitor size={14} />
                    )
                  }
                  label={`${iface.type}: ${iface.address}`}
                  variant="outlined"
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Manual Config Modal */}
      <Dialog
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Manual Connection Setup</DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            color="text.secondary"
            paragraph
            sx={{ mt: 1 }}
          >
            If auto-discovery fails, enter the IP address displayed on the Main
            Server (e.g., http://192.168.1.5:3000).
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Server URL"
            placeholder="http://192.168.1.X:3000"
            fullWidth
            variant="outlined"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClearManual} color="error">
            Reset to Auto
          </Button>
          <Box flexGrow={1} />
          <Button onClick={() => setIsEditOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveManual} variant="contained">
            Save & Connect
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Toast / Overlay */}
      <Dialog open={isSaved}>
        <Box p={4} textAlign="center" minWidth={300}>
          <CheckCircle2
            size={48}
            color="#2e7d32"
            style={{ margin: "0 auto" }}
          />
          <Typography variant="h6" mt={2} fontWeight="bold">
            Settings Saved
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Reloading connection...
          </Typography>
        </Box>
      </Dialog>
    </Box>
  );
}
