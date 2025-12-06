"use client";

import { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  Chip,
  Button,
  Stack,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  Users,
  Trophy,
  UserX,
  TrendingUp,
  MessageCircle,
  Info,
  Megaphone, // ✅ Icon for bulk action
} from "lucide-react";
import toast from "react-hot-toast";

import DashboardHeader from "../components/DashboardHeader";
import DataTable from "../components/DataTable";

import {
  getCustomerInsights,
  CustomerInsight,
} from "../lib/api/analyticsService";
import AnalyticsInfoModal from "../components/analytics/AnalyticsInfoModal";
import WhatsAppTemplateModal from "../components/analytics/WhatsAppTemplateModal"; // ✅ Import Template Modal
import { DataCard } from "../components/DataCard";

export default function CustomerAnalyticsPage() {
  const [data, setData] = useState<CustomerInsight[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0); // 0 = Leaderboard, 1 = Retention

  // ✅ Modal States
  const [infoOpen, setInfoOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<
    CustomerInsight[]
  >([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getCustomerInsights(90);
      setData(res.all);
      setStats(res.stats);
    } catch (error) {
      toast.error("Failed to load customer insights.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Handlers ---

  // 1. Single Customer Message (Row Action)
  const handleSingleMessage = (customer: CustomerInsight) => {
    if (!customer.phone) return toast.error("No phone number available.");
    setSelectedRecipients([customer]);
    setWhatsappOpen(true);
  };

  // 2. Bulk Dormant Message (Header Action)
  const handleBulkDormantMessage = () => {
    // Filter for dormant customers who actually have phone numbers
    const dormant = data.filter(
      (c) => c.segment === "Dormant" && c.phone && c.phone.length >= 10
    );

    if (dormant.length === 0) {
      return toast.error(
        "No dormant customers found with valid phone numbers."
      );
    }

    setSelectedRecipients(dormant);
    setWhatsappOpen(true);
  };

  // --- Columns (Unchanged) ---
  const columns = [
    { key: "name", label: "Customer" },
    {
      key: "segment",
      label: "Segment",
      format: (val: string) => {
        let color: any = "default";
        if (val === "VIP") color = "warning";
        if (val === "Dormant") color = "error";
        if (val === "New") color = "info";
        return (
          <Chip label={val} size="small" color={color} variant="outlined" />
        );
      },
    },
    {
      key: "total_revenue",
      label: "Lifetime Value",
      align: "right" as const,
      format: (val: number) => <strong>₹{val.toLocaleString("en-IN")}</strong>,
    },
    { key: "order_count", label: "Orders", align: "center" as const },
    {
      key: "aov",
      label: "Avg Order Val",
      align: "right" as const,
      format: (val: number) => `₹${val.toLocaleString("en-IN")}`,
    },
    {
      key: "days_inactive",
      label: "Last Seen",
      align: "right" as const,
      format: (val: number) => (
        <span style={{ color: val > 90 ? "red" : "inherit" }}>
          {val} days ago
        </span>
      ),
    },
  ];

  // Filter data based on Tab
  const filteredData =
    tab === 0
      ? [...data].sort((a, b) => b.total_revenue - a.total_revenue)
      : data
          .filter((c) => c.segment === "Dormant")
          .sort((a, b) => b.days_inactive - a.days_inactive);

  const retentionActions = [
    {
      label: "Send Message",
      icon: <MessageCircle size={16} color="green" />,
      onClick: (row: CustomerInsight) => handleSingleMessage(row), // ✅ Open Modal
    },
  ];

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
        title="Customer Intelligence"
        showSearch={false}
        showDateFilters={false}
        actions={
          <Stack direction="row" spacing={1.5}>
            {/* ✅ Show "Message All" only on Retention Tab */}
            {tab === 1 && (
              <Button
                variant="contained"
                color="success"
                startIcon={<Megaphone size={18} />}
                onClick={handleBulkDormantMessage}
                sx={{
                  borderRadius: "12px",
                  fontWeight: 600,
                  textTransform: "none",
                  boxShadow: "none",
                  bgcolor: "#2e7d32", // WhatsApp Green
                  "&:hover": { bgcolor: "#1b5e20" },
                }}
              >
                Message All ({filteredData.length})
              </Button>
            )}

            <Button
              variant="outlined"
              startIcon={<Info size={18} />}
              onClick={() => setInfoOpen(true)}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              What do these mean?
            </Button>
          </Stack>
        }
      />

      {loading || !stats ? (
        <Box display="flex" justifyContent="center" mt={10}>
          <CircularProgress />
        </Box>
      ) : (
        <Box mt={2}>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <DataCard
                title="Total Customers"
                value={stats.totalCustomers}
                icon={<Users />}
                color="primary.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DataCard
                title="Average CLV"
                value={`₹${stats.avgCLV.toLocaleString("en-IN")}`}
                icon={<TrendingUp />}
                color="success.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DataCard
                title="VIP Customers"
                value={data.filter((c) => c.segment === "VIP").length}
                icon={<Trophy />}
                color="warning.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DataCard
                title="At Risk (Dormant)"
                value={stats.dormantCount}
                icon={<UserX />}
                color="error.main"
              />
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: "grey.50",
              }}
            >
              <Tab label="Leaderboard (Top Revenue)" />
              <Tab label={`Retention (Dormant: ${stats.dormantCount})`} />
            </Tabs>

            <DataTable
              rows={filteredData}
              columns={columns}
              loading={loading}
              total={filteredData.length}
              page={0}
              rowsPerPage={10}
              // Only show actions on Retention tab
              actions={tab === 1 ? retentionActions : undefined}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
            />
          </Paper>
        </Box>
      )}

      {/* Info Modal */}
      <AnalyticsInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />

      {/* ✅ WhatsApp Template Modal */}
      <WhatsAppTemplateModal
        open={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
        recipients={selectedRecipients}
      />
    </Box>
  );
}
