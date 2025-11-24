// /components/gstr/GstReportFilters.tsx

"use client";

import {
  Card,
  CardContent,
  Stack,
  Typography,
  Chip,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
} from "@mui/material";
import { BarChart2 } from "lucide-react";

// Define the types for the component's props for strong typing
type PeriodType = "month" | "quarter" | "year";

interface GstReportFiltersProps {
  periodType: PeriodType;
  setPeriodType: (value: PeriodType) => void;
  year: number;
  setYear: (value: number) => void;
  month: number;
  setMonth: (value: number) => void;
  quarter: number;
  setQuarter: (value: number) => void;
  isGenerating: boolean;
  onGenerateReport: () => void;
}

export default function GstReportFilters({
  periodType,
  setPeriodType,
  year,
  setYear,
  month,
  setMonth,
  quarter,
  setQuarter,
  isGenerating,
  onGenerateReport,
}: GstReportFiltersProps) {
  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems="center"
          >
            {/* Chip-based period selection */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" fontWeight={500} sx={{ mr: 1 }}>
                Filing Period:
              </Typography>
              {(["month", "quarter", "year"] as const).map((p) => (
                <Chip
                  key={p}
                  label={p}
                  onClick={() => setPeriodType(p)}
                  color={periodType === p ? "primary" : "default"}
                  sx={{ textTransform: "capitalize", borderRadius: "16px" }}
                />
              ))}
            </Stack>

            {/* Conditional dropdowns based on period type */}
            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Financial Year"
                size="small"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                sx={{
                  minWidth: 150,
                  "& .MuiOutlinedInput-root": { borderRadius: "16px" },
                }}
              >
                {Array.from(
                  { length: 5 },
                  (_, i) => new Date().getFullYear() - i
                ).map((y) => (
                  <MenuItem key={y} value={y}>{`${y}-${(y + 1)
                    .toString()
                    .slice(2)}`}</MenuItem>
                ))}
              </TextField>

              {periodType === "month" && (
                <TextField
                  select
                  label="Month"
                  size="small"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  sx={{
                    minWidth: 150,
                    "& .MuiOutlinedInput-root": { borderRadius: "16px" },
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

              {periodType === "quarter" && (
                <TextField
                  select
                  label="Quarter"
                  size="small"
                  value={quarter}
                  onChange={(e) => setQuarter(Number(e.target.value))}
                  sx={{
                    minWidth: 150,
                    "& .MuiOutlinedInput-root": { borderRadius: "16px" },
                  }}
                >
                  <MenuItem value={1}>Q1 (Apr - Jun)</MenuItem>
                  <MenuItem value={2}>Q2 (Jul - Sep)</MenuItem>
                  <MenuItem value={3}>Q3 (Oct - Dec)</MenuItem>
                  <MenuItem value={4}>Q4 (Jan - Mar)</MenuItem>
                </TextField>
              )}
            </Stack>
          </Stack>

          <Button
            variant="contained"
            onClick={onGenerateReport}
            disabled={isGenerating}
            startIcon={
              isGenerating ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <BarChart2 size={18} />
              )
            }
            sx={{ height: 40, width: { xs: "100%", md: "auto" } }}
          >
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
