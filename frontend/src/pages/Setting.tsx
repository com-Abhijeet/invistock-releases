"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Tabs,
  Tab,
  CircularProgress,
  Typography,
  Button,
  Paper,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  User,
  FileText,
  Settings as SettingsIcon,
  DatabaseBackup,
  Smartphone,
  MessageCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import DashboardHeader from "../components/DashboardHeader";
import ProfileSettingsTab from "../components/settings/ProfileSettingsTab";
import TaxBankSettingsTab from "../components/settings/TaxBankSettingsTab";
import PreferencesTab from "../components/settings/PreferencesTab";
import BackupRestoreTab from "../components/settings/BackupRestoreTab";
import MobileAccessTab from "../components/settings/MobileAccessTab";
import WhatsAppTab from "../components/settings/WhatsAppTab";

import type { ShopSetupForm } from "../lib/types/shopTypes";
import { getShopData, updateShopData } from "../lib/api/shopService";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [shopData, setShopData] = useState<ShopSetupForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const theme = useTheme();
  // Check if screen is small to switch back to scrollable tabs if needed
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const data = await getShopData();
        setShopData(data);
      } catch (error) {
        toast.error("Failed to load shop settings.");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (field: keyof ShopSetupForm, value: any) => {
    setShopData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSave = async () => {
    if (!shopData) return;
    setSaving(true);
    try {
      await updateShopData(shopData);
      toast.success("Settings saved successfully!");
      localStorage.removeItem("shop");
      await getShopData();
    } catch (error) {
      toast.error("Failed to save settings.");
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
        height="80vh"
      >
        <CircularProgress />
        <Typography ml={2} color="text.secondary">
          Loading Settings...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        backgroundColor: "#fff",

        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DashboardHeader title="Application Settings" showDateFilters={false} />

      {/* --- TABS HEADER --- */}
      <Paper
        variant="outlined"
        sx={{
          mb: 3,
          borderRadius: 2,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          borderBottom: "none",
          backgroundColor: "background.paper",
          overflow: "hidden", // Keeps the active indicator clean
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          // ✅ Auto-switch layout based on screen size
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          sx={{
            "& .MuiTab-root": {
              minHeight: 64,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.95rem",
              gap: 1.5,
              color: "text.secondary",
              transition: "all 0.2s",
              "&.Mui-selected": {
                color: "primary.main",
                backgroundColor: (theme) => theme.palette.primary.light + "15", // Subtle background highlight
              },
              "&:hover": {
                backgroundColor: (theme) => theme.palette.action.hover,
              },
            },
            "& .MuiTabs-indicator": {
              height: 3, // Thicker indicator
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3,
            },
          }}
        >
          <Tab icon={<User size={20} />} iconPosition="start" label="Profile" />
          <Tab
            icon={<FileText size={20} />}
            iconPosition="start"
            label="Tax & Bank"
          />
          <Tab
            icon={<SettingsIcon size={20} />}
            iconPosition="start"
            label="Preferences"
          />
          <Tab
            icon={<DatabaseBackup size={20} />}
            iconPosition="start"
            label="Backup"
          />
          <Tab
            icon={<Smartphone size={20} />}
            iconPosition="start"
            label="Mobile"
          />
          <Tab
            icon={<MessageCircle size={20} />}
            iconPosition="start"
            label="WhatsApp"
          />
        </Tabs>
        <Divider />
      </Paper>

      {/* --- TAB CONTENT --- */}
      <Box sx={{ flexGrow: 1, pb: 4 }}>
        {/* Form-based Tabs */}
        {activeTab === 0 && shopData && (
          <ProfileSettingsTab data={shopData} onChange={handleChange} />
        )}
        {activeTab === 1 && shopData && (
          <TaxBankSettingsTab data={shopData} onChange={handleChange} />
        )}
        {activeTab === 2 && shopData && (
          <PreferencesTab data={shopData} onChange={handleChange} />
        )}

        {/* Component-based Tabs */}
        {activeTab === 3 && <BackupRestoreTab />}
        {activeTab === 4 && <MobileAccessTab />}
        {activeTab === 5 && <WhatsAppTab />}
      </Box>

      {/* --- SAVE ACTIONS (Floating Footer) --- */}
      {[0, 1, 2].includes(activeTab) && (
        <Paper
          elevation={3}
          sx={{
            position: "sticky",
            bottom: 0,
            p: 2,
            mt: 2,
            borderRadius: 2,
            display: "flex",
            justifyContent: "flex-end",
            backgroundColor: "background.paper",
            zIndex: 10,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={handleSave}
            disabled={saving}
            sx={{ minWidth: 160, fontWeight: 600 }}
          >
            {saving ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Save Changes"
            )}
          </Button>
        </Paper>
      )}
    </Box>
  );
}
