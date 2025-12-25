import { Box, Typography, Chip, IconButton, Tooltip } from "@mui/material";
import { Trash2, Shield, User as UserIcon, Edit } from "lucide-react";
import { User } from "../../lib/types/UserTypes";
import DataTable from "../DataTable";

interface UserListTableProps {
  users: User[];
  loading: boolean;
  page: number;
  rowsPerPage: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (id: number) => void;
  onEdit: (user: User) => void;
}

export default function UserListTable({
  users,
  loading,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onDelete,
  onEdit,
}: UserListTableProps) {
  // Define columns for the DataTable
  const columns = [
    {
      key: "name",
      label: "Name",
      minWidth: 170,
      format: (value: string, row: User) => (
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              p: 0.5,
              borderRadius: "50%",
              bgcolor: row.role === "admin" ? "primary.lighter" : "grey.100",
              color: row.role === "admin" ? "primary.main" : "text.secondary",
              display: "flex",
            }}
          >
            {row.role === "admin" ? (
              <Shield size={16} />
            ) : (
              <UserIcon size={16} />
            )}
          </Box>
          <Typography variant="body2" fontWeight={500}>
            {value}
          </Typography>
        </Box>
      ),
    },
    {
      key: "username",
      label: "Username / ID",
      minWidth: 150,
    },
    {
      key: "role",
      label: "Role",
      minWidth: 100,
      format: (value: string) => (
        <Chip
          label={value.toUpperCase()}
          color={value === "admin" ? "primary" : "default"}
          size="small"
          sx={{ fontWeight: 600, fontSize: "0.7rem", height: 24 }}
        />
      ),
    },
    {
      key: "permissions",
      label: "Access",
      minWidth: 250,
      format: (value: string[], row: User) => {
        if (row.role === "admin") {
          return (
            <Typography variant="caption" color="text.secondary">
              Full System Access
            </Typography>
          );
        }
        // Ensure permissions is an array
        const perms = Array.isArray(value) ? value : [];
        return (
          <Box display="flex" gap={0.5} flexWrap="wrap" maxWidth={300}>
            {perms.slice(0, 3).map((p) => (
              <Chip key={p} label={p} size="small" variant="outlined" />
            ))}
            {perms.length > 3 && (
              <Chip
                label={`+${perms.length - 3} more`}
                size="small"
                variant="outlined"
              />
            )}
            {perms.length === 0 && (
              <Typography variant="caption" color="text.secondary">
                Restricted
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      align: "right" as const,
      minWidth: 100,
      format: (_value: any, row: User) => (
        <Box display="flex" justifyContent="flex-end">
          <Tooltip title="Edit User">
            <IconButton
              color="primary"
              onClick={() => onEdit(row)}
              size="small"
              sx={{ mr: 1 }}
            >
              <Edit size={18} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Delete User">
            <span>
              <IconButton
                color="error"
                onClick={() => onDelete(row.id)}
                disabled={row.role === "admin" && row.username === "admin"}
                size="small"
              >
                <Trash2 size={18} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Calculate the slice of users to display for the current page
  const visibleRows = users.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <DataTable
      rows={visibleRows}
      columns={columns}
      loading={loading}
      page={page}
      rowsPerPage={rowsPerPage}
      total={users.length}
      onPageChange={() => onPageChange}
      onRowsPerPageChange={() => onRowsPerPageChange}
    />
  );
}
