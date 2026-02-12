"use client";

import { useState, useCallback } from "react";
import { Box, MenuItem, TextField } from "@mui/material";
import PurchaseTable from "../components/purchase/PurchaseTable";
import DashboardHeader from "../components/DashboardHeader";
import type { DashboardFilter } from "../lib/types/inventoryDashboardTypes";
import theme from "../../theme";

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

      <PurchaseTable filters={finalFilters} />
    </Box>
  );
};

export default PurchaseTablePage;
