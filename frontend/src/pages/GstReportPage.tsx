"use client";

import { useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Divider,
  useTheme,
  useMediaQuery,
  Stack,
  Chip,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  FileText,
  PieChart,
  FileSpreadsheet,
  CalendarDays,
  Play,
} from "lucide-react";

import DashboardHeader from "../components/DashboardHeader";
import Gstr1ReportComponent from "../components/gstr/Gstr1ReportComponent";

// Define a type for the report parameters
type ReportParams = {
  periodType: "month" | "quarter" | "year";
  year: number;
  month?: number;
  quarter?: number;
};

export default function GstrReportsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // --- State ---
  const [activeReport, setActiveReport] = useState<
    "gstr1" | "gstr3b" | "gstr2"
  >("gstr1");

  // Filter State
  const [periodType, setPeriodType] = useState<"month" | "quarter" | "year">(
    "month"
  );
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState(
    Math.floor((new Date().getMonth() + 3) / 3)
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [submittedParams, setSubmittedParams] = useState<ReportParams | null>(
    null
  );

  // --- Handlers ---

  const handleTabChange = (_event: React.SyntheticEvent, newValue: any) => {
    setActiveReport(newValue);
    setSubmittedParams(null);
  };

  const handleGenerateReport = () => {
    setIsGenerating(true);
    const params: ReportParams = { periodType, year };
    if (periodType === "month") params.month = month;
    if (periodType === "quarter") params.quarter = quarter;

    setSubmittedParams(params);

    // Simulate loading delay
    setTimeout(() => setIsGenerating(false), 800);
  };

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        backgroundColor: "#fff",
        borderTopLeftRadius: "36px",
        borderBottomLeftRadius: "36px",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 1. HEADER */}
      <DashboardHeader
        title="GST Compliance Reports"
        showSearch={false}
        showDateFilters={false}
      />

      {/* 2. TABS */}
      <Paper
        variant="outlined"
        sx={{
          mb: 3,
          borderRadius: 2,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          borderBottom: "none",
          backgroundColor: "background.paper",
          overflow: "hidden",
        }}
      >
        <Tabs
          value={activeReport}
          onChange={handleTabChange}
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          sx={{
            "& .MuiTab-root": {
              minHeight: 64,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.95rem",
              gap: 1.5,
              color: "text.secondary",
              "&.Mui-selected": {
                color: "primary.main",
                backgroundColor: (theme) => theme.palette.primary.light + "15",
              },
            },
          }}
        >
          <Tab
            icon={<FileText size={20} />}
            iconPosition="start"
            label="GSTR-1 (Sales)"
            value="gstr1"
          />
          <Tab
            icon={<PieChart size={20} />}
            iconPosition="start"
            label="GSTR-3B (Summary)"
            value="gstr3b"
            disabled
          />
          <Tab
            icon={<FileSpreadsheet size={20} />}
            iconPosition="start"
            label="GSTR-2A (Purchase)"
            value="gstr2"
            disabled
          />
        </Tabs>
        <Divider />
      </Paper>

      {/* 3. FILTERS & CONTENT */}
      <Box sx={{ flexGrow: 1, pb: 4 }}>
        {/* ✅ UNIFIED CONTROL BAR (Matches DashboardHeader style) */}
        <Paper
          variant="outlined"
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
            mb: 3,
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          {/* Left: Filter Type Chips */}
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box color="text.secondary" display="flex" alignItems="center">
              <CalendarDays size={20} />
            </Box>
            {["month", "quarter", "year"].map((type) => (
              <Chip
                key={type}
                label={type.charAt(0).toUpperCase() + type.slice(1)}
                color={periodType === type ? "primary" : "default"}
                onClick={() => setPeriodType(type as any)}
                sx={{
                  borderRadius: "16px",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              />
            ))}
          </Stack>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ display: { xs: "none", md: "block" } }}
          />

          {/* Center: Dynamic Selectors */}
          <Stack direction="row" alignItems="center" spacing={2}>
            {/* Year Selector (Always visible) */}
            <TextField
              select
              size="small"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              sx={{
                minWidth: 100,
                "& .MuiOutlinedInput-root": { borderRadius: "12px" },
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
            </TextField>

            {/* Month Selector */}
            {periodType === "month" && (
              <TextField
                select
                size="small"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                sx={{
                  minWidth: 140,
                  "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <MenuItem key={m} value={m}>
                    {new Date(0, m - 1).toLocaleString("default", {
                      month: "long",
                    })}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {/* Quarter Selector */}
            {periodType === "quarter" && (
              <TextField
                select
                size="small"
                value={quarter}
                onChange={(e) => setQuarter(Number(e.target.value))}
                sx={{
                  minWidth: 120,
                  "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                }}
              >
                <MenuItem value={1}>Apr - Jun (Q1)</MenuItem>
                <MenuItem value={2}>Jul - Sep (Q2)</MenuItem>
                <MenuItem value={3}>Oct - Dec (Q3)</MenuItem>
                <MenuItem value={4}>Jan - Mar (Q4)</MenuItem>
              </TextField>
            )}
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          {/* Right: Generate Action */}
          <Button
            variant="contained"
            onClick={handleGenerateReport}
            disabled={isGenerating}
            startIcon={
              isGenerating ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <Play size={18} />
              )
            }
            sx={{ borderRadius: "12px", px: 3, fontWeight: 600 }}
          >
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>
        </Paper>

        {/* Report Content */}
        {activeReport === "gstr1" &&
          (submittedParams ? (
            <Gstr1ReportComponent {...submittedParams} />
          ) : (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              height="300px"
              color="text.secondary"
              sx={{
                border: "2px dashed #eee",
                borderRadius: 4,
                bgcolor: "grey.50",
              }}
            >
              Select a period and click "Generate Report" to view data.
            </Box>
          ))}

        {activeReport === "gstr3b" && (
          <Box p={4} textAlign="center" color="text.secondary">
            GSTR-3B reporting module coming soon.
          </Box>
        )}
      </Box>
    </Box>
  );
}
