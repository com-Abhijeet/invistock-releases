"use client";

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Chip,
  LinearProgress,
  Stack,
  Button,
} from "@mui/material";
import {
  Eye,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
  Megaphone,
} from "lucide-react";
import toast from "react-hot-toast";

import { api } from "../lib/api/api";
import DashboardHeader from "../components/DashboardHeader";
import DataTable from "../components/DataTable";

// Type definition matching the backend response from /api/customers/financials
interface CustomerFinancialRow {
  id: number;
  name: string;
  phone: string;
  city: string;
  total_bills: number;
  total_purchased: number;
  total_bills_paid: number;
  total_amount_paid: number;
  total_overdue: number;
  payment_percentage: number;
}

export default function CustomerAccountsPage() {
  const navigate = useNavigate();

  // Data State
  const [customers, setCustomers] = useState<CustomerFinancialRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Pagination & Filter State
  const [page, setPage] = useState(0); // DataTable uses 0-based index
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // API expects 1-based page index
      const queryParams = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        query: searchQuery,
        sortBy: "total_overdue", // Default sort by overdue to highlight debtors
        sortOrder: "desc",
      });

      const response = await api.get(
        `/api/customers/financials?${queryParams}`
      );
      if (response.data.status === "success") {
        setCustomers(response.data.data);
        setTotalRecords(response.data.pagination.total);
      }
    } catch (error) {
      console.error("Failed to fetch customer accounts:", error);
      toast.error("Failed to load customer accounts");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handlers ---

  const handleSingleMessage = async (customer: CustomerFinancialRow) => {
    if (!customer.phone) return toast.error("No phone number available.");

    // Construct default message
    const message = `Hello ${
      customer.name
    },\n\nHere is your financial overview from our shop:\n\nTotal Sales: ₹${customer.total_purchased.toLocaleString(
      "en-IN"
    )}\nTotal Paid: ₹${customer.total_amount_paid.toLocaleString(
      "en-IN"
    )}\n\n*Outstanding Balance: ₹${customer.total_overdue.toLocaleString(
      "en-IN"
    )}*\n\nPlease clear your dues at the earliest. Thank you!`;

    try {
      toast.loading("Sending message...");
      const res = await window.electron.sendWhatsAppMessage(
        customer.phone,
        message
      );
      toast.dismiss();
      if (res.success) {
        toast.success("Message sent!");
      } else {
        toast.error("Failed to send: " + res.error);
      }
    } catch (e) {
      toast.dismiss();
      toast.error("Error sending message");
    }
  };

  const handleBulkMessage = async () => {
    // Filter for valid phones AND outstanding dues
    const validRecipients = customers.filter(
      (c) => c.phone && c.phone.length >= 10 && c.total_overdue > 0
    );

    if (validRecipients.length === 0) {
      return toast.error(
        "No customers with outstanding dues and valid phones found."
      );
    }

    if (
      !confirm(
        `Send payment reminders to ${validRecipients.length} customers with outstanding dues?`
      )
    ) {
      return;
    }

    setIsSending(true);
    let successCount = 0;
    let failCount = 0;

    toast.loading(`Sending to ${validRecipients.length} customers...`);

    for (const customer of validRecipients) {
      const message = `Hello ${
        customer.name
      },\n\nGentle reminder regarding your account balance:\n\n*Outstanding Due: ₹${customer.total_overdue.toLocaleString(
        "en-IN"
      )}*\n\nPlease make payment soon. Ignore if already paid.`;

      try {
        const res = await window.electron.sendWhatsAppMessage(
          customer.phone,
          message
        );
        if (res.success) successCount++;
        else failCount++;
      } catch (e) {
        failCount++;
      }
      // Small delay to avoid spam detection
      await new Promise((r) => setTimeout(r, 800));
    }

    toast.dismiss();
    setIsSending(false);

    if (successCount > 0) {
      toast.success(`Sent ${successCount} reminders successfully.`);
    }
    if (failCount > 0) {
      toast.error(`Failed to send to ${failCount} customers.`);
    }
  };

  // --- Table Configuration ---

  const columns = [
    {
      key: "name",
      label: "Customer",
      format: (_: any, row: CustomerFinancialRow) => (
        <Box>
          <Typography variant="body2" fontWeight={600} color="text.primary">
            {row.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.phone || "No Phone"} {row.city ? `• ${row.city}` : ""}
          </Typography>
        </Box>
      ),
    },
    {
      key: "total_bills",
      label: "Bills",
      align: "center" as const,
      format: (val: number) => (
        <Chip label={val} size="small" variant="outlined" />
      ),
    },
    {
      key: "total_purchased",
      label: "Total Sales",
      align: "right" as const,
      format: (val: number) => (
        <Typography variant="body2" fontWeight={500}>
          ₹{val.toLocaleString("en-IN")}
        </Typography>
      ),
    },
    {
      key: "total_amount_paid",
      label: "Paid",
      align: "right" as const,
      format: (val: number) => (
        <Typography variant="body2" color="success.main" fontWeight={500}>
          ₹{val.toLocaleString("en-IN")}
        </Typography>
      ),
    },
    {
      key: "total_overdue",
      label: "Pending",
      align: "right" as const,
      format: (val: number) => (
        <Typography
          variant="body2"
          fontWeight={700}
          color={val > 0 ? "error.main" : "text.secondary"}
        >
          ₹{val.toLocaleString("en-IN")}
        </Typography>
      ),
    },
    {
      key: "payment_percentage",
      label: "Status",
      align: "left" as const,
      format: (val: number, row: CustomerFinancialRow) => (
        <Box sx={{ width: "100%", minWidth: 100 }}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
            >
              {val}% Paid
            </Typography>
            {val >= 100 ? (
              <CheckCircle2 size={14} color="#2e7d32" />
            ) : val === 0 && row.total_purchased > 0 ? (
              <AlertCircle size={14} color="#d32f2f" />
            ) : null}
          </Stack>
          <LinearProgress
            variant="determinate"
            value={val > 100 ? 100 : val}
            color={val >= 100 ? "success" : val < 50 ? "error" : "warning"}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      ),
    },
  ];

  const actions = [
    {
      label: "Send Reminder",
      icon: <MessageCircle size={16} color="green" />,
      onClick: (row: CustomerFinancialRow) => handleSingleMessage(row),
    },
    {
      label: "View Ledger",
      icon: <Eye size={16} />,
      onClick: (row: CustomerFinancialRow) =>
        navigate(`/customers/ledger/${row.id}`),
    },
    {
      label: "Open Profile",
      icon: <ArrowRight size={16} />,
      onClick: (row: CustomerFinancialRow) => navigate(`/customer/${row.id}`),
    },
  ];

  return (
    <Box p={3} sx={{ minHeight: "100vh", bgcolor: "#f8f9fa" }}>
      <DashboardHeader
        title="Customer Accounts Overview"
        showSearch={true}
        showDateFilters={false} // We are showing lifetime totals here
        onSearch={(q) => {
          setSearchQuery(q);
          setPage(0); // Reset to first page on search
        }}
        onRefresh={fetchData}
        initialFilter="today" // Not used but required by prop type
        actions={
          <Button
            variant="contained"
            color="success"
            startIcon={<Megaphone size={18} />}
            onClick={handleBulkMessage}
            disabled={customers.length === 0 || isSending}
            sx={{
              borderRadius: "12px",
              fontWeight: 600,
              textTransform: "none",
              boxShadow: "none",
              bgcolor: "#2e7d32",
              "&:hover": { bgcolor: "#1b5e20" },
            }}
          >
            {isSending
              ? "Sending..."
              : `Send Reminders (${
                  customers.filter((c) => c.total_overdue > 0).length
                })`}
          </Button>
        }
      />

      <Box mt={3}>
        <DataTable
          rows={customers}
          columns={columns}
          actions={actions}
          loading={loading}
          total={totalRecords}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(newLimit) => {
            setRowsPerPage(newLimit);
            setPage(0);
          }}
        />
      </Box>
    </Box>
  );
}
