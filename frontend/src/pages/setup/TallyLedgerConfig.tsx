import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  useTheme,
  Fade,
  Container,
} from "@mui/material";

import Grid from "@mui/material/GridLegacy";
import {
  getTallyConfigs,
  saveTallyConfigs,
  syncBaseConfigs,
} from "../../services/tallyApi";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import SaveIcon from "@mui/icons-material/Save";
import DashboardHeader from "../../components/DashboardHeader";
import {
  Wifi,
  ShoppingCart,
  Receipt,
  AccountBalance,
  Inventory,
  Payments,
} from "@mui/icons-material";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tally-tabpanel-${index}`}
      aria-labelledby={`tally-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Fade in={value === index}>
          <Box sx={{ py: 3 }}>{children}</Box>
        </Fade>
      )}
    </div>
  );
}

export default function TallyLedgerConfig() {
  const theme = useTheme();
  const [configs, setConfigs] = useState<Record<string, string>>({
    tally_port: "9000",
    tally_host: "localhost",
    default_sales_ledger: "Sales A/c",
    default_purchase_ledger: "Purchase A/c",
    default_discount_ledger: "Discount",
    default_roundoff_ledger: "Round Off",
    default_cgst_ledger: "CGST",
    default_sgst_ledger: "SGST",
    default_igst_ledger: "IGST",
    default_cash_ledger: "Cash",
    default_bank_ledger: "Bank A/c",
    default_expense_ledger: "General Expenses",
    default_godown: "Main Location",
    default_units: "pcs, kg, g, ltr, doz, box",
    tally_educational_mode: "false",
  });

  const [openSnack, setOpenSnack] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");
  const [snackSeverity, setSnackSeverity] = useState<"success" | "error">(
    "success",
  );
  const [tabValue, setTabValue] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const data = await getTallyConfigs();
      if (data && Object.keys(data).length > 0) {
        setConfigs((prev) => ({ ...prev, ...data }));
      }
    } catch (e) {
      console.error("Failed to load tally configs", e);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setConfigs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await saveTallyConfigs(configs);
      setSnackMsg("Configurations saved successfully!");
      setSnackSeverity("success");
      setOpenSnack(true);
    } catch (e: any) {
      setSnackMsg(e.message || "Failed to save configs");
      setSnackSeverity("error");
      setOpenSnack(true);
    }
  };

  const handleAutoCreate = async () => {
    try {
      await saveTallyConfigs(configs);
      setSyncing(true);
      const res = await syncBaseConfigs();
      setSnackMsg(res.message || "All configurations generated in Tally!");
      setSnackSeverity("success");
      setOpenSnack(true);
    } catch (e: any) {
      setSnackMsg(
        e.response?.data?.error ||
          e.message ||
          "Failed to create configs in Tally",
      );
      setSnackSeverity("error");
      setOpenSnack(true);
    } finally {
      setSyncing(false);
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

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        maxWidth: 1400,
        mx: "auto",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
      }}
    >
      <DashboardHeader
        title="Tally Ledger Configuration"
        showDateFilters={false}
        showSearch={false}
        actions={
          <Button
            variant="contained"
            color="secondary"
            startIcon={
              syncing ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <AutoFixHighIcon />
              )
            }
            onClick={handleAutoCreate}
            disabled={syncing}
            sx={{
              py: 1,
              px: 3,
              borderRadius: 2,
              fontWeight: 700,
              boxShadow: `0 4px 12px ${theme.palette.secondary.main}40`,
            }}
          >
            {syncing
              ? "GENERATING IN TALLY..."
              : "AUTO-CREATE CONFIGS IN TALLY"}
          </Button>
        }
      />

      <Container maxWidth="lg" sx={{ pt: 4 }}>
        {/* --- FLOATING PILL NAVIGATION --- */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 0.5,
              backgroundColor: "rgba(0, 0, 0, 0.04)",
              borderRadius: 3,
              display: "inline-flex",
            }}
          >
            <Tabs
              value={tabValue}
              onChange={(_e, newValue) => setTabValue(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: "auto",
                "& .MuiTabs-indicator": { display: "none" },
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  minHeight: 40,
                  minWidth: "auto",
                  borderRadius: 2.5,
                  px: 2.5,
                  py: 1,
                  mx: 0.5,
                  color: "text.secondary",
                  transition: "all 0.2s ease",
                  "&.Mui-selected": {
                    color: "text.primary",
                    backgroundColor: "background.paper",
                    boxShadow: "0px 2px 8px rgba(0,0,0,0.08)",
                  },
                  "&:hover:not(.Mui-selected)": {
                    backgroundColor: "rgba(0,0,0,0.04)",
                  },
                },
              }}
            >
              <Tab
                icon={<Wifi sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Connection"
              />
              <Tab
                icon={<ShoppingCart sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Sales & Purchases"
              />
              <Tab
                icon={<Receipt sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Taxation"
              />
              <Tab
                icon={<AccountBalance sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Banking & Cash"
              />
              <Tab
                icon={<Inventory sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Inventory"
              />
              <Tab
                icon={<Payments sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Expenses"
              />
            </Tabs>
          </Paper>
        </Box>

        {/* --- TAB PANELS --- */}
        <TabPanel value={tabValue} index={0}>
          <Card elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Box
              sx={{ p: 2, bgcolor: theme.palette.primary.main, color: "white" }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, letterSpacing: 0.5 }}
              >
                TALLY PRIME API SERVER
              </Typography>
            </Box>
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Tally Host"
                    value={configs.tally_host || ""}
                    onChange={(e) => handleChange("tally_host", e.target.value)}
                    sx={{
                      mb: 3,
                      "& .MuiOutlinedInput-root": { borderRadius: 2 },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Tally Port (Default: 9000)"
                    value={configs.tally_port || ""}
                    onChange={(e) => handleChange("tally_port", e.target.value)}
                    sx={{
                      mb: 3,
                      "& .MuiOutlinedInput-root": { borderRadius: 2 },
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={configs.tally_educational_mode === "true"}
                        onChange={(e) =>
                          handleChange(
                            "tally_educational_mode",
                            e.target.checked ? "true" : "false",
                          )
                        }
                      />
                    }
                    label={
                      <Typography fontWeight={500}>
                        Educational Mode (Forces all voucher dates to the 1st of
                        the month)
                      </Typography>
                    }
                    sx={{ mt: 1 }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Card
                elevation={2}
                sx={{ borderRadius: 3, overflow: "hidden", height: "100%" }}
              >
                <Box
                  sx={{
                    p: 2,
                    bgcolor: theme.palette.primary.main,
                    color: "white",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, letterSpacing: 0.5 }}
                  >
                    SALES CONFIGURATION
                  </Typography>
                </Box>
                <CardContent sx={{ p: 4 }}>
                  <TextField
                    fullWidth
                    label="Default Sales Ledger"
                    value={configs.default_sales_ledger || ""}
                    onChange={(e) =>
                      handleChange("default_sales_ledger", e.target.value)
                    }
                    sx={{
                      mb: 3,
                      "& .MuiOutlinedInput-root": { borderRadius: 2 },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Discount Ledger"
                    value={configs.default_discount_ledger || ""}
                    onChange={(e) =>
                      handleChange("default_discount_ledger", e.target.value)
                    }
                    sx={{
                      mb: 3,
                      "& .MuiOutlinedInput-root": { borderRadius: 2 },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Round Off Ledger"
                    value={configs.default_roundoff_ledger || ""}
                    onChange={(e) =>
                      handleChange("default_roundoff_ledger", e.target.value)
                    }
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card
                elevation={2}
                sx={{ borderRadius: 3, overflow: "hidden", height: "100%" }}
              >
                <Box
                  sx={{
                    p: 2,
                    bgcolor: theme.palette.primary.main,
                    color: "white",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, letterSpacing: 0.5 }}
                  >
                    PURCHASE CONFIGURATION
                  </Typography>
                </Box>
                <CardContent sx={{ p: 4 }}>
                  <TextField
                    fullWidth
                    label="Default Purchase Ledger"
                    value={configs.default_purchase_ledger || ""}
                    onChange={(e) =>
                      handleChange("default_purchase_ledger", e.target.value)
                    }
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Card elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Box
              sx={{ p: 2, bgcolor: theme.palette.primary.main, color: "white" }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, letterSpacing: 0.5 }}
              >
                GST LEDGERS
              </Typography>
            </Box>
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="CGST Ledger"
                    value={configs.default_cgst_ledger || ""}
                    onChange={(e) =>
                      handleChange("default_cgst_ledger", e.target.value)
                    }
                    sx={{
                      mb: 3,
                      "& .MuiOutlinedInput-root": { borderRadius: 2 },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="SGST Ledger"
                    value={configs.default_sgst_ledger || ""}
                    onChange={(e) =>
                      handleChange("default_sgst_ledger", e.target.value)
                    }
                    sx={{
                      mb: 3,
                      "& .MuiOutlinedInput-root": { borderRadius: 2 },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="IGST Ledger"
                    value={configs.default_igst_ledger || ""}
                    onChange={(e) =>
                      handleChange("default_igst_ledger", e.target.value)
                    }
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Card elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Box
              sx={{ p: 2, bgcolor: theme.palette.primary.main, color: "white" }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, letterSpacing: 0.5 }}
              >
                TRANSACTIONS CONFIGURATION
              </Typography>
            </Box>
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Cash Account Ledger"
                    value={configs.default_cash_ledger || ""}
                    onChange={(e) =>
                      handleChange("default_cash_ledger", e.target.value)
                    }
                    sx={{
                      mb: 3,
                      "& .MuiOutlinedInput-root": { borderRadius: 2 },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Primary Bank Account Ledger"
                    value={configs.default_bank_ledger || ""}
                    onChange={(e) =>
                      handleChange("default_bank_ledger", e.target.value)
                    }
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Card elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Box
              sx={{ p: 2, bgcolor: theme.palette.primary.main, color: "white" }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, letterSpacing: 0.5 }}
              >
                INVENTORY & GODOWNS
              </Typography>
            </Box>
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Default Godown / Location Name"
                    value={configs.default_godown || ""}
                    onChange={(e) =>
                      handleChange("default_godown", e.target.value)
                    }
                    helperText="This godown will be created in Tally and all inventory will be posted here."
                    sx={{
                      mb: 4,
                      "& .MuiOutlinedInput-root": { borderRadius: 2 },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Standard Units (Comma separated)"
                    value={configs.default_units || "pcs,kg,g,ltr,doz,box"}
                    onChange={(e) =>
                      handleChange("default_units", e.target.value)
                    }
                    helperText="These units will be auto-created in Tally. e.g. pcs, kg, g, doz"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
          <Card elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Box
              sx={{ p: 2, bgcolor: theme.palette.primary.main, color: "white" }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, letterSpacing: 0.5 }}
              >
                EXPENSES CONFIGURATION
              </Typography>
            </Box>
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Default General Expense Ledger"
                    value={configs.default_expense_ledger || ""}
                    onChange={(e) =>
                      handleChange("default_expense_ledger", e.target.value)
                    }
                    helperText="Unmapped expense categories will default to this ledger in Tally."
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Save Button */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2, mb: 4 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleSave}
            size="large"
            startIcon={<SaveIcon />}
            sx={{
              py: 1.5,
              px: 4,
              borderRadius: 2,
              fontWeight: 700,
              borderWidth: 2,
              "&:hover": { borderWidth: 2 },
            }}
          >
            SAVE CONFIGURATION
          </Button>
        </Box>
      </Container>

      <Snackbar
        open={openSnack}
        autoHideDuration={4000}
        onClose={() => setOpenSnack(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackSeverity}
          sx={{ width: "100%", borderRadius: 2, boxShadow: 3 }}
          onClose={() => setOpenSnack(false)}
        >
          {snackMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
