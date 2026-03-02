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
  Card,
  CardContent,
  Typography,
  alpha,
} from "@mui/material";
import {
  FileText,
  PieChart,
  FileSpreadsheet,
  Play,
  FileSearch,
} from "lucide-react";

import DashboardHeader from "../components/DashboardHeader";
import Gstr1ReportComponent from "../components/gstr/Gstr1ReportComponent";
import Gstr2ReportComponent from "../components/gstr/Gstr2ReportComponent";
import Gstr3bReportComponent from "../components/gstr/Gstr3bReportComponent";

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
    "month",
  );
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState(
    Math.floor((new Date().getMonth() + 3) / 3),
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [submittedParams, setSubmittedParams] = useState<ReportParams | null>(
    null,
  );

  // --- Handlers ---
  const handleTabChange = (_event: React.SyntheticEvent, newValue: any) => {
    setActiveReport(newValue);
    setSubmittedParams(null); // Reset report view when switching tabs
  };

  const handleGenerateReport = () => {
    setIsGenerating(true);
    const params: ReportParams = { periodType, year };
    if (periodType === "month") params.month = month;
    if (periodType === "quarter") params.quarter = quarter;

    setSubmittedParams(params);

    // Simulate loading delay for smooth UX transition
    setTimeout(() => setIsGenerating(false), 600);
  };

  return (
    <Box
      p={{ xs: 1.5, sm: 3 }}
      sx={{
        backgroundColor: theme.palette.background.default,
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

      {/* 2. MAIN TABS */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
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
              fontWeight: 700,
              fontSize: "0.95rem",
              gap: 1.5,
              color: "text.secondary",
              transition: "all 0.2s",
              "&.Mui-selected": {
                color: "primary.main",
                backgroundColor: alpha(theme.palette.primary.main, 0.04),
              },
              "&:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
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
          />
          <Tab
            icon={<FileSpreadsheet size={20} />}
            iconPosition="start"
            label="GSTR-2 (Purchase)"
            value="gstr2"
          />
        </Tabs>
      </Paper>

      {/* 3. FILTERS & CONTENT AREA */}
      <Box sx={{ flexGrow: 1, pb: 4 }}>
        {/* Modern Control Panel Card */}
        <Card
          elevation={0}
          sx={{
            mb: 4,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.primary.main, 0.02),
            overflow: "visible",
          }}
        >
          <CardContent
            component={Stack}
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
            sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}
          >
            {/* Left Side: Parameters */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={3}
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              {/* Period Type Segmented Control */}
              <Box>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  textTransform="uppercase"
                  letterSpacing={0.5}
                  mb={1}
                  display="block"
                >
                  Report Frequency
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    bgcolor: "background.paper",
                    p: 0.5,
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  {["month", "quarter", "year"].map((type) => {
                    const isSelected = periodType === type;
                    return (
                      <Chip
                        key={type}
                        label={type.charAt(0).toUpperCase() + type.slice(1)}
                        onClick={() => setPeriodType(type as any)}
                        sx={{
                          borderRadius: 1.5,
                          cursor: "pointer",
                          fontWeight: 700,
                          px: 1,
                          bgcolor: isSelected ? "primary.main" : "transparent",
                          color: isSelected
                            ? "primary.contrastText"
                            : "text.primary",
                          "&:hover": {
                            bgcolor: isSelected
                              ? "primary.dark"
                              : alpha(theme.palette.primary.main, 0.08),
                          },
                        }}
                      />
                    );
                  })}
                </Stack>
              </Box>

              <Divider
                orientation="vertical"
                flexItem
                sx={{ display: { xs: "none", sm: "block" } }}
              />

              {/* Dynamic Selectors */}
              <Box>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  textTransform="uppercase"
                  letterSpacing={0.5}
                  mb={1}
                  display="block"
                >
                  Select Period
                </Typography>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    select
                    size="small"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    sx={{
                      minWidth: 110,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        bgcolor: "background.paper",
                        fontWeight: 600,
                      },
                    }}
                  >
                    {Array.from(
                      { length: 5 },
                      (_, i) => new Date().getFullYear() - i,
                    ).map((y) => (
                      <MenuItem key={y} value={y} sx={{ fontWeight: 600 }}>
                        {y}
                      </MenuItem>
                    ))}
                  </TextField>

                  {periodType === "month" && (
                    <TextField
                      select
                      size="small"
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                      sx={{
                        minWidth: 150,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          bgcolor: "background.paper",
                          fontWeight: 600,
                        },
                      }}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <MenuItem key={m} value={m} sx={{ fontWeight: 500 }}>
                          {new Date(0, m - 1).toLocaleString("default", {
                            month: "long",
                          })}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}

                  {periodType === "quarter" && (
                    <TextField
                      select
                      size="small"
                      value={quarter}
                      onChange={(e) => setQuarter(Number(e.target.value))}
                      sx={{
                        minWidth: 150,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          bgcolor: "background.paper",
                          fontWeight: 600,
                        },
                      }}
                    >
                      <MenuItem value={1} sx={{ fontWeight: 500 }}>
                        Apr - Jun (Q1)
                      </MenuItem>
                      <MenuItem value={2} sx={{ fontWeight: 500 }}>
                        Jul - Sep (Q2)
                      </MenuItem>
                      <MenuItem value={3} sx={{ fontWeight: 500 }}>
                        Oct - Dec (Q3)
                      </MenuItem>
                      <MenuItem value={4} sx={{ fontWeight: 500 }}>
                        Jan - Mar (Q4)
                      </MenuItem>
                    </TextField>
                  )}
                </Stack>
              </Box>
            </Stack>

            {/* Right Side: Generate Action */}
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleGenerateReport}
              disabled={isGenerating}
              startIcon={
                isGenerating ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Play size={20} />
                )
              }
              sx={{
                borderRadius: 2.5,
                px: 4,
                py: 1.5,
                fontWeight: 800,
                textTransform: "none",
                fontSize: "1rem",
                boxShadow: theme.shadows[4],
                "&:hover": { boxShadow: theme.shadows[6] },
              }}
            >
              {isGenerating ? "Compiling..." : "Generate Report"}
            </Button>
          </CardContent>
        </Card>

        {/* Report Content Container */}
        {submittedParams ? (
          <Box sx={{ animation: "fadeIn 0.5s ease-in-out" }}>
            {activeReport === "gstr1" && (
              <Gstr1ReportComponent {...submittedParams} />
            )}
            {activeReport === "gstr2" && (
              <Gstr2ReportComponent {...submittedParams} />
            )}
            {activeReport === "gstr3b" && (
              <Gstr3bReportComponent {...submittedParams} />
            )}
          </Box>
        ) : (
          <Card
            elevation={0}
            sx={{
              border: `2px dashed ${theme.palette.divider}`,
              borderRadius: 4,
              bgcolor: alpha(theme.palette.action.hover, 0.02),
            }}
          >
            <Box
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
              minHeight="400px"
              color="text.secondary"
              p={4}
              textAlign="center"
            >
              <Box
                sx={{
                  p: 3,
                  bgcolor: "background.paper",
                  borderRadius: "50%",
                  mb: 2,
                  boxShadow: theme.shadows[1],
                }}
              >
                <FileSearch size={48} color={theme.palette.primary.light} />
              </Box>
              <Typography
                variant="h6"
                fontWeight="bold"
                color="text.primary"
                gutterBottom
              >
                No Report Generated Yet
              </Typography>
              <Typography variant="body2" maxWidth="400px">
                Select a tab, configure your filing frequency in the control
                panel above, and click <b>Generate Report</b> to compile your
                GST data.
              </Typography>
            </Box>
          </Card>
        )}
      </Box>
    </Box>
  );
}
