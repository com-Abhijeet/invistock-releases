"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Category, Subcategory } from "../../lib/types/categoryTypes";
import {
  generateCodeFromName,
  isDuplicateCategoryCode,
  isDuplicateSubCode,
} from "../../utils/codeGenerator";
import toast from "react-hot-toast";

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Category) => void;
  existingCategories: Category[];
  initialData?: Category | null; // ✅ Prop to accept data for editing
}

const defaultCategory = { name: "", code: "" };
const defaultSubcategory = { name: "", code: "" };

export default function CategoryModalForm({
  open,
  onClose,
  onSave,
  existingCategories,
  initialData, // Destructure the new prop
}: CategoryModalProps) {
  const [category, setCategory] = useState(defaultCategory);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([
    defaultSubcategory,
  ]);

  // State for validation errors
  const [codeError, setCodeError] = useState(false);
  const [subErrors, setSubErrors] = useState<boolean[]>([false]);

  // ✅ State to track if the user has manually edited the code fields
  const [isCategoryCodeEdited, setIsCategoryCodeEdited] = useState(false);
  const [isSubCodeEdited, setIsSubCodeEdited] = useState<boolean[]>([false]);

  // ✅ EFFECT 1: Populate form for Add/Edit mode
  // This runs only when the modal opens to set the initial state.
  useEffect(() => {
    if (open) {
      if (initialData) {
        // Edit Mode
        setCategory({ name: initialData.name, code: initialData.code });
        setSubcategories(
          initialData.subcategories.length > 0
            ? initialData.subcategories
            : [defaultSubcategory]
        );
        setIsCategoryCodeEdited(true); // Pre-filled codes are considered "manual"
        setIsSubCodeEdited(Array(initialData.subcategories.length).fill(true));
      } else {
        // Add Mode
        setCategory(defaultCategory);
        setSubcategories([defaultSubcategory]);
        setIsCategoryCodeEdited(false);
        setIsSubCodeEdited([false]);
      }
      // Reset validation errors
      setCodeError(false);
      setSubErrors([false]);
    }
  }, [open, initialData]);

  // ✅ EFFECT 2: Auto-generate Category Code
  // This runs when the category name changes, but respects manual edits.
  useEffect(() => {
    if (category.name && !isCategoryCodeEdited) {
      const autoCode = generateCodeFromName(category.name, 3); // Force 3 letters
      setCategory((prev) => ({ ...prev, code: autoCode }));
    }
  }, [category.name, isCategoryCodeEdited]);

  // --- HANDLER FUNCTIONS ---

  const handleCategoryChange = (field: "name" | "code", value: string) => {
    setCategory((prev) => ({ ...prev, [field]: value.toUpperCase() }));

    if (field === "code") {
      setIsCategoryCodeEdited(true); // User is typing in the code field

      const isDup = isDuplicateCategoryCode(
        value,
        existingCategories, // ✅ Pass the full array of category objects
        initialData?.id
      );
      setCodeError(isDup);
    }
  };

  const handleSubChange = (
    index: number,
    field: keyof Subcategory,
    value: string
  ) => {
    const updatedSubs = [...subcategories];
    const updatedEdits = [...isSubCodeEdited];

    updatedSubs[index] = {
      ...updatedSubs[index],
      [field]: value.toUpperCase(),
    };

    if (field === "name" && !updatedEdits[index]) {
      updatedSubs[index].code = generateCodeFromName(value, 3); // Auto-gen sub code
    }

    if (field === "code") {
      updatedEdits[index] = true; // User is typing in the code field
      const dup = isDuplicateSubCode(value, updatedSubs, index);
      const newErrors = [...subErrors];
      newErrors[index] = dup;
      setSubErrors(newErrors);
    }

    setSubcategories(updatedSubs);
    setIsSubCodeEdited(updatedEdits);
  };

  const addSubcategory = () => {
    setSubcategories([...subcategories, defaultSubcategory]);
    setSubErrors([...subErrors, false]);
    setIsSubCodeEdited([...isSubCodeEdited, false]);
  };

  const removeSubcategory = (index: number) => {
    setSubcategories((prev) => prev.filter((_, i) => i !== index));
    setSubErrors((prev) => prev.filter((_, i) => i !== index));
    setIsSubCodeEdited((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!category.name || !category.code || codeError)
      return toast.error("Category name and unique code are required.");
    if (
      subcategories.some(
        (s) => (!s.name || !s.code) && subcategories.length > 1
      )
    )
      return toast.error("Subcategory fields cannot be empty.");
    if (subErrors.some((e) => e))
      return toast.error("Please fix duplicate subcategory codes.");

    // Filter out the initial empty subcategory if it was never filled
    const finalSubcategories = subcategories.filter((s) => s.name && s.code);

    onSave({ ...initialData, ...category, subcategories: finalSubcategories });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {initialData ? "Edit Category" : "Add New Category"}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} alignItems="center" mb={3}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Category Name"
              value={category.name}
              onChange={(e) => handleCategoryChange("name", e.target.value)}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Category Code"
              value={category.code}
              onChange={(e) => handleCategoryChange("code", e.target.value)}
              error={codeError}
              helperText={codeError ? "Duplicate code" : "3-letter unique code"}
              inputProps={{ maxLength: 3 }}
            />
          </Grid>
        </Grid>

        <Typography variant="subtitle1" gutterBottom>
          Subcategories
        </Typography>
        {subcategories.map((sub, index) => (
          <Grid container spacing={1} alignItems="center" key={index} mb={1.5}>
            <Grid item xs={5}>
              <TextField
                label="Name"
                fullWidth
                size="small"
                value={sub.name}
                onChange={(e) => handleSubChange(index, "name", e.target.value)}
              />
            </Grid>
            <Grid item xs={5}>
              <TextField
                label="Code"
                fullWidth
                size="small"
                value={sub.code}
                onChange={(e) => handleSubChange(index, "code", e.target.value)}
                error={subErrors[index]}
                helperText={subErrors[index] ? "Duplicate code" : ""}
                inputProps={{ maxLength: 3 }}
              />
            </Grid>
            <Grid item xs={2}>
              <IconButton
                onClick={() => removeSubcategory(index)}
                color="error"
                disabled={subcategories.length === 1 && !sub.name && !sub.code}
              >
                <Trash2 size={18} />
              </IconButton>
            </Grid>
          </Grid>
        ))}

        <Button
          onClick={addSubcategory}
          variant="outlined"
          startIcon={<Plus />}
          sx={{ mt: 1 }}
        >
          Add Subcategory
        </Button>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
