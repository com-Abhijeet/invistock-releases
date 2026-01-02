"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  InputAdornment,
  Autocomplete, // Imported Autocomplete
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { Save } from "lucide-react";
import toast from "react-hot-toast";
import { createExpense, updateExpense } from "../../lib/api/expenseService";
import {
  Expense,
  EXPENSE_CATEGORIES,
  PAYMENT_MODES,
} from "../../lib/types/expenseTypes";
import { FormField } from "../FormField";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Expense | null;
}

export default function AddEditExpenseModal({
  open,
  onClose,
  onSuccess,
  initialData,
}: Props) {
  const [form, setForm] = useState<Partial<Expense>>({
    date: new Date().toISOString().split("T")[0], // Default to today (YYYY-MM-DD)
    category: "",
    amount: 0,
    payment_mode: "Cash",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      // Convert DD/MM/YYYY back to YYYY-MM-DD for the input field
      const [d, m, y] = initialData.date.split("/");
      const isoDate = `${y}-${m}-${d}`;

      setForm({
        ...initialData,
        date: isoDate,
      });
    } else {
      // Reset
      setForm({
        date: new Date().toISOString().split("T")[0],
        category: "",
        amount: 0,
        payment_mode: "Cash",
        description: "",
      });
    }
  }, [initialData, open]);

  const handleChange = (key: keyof Expense, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.amount || !form.category || !form.date) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      // Convert YYYY-MM-DD to DD/MM/YYYY for API
      const [y, m, d] = form.date!.split("-");
      const submissionData = { ...form, date: `${d}/${m}/${y}` } as Expense;

      if (initialData?.id) {
        await updateExpense(initialData.id, submissionData);
        toast.success("Expense updated!");
      } else {
        await createExpense(submissionData);
        toast.success("Expense added!");
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save expense.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initialData ? "Edit Expense" : "Add New Expense"}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormField label="Date *">
              <TextField
                type="date"
                fullWidth
                size="small"
                value={form.date}
                onChange={(e) => handleChange("date", e.target.value)}
              />
            </FormField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormField label="Amount *">
              <TextField
                type="number"
                fullWidth
                size="small"
                value={form.amount}
                onChange={(e) => handleChange("amount", Number(e.target.value))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                }}
              />
            </FormField>
          </Grid>

          {/* REPLACED DROPDOWN WITH AUTOCOMPLETE SEARCH */}
          <Grid item xs={12} sm={6}>
            <FormField label="Category *">
              <Autocomplete
                options={EXPENSE_CATEGORIES}
                value={form.category || null} // Handle initial empty state
                onChange={(_, newValue) =>
                  handleChange("category", newValue || "")
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    size="small"
                    placeholder="Search category..."
                  />
                )}
              />
            </FormField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormField label="Payment Mode">
              <TextField
                select
                fullWidth
                size="small"
                value={form.payment_mode}
                onChange={(e) => handleChange("payment_mode", e.target.value)}
              >
                {PAYMENT_MODES.map((mode) => (
                  <MenuItem key={mode} value={mode}>
                    {mode}
                  </MenuItem>
                ))}
              </TextField>
            </FormField>
          </Grid>
          <Grid item xs={12}>
            <FormField label="Description / Note">
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="e.g., Shop rent for November"
              />
            </FormField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<Save size={18} />}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Expense"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
