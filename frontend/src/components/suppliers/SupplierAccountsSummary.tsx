"use client";

import { useEffect, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import StatisticsCard from "../StatisticCard";
import { getSupplierAccountSummary } from "../../lib/api/transactionService"; // Assumes a similar service function
import {
  IndianRupeeIcon,
  FileText,
  MinusCircle,
  PlusCircle,
} from "lucide-react";
import type { DashboardFilter } from "../../lib/types/inventoryDashboardTypes";

interface SupplierAccountSummaryProps {
  supplierId: number;
  filters: DashboardFilter;
}

export default function SupplierAccountSummary({
  supplierId,
  filters,
}: SupplierAccountSummaryProps) {
  // State for summary data, adjusted for suppliers
  const [summary, setSummary] = useState({
    total_purchases: 0,
    total_paid: 0,
    total_debit_notes: 0,
    total_bills: 0,
    outstanding_balance: 0,
  });

  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const summaryData = await getSupplierAccountSummary(supplierId, filters);
      //   console.log(summaryData);
      setSummary(summaryData);
    } catch (e) {
      console.error("Failed to fetch supplier data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [supplierId, filters]); 

  return (
    <Box>
      <Box mb={3}>
        {/* Filter Bar */}

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Box
            display="grid"
            gridTemplateColumns={{
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(5, 1fr)",
            }}
            gap={2}
          >
            <StatisticsCard
              icon={<FileText />}
              title="Total Bills"
              value={summary.total_bills}
            />
            <StatisticsCard
              icon={<PlusCircle />}
              title="Total Purchases"
              value={`₹${summary.total_purchases.toLocaleString()}`}
            />
            <StatisticsCard
              icon={<IndianRupeeIcon />}
              title="Total Paid"
              value={`₹${summary.total_paid?.toLocaleString()}`}
            />
            <StatisticsCard
              icon={<MinusCircle />}
              title="Total Adjustments"
              value={`₹${Math.abs(
                summary.total_debit_notes
              )?.toLocaleString()}`}
            />
            <StatisticsCard
              icon={<MinusCircle />}
              title="Balance Due"
              value={`₹${summary.outstanding_balance?.toLocaleString()}`}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
