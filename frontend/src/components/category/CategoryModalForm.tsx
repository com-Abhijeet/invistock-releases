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
  Stack,
  Box,
  Divider,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { Plus, Trash2, Tag, Layers, Hash, Info } from "lucide-react";
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
  initialData?: Category | null;
}

const defaultCategory = { name: "", code: "" };
const defaultSubcategory = { name: "", code: "" };

export default function CategoryModalForm({
  open,
  onClose,
  onSave,
  existingCategories,
  initialData,
}: CategoryModalProps) {
  const [category, setCategory] = useState(defaultCategory);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([
    defaultSubcategory,
  ]);

  // State for validation errors
  const [codeError, setCodeError] = useState(false);
  const [subErrors, setSubErrors] = useState<boolean[]>([false]);

  // Track manual edits
  const [isCategoryCodeEdited, setIsCategoryCodeEdited] = useState(false);
  const [isSubCodeEdited, setIsSubCodeEdited] = useState<boolean[]>([false]);

  // ✅ EFFECT 1: Populate form for Add/Edit mode
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
        setIsCategoryCodeEdited(true);
        setIsSubCodeEdited(Array(initialData.subcategories.length).fill(true));
      } else {
        // Add Mode
        setCategory(defaultCategory);
        setSubcategories([defaultSubcategory]);
        setIsCategoryCodeEdited(false);
        setIsSubCodeEdited([false]);
      }
      setCodeError(false);
      setSubErrors([false]);
    }
  }, [open, initialData]);

  // ✅ EFFECT 2: Auto-generate Category Code
  useEffect(() => {
    if (category.name && !isCategoryCodeEdited) {
      const autoCode = generateCodeFromName(category.name, 3);
      setCategory((prev) => ({ ...prev, code: autoCode }));
    }
  }, [category.name, isCategoryCodeEdited]);

  // ✅ EFFECT 3: Live Validation for Category Code (Handles both auto & manual)
  useEffect(() => {
    if (category.code) {
      const isDup = isDuplicateCategoryCode(
        category.code,
        existingCategories,
        initialData?.id
      );
      setCodeError(isDup);
    } else {
      setCodeError(false);
    }
  }, [category.code, existingCategories, initialData]);

  // --- HANDLER FUNCTIONS ---

  const handleCategoryChange = (field: "name" | "code", value: string) => {
    setCategory((prev) => ({ ...prev, [field]: value.toUpperCase() }));

    if (field === "code") {
      setIsCategoryCodeEdited(true); // User is typing, stop auto-gen
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

    // Auto-gen sub code if name changes and code wasn't manually edited
    if (field === "name" && !updatedEdits[index]) {
      updatedSubs[index].code = generateCodeFromName(value, 3);
    }

    // Mark as manually edited if code changes
    if (field === "code") {
      updatedEdits[index] = true;
    }

    // Validate Sub Code immediately
    const dup = isDuplicateSubCode(updatedSubs[index].code, updatedSubs, index);
    const newErrors = [...subErrors];
    newErrors[index] = dup;

    setSubcategories(updatedSubs);
    setIsSubCodeEdited(updatedEdits);
    setSubErrors(newErrors);
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
      return toast.error(
        "Please provide a valid Category Name and unique Code."
      );

    if (
      subcategories.some(
        (s) => (!s.name || !s.code) && subcategories.length > 1
      )
    )
      return toast.error("Subcategory fields cannot be empty.");

    if (subErrors.some((e) => e))
      return toast.error("Please fix duplicate subcategory codes.");

    const finalSubcategories = subcategories.filter((s) => s.name && s.code);

    onSave({ ...initialData, ...category, subcategories: finalSubcategories });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              bgcolor: "primary.light",
              p: 0.8,
              borderRadius: 2,
              color: "primary.main",
              opacity: 0.1,
            }}
          >
            <Tag size={24} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {initialData ? "Edit Category" : "Add New Category"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Organize your products with categories and sub-codes.
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <Divider sx={{ my: 1 }} />

      <DialogContent sx={{ py: 3 }}>
        <Stack spacing={4}>
          {/* --- Section 1: Main Category --- */}
          <Box>
            <Typography
              variant="subtitle2"
              fontWeight={600}
              color="text.secondary"
              mb={2}
            >
              CATEGORY DETAILS
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={8}>
                <TextField
                  fullWidth
                  label="Category Name"
                  placeholder="e.g. Electronics"
                  value={category.name}
                  onChange={(e) => handleCategoryChange("name", e.target.value)}
                  InputProps={{
                    sx: { borderRadius: 2 },
                  }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Code"
                  placeholder="ELE"
                  value={category.code}
                  onChange={(e) => handleCategoryChange("code", e.target.value)}
                  error={codeError}
                  helperText={codeError ? "Duplicate" : ""}
                  inputProps={{ maxLength: 3 }}
                  InputProps={{
                    sx: { borderRadius: 2 },
                    startAdornment: (
                      <InputAdornment position="start">
                        <Hash size={16} className="text-gray-400" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Box>

          {/* --- Section 2: Subcategories --- */}
          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Layers size={18} className="text-gray-500" />
                <Typography
                  variant="subtitle2"
                  fontWeight={600}
                  color="text.secondary"
                >
                  SUBCATEGORIES
                </Typography>
              </Stack>
              {/* Optional info tooltip */}
              <Tooltip title="Subcategories allow for finer product organization.">
                <Info size={16} className="text-gray-400 cursor-help" />
              </Tooltip>
            </Stack>

            <Stack spacing={2}>
              {subcategories.map((sub, index) => (
                <Grid
                  container
                  spacing={1.5}
                  alignItems="flex-start"
                  key={index}
                >
                  <Grid item xs={7}>
                    <TextField
                      label={index === 0 ? "Subcategory Name" : ""}
                      placeholder="e.g. Mobile Phones"
                      fullWidth
                      size="small"
                      value={sub.name}
                      onChange={(e) =>
                        handleSubChange(index, "name", e.target.value)
                      }
                      InputProps={{ sx: { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      label={index === 0 ? "Code" : ""}
                      placeholder="MOB"
                      fullWidth
                      size="small"
                      value={sub.code}
                      onChange={(e) =>
                        handleSubChange(index, "code", e.target.value)
                      }
                      error={subErrors[index]}
                      helperText={subErrors[index] ? "Taken" : ""}
                      inputProps={{ maxLength: 3 }}
                      InputProps={{ sx: { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid
                    item
                    xs={2}
                    display="flex"
                    justifyContent="center"
                    pt={index === 0 ? 0.5 : 0}
                  >
                    <IconButton
                      onClick={() => removeSubcategory(index)}
                      color="error"
                      size="small"
                      disabled={
                        subcategories.length === 1 && !sub.name && !sub.code
                      }
                      sx={{
                        mt: index === 0 ? 0.5 : 0,
                        bgcolor: "error.lighter",
                        "&:hover": { bgcolor: "error.light", color: "white" },
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
            </Stack>

            <Button
              onClick={addSubcategory}
              fullWidth
              variant="outlined"
              startIcon={<Plus size={18} />}
              sx={{
                mt: 2,
                borderStyle: "dashed",
                borderWidth: 1.5,
                borderRadius: 2,
                color: "text.secondary",
                "&:hover": {
                  borderWidth: 1.5,
                  borderColor: "primary.main",
                  color: "primary.main",
                  bgcolor: "primary.lighter",
                },
              }}
            >
              Add Subcategory
            </Button>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={onClose}
          size="large"
          sx={{ borderRadius: 2, color: "text.secondary" }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          size="large"
          disableElevation
          sx={{ borderRadius: 2, px: 4, fontWeight: 600 }}
        >
          Save Category
        </Button>
      </DialogActions>
    </Dialog>
  );
}
