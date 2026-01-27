"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  IconButton,
  Chip,
  Button,
  TextField,
  MenuItem,
  Divider,
  Paper,
  alpha,
  useTheme,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  ArrowLeft,
  Phone,
  Briefcase,
  TrendingUp,
  Percent,
  Filter,
} from "lucide-react";
import DataTable from "../components/DataTable";

import { api } from "../lib/api/api";
import toast from "react-hot-toast";

interface Employee {
  id: number;
  name: string;
  phone: string;
  role: string;
  commission_rate: number;
  is_active: number;
}

interface EmployeeSale {
  id: number;
  sale_id: number;
  sale_amount: number;
  commission_amount: number;
  created_at: string;
  sales_reference_no?: string;
}

export default function EmployeeDetailPage() {
  const theme = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);

  // ✅ Single source of truth for sales data
  const [sales, setSales] = useState<EmployeeSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(false);

  // --- Filter State ---
  const [filterType, setFilterType] = useState<"all" | "month" | "date">("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [specificDate, setSpecificDate] = useState(""); // YYYY-MM-DD

  const years = Array.from(
    { length: 6 },
    (_, i) => new Date().getFullYear() - i,
  );
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  // 1. Initial Load (Employee Details)
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const empRes = await api.get(`/api/employees/${id}`);
        if (empRes.data.success) {
          setEmployee(empRes.data.data);
        }
      } catch (error) {
        toast.error("Failed to load employee details");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchEmployee();
  }, [id]);

  // 2. Fetch Sales Logic (Server-Side Filtering)
  const fetchSales = async () => {
    if (!id) return;
    setSalesLoading(true);

    try {
      const params: any = {};

      if (filterType === "month") {
        // Calculate start/end of month
        const start = new Date(selectedYear, selectedMonth - 1, 1);
        const end = new Date(selectedYear, selectedMonth, 0); // Last day of month

        // Format YYYY-MM-DD
        // Note: Using CA local string to ensure YYYY-MM-DD format or manual construction
        const formatDate = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        };

        params.startDate = formatDate(start);
        params.endDate = formatDate(end);
      } else if (filterType === "date" && specificDate) {
        params.startDate = specificDate;
        params.endDate = specificDate;
      }

      const salesRes = await api.get(`/api/employee-sales/employee/${id}`, {
        params,
      });

      if (salesRes.data.success) {
        setSales(salesRes.data.data);
      }
    } catch (error) {
      console.error("Error fetching sales:", error);
      toast.error("Failed to load sales history");
    } finally {
      setSalesLoading(false);
    }
  };

  // 3. Trigger Fetch when filters change
  useEffect(() => {
    fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, filterType, selectedMonth, selectedYear, specificDate]);

  const columns = [
    {
      key: "created_at",
      label: "Date",
      format: (val: string) => new Date(val).toLocaleDateString("en-IN"),
    },
    {
      key: "sales_reference_no",
      label: "Sale Ref",
      format: (val: string, row: any) => (
        <Chip
          label={val || `#${row.sale_id}`}
          size="small"
          variant="outlined"
          onClick={() => navigate(`/billing/view/${row.sale_id}`)}
          sx={{ cursor: "pointer", fontWeight: 600, minWidth: 80 }}
        />
      ),
    },
    {
      key: "sale_amount",
      label: "Sale Amount",
      format: (val: number) => `₹${val.toLocaleString("en-IN")}`,
    },
    {
      key: "commission_amount",
      label: "Commission",
      format: (val: number) => (
        <Typography fontWeight={700} color="success.main">
          ₹{val.toLocaleString("en-IN")}
        </Typography>
      ),
    },
  ];

  // Calculate totals from API result
  const totalSales = sales.reduce((sum, s) => sum + s.sale_amount, 0);
  const totalCommission = sales.reduce(
    (sum, s) => sum + s.commission_amount,
    0,
  );

  if (!employee && !loading) {
    return (
      <Box p={4} textAlign="center">
        <Typography color="error">Employee not found</Typography>
        <Button onClick={() => navigate("/employees")} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3} sx={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      {/* --- Top Bar --- */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        mb={3}
        spacing={2}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={() => navigate("/employees")} sx={{ mr: 1 }}>
            <ArrowLeft />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight={800} color="text.primary">
              {employee?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Employee Details & Performance
            </Typography>
          </Box>
        </Stack>

        {/* --- Modern Filter Bar --- */}
        <Paper
          elevation={0}
          sx={{
            p: 0.5,
            pl: 2,
            pr: 0.5,
            display: "flex",
            alignItems: "center",
            borderRadius: "12px",
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: "#fff",
            gap: 2,
            boxShadow: theme.shadows[1],
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Filter size={16} color={theme.palette.text.secondary} />
            <Typography
              variant="caption"
              fontWeight={700}
              color="text.secondary"
              sx={{ textTransform: "uppercase" }}
            >
              Filter By
            </Typography>
          </Stack>

          <TextField
            select
            variant="standard"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            InputProps={{ disableUnderline: true }}
            sx={{ minWidth: 100, "& .MuiSelect-select": { fontWeight: 600 } }}
          >
            <MenuItem value="all">All Time</MenuItem>
            <MenuItem value="month">Month</MenuItem>
            <MenuItem value="date">Date</MenuItem>
          </TextField>

          {filterType !== "all" && (
            <Divider
              orientation="vertical"
              flexItem
              sx={{ height: 20, my: "auto" }}
            />
          )}

          {/* Conditional Inputs */}
          {filterType === "month" && (
            <Stack direction="row" spacing={1}>
              <TextField
                select
                variant="standard"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                InputProps={{ disableUnderline: true }}
                sx={{ minWidth: 100 }}
              >
                {months.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                variant="standard"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                InputProps={{ disableUnderline: true }}
                sx={{ minWidth: 70 }}
              >
                {years.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}

          {filterType === "date" && (
            <TextField
              type="date"
              variant="standard"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              InputProps={{ disableUnderline: true }}
              sx={{ minWidth: 130 }}
            />
          )}

          {filterType !== "all" && (
            <Chip
              label={`${sales.length} records`}
              size="small"
              color="primary"
              variant="filled"
              sx={{
                borderRadius: "6px",
                fontWeight: 600,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: "primary.main",
              }}
            />
          )}
        </Paper>
      </Stack>

      <Grid container spacing={3} mb={3}>
        {/* Profile Card */}
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{
              height: "100%",
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Stack spacing={2.5}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    fontWeight={700}
                  >
                    PROFILE
                  </Typography>
                  <Chip
                    label={employee?.is_active ? "Active" : "Inactive"}
                    size="small"
                    color={employee?.is_active ? "success" : "default"}
                    sx={{ fontWeight: 600, height: 24 }}
                  />
                </Stack>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      p={1}
                      borderRadius={2}
                      bgcolor={alpha(theme.palette.grey[500], 0.1)}
                    >
                      <Phone size={18} color={theme.palette.text.secondary} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Phone
                      </Typography>
                      <Typography fontWeight={500}>
                        {employee?.phone || "N/A"}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      p={1}
                      borderRadius={2}
                      bgcolor={alpha(theme.palette.grey[500], 0.1)}
                    >
                      <Briefcase
                        size={18}
                        color={theme.palette.text.secondary}
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Role
                      </Typography>
                      <Typography
                        fontWeight={500}
                        sx={{ textTransform: "capitalize" }}
                      >
                        {employee?.role}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      p={1}
                      borderRadius={2}
                      bgcolor={alpha(theme.palette.grey[500], 0.1)}
                    >
                      <Percent size={18} color={theme.palette.text.secondary} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Commission Rate
                      </Typography>
                      <Typography fontWeight={500}>
                        {employee?.commission_rate}%
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Stats Card */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3} height="100%">
            <Grid item xs={12} sm={6}>
              <Card
                elevation={0}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  borderRadius: 3,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <CardContent>
                  <Stack spacing={1}>
                    <Box
                      width={40}
                      height={40}
                      borderRadius="12px"
                      bgcolor={alpha(theme.palette.primary.main, 0.2)}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      color="primary.main"
                      mb={1}
                    >
                      <TrendingUp size={20} />
                    </Box>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      Total Sales Generated
                    </Typography>
                    <Typography
                      variant="h3"
                      fontWeight={800}
                      color="primary.main"
                      sx={{ letterSpacing: -1 }}
                    >
                      ₹{totalSales.toLocaleString("en-IN")}
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      color="primary.dark"
                    >
                      {filterType === "all"
                        ? "Lifetime Total"
                        : "Selected Period"}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card
                elevation={0}
                sx={{
                  bgcolor: alpha(theme.palette.success.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  borderRadius: 3,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <CardContent>
                  <Stack spacing={1}>
                    <Box
                      width={40}
                      height={40}
                      borderRadius="12px"
                      bgcolor={alpha(theme.palette.success.main, 0.2)}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      color="success.main"
                      mb={1}
                    >
                      <Percent size={20} />
                    </Box>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      Total Commission Earned
                    </Typography>
                    <Typography
                      variant="h3"
                      fontWeight={800}
                      color="success.main"
                      sx={{ letterSpacing: -1 }}
                    >
                      ₹{totalCommission.toLocaleString("en-IN")}
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      color="success.dark"
                    >
                      Based on {employee?.commission_rate}% rate
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Sales Table */}
      <DataTable
        rows={sales}
        columns={columns}
        actions={[]}
        loading={salesLoading}
        total={sales.length}
        page={0}
        rowsPerPage={100}
        onPageChange={() => {}}
        onRowsPerPageChange={() => {}}
      />
    </Box>
  );
}
