"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  InputAdornment,
  Stack,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { useState, useEffect } from "react";
import { User, Phone, Percent, Briefcase } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api/api";

interface Employee {
  id?: number;
  name: string;
  phone: string;
  role: string;
  commission_rate: number;
  is_active: number;
}

const defaultEmployee: Employee = {
  name: "",
  phone: "",
  role: "staff",
  commission_rate: 0,
  is_active: 1,
};

interface Props {
  open: boolean;
  onClose: () => void;
  initialData?: Employee | null;
  onSuccess: () => void;
}

export default function EmployeeFormModal({
  open,
  onClose,
  initialData,
  onSuccess,
}: Props) {
  const [form, setForm] = useState<Employee>(defaultEmployee);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialData || defaultEmployee);
    }
  }, [open, initialData]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setLoading(true);
    try {
      if (form.id) {
        await api.put(`/api/employees/${form.id}`, form);
        toast.success("Employee updated");
      } else {
        await api.post("/api/employees", form);
        toast.success("Employee created");
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {form.id ? "Edit Employee" : "Add New Employee"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} mt={1}>
          <TextField
            label="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <User size={18} />
                </InputAdornment>
              ),
            }}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone size={18} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              label="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Briefcase size={18} />
                  </InputAdornment>
                ),
              }}
            >
              <MenuItem value="staff">Staff</MenuItem>
              <MenuItem value="manager">Manager</MenuItem>
              <MenuItem value="driver">Driver</MenuItem>
            </TextField>
          </Stack>

          <TextField
            label="Commission Rate (%)"
            type="number"
            value={form.commission_rate}
            onChange={(e) =>
              setForm({ ...form, commission_rate: parseFloat(e.target.value) })
            }
            fullWidth
            helperText="Percentage of total bill amount earned as commission"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Percent size={18} />
                </InputAdornment>
              ),
            }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={Boolean(form.is_active)}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked ? 1 : 0 })
                }
              />
            }
            label="Employee is Active"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
