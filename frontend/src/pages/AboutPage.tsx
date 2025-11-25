"use client";

import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemButton,
  CircularProgress,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useNavigate } from "react-router-dom"; // Assuming you use React Router
import { flattenedMenu } from "../lib/navigation";

// ✅ Import an icon for the license page
import { KeyRound } from "lucide-react";
import { useState, useEffect } from "react";
const { electron } = window;
const AboutPage = () => {
  const navigate = useNavigate();
  // ✅ State to hold the application mode
  const [appMode, setAppMode] = useState<string | null>(null);

  // ✅ Fetch the app mode when the component loads
  useEffect(() => {
    electron
      .getAppMode()
      .then(setAppMode)
      .catch((err) => {
        console.error("Failed to get app mode:", err);
        setAppMode("Error");
      });
  }, []);

  return (
    <Box p={3}>
      {/* --- Left Column (Unchanged) --- */}
      <Grid container spacing={4}>
        {/* --- Left Column (Unchanged) --- */}
        <Grid item xs={12} md={4}>
          <Stack
            direction="column"
            justifyContent="space-between"
            sx={{ height: "calc(90vh - 48px)" }}
          >
            {/* App Intro */}
            <Box>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                Welcome to InviStock
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                component="div"
                mt={2}
              >
                Your complete solution for business management. Key features
                include:
                <ul style={{ paddingLeft: "20px", marginTop: "8px" }}>
                  <li>
                    <b>Billing:</b> Fast and accurate Point of Sale (POS) for
                    creating invoices.
                  </li>
                  <li>
                    <b>Inventory Management:</b> Real-time stock tracking and
                    product catalog management.
                  </li>
                  <li>
                    <b>Purchase & Supplier Tracking:</b> Manage purchase orders
                    and vendor details seamlessly.
                  </li>
                  <li>
                    <b>Business Analytics:</b> In-depth dashboards for sales,
                    purchases, and payments.
                  </li>
                  <li>
                    <b>Data Management:</b> Easy import and export for products,
                    categories, and more.
                  </li>
                  <li>
                    <b>CRM & Reporting:</b> Manage your customer directory and
                    Account summary.
                  </li>
                </ul>
              </Typography>
            </Box>

            {/* Developer Details */}
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: "grey.50" }}>
              {/* ✅ Added Mode Indicator */}
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={1}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  Developer : Abhijeet Shinde
                </Typography>
                {appMode ? (
                  <Chip
                    label={appMode}
                    color={appMode === "server " ? "success" : "info"}
                    size="small"
                  />
                ) : (
                  <>
                    <CircularProgress size={20} />
                    <Typography>Loading About Page</Typography>
                  </>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                Version 1.0.0
              </Typography>
              <Typography variant="caption" color="text.secondary">
                For support, contact: +91 9370294078, invistock@gmail.com
              </Typography>
            </Paper>
          </Stack>
        </Grid>

        {/* --- Right Column (Action List) --- */}
        <Grid item xs={12} md={8}>
          <Paper variant="outlined">
            <List disablePadding>
              {flattenedMenu.map((item, index) => (
                <ListItem key={item.path} divider sx={{ py: 0.5 }}>
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    sx={{ width: "100%", px: 0 }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      width="100%"
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        {item.icon}
                        <Typography variant="body1" fontWeight={500}>
                          {item.label}
                        </Typography>
                      </Stack>

                      {index < 12 && (
                        <Chip label={`F${index + 1}`} size="small" />
                      )}
                    </Stack>
                  </ListItemButton>
                </ListItem>
              ))}

              {/* ✅ ADDED: License Page Link */}
              <ListItem key="/view-license" divider sx={{ py: 1 }}>
                <ListItemButton
                  onClick={() => navigate("/view-license")}
                  sx={{ width: "100%", px: 0 }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    width="100%"
                  >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <KeyRound size={18} />
                      <Typography variant="body1" fontWeight={500}>
                        License Status
                      </Typography>
                    </Stack>
                    {/* No F-key chip for this one */}
                  </Stack>
                </ListItemButton>
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AboutPage;
