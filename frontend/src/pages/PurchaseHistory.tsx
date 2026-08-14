"use client";

import { useState, useCallback } from "react";
import { Box, MenuItem, TextField } from "@mui/material";
import PurchaseTable from "../components/purchase/PurchaseTable";
import DashboardHeader from "../components/DashboardHeader";
import type { DashboardFilter } from "../lib/types/inventoryDashboardTypes";
import theme from "../../theme";
import toast from "react-hot-toast";
import AddEditTransactionModal from "../components/transactions/AddEditTransactionModal";
import type { Transaction } from "../lib/types/transactionTypes";

const getInitialFilters = (): DashboardFilter => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    from: formatDate(start),
    to: formatDate(end),
    filter: "year",
  };
};

const statuses = ["all", "paid", "pending", "refunded"];

const PurchaseTablePage = () => {
  const [activeFilters, setActiveFilters] =
    useState<DashboardFilter>(getInitialFilters);
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("all");

  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionInitialData, setTransactionInitialData] =
    useState<Partial<Transaction> | null>(null);

  // ✅ ADDED: Stability wrapper
  const handleFilterChange = useCallback((newFilters: DashboardFilter) => {
    setActiveFilters((prev) => {
      if (
        prev.filter === newFilters.filter &&
        prev.from === newFilters.from &&
        prev.to === newFilters.to
      ) {
        return prev;
      }
      return newFilters;
    });
  }, []);

  const finalFilters = {
    ...activeFilters,
    query: searchQuery,
    status: status,
  };

  const handleMarkPayment = (purchase: any) => {
    const netTotal = (purchase.original_total || 0) + (purchase.total_adjustments || 0);
    const netPaid = purchase.net_paid_amount ?? purchase.original_paid ?? 0;
    const pending = Math.max(0, netTotal - netPaid);

    if (pending <= 0.9) {
      toast("This bill is already fully paid.", { icon: "ℹ️" });
    }

    setTransactionInitialData({
      type: "payment_out",
      bill_type: "purchase",
      entity_type: "supplier",
      entity_id: purchase.supplier_id,
      bill_id: purchase.id,
      amount: parseFloat(pending.toFixed(2)),
      transaction_date: new Date().toISOString().split("T")[0],
      status: "paid",
      payment_mode: "cash",
    });
    setTransactionModalOpen(true);
  };

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        backgroundColor: theme.palette.background.default,
        minHeight: "100vh",
      }}
    >
      <DashboardHeader
        title="Purchase Orders"
        showSearch={true}
        showDateFilters={true}
        onFilterChange={handleFilterChange} // ✅ Use the wrapper
        onSearch={setSearchQuery}
        initialFilter="today"
        actions={
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            sx={{
              minWidth: 150,
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                backgroundColor: "white",
              },
            }}
          >
            {statuses.map((option) => (
              <MenuItem key={option} value={option}>
                {option[0].toUpperCase() + option.slice(1)}
              </MenuItem>
            ))}
          </TextField>
        }
      />

      <PurchaseTable filters={finalFilters} onMarkPayment={handleMarkPayment} />

      {/* CREATE / EDIT MODAL */}
      <AddEditTransactionModal
        open={transactionModalOpen}
        onClose={() => {
          setTransactionModalOpen(false);
          setTransactionInitialData(null);
        }}
        onSuccess={() => {
          // You can trigger a table refresh here by tweaking a state if needed
          // For now, the user can manually refresh or we could pass a reload function from PurchaseTable
        }}
        initialData={transactionInitialData as Transaction}
      />
    </Box>
  );
};

export default PurchaseTablePage;
