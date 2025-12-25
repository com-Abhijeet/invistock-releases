import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Box,
  Divider,
  InputAdornment,
  IconButton,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { CreateUserPayload, UserRole } from "../../lib/types/UserTypes";
import { getPermissionsFromMenu } from "../../lib/permissionUtils";
import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserPayload) => void;
  formData: CreateUserPayload;
  setFormData: (data: CreateUserPayload) => void;
  isEditing?: boolean; // New prop to indicate edit mode
}

export default function UserFormModal({
  open,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isEditing = false,
}: UserFormModalProps) {
  const permissionSections = useMemo(() => getPermissionsFromMenu(), []);
  const [showPassword, setShowPassword] = useState(false);

  const togglePermission = (key: string) => {
    setFormData({
      ...formData,
      permissions: formData.permissions.includes(key)
        ? formData.permissions.filter((p) => p !== key)
        : [...formData.permissions, key],
    });
  };

  const handleSelectAll = (sectionKeys: string[], checked: boolean) => {
    let newPermissions = [...formData.permissions];
    if (checked) {
      sectionKeys.forEach((key) => {
        if (!newPermissions.includes(key)) newPermissions.push(key);
      });
    } else {
      newPermissions = newPermissions.filter((p) => !sectionKeys.includes(p));
    }
    setFormData({ ...formData, permissions: newPermissions });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: "bold" }}>
        {isEditing
          ? "Edit User Details"
          : formData.role === "admin"
          ? "Add Administrator"
          : "Add Employee"}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* --- Basic Details --- */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Full Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Username / Login ID"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              type={showPassword ? "text" : "password"}
              label={
                isEditing ? "New Password (Leave blank to keep)" : "Password"
              }
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as UserRole })
                }
              >
                <MenuItem value="employee">Employee</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* --- Dynamic Permissions Section --- */}
          {formData.role === "employee" && (
            <Grid item xs={12}>
              <Box mt={2}>
                <Typography variant="h6" gutterBottom color="primary">
                  Access Permissions
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Select which modules this employee can access.
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 3,
                  }}
                >
                  {permissionSections.map((section) => {
                    const sectionKeys = section.items.map((i) => i.key);
                    const allSelected = sectionKeys.every((k) =>
                      formData.permissions.includes(k)
                    );
                    const someSelected = sectionKeys.some((k) =>
                      formData.permissions.includes(k)
                    );

                    return (
                      <Box
                        key={section.title}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                          p: 2,
                        }}
                      >
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          mb={1}
                        >
                          <Typography variant="subtitle2" fontWeight="bold">
                            {section.title}
                          </Typography>
                          <Checkbox
                            size="small"
                            checked={allSelected}
                            indeterminate={someSelected && !allSelected}
                            onChange={(e) =>
                              handleSelectAll(sectionKeys, e.target.checked)
                            }
                          />
                        </Box>
                        <Divider sx={{ mb: 1 }} />
                        <FormGroup>
                          {section.items.map((item) => (
                            <FormControlLabel
                              key={item.key}
                              control={
                                <Checkbox
                                  size="small"
                                  checked={formData.permissions.includes(
                                    item.key
                                  )}
                                  onChange={() => togglePermission(item.key)}
                                />
                              }
                              label={
                                <Typography variant="body2">
                                  {item.label}
                                </Typography>
                              }
                            />
                          ))}
                        </FormGroup>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={() => onSubmit(formData)}>
          {isEditing ? "Update User" : "Create User"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
