"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Stack,
  Divider,
  Chip,
  Alert,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  CheckCircle2,
  ShieldCheck,
  Zap,
  Server,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import DashboardHeader from "../components/DashboardHeader"; // Reuse your header

// Define the shape of a Plan object based on your API
interface Plan {
  id: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice?: number;
  features: string[]; // Assuming features is an array of strings
  recommended?: boolean;
}

// Access the electron bridge
const { electron } = window;

// Configuration
const API_BASE_URL = "http://localhost:5001/api/v1"; // Change to localhost for dev if needed
const CHECKOUT_URL = `http://localhost:3000/checkout`;

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [machineId, setMachineId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // 1. Get Machine ID from Electron
        let mId = "unknown-machine";
        if (electron && electron.getMachineId) {
          mId = await electron.getMachineId();
          setMachineId(mId);
        } else {
          // Fallback for browser-only dev mode
          console.warn("Electron Machine ID not available. Using mock ID.");
          setMachineId("mock-browser-id");
          mId = "mock-browser-id";
        }

        // 2. Fetch Plans from Web Platform
        const res = await fetch(`${API_BASE_URL}/plan`);
        if (!res.ok) throw new Error("Failed to fetch plans from server.");

        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPlans(json.data);
        } else {
          throw new Error("Invalid response format from server.");
        }
      } catch (err: any) {
        console.error("Plan fetch error:", err);
        setError(err.message || "Could not load pricing plans.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleBuy = (planId: string) => {
    if (!machineId) {
      toast.error("Machine ID missing. Cannot proceed.");
      return;
    }

    // 3. Construct Checkout URL
    const url = `${CHECKOUT_URL}?p=${encodeURIComponent(
      planId
    )}&m=${encodeURIComponent(machineId)}`;

    // 4. Open in Default Browser
    if (electron && electron.openExternalUrl) {
      electron.openExternalUrl(url);
      toast.success("Opening checkout in your browser...");
    } else {
      // Fallback for web dev
      window.open(url, "_blank");
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4} textAlign="center">
        <Alert severity="error" sx={{ mb: 2, maxWidth: 600, mx: "auto" }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        backgroundColor: "#fff",
        borderTopLeftRadius: "36px",
        borderBottomLeftRadius: "36px",
        minHeight: "100vh",
      }}
    >
      <DashboardHeader
        title="Upgrade Your License"
        showSearch={false}
        showDateFilters={false}
      />

      <Box maxWidth={1200} mx="auto" mt={4}>
        <Box textAlign="center" mb={6}>
          <Typography variant="h4" fontWeight="800" gutterBottom>
            Choose the Perfect Plan for Your Business
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Unlock advanced features like Cloud Backup, WhatsApp Automation, and
            Multi-User access.
          </Typography>

          {/* Display Machine ID for reference/debug */}
          {machineId && (
            <Chip
              icon={<Server size={14} />}
              label={`Machine ID: ${machineId}`}
              size="small"
              sx={{ mt: 2, fontFamily: "monospace", bgcolor: "grey.100" }}
            />
          )}
        </Box>

        <Grid container spacing={4} justifyContent="center">
          {plans.map((plan) => (
            <Grid item xs={12} md={4} key={plan.id}>
              <Card
                variant="outlined"
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 4,
                  position: "relative",
                  borderColor: plan.recommended ? "primary.main" : "divider",
                  boxShadow: plan.recommended
                    ? "0 8px 24px rgba(25, 118, 210, 0.15)"
                    : "none",
                  transform: plan.recommended ? "scale(1.02)" : "none",
                  transition: "transform 0.2s",
                }}
              >
                {plan.recommended && (
                  <Chip
                    label="Most Popular"
                    color="primary"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      fontWeight: "bold",
                    }}
                  />
                )}

                <CardContent sx={{ p: 4, flexGrow: 1 }}>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    fontWeight={700}
                    letterSpacing={1.2}
                  >
                    {plan.name.toUpperCase()}
                  </Typography>

                  <Box my={2} display="flex" alignItems="baseline">
                    <Typography variant="h3" fontWeight="bold">
                      ₹{plan.monthlyPrice}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" ml={1}>
                      / month
                    </Typography>
                  </Box>

                  {plan.description && (
                    <Typography variant="body2" color="text.secondary" mb={3}>
                      {plan.description}
                    </Typography>
                  )}

                  <Divider sx={{ my: 3 }} />

                  <Stack spacing={2}>
                    {plan.features.map((feature, idx) => (
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        key={idx}
                      >
                        <CheckCircle2
                          size={18}
                          color="#2e7d32"
                          strokeWidth={2.5}
                        />
                        <Typography variant="body2" fontWeight={500}>
                          {feature}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>

                <Box p={3} pt={0}>
                  <Button
                    fullWidth
                    variant={plan.recommended ? "contained" : "outlined"}
                    size="large"
                    onClick={() => handleBuy(plan.id)}
                    startIcon={<Zap size={18} />}
                    endIcon={<ExternalLink size={16} />}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: "1rem",
                    }}
                  >
                    Buy Now
                  </Button>
                  <Typography
                    variant="caption"
                    display="block"
                    textAlign="center"
                    color="text.disabled"
                    mt={1.5}
                  >
                    Secure checkout via Web Platform
                  </Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box mt={6} textAlign="center" color="text.secondary">
          <Stack
            direction="row"
            justifyContent="center"
            alignItems="center"
            spacing={1}
          >
            <ShieldCheck size={16} />
            <Typography variant="caption">
              Payments are processed securely. Licenses are activated
              immediately for this machine.
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
