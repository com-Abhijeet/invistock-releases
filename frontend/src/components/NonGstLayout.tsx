"use client";

import {
  Box,
  Typography,
  Button,
  Stack,
  Divider,
  Tabs,
  Tab,
} from "@mui/material";
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { useAppMode } from "../context/ModeContext";
import { ArrowLeft } from "lucide-react"; // ✅ Import ArrowLeft
import { Toaster } from "react-hot-toast";

export default function NonGstLayout() {
  const { toggleAppMode } = useAppMode();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine the current tab value from the URL
  // This makes the tabs sync with browser navigation
  let currentTab: string | false = false;
  if (location.pathname.startsWith("/cash-sale/history")) {
    currentTab = "/non-gst/history";
  } else if (location.pathname.startsWith("/cash-sale")) {
    currentTab = "/cash-sale";
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    navigate(newValue);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "grey.100",
      }}
    >
      <Toaster position="bottom-center" />

      <Box
        p={2}
        pt={3}
        sx={{
          backgroundColor: "#fff",
          borderTopLeftRadius: "36px",
          borderBottomLeftRadius: "36px",
          minHeight: "100vh",
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* --- Header Section --- */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: 2, mb: 2 }}
        >
          {/* ✅ Left: Back Button */}
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<ArrowLeft size={18} />}
            onClick={toggleAppMode}
            title="Back to Main App (Alt+C)"
          >
            Back to Main App
          </Button>

          {/* ✅ Center: Active/Passive Tabs */}
          <Box>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              aria-label="Non-GST Navigation"
            >
              <Tab
                label="New Cash Sale"
                value="/cash-sale"
                component={Link}
                to="/cash-sale"
              />
              <Tab
                label="Sales History"
                value="/cash-sale/history"
                component={Link}
                to="/non-gst/history"
              />
            </Tabs>
          </Box>

          {/* ✅ Right: Simple Title */}
          <Box sx={{ minWidth: 160, textAlign: "right" }}>
            <Typography variant="h6" fontWeight="bold" color="text.secondary">
              Cash Sale System
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 3 }} />

        {/* --- Page Content --- */}
        <Box sx={{ flexGrow: 1, px: 2 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
