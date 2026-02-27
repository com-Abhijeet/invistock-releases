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
import DashboardHeader from "../components/DashboardHeader";

interface Plan {
  id: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice?: number;
  features: string[];
  recommended?: boolean;
}

const { electron } = window;

const API_BASE_URL = "http://localhost:5001/api/v1";

// Note: You should point this to your actual deployed website later.
const CHECKOUT_URL = `http://localhost:3000/checkout`;

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [machineId, setMachineId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const themeColors = {
    primary: "#115e59",
    primaryLight: "#ecfdf5",
    slateBorder: "#e2e8f0",
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        let mId = "unknown-machine";
        if (electron && electron.getMachineId) {
          mId = await electron.getMachineId();
          setMachineId(mId);
        } else {
          console.warn("Electron Machine ID not available.");
          setMachineId("mock-browser-id");
          mId = "mock-browser-id";
        }

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
        setError(
          "Could not connect to Kosh Pricing Server. Please check your internet.",
        );
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

    const url = `${CHECKOUT_URL}?p=${encodeURIComponent(
      planId,
    )}&m=${encodeURIComponent(machineId)}`;

    if (electron && electron.openExternalUrl) {
      electron.openExternalUrl(url);
      toast.success("Opening secure checkout in your browser...");
    } else {
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
        <CircularProgress sx={{ color: themeColors.primary }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4} textAlign="center" mt={10}>
        <Alert
          severity="error"
          sx={{ mb: 3, maxWidth: 600, mx: "auto", borderRadius: 2 }}
        >
          {error}
        </Alert>
        <Button
          variant="outlined"
          onClick={() => window.location.reload()}
          sx={{ color: themeColors.primary, borderColor: themeColors.primary }}
        >
          Retry Connection
        </Button>
      </Box>
    );
  }

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        backgroundColor: "#f8fafc",
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

      <Box maxWidth={1100} mx="auto" mt={6}>
        <Box textAlign="center" mb={6}>
          <Typography
            variant="h4"
            fontWeight="900"
            color="#0f172a"
            gutterBottom
          >
            Choose the Perfect Plan for Your Business
          </Typography>
          <Typography variant="body1" color="#475569" maxWidth={600} mx="auto">
            Unlock advanced features like Multi-User LAN access, Cloud Backup,
            and WhatsApp Auto-Invoicing.
          </Typography>

          {machineId && (
            <Chip
              icon={<Server size={14} color="#64748b" />}
              label={`Machine ID: ${machineId}`}
              size="small"
              sx={{
                mt: 3,
                fontFamily: "monospace",
                bgcolor: "#e2e8f0",
                color: "#334155",
                fontWeight: "bold",
              }}
            />
          )}
        </Box>

        <Grid container spacing={4} justifyContent="center">
          {plans.map((plan) => (
            <Grid item xs={12} md={5} key={plan.id}>
              <Card
                variant="outlined"
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 4,
                  position: "relative",
                  borderColor: plan.recommended
                    ? themeColors.primary
                    : themeColors.slateBorder,
                  boxShadow: plan.recommended
                    ? "0 12px 32px rgba(17, 94, 89, 0.15)"
                    : "none",
                  transform: plan.recommended ? "scale(1.02)" : "none",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
                  },
                }}
              >
                {plan.recommended && (
                  <Chip
                    label="Most Popular"
                    sx={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      fontWeight: "900",
                      bgcolor: themeColors.primary,
                      color: "white",
                      letterSpacing: 0.5,
                    }}
                  />
                )}

                <CardContent sx={{ p: 5, flexGrow: 1 }}>
                  <Typography
                    variant="overline"
                    color="#64748b"
                    fontWeight={800}
                    letterSpacing={1.5}
                  >
                    {plan.name.toUpperCase()}
                  </Typography>

                  <Box my={2} display="flex" alignItems="baseline">
                    <Typography variant="h3" fontWeight="900" color="#0f172a">
                      ₹{plan.monthlyPrice}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      color="#64748b"
                      ml={1}
                      fontWeight="bold"
                    >
                      / month
                    </Typography>
                  </Box>

                  {plan.description && (
                    <Typography
                      variant="body2"
                      color="#475569"
                      mb={3}
                      lineHeight={1.6}
                    >
                      {plan.description}
                    </Typography>
                  )}

                  <Divider
                    sx={{ my: 3, borderColor: themeColors.slateBorder }}
                  />

                  <Stack spacing={2.5}>
                    {plan.features.map((feature, idx) => (
                      <Stack
                        direction="row"
                        spacing={2}
                        alignItems="flex-start"
                        key={idx}
                      >
                        <CheckCircle2
                          size={20}
                          color="#059669"
                          strokeWidth={2.5}
                          style={{ marginTop: 2 }}
                        />
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color="#334155"
                        >
                          {feature}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>

                <Box p={4} pt={0}>
                  <Button
                    fullWidth
                    variant={plan.recommended ? "contained" : "outlined"}
                    size="large"
                    onClick={() => handleBuy(plan.id)}
                    startIcon={<Zap size={18} />}
                    endIcon={<ExternalLink size={16} />}
                    sx={{
                      py: 1.5,
                      borderRadius: 2.5,
                      textTransform: "none",
                      fontWeight: 800,
                      fontSize: "1rem",
                      bgcolor: plan.recommended
                        ? themeColors.primary
                        : "transparent",
                      color: plan.recommended ? "white" : themeColors.primary,
                      borderColor: plan.recommended
                        ? "transparent"
                        : themeColors.primary,
                      "&:hover": {
                        bgcolor: plan.recommended
                          ? "#0f4c4a"
                          : themeColors.primaryLight,
                        borderColor: themeColors.primary,
                      },
                    }}
                  >
                    Buy License Now
                  </Button>
                  <Typography
                    variant="caption"
                    display="block"
                    textAlign="center"
                    color="#94a3b8"
                    mt={2}
                    fontWeight="medium"
                  >
                    Checkout opens securely in your web browser
                  </Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box mt={8} textAlign="center" color="#64748b">
          <Stack
            direction="row"
            justifyContent="center"
            alignItems="center"
            spacing={1}
          >
            <ShieldCheck size={18} color={themeColors.primary} />
            <Typography variant="body2" fontWeight="bold">
              Payments are 100% secure. License keys are instantly generated and
              sent to your email.
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
