"use client";

import { useEffect, useState } from "react";
import { Box, Button } from "@mui/material";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

// Services & Types
import userApiService from "../lib/api/userService";
import { User, CreateUserPayload } from "../lib/types/UserTypes";
import type { DashboardFilter } from "../lib/types/inventoryDashboardTypes";

// Components
import DashboardHeader from "../components/DashboardHeader";
import theme from "../../theme";
import UserListTable from "../components/users/UserListTable";
import UserFormModal from "../components/users/UserFormModal";

const getInitialFilters = (): DashboardFilter => ({
  from: "",
  to: "",
  filter: "month",
});

export default function UserManagement() {
  // --- State ---
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [_activeFilters, setActiveFilters] =
    useState<DashboardFilter>(getInitialFilters);

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Form State
  const [formData, setFormData] = useState<CreateUserPayload>({
    name: "",
    username: "",
    password: "",
    role: "employee",
    permissions: [],
  });

  // Edit State
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  // --- Effects ---
  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = users;
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(lower) ||
          u.username.toLowerCase().includes(lower),
      );
    }
    setFilteredUsers(result);
    setPage(0);
  }, [searchQuery, users]);

  // --- Handlers ---
  const fetchUsers = async () => {
    try {
      const data = await userApiService.getAllUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      toast.error("Failed to load users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await userApiService.deleteUser(id);
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const handleEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      username: user.username,
      password: "", // Clear password for security (optional update)
      role: user.role,
      permissions: user.permissions,
    });
    setOpenModal(true);
  };

  const handleCreateOrUpdate = async (data: CreateUserPayload) => {
    if (!data.name || !data.username) {
      toast.error("Please fill in Name and Username");
      return;
    }

    // Validation: Password is required only for creating new users
    if (!editingUserId && !data.password) {
      toast.error("Password is required for new users");
      return;
    }

    try {
      if (editingUserId) {
        await userApiService.updateUser(editingUserId, data);
        toast.success("User updated successfully");
      } else {
        await userApiService.createUser(data);
        toast.success("User created successfully");
      }

      setOpenModal(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Operation failed");
    }
  };

  const resetForm = () => {
    setEditingUserId(null);
    setFormData({
      name: "",
      username: "",
      password: "",
      role: "employee",
      permissions: [],
    });
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
        title="User Management"
        showSearch={true}
        showDateFilters={false}
        onSearch={setSearchQuery}
        onFilterChange={setActiveFilters}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => {
              resetForm();
              setOpenModal(true);
            }}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 600,
              boxShadow: "none",
              "&:hover": { boxShadow: "none" },
            }}
          >
            Add New User
          </Button>
        }
      />

      <UserListTable
        users={filteredUsers}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />

      <UserFormModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          resetForm();
        }}
        onSubmit={handleCreateOrUpdate}
        formData={formData}
        setFormData={setFormData}
        isEditing={!!editingUserId}
      />
    </Box>
  );
}
