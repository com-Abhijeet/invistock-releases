"use client";

import {
  useState,
  useEffect,
  useMemo,
  type ReactNode,
  MouseEvent,
} from "react";
import {
  Box,
  Typography,
  IconButton,
  InputBase,
  Paper,
  Stack,
  Button,
  alpha,
  useTheme,
  Tooltip,
  Divider,
  Popover,
} from "@mui/material";
import {
  Search,
  RefreshCw,
  X,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowRight,
  Calendar as CalendarIcon,
} from "lucide-react";
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

  // Popover state
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [viewDate, setViewDate] = useState(new Date());

  const open = Boolean(anchorEl);
  const id = open ? "filter-popover" : undefined;

  const applyFilter = (
    newType: DashboardFilterType,
    newYear?: number,
    newFrom?: string,
    newTo?: string,
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

  const handleTypeClick = (
    event: MouseEvent<HTMLButtonElement>,
    type: DashboardFilterType,
  ) => {
    if (type === "year" || type === "custom") {
      setAnchorEl(event.currentTarget);
      setFilterType(type);
    } else {
      setFilterType(type);
      applyFilter(type);
      setAnchorEl(null);
    }
  };

  const handleClose = () => setAnchorEl(null);

  useEffect(() => {
    if (onSearch === undefined) return;
    const handler = setTimeout(() => onSearch(searchQuery), 500);
    return () => clearTimeout(handler);
  }, [searchQuery, onSearch]);

  // --- Calendar Helpers ---
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const calendarDays = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const days = [];
    const totalDays = daysInMonth(y, m);
    const startOffset = firstDayOfMonth(y, m);

    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(new Date(y, m, i));

    return days;
  }, [viewDate]);

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    if (!from || (from && to)) {
      setFrom(dateStr);
      setTo("");
    } else {
      if (dateStr < from) {
        setFrom(dateStr);
        setTo(from);
        applyFilter("custom", undefined, dateStr, from);
      } else {
        setTo(dateStr);
        applyFilter("custom", undefined, from, dateStr);
      }
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          pl: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderRadius: "20px",
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
          boxShadow: "0 4px 20px -5px rgba(0,0,0,0.05)",
          minHeight: 72,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2.5}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "14px",
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            <CalendarDays size={22} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>
              {title}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
            >
              Performance Tracking
            </Typography>
          </Box>
        </Stack>

        {showDateFilters && (
          <Box
            sx={{
              display: { xs: "none", lg: "flex" },
              bgcolor: alpha(theme.palette.text.primary, 0.04),
              p: 0.6,
              borderRadius: "14px",
              gap: 0.5,
              alignItems: "center",
            }}
          >
            {[
              { id: "today", label: "Today" },
              { id: "month", label: "Monthly" },
              { id: "year", label: "Yearly" },
              { id: "custom", label: "Range" },
            ].map((item) => (
              <Button
                key={item.id}
                onClick={(e) =>
                  handleTypeClick(e, item.id as DashboardFilterType)
                }
                sx={{
                  px: 2.5,
                  py: 0.8,
                  borderRadius: "10px",
                  fontSize: "0.825rem",
                  fontWeight: filterType === item.id ? 700 : 500,
                  textTransform: "none",
                  color:
                    filterType === item.id ? "primary.main" : "text.secondary",
                  backgroundColor:
                    filterType === item.id ? "#fff" : "transparent",
                  boxShadow:
                    filterType === item.id
                      ? "0 2px 8px rgba(0,0,0,0.08)"
                      : "none",
                  "&:hover": {
                    backgroundColor:
                      filterType === item.id
                        ? "#fff"
                        : alpha(theme.palette.text.primary, 0.04),
                  },
                }}
              >
                {item.label}
              </Button>
            ))}

            {filterType === "custom" && from && (
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ ml: 1, pr: 1.5 }}
              >
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ height: 20, my: "auto" }}
                />
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="primary.main"
                >
                  {from} {to ? `→ ${to}` : "(...)"}
                </Typography>
              </Stack>
            )}
          </Box>
        )}

        <Stack direction="row" alignItems="center" spacing={1.5}>
          {showSearch && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                bgcolor: isSearchExpanded
                  ? alpha(theme.palette.text.primary, 0.04)
                  : "transparent",
                borderRadius: "12px",
                width: isSearchExpanded ? 240 : 44,
                height: 44,
                transition: "all 0.3s ease",
                border: `1px solid ${isSearchExpanded ? theme.palette.divider : "transparent"}`,
              }}
            >
              <IconButton
                onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                sx={{ width: 44, height: 44 }}
              >
                {isSearchExpanded ? <X size={18} /> : <Search size={18} />}
              </IconButton>
              <InputBase
                placeholder="Search metrics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  ml: 0.5,
                  flex: 1,
                  fontSize: "0.85rem",
                  display: isSearchExpanded ? "block" : "none",
                }}
              />
            </Box>
          )}
          <Tooltip title="Refresh">
            <IconButton
              onClick={onRefresh}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: "12px",
                width: 44,
                height: 44,
              }}
            >
              <RefreshCw size={18} />
            </IconButton>
          </Tooltip>
          {actions}
        </Stack>
      </Paper>

      {/* --- Floating Filter Popover --- */}
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        PaperProps={{
          sx: {
            mt: 1.5,
            borderRadius: "20px",
            boxShadow: "0 10px 40px -10px rgba(0,0,0,0.15)",
            border: `1px solid ${theme.palette.divider}`,
            overflow: "hidden",
            width: filterType === "custom" ? 420 : 280,
          },
        }}
      >
        <Box sx={{ p: 2.5 }}>
          {filterType === "year" && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Filter size={18} color={theme.palette.primary.main} />
                <Typography
                  variant="subtitle2"
                  fontWeight={800}
                  color="text.secondary"
                  sx={{ letterSpacing: 0.5 }}
                >
                  CHOOSE FISCAL YEAR
                </Typography>
              </Stack>
              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}
              >
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const y = new Date().getFullYear() - i;
                  return (
                    <Button
                      key={y}
                      onClick={() => {
                        setYear(y);
                        applyFilter("year", y);
                        handleClose();
                      }}
                      variant={year === y ? "contained" : "outlined"}
                      size="small"
                      disableElevation
                      sx={{ borderRadius: "10px", fontWeight: 700 }}
                    >
                      {y}
                    </Button>
                  );
                })}
              </Box>
            </Stack>
          )}

          {filterType === "custom" && (
            <Stack spacing={2.5}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <CalendarIcon size={18} color={theme.palette.primary.main} />
                  <Typography
                    variant="subtitle2"
                    fontWeight={800}
                    color="text.secondary"
                  >
                    CUSTOM RANGE
                  </Typography>
                </Stack>
                <Button
                  size="small"
                  color="error"
                  onClick={() => {
                    setFrom("");
                    setTo("");
                    applyFilter("custom", undefined, "", "");
                  }}
                  sx={{ fontSize: "0.7rem", fontWeight: 700, p: 0 }}
                >
                  Clear Selection
                </Button>
              </Stack>

              <Box
                sx={{
                  p: 1.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.03),
                  borderRadius: "12px",
                  border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Typography
                    variant="caption"
                    fontWeight={800}
                    color={from ? "text.primary" : "text.disabled"}
                  >
                    {from || "Start Date"}
                  </Typography>
                  <ArrowRight size={14} color={theme.palette.text.disabled} />
                  <Typography
                    variant="caption"
                    fontWeight={800}
                    color={to ? "text.primary" : "text.disabled"}
                  >
                    {to || "End Date"}
                  </Typography>
                </Stack>
              </Box>

              <Box sx={{ bgcolor: "white" }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1.5 }}
                >
                  <IconButton
                    size="small"
                    onClick={() =>
                      setViewDate(
                        new Date(
                          viewDate.getFullYear(),
                          viewDate.getMonth() - 1,
                          1,
                        ),
                      )
                    }
                  >
                    <ChevronLeft size={16} />
                  </IconButton>
                  <Typography variant="body2" fontWeight={800}>
                    {viewDate.toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    })}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() =>
                      setViewDate(
                        new Date(
                          viewDate.getFullYear(),
                          viewDate.getMonth() + 1,
                          1,
                        ),
                      )
                    }
                  >
                    <ChevronRight size={16} />
                  </IconButton>
                </Stack>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: 0.2,
                  }}
                >
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                    <Typography
                      key={day}
                      variant="caption"
                      align="center"
                      fontWeight={700}
                      color="text.disabled"
                      sx={{ py: 0.5, fontSize: "0.65rem" }}
                    >
                      {day}
                    </Typography>
                  ))}
                  {calendarDays.map((date, idx) => {
                    const isSelected =
                      date &&
                      (date.toISOString().split("T")[0] === from ||
                        date.toISOString().split("T")[0] === to);
                    const isInRange =
                      date &&
                      from &&
                      to &&
                      date.toISOString().split("T")[0] > from &&
                      date.toISOString().split("T")[0] < to;

                    return (
                      <Box key={idx} sx={{ position: "relative" }}>
                        {date ? (
                          <Button
                            onClick={() => handleDateClick(date)}
                            fullWidth
                            disableElevation
                            sx={{
                              minWidth: 0,
                              p: 0.6,
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              borderRadius: "6px",
                              color: isSelected ? "white" : "text.primary",
                              bgcolor: isSelected
                                ? "primary.main"
                                : isInRange
                                  ? alpha(theme.palette.primary.main, 0.08)
                                  : "transparent",
                              "&:hover": {
                                bgcolor: isSelected
                                  ? "primary.dark"
                                  : alpha(theme.palette.primary.main, 0.15),
                              },
                            }}
                          >
                            {date.getDate()}
                          </Button>
                        ) : (
                          <Box />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              <Button
                fullWidth
                variant="contained"
                disableElevation
                disabled={!from || !to}
                onClick={handleClose}
                sx={{
                  borderRadius: "10px",
                  textTransform: "none",
                  fontWeight: 700,
                }}
              >
                Apply Selected Range
              </Button>
            </Stack>
          )}
        </Box>
      </Popover>
    </Box>
  );
}
