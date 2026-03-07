"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  CircularProgress,
  useTheme,
  Alert,
  AlertTitle,
  Divider,
} from "@mui/material";
import { Cloud, Save, Smartphone, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

import DashboardHeader from "../components/DashboardHeader";
import {
  getBusinessProfile,
  updateBusinessProfile,
  BusinessProfile,
} from "../lib/api/businessService";

export default function BusinessSettings() {
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile>({
    kosh_business_id: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await getBusinessProfile();
      if (data) {
        setProfile(data);
      }
    } catch (error: any) {
      toast.error("Failed to load business profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const loadId = toast.loading("Saving online identity...");

    try {
      const updatedData = await updateBusinessProfile(profile);
      setProfile(updatedData);
      toast.success("Business Profile synced successfully!", { id: loadId });
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile", { id: loadId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      p={2}
      pt={3}
      sx={{ bgcolor: theme.palette.background.default, minHeight: "100vh" }}
    >
      <DashboardHeader
        title="Cloud Sync & Online Profile"
        showSearch={false}
        showDateFilters={false}
      />

      <Box sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
        <Card
          variant="outlined"
          sx={{ borderRadius: 3, boxShadow: theme.shadows[2] }}
        >
          <form onSubmit={handleSave}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Box
                  p={1.5}
                  bgcolor={theme.palette.primary.light + "20"}
                  borderRadius={2}
                  color="primary.main"
                >
                  <Cloud size={28} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Online Identity
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage your Kosh cloud credentials and mobile pairing
                    settings.
                  </Typography>
                </Box>
              </Box>

              <Alert
                severity="info"
                icon={<ShieldCheck />}
                sx={{ mb: 4, borderRadius: 2 }}
              >
                <AlertTitle>Secure Peer-to-Peer Pairing</AlertTitle>
                Your <strong>Kosh Business ID</strong> acts as a secure tunnel
                key. By entering the exact same ID into your Mobile App, you
                establish a direct, real-time connection to this desktop without
                storing any data on external servers.
              </Alert>

              <Box mb={4}>
                <Typography
                  variant="subtitle2"
                  color="text.primary"
                  fontWeight="bold"
                  sx={{
                    mb: 1.5,
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Smartphone size={16} /> Mobile App Pairing
                </Typography>
                <TextField
                  fullWidth
                  label="Kosh Business ID"
                  variant="outlined"
                  value={profile?.kosh_business_id || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, kosh_business_id: e.target.value })
                  }
                  placeholder="e.g., KOSH-1234-ABCD"
                  helperText="Enter the unique Business ID provided by Kosh to enable real-time mobile sync."
                  InputProps={{
                    sx: {
                      fontWeight: 600,
                      letterSpacing: 1,
                      fontFamily: "monospace",
                    },
                  }}
                />
              </Box>

              {/* Future fields (like subscription tier, sync toggles) can easily be added here 
                  without changing the backend, thanks to your dynamic repository! */}

              <Divider sx={{ my: 3 }} />

              <Box display="flex" justifyContent="flex-end">
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={saving}
                  startIcon={
                    saving ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <Save size={20} />
                    )
                  }
                  sx={{ px: 4, py: 1.5, borderRadius: 2, fontWeight: "bold" }}
                >
                  {saving ? "Saving..." : "Save Identity"}
                </Button>
              </Box>
            </CardContent>
          </form>
        </Card>
      </Box>
    </Box>
  );
}
