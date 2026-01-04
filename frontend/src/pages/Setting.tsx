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
  Container,
  Fade,
} from "@mui/material";
import {
  User,
  FileText,
  Settings as SettingsIcon,
  DatabaseBackup,
  Smartphone,
  MessageCircle,
  Printer,
} from "lucide-react";
import toast from "react-hot-toast";

import ProfileSettingsTab from "../components/settings/ProfileSettingsTab";
import TaxBankSettingsTab from "../components/settings/TaxBankSettingsTab";
import PreferencesTab from "../components/settings/PreferencesTab";
import PrintSettingsTab from "../components/settings/PrintSettingsTab"; // ✅ New Import
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
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: "#f8fafc",
        minHeight: "80vh",
        pb: 10,
      }}
    >
      <Container maxWidth="lg" sx={{ pt: 2 }}>
        {/* --- FLOATING PILL NAVIGATION --- */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 4,
          }}
        >
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
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
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
                icon={<User size={18} />}
                iconPosition="start"
                label="Profile"
              />
              <Tab
                icon={<FileText size={18} />}
                iconPosition="start"
                label="Tax"
              />
              {/* ✅ New Print Tab */}
              <Tab
                icon={<Printer size={18} />}
                iconPosition="start"
                label="Print"
              />
              <Tab
                icon={<SettingsIcon size={18} />}
                iconPosition="start"
                label="Preferences"
              />
              <Tab
                icon={<DatabaseBackup size={18} />}
                iconPosition="start"
                label="Backup"
              />
              <Tab
                icon={<Smartphone size={18} />}
                iconPosition="start"
                label="Mobile"
              />
              <Tab
                icon={<MessageCircle size={18} />}
                iconPosition="start"
                label="WhatsApp"
              />
            </Tabs>
          </Paper>
        </Box>

        {/* --- CONTENT AREA --- */}
        <Fade in={true} key={activeTab} timeout={300}>
          <Box>
            {activeTab === 0 && shopData && (
              <ProfileSettingsTab data={shopData} onChange={handleChange} />
            )}
            {activeTab === 1 && shopData && (
              <TaxBankSettingsTab data={shopData} onChange={handleChange} />
            )}
            {/* ✅ New Print Tab Content */}
            {activeTab === 2 && shopData && (
              <PrintSettingsTab data={shopData} onChange={handleChange} />
            )}
            {activeTab === 3 && shopData && (
              <PreferencesTab data={shopData} onChange={handleChange} />
            )}
            {activeTab === 4 && <BackupRestoreTab />}
            {activeTab === 5 && <MobileAccessTab />}
            {activeTab === 6 && <WhatsAppTab />}
          </Box>
        </Fade>
      </Container>

      {/* --- SAVE FOOTER --- */}
      {/* Show for tabs 0-3 (Profile, Tax, Print, Prefs) */}
      {[0, 1, 2, 3].includes(activeTab) && (
        <Paper
          elevation={5}
          sx={{
            position: "fixed",
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1200,
            borderRadius: 50,
            px: 1,
            py: 1,
            display: "flex",
            alignItems: "center",
            gap: 2,
            backgroundColor: "#fff",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box px={2}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Unsaved changes
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={saving}
            sx={{ borderRadius: 50, px: 4 }}
          >
            {saving ? "Saving..." : "Save Updates"}
          </Button>
        </Paper>
      )}
    </Box>
  );
}
