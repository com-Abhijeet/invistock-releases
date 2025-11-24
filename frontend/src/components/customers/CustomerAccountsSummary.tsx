"use client";

import { useEffect, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import StatisticsCard from "../StatisticCard";
import { getCustomerAccountSummary } from "../../lib/api/transactionService";
import { DollarSign, FileText, MinusCircle, PlusCircle } from "lucide-react";
import type { DashboardFilter } from "../../lib/types/inventoryDashboardTypes"; // Use a central type

interface CustomerAccountSummaryProps {
  customerId: number;
  filters: DashboardFilter;
}

export default function CustomerAccountSummary({
  customerId,
  filters,
}: CustomerAccountSummaryProps) {
  // State for summary data
  const [summary, setSummary] = useState({
    total_sales: 0,
    total_paid: 0,
    total_credit_notes: 0,
    total_invoices: 0,
    outstanding_balance: 0,
  });

  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const summaryData = await getCustomerAccountSummary(customerId, filters);
      setSummary(summaryData);

    } catch (e) {
      console.error("Failed to fetch customer data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [customerId, filters]);

  return (
    <Box>
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          display="grid"
          gridTemplateColumns={{
            xs: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(5, 1fr)",
          }}
          gap={2}
        >
          <StatisticsCard
            title="Total Invoices"
            value={summary.total_invoices}
            icon={<FileText />}
          />
          <StatisticsCard
            title="Total Sales"
            value={`₹${summary.total_sales.toLocaleString()}`}
            icon={<PlusCircle />}
          />
          <StatisticsCard
            title="Total Paid"
            value={`₹${summary.total_paid.toLocaleString()}`}
            icon={<DollarSign />}
          />
          <StatisticsCard
            title="Total Adjustments"
            value={`₹${Math.abs(summary.total_credit_notes).toLocaleString()}`}
            icon={<MinusCircle />}
          />
          <StatisticsCard
            title="Outstanding Balance"
            value={`₹${summary.outstanding_balance.toLocaleString()}`}
            icon={<MinusCircle />}
          />
        </Box>
      )}
    </Box>
  );
}
