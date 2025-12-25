// ...existing code...
"use client";

import { useEffect, useState } from "react";
import { Box, Typography, Chip } from "@mui/material";
import { Monitor, Server, Clock } from "lucide-react";
import userApiService from "../lib/api/userService";
import { AccessLog } from "../lib/types/UserTypes";
import DashboardHeader from "../components/DashboardHeader";
import theme from "../../theme";
import type { DashboardFilter } from "../lib/types/inventoryDashboardTypes";
import DataTable from "../components/DataTable";
// ...existing code...
const getInitialFilters = (): DashboardFilter => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    from: formatDate(start),
    to: formatDate(end),
    filter: "month",
  };
};
// ...existing code...
export default function AccessLogs() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AccessLog[]>([]);
  const [activeFilters, setActiveFilters] =
    useState<DashboardFilter>(getInitialFilters);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs based on search and date
  useEffect(() => {
    let result = logs;

    // 1. Filter by Search Query
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(
        (log) =>
          log.user_name.toLowerCase().includes(lower) ||
          log.action.toLowerCase().includes(lower) ||
          log.details.toLowerCase().includes(lower)
      );
    }

    // 2. Filter by Date Range
    if (activeFilters.from && activeFilters.to) {
      const fromDate = activeFilters.from;
      const toDate = activeFilters.to;
      result = result.filter((log) => {
        // Assume log.timestamp is ISO string "2023-12-25T10:00:00"
        const logDate = log.timestamp.split("T")[0];
        return logDate >= fromDate && logDate <= toDate;
      });
    }

    setFilteredLogs(result);
    setPage(0); // Reset page on filter change
  }, [logs, searchQuery, activeFilters]);

  const fetchLogs = async () => {
    try {
      const data = await userApiService.getAccessLogs();
      setLogs(data);
    } catch (error) {
      console.error("Failed to load logs", error);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Pagination handlers (DataTable expects single-arg handlers)
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  // Prepare rows for current page
  const pageRows = filteredLogs.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const columns = [
    {
      key: "timestamp",
      label: "Timestamp",
      format: (_: any, row: AccessLog) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Clock size={14} className="text-gray-400" />
          {formatTime(row.timestamp)}
        </Box>
      ),
    },
    {
      key: "user_name",
      label: "User",
      format: (val: string) => <strong>{val}</strong>,
    },
    {
      key: "action",
      label: "Action",
      format: (_: any, row: AccessLog) => (
        <Chip
          label={row.action}
          color={
            row.action === "LOGIN"
              ? "success"
              : row.action === "LOGOUT"
              ? "warning"
              : "default"
          }
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      key: "details",
      label: "Details",
    },
    {
      key: "source",
      label: "Source",
      format: (_: any, row: AccessLog) => (
        <Box display="flex" alignItems="center" gap={1}>
          {row.machine_type === "server" ? (
            <Server size={14} />
          ) : (
            <Monitor size={14} />
          )}
          <Typography variant="body2">
            {row.machine_type.toUpperCase()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ({row.ip_address})
          </Typography>
        </Box>
      ),
    },
  ];

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
        title="Access Logs"
        showSearch={true}
        showDateFilters={true}
        onSearch={setSearchQuery}
        onFilterChange={setActiveFilters}
      />

      <DataTable
        rows={pageRows}
        columns={columns}
        loading={false}
        total={filteredLogs.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Box>
  );
}
