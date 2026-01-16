"use client";

import { useState } from "react";
import { Box, Button, Stack } from "@mui/material";
import DashboardHeader from "../components/DashboardHeader";
import SalesOrdersTable from "../components/sales-orders/SalesOrdersTable";
import theme from "../../theme";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SalesOrdersList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  // Filter state could be expanded for status filters later
  const [filter, setFilter] = useState("all");

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
        title="Sales Orders"
        showSearch={true}
        showDateFilters={false} // Date filtering not yet in backend repo for orders
        onSearch={setSearchQuery}
        actions={
          <Button
            variant="contained"
            onClick={() => navigate("/sales-orders/new")}
            startIcon={<Plus size={18} />}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 600,
              boxShadow: "none",
            }}
          >
            Create Order
          </Button>
        }
      />

      {/* You could add a Tab Bar here for [All | Pending | Completed] 
         and pass the status to the table prop 
      */}

      <SalesOrdersTable
        searchQuery={searchQuery}
        // statusFilter={filter === 'all' ? undefined : filter}
      />
    </Box>
  );
}
