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
        {/* --- FOLDER STYLE NAVIGATION --- */}
        <Box sx={{ position: "relative", zIndex: 1, display: "flex", px: 2, pt: 2, borderBottom: "none" }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 48,
                "& .MuiTabs-indicator": { display: "none" },
                "& .MuiTabs-flexContainer": {
                  gap: 0.5,
                },
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  minHeight: 48,
                  minWidth: "auto",
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  px: 3,
                  py: 1.5,
                  color: "text.secondary",
                  backgroundColor: "rgba(0,0,0,0.04)",
                  transition: "all 0.2s ease",
                  border: "1px solid transparent",
                  borderBottom: "none",
                  "&.Mui-selected": {
                    color: "primary.contrastText",
                    backgroundColor: "primary.main",
                    boxShadow: "0px -4px 12px rgba(0,0,0,0.1)",
                    zIndex: 2,
                    position: "relative",
                  },
                  "&:hover:not(.Mui-selected)": {
                    backgroundColor: "rgba(0,0,0,0.08)",
                  },
                },
              }}
            >
              <Tab icon={<User size={18} />} iconPosition="start" label="Profile" />
              <Tab icon={<FileText size={18} />} iconPosition="start" label="Tax" />
              <Tab icon={<Printer size={18} />} iconPosition="start" label="Print" />
              <Tab icon={<SettingsIcon size={18} />} iconPosition="start" label="Preferences" />
              <Tab icon={<DatabaseBackup size={18} />} iconPosition="start" label="Backup" />
              <Tab icon={<Smartphone size={18} />} iconPosition="start" label="Mobile" />
              <Tab icon={<MessageCircle size={18} />} iconPosition="start" label="WhatsApp" />
            </Tabs>
        </Box>

        {/* --- CONTENT AREA --- */}
        <Box 
          sx={{ 
            position: "relative", 
            zIndex: 0, 
            borderRadius: 3, 
            borderTopLeftRadius: activeTab === 0 ? 0 : 3,
            backgroundColor: "background.paper", 
            p: { xs: 2, md: 4 }, 
            minHeight: "50vh",
            boxShadow: "0px 8px 24px rgba(0,0,0,0.05)",
            borderTop: (theme) => `8px solid ${theme.palette.primary.main}`
          }}
        >
          <Fade in={true} key={activeTab} timeout={300}>
            <Box>
              {activeTab === 0 && shopData && (
                <ProfileSettingsTab data={shopData} onChange={handleChange} />
              )}
              {activeTab === 1 && shopData && (
                <TaxBankSettingsTab data={shopData} onChange={handleChange} />
              )}
              {activeTab === 2 && shopData && (
                <PrintSettingsTab data={shopData} onChange={handleChange} />
              )}
              {activeTab === 3 && shopData && (
                <PreferencesTab data={shopData} onChange={handleChange} />
              )}
              {activeTab === 4 && shopData && (
                <BackupRestoreTab data={shopData} onChange={handleChange} />
              )}
              {activeTab === 5 && <MobileAccessTab />}
              {activeTab === 6 && <WhatsAppTab />}
            </Box>
          </Fade>
          </Box>

      </Container>

      {/* --- SAVE FOOTER --- */}
      {/* Show for tabs 0-3 (Profile, Tax, Print, Prefs) */}
      {[0, 1, 2, 3, 4].includes(activeTab) && (
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
            bgcolor: 'background.paper',
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
