"use client";

import { useState, useEffect, type ReactNode } from "react";
import {
  Box,
  Typography,
  IconButton,
  InputBase,
  Paper,
  Stack,
  Button,
  Collapse,
  alpha,
  useTheme,
  MenuItem,
  Select,
  Tooltip,
} from "@mui/material";
import { Search, RefreshCw, X, CalendarDays } from "lucide-react";
import type { DashboardFilter } from "../lib/types/inventoryDashboardTypes";

export type DashboardFilterType = "today" | "month" | "year" | "custom";

interface DashboardHeaderProps {
  title: string;
  showSearch?: boolean;
  showDateFilters?: boolean;
  actions?: ReactNode;
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
  onFilterChange?: (filters: DashboardFilter) => void;
  initialFilter?: DashboardFilterType;
}

export default function DashboardHeader({
  title,
  showSearch = false,
  showDateFilters = true,
  actions = null,
  onSearch,
  onRefresh,
  onFilterChange,
  initialFilter = "month",
}: DashboardHeaderProps) {
  const theme = useTheme();
  const [filterType, setFilterType] =
    useState<DashboardFilterType>(initialFilter);
  const [year, setYear] = useState(new Date().getFullYear());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // --- Logic (Same as before) ---
  const applyFilter = (
    newType: DashboardFilterType,
    newYear?: number,
    newFrom?: string,
    newTo?: string
  ) => {
    if (!onFilterChange) return;

    const now = new Date();
    const selectedYear = newYear || year;
    let fromDate = newFrom !== undefined ? newFrom : from;
    let toDate = newTo !== undefined ? newTo : to;

    if (newType === "today") {
      fromDate = toDate = now.toISOString().split("T")[0];
    } else if (newType === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      fromDate = start.toISOString().split("T")[0];
      toDate = end.toISOString().split("T")[0];
    } else if (newType === "year") {
      const start = new Date(selectedYear, 0, 1);
      const end = new Date(selectedYear, 11, 31);
      fromDate = start.toISOString().split("T")[0];
      toDate = end.toISOString().split("T")[0];
    }

    onFilterChange({ filter: newType, from: fromDate, to: toDate });
  };

  const handleTypeChange = (type: DashboardFilterType) => {
    setFilterType(type);
    applyFilter(type);
  };

  useEffect(() => {
    if (onSearch === undefined) return;
    const handler = setTimeout(() => onSearch(searchQuery), 500);
    return () => clearTimeout(handler);
  }, [searchQuery, onSearch]);

  // --- Styled Components (Inline) ---
  const FilterButton = ({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <Button
      onClick={onClick}
      disableRipple
      sx={{
        minWidth: "auto",
        px: 2,
        py: 0.5,
        borderRadius: "8px",
        fontSize: "0.85rem",
        fontWeight: active ? 600 : 500,
        textTransform: "none",
        color: active ? "primary.main" : "text.secondary",
        backgroundColor: active
          ? alpha(theme.palette.primary.main, 0.1)
          : "transparent",
        transition: "all 0.2s ease",
        "&:hover": {
          backgroundColor: active
            ? alpha(theme.palette.primary.main, 0.15)
            : alpha(theme.palette.text.primary, 0.05),
          color: active ? "primary.dark" : "text.primary",
        },
      }}
    >
      {label}
    </Button>
  );

  return (
    <Box sx={{ mb: 3 }}>
      {/* Main Control Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 1,
          pl: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderRadius: "16px",
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: "#fff",
          height: 64,
        }}
      >
        {/* Left: Title */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "12px",
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "primary.main",
            }}
          >
            <CalendarDays size={20} />
          </Box>
          <Typography variant="h6" fontWeight={700} color="text.primary">
            {title}
          </Typography>
        </Stack>

        {/* Middle: Segmented Filters (Hidden on very small screens) */}
        {showDateFilters && (
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              bgcolor: alpha(theme.palette.grey[200], 0.5),
              p: 0.5,
              borderRadius: "10px",
              gap: 0.5,
            }}
          >
            {[
              { id: "today", label: "Today" },
              { id: "month", label: "This Month" },
              { id: "year", label: "Year" },
              { id: "custom", label: "Custom" },
            ].map((item) => (
              <FilterButton
                key={item.id}
                label={item.label}
                active={filterType === item.id}
                onClick={() => handleTypeChange(item.id as DashboardFilterType)}
              />
            ))}
          </Box>
        )}

        {/* Right: Actions & Search */}
        <Stack direction="row" alignItems="center" spacing={1}>
          {/* Expandable Search */}
          {showSearch && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                bgcolor: isSearchExpanded
                  ? alpha(theme.palette.grey[200], 0.5)
                  : "transparent",
                borderRadius: "12px",
                transition: "all 0.3s ease",
                width: isSearchExpanded ? 240 : 40,
                height: 40,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <IconButton
                onClick={() => {
                  if (isSearchExpanded && searchQuery) {
                    setSearchQuery(""); // Clear on close
                  }
                  setIsSearchExpanded(!isSearchExpanded);
                }}
                sx={{
                  color: isSearchExpanded ? "primary.main" : "text.secondary",
                  width: 40,
                  height: 40,
                }}
              >
                {isSearchExpanded ? <X size={18} /> : <Search size={18} />}
              </IconButton>

              <InputBase
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus={isSearchExpanded}
                sx={{
                  ml: 0.5,
                  flex: 1,
                  fontSize: "0.9rem",
                  opacity: isSearchExpanded ? 1 : 0,
                  transition: "opacity 0.2s ease",
                  display: isSearchExpanded ? "block" : "none",
                }}
              />
            </Box>
          )}

          {/* Refresh Button */}
          <Tooltip title="Refresh Data">
            <IconButton
              onClick={onRefresh}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: "12px",
                width: 40,
                height: 40,
              }}
            >
              <RefreshCw size={18} />
            </IconButton>
          </Tooltip>

          {actions}
        </Stack>
      </Paper>

      {/* --- Collapsible Date Inputs (For Year/Custom) --- */}
      <Collapse in={filterType === "year" || filterType === "custom"}>
        <Paper
          elevation={0}
          sx={{
            mt: 1,
            p: 1.5,
            borderRadius: "12px",
            backgroundColor: alpha(theme.palette.primary.main, 0.03),
            border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          {filterType === "year" && (
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="body2" fontWeight={600} color="primary">
                Select Year:
              </Typography>
              <Select
                value={year}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setYear(val);
                  applyFilter("year", val);
                }}
                size="small"
                variant="standard"
                disableUnderline
                sx={{
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  color: "primary.main",
                }}
              >
                {Array.from(
                  { length: 5 },
                  (_, i) => new Date().getFullYear() - i
                ).map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          )}

          {filterType === "custom" && (
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.secondary"
                >
                  FROM
                </Typography>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    applyFilter("custom", undefined, e.target.value, undefined);
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                    outline: "none",
                    fontFamily: "inherit",
                    fontSize: "0.9rem",
                  }}
                />
              </Box>
              <Box width={20} height={1} bgcolor="divider" />
              <Box display="flex" alignItems="center" gap={1}>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.secondary"
                >
                  TO
                </Typography>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    applyFilter("custom", undefined, undefined, e.target.value);
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                    outline: "none",
                    fontFamily: "inherit",
                    fontSize: "0.9rem",
                  }}
                />
              </Box>
            </Stack>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
}
