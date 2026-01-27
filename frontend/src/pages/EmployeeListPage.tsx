"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ✅ Added for navigation
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  TrendingUp,
  Eye, // ✅ Added Eye icon
} from "lucide-react";
import DataTable from "../components/DataTable";
import DashboardHeader from "../components/DashboardHeader";
import EmployeeFormModal from "../components/employees/EmployeeFormModal";
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

// Separate interface for stats to keep types clean
interface EmployeeStats {
  total_sales: number;
  total_commission: number;
  total_bills: number;
}

export default function EmployeeListPage() {
  const navigate = useNavigate(); // ✅ Initialize hook
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<EmployeeStats>({
    total_sales: 0,
    total_commission: 0,
    total_bills: 0,
  });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<Employee | null>(null);

  // Date filter for stats (only used for the summary cards now)
  const [dateFilter, setDateFilter] = useState({
    start: new Date().toISOString().slice(0, 8) + "01", // Start of current month
    end: new Date().toISOString().slice(0, 10),
  });

  // 1. Fetch Employee List (Basic Info)
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/employees"); // Default get all
      if (res.data.success && Array.isArray(res.data.data)) {
        setEmployees(res.data.data);
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Aggregate Stats (Optional / Separate)
  const fetchStats = async () => {
    try {
      const res = await api.get("/api/employees/stats", {
        params: { startDate: dateFilter.start, endDate: dateFilter.end },
      });

      if (res.data.success && Array.isArray(res.data.data)) {
        // Aggregating locally for the summary cards
        const totalSales = res.data.data.reduce(
          (sum: number, e: any) => sum + (e.total_sales || 0),
          0,
        );
        const totalCommission = res.data.data.reduce(
          (sum: number, e: any) => sum + (e.total_commission || 0),
          0,
        );
        const totalBills = res.data.data.reduce(
          (sum: number, e: any) => sum + (e.total_bills || 0),
          0,
        );

        setStats({
          total_sales: totalSales,
          total_commission: totalCommission,
          total_bills: totalBills,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Don't block UI if stats fail
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [dateFilter]); // Re-fetch only stats when date changes

  const handleEdit = (employee: Employee) => {
    setEditData(employee);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to deactivate this employee?")) return;
    try {
      await api.delete(`/api/employees/${id}`);
      toast.success("Employee deactivated");
      fetchEmployees();
    } catch (e) {
      toast.error("Failed to deactivate");
    }
  };

  const handleAdd = () => {
    setEditData(null);
    setModalOpen(true);
  };

  const handleSuccess = () => {
    fetchEmployees();
    fetchStats(); // Update stats too in case a new employee affects counts
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      format: (val: string, row: Employee) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              bgcolor: row.is_active
                ? "primary.light"
                : "action.disabledBackground",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: row.is_active ? "primary.contrastText" : "text.disabled",
              fontWeight: "bold",
              fontSize: "0.8rem",
            }}
          >
            {val.charAt(0).toUpperCase()}
          </Box>
          <Box>
            <Typography
              variant="body2"
              fontWeight={600}
              color={row.is_active ? "text.primary" : "text.disabled"}
            >
              {val}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textTransform: "capitalize" }}
            >
              {row.role}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    { key: "phone", label: "Phone" },
    {
      key: "commission_rate",
      label: "Comm. Rate",
      format: (val: number) => (
        <Chip
          label={`${val}%`}
          size="small"
          color="secondary"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      ),
    },
    {
      key: "is_active",
      label: "Status",
      format: (val: number) => (
        <Chip
          label={val ? "Active" : "Inactive"}
          color={val ? "success" : "default"}
          size="small"
        />
      ),
    },
  ];

  const actions = [
    // ✅ ADDED: View Action
    {
      label: "View Details",
      icon: <Eye size={18} />,
      onClick: (row: Employee) => navigate(`/employees/${row.id}`),
    },
    {
      label: "Edit",
      icon: <Edit2 size={18} />,
      onClick: (row: Employee) => handleEdit(row),
    },
    {
      label: "Deactivate",
      icon: <Trash2 size={18} />,
      onClick: (row: Employee) => handleDelete(row.id),
    },
  ];

  const activeStaffCount = employees.filter((e) => e.is_active).length;

  return (
    <Box p={3} sx={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <DashboardHeader
        title="Employee Management"
        showDateFilters={true}
        onFilterChange={(f) => {
          if (f.from && f.to) {
            setDateFilter({ start: f.from, end: f.to });
          }
        }}
        onRefresh={() => {
          fetchEmployees();
          fetchStats();
        }}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={handleAdd}
            sx={{
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            Add Employee
          </Button>
        }
      />

      {/* Summary Cards - Powered by separate 'stats' state */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={4}>
          <Card
            elevation={0}
            sx={{ border: "1px solid #e0e0e0", borderRadius: 3 }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  p={1.5}
                  bgcolor="primary.lighter"
                  borderRadius={3}
                  color="primary.main"
                >
                  <UserCheck size={24} />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {activeStaffCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Staff
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card
            elevation={0}
            sx={{ border: "1px solid #e0e0e0", borderRadius: 3 }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  p={1.5}
                  bgcolor="success.lighter"
                  borderRadius={3}
                  color="success.main"
                >
                  <TrendingUp size={24} />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    ₹{stats.total_sales.toLocaleString("en-IN")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Sales (Selected Period)
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card
            elevation={0}
            sx={{ border: "1px solid #e0e0e0", borderRadius: 3 }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  p={1.5}
                  bgcolor="secondary.lighter"
                  borderRadius={3}
                  color="secondary.main"
                >
                  <UserCheck size={24} />
                </Box>
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    color="secondary.main"
                  >
                    ₹{stats.total_commission.toLocaleString("en-IN")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Commission Due
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <DataTable
        rows={employees}
        columns={columns}
        actions={actions}
        loading={loading}
        total={employees.length}
        page={0}
        rowsPerPage={100}
        onPageChange={() => {}}
        onRowsPerPageChange={() => {}}
      />

      <EmployeeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={editData}
        onSuccess={handleSuccess}
      />
    </Box>
  );
}
