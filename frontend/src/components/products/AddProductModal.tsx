/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  InputAdornment,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
  Box,
  Switch,
  FormControlLabel,
  Alert,
  Autocomplete,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getCategories } from "../../lib/api/categoryService";
import type { Product } from "../../lib/types/product";
import type { Category, Subcategory } from "../../lib/types/categoryTypes";
import {
  createProduct,
  updateProduct,
  fetchNextBarcode,
  fetchNextProductCode,
} from "../../lib/api/productService";
import { generateProductCode } from "../../utils/generateProductCode";
import {
  PackagePlus,
  Hash,
  Percent,
  Boxes,
  Tag,
  Warehouse,
  Image as ImageIcon,
  Save,
  Barcode,
  Upload,
  AlertTriangle,
  Scale,
  Ruler,
  Layers,
  ScanBarcode,
  Package,
} from "lucide-react";
import { FormField } from "../FormField";

type Mode = "add" | "edit";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
  initialData?: Partial<Product>;
  mode?: Mode;
};

// Update defaultForm to accept partial types or loose types for new categories
const defaultForm: Partial<Product> = {
  name: "",
  product_code: "",
  hsn: "",
  gst_rate: 0,
  mrp: 0,
  mop: 0,
  category: null,
  subcategory: null,
  storage_location: "Store",
  quantity: 0,
  description: "",
  brand: "",
  barcode: "",
  image_url: "",
  mfw_price: "",
  average_purchase_price: 0,
  low_stock_threshold: 5,
  size: "",
  weight: "",
  is_active: 1,
  tracking_type: "none",
};

const steps = ["Essential Details", "Inventory & Tracking", "Additional Info"];

export default function AddEditProductModal({
  open,
  onClose,
  onSuccess,
  initialData = {},
  mode = "add",
}: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<Partial<Product>>({
    ...defaultForm,
    ...initialData,
  });
  const [loading, setLoading] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Category[]>(
    [],
  );
  const [filteredSubcategories, setFilteredSubcategories] = useState<
    Subcategory[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  // Track if user is typing a new category (string input)
  const isNewCategory = typeof form.category === "string";
  const isNewSubcategory = typeof form.subcategory === "string";

  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setError(null);
      setForm(
        mode === "edit" ? { ...defaultForm, ...initialData } : defaultForm,
      );

      if (mode === "add") {
        setForm((prev) => ({ ...prev, barcode: "Loading..." }));
        fetchNextBarcode()
          .then((barcode) => handleChange("barcode", barcode))
          .catch(() => handleChange("barcode", "Error"));
      }
    }
  }, [open, mode]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categories = await getCategories();
        setAvailableCategories(categories);
        // If editing and has ID, filter subcats
        if (form.category && typeof form.category === "number") {
          const selected = categories.find(
            (cat: { id: number }) => cat.id === Number(form.category),
          );
          setFilteredSubcategories(selected?.subcategories || []);
        } else {
          setFilteredSubcategories([]);
        }
      } catch {
        toast.error("Failed to load categories");
      }
    };
    loadCategories();
  }, [form.category]); // Re-run if category changes (specifically if it becomes a number)

  const cached = localStorage.getItem("cached_products");
  const products: Product[] = cached
    ? (() => {
        try {
          const arr = JSON.parse(cached);
          return Array.isArray(arr) ? arr : [];
        } catch {
          return [];
        }
      })()
    : [];

  // Update Product Code Logic
  useEffect(() => {
    if (mode === "add") {
      // 1. If user is creating a NEW category or subcategory
      if (isNewCategory || isNewSubcategory) {
        setForm((prev) => ({ ...prev, product_code: "Generating..." }));
        // We can't fetch from backend because codes don't exist yet.
        // Backend will finalize this.
        return;
      }

      // 2. Standard flow (Existing IDs)
      if (
        typeof form.category === "number" &&
        typeof form.subcategory === "number"
      ) {
        const selectedCategory = availableCategories.find(
          (c) => c.id === form.category,
        );
        const selectedSubcategory = selectedCategory?.subcategories.find(
          (s) => s.id === form.subcategory,
        );

        if (selectedCategory && selectedSubcategory) {
          setForm((prev) => ({ ...prev, product_code: "Generating..." }));
          fetchNextProductCode(selectedCategory.code, selectedSubcategory.code)
            .then((code) => handleChange("product_code", code))
            .catch(() => handleChange("product_code", "Error"));
        }
      }
    }
  }, [
    form.category,
    form.subcategory,
    mode,
    availableCategories,
    isNewCategory,
    isNewSubcategory,
  ]);

  const handleChange = (key: keyof Product, value: any) => {
    setForm((prev) => {
      const newForm = { ...prev, [key]: value };

      // Client-side code generation logic (Fallback)
      if (
        !isNewCategory &&
        !isNewSubcategory &&
        ((key === "category" && value) || (key === "subcategory" && value))
      ) {
        const newCode = generateProductCode(
          typeof newForm.category === "number" ? newForm.category : null,
          typeof newForm.subcategory === "number" ? newForm.subcategory : null,
          availableCategories,
          products,
        );
        newForm.product_code = newCode;
      }
      return newForm;
    });
    if (error) setError(null);
  };

  const validateStep = (step: number) => {
    if (step === 0) {
      if (!form.name?.trim()) return "Product Name is required.";
      // Robust check for category: must be non-null ID or non-empty String
      if (
        form.category === null ||
        form.category === undefined ||
        form.category === ""
      )
        return "Category is required.";
      if (form.gst_rate === undefined || form.gst_rate === null)
        return "GST Rate is required.";

      // Relax product_code validation if we are in "New Category" mode,
      // as backend will generate it.
      if (!isNewCategory && !isNewSubcategory && !form.product_code)
        return "Product Code is required.";
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(activeStep);
    if (err) {
      setError(err);
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const finalPayload: any = {
        ...form,
        storage_location: form.storage_location || "Store",
        low_stock_threshold: form.low_stock_threshold || 5,
        hsn: form.hsn || "",
        tracking_type: form.tracking_type || "none",
      };

      let result;
      if (mode === "add") {
        result = await createProduct(finalPayload);
      } else {
        result = await updateProduct(form.id!, finalPayload);
      }

      if (!result) {
        toast.error("Failed to save product.");
        return;
      }

      onSuccess(result);
      setForm(defaultForm);
      localStorage.removeItem("cached_products");
      onClose();
      toast.success(mode === "add" ? "Product Created" : "Product Updated");
    } catch (e: any) {
      toast.error("Something went wrong: " + (e.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = async () => {
    if (!window.electron) {
      toast.error("Desktop features are not available.");
      return;
    }
    try {
      const originalPath =
        await window.electron.ipcRenderer.invoke("dialog:open-image");

      if (!originalPath) return;

      toast.loading("Saving image...");
      const result = await window.electron.ipcRenderer.invoke(
        "copy-product-image",
        originalPath,
      );

      if (result.success) {
        handleChange("image_url", result.fileName);
        toast.dismiss();
        toast.success("Image saved successfully!");
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || "Failed to save image.");
    }
  };

  // Helper to check if category is set (ID or String) for enabling subcategory
  const isCategorySet =
    form.category !== null &&
    form.category !== undefined &&
    form.category !== "";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ bgcolor: "primary.main", color: "white", pb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <PackagePlus color="white" />
          <Typography variant="h6" color="white">
            {mode === "add" ? "Add New Product" : "Edit Product"}
          </Typography>
        </Stack>
      </DialogTitle>

      <Box sx={{ width: "100%", px: 3, mt: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent sx={{ mt: 2, minHeight: "320px" }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2.5} mt={0.5}>
          {/* ---------------- STEP 1: ESSENTIAL DETAILS ---------------- */}
          {activeStep === 0 && (
            <>
              <Grid item xs={12} sm={4}>
                <FormField label="Product Name *">
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={form.name || ""}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Enter product name"
                  />
                </FormField>
              </Grid>

              {/* Category: Autocomplete with FreeSolo and onChange + onInputChange */}
              <Grid item xs={12} sm={4}>
                <FormField label="Category *">
                  <Autocomplete
                    freeSolo
                    options={availableCategories}
                    getOptionLabel={(option) =>
                      typeof option === "string" ? option : option.name
                    }
                    value={
                      typeof form.category === "number"
                        ? availableCategories.find(
                            (c) => c.id === form.category,
                          )
                        : (form.category as string) || null
                    }
                    // Selection Handler
                    onChange={(_e, newValue) => {
                      if (newValue && typeof newValue === "object") {
                        handleChange("category", newValue.id);
                        handleChange("subcategory", null); // Clear subcat on explicit change
                      } else if (newValue === null) {
                        handleChange("category", null);
                        handleChange("subcategory", null);
                      } else if (typeof newValue === "string") {
                        handleChange("category", newValue);
                        handleChange("subcategory", null);
                      }
                    }}
                    // Typing Handler (Critical for 'New' values not yet committed)
                    onInputChange={(_e, newInputValue, reason) => {
                      if (reason === "input" || reason === "clear") {
                        const match = availableCategories.find(
                          (c) =>
                            c.name.toLowerCase() ===
                            newInputValue.toLowerCase(),
                        );
                        if (match) {
                          handleChange("category", match.id);
                        } else {
                          handleChange(
                            "category",
                            newInputValue === "" ? null : newInputValue,
                          );
                        }
                        // If typing changes, subcategory context might be invalid
                        if (form.subcategory) handleChange("subcategory", null);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        size="small"
                        placeholder="Select or Type New"
                      />
                    )}
                  />
                </FormField>
              </Grid>

              {/* Subcategory: Autocomplete with FreeSolo */}
              <Grid item xs={12} sm={4}>
                <FormField label="Subcategory">
                  <Autocomplete
                    freeSolo
                    options={filteredSubcategories}
                    disabled={!isCategorySet} // Enable if category has ANY value (ID or String)
                    getOptionLabel={(option) =>
                      typeof option === "string" ? option : option.name
                    }
                    value={
                      typeof form.subcategory === "number"
                        ? filteredSubcategories.find(
                            (s) => s.id === form.subcategory,
                          )
                        : (form.subcategory as string) || null
                    }
                    onChange={(_e, newValue) => {
                      if (newValue && typeof newValue === "object") {
                        handleChange("subcategory", newValue.id);
                      } else if (newValue === null) {
                        handleChange("subcategory", null);
                      } else if (typeof newValue === "string") {
                        handleChange("subcategory", newValue);
                      }
                    }}
                    onInputChange={(_e, newInputValue, reason) => {
                      if (reason === "input" || reason === "clear") {
                        const match = filteredSubcategories.find(
                          (s) =>
                            s.name.toLowerCase() ===
                            newInputValue.toLowerCase(),
                        );
                        if (match) {
                          handleChange("subcategory", match.id);
                        } else {
                          handleChange(
                            "subcategory",
                            newInputValue === "" ? null : newInputValue,
                          );
                        }
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        size="small"
                        placeholder={
                          !isCategorySet
                            ? "Select Category First"
                            : "Select or Type New"
                        }
                      />
                    )}
                  />
                </FormField>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormField label="Product Code *">
                  <TextField
                    fullWidth
                    size="small"
                    value={form.product_code || ""}
                    onChange={(e) =>
                      handleChange("product_code", e.target.value)
                    }
                    placeholder={mode === "add" ? "Select category first" : ""}
                    helperText={
                      isNewCategory || isNewSubcategory
                        ? "Will be auto-generated by system"
                        : ""
                    }
                    InputProps={{
                      readOnly:
                        mode === "add" && !isNewCategory && !isNewSubcategory,
                      startAdornment: (
                        <InputAdornment position="start">
                          <Hash size={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormField label="HSN Code">
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={form.hsn || ""}
                    onChange={(e) => handleChange("hsn", e.target.value)}
                    placeholder="Enter HSN/SAC code"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Hash size={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormField label="Barcode (EAN)">
                  <TextField
                    fullWidth
                    size="small"
                    value={form.barcode || ""}
                    onChange={(e) => handleChange("barcode", e.target.value)}
                    placeholder="Auto-generated"
                    InputProps={{
                      readOnly: mode === "add",
                      startAdornment: (
                        <InputAdornment position="start">
                          <Barcode size={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormField>
              </Grid>

              <Grid item xs={12} sm={3}>
                <FormField label="MRP">
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    type="number"
                    value={form.mrp ?? ""}
                    onChange={(e) =>
                      handleChange("mrp", Number(e.target.value))
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">₹</InputAdornment>
                      ),
                    }}
                  />
                </FormField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormField label="Max. offer price MOP">
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    type="number"
                    value={form.mop ?? ""}
                    onChange={(e) =>
                      handleChange("mop", Number(e.target.value))
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">₹</InputAdornment>
                      ),
                    }}
                  />
                </FormField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormField label="MF/W Price">
                  <TextField
                    fullWidth
                    size="small"
                    type="text"
                    value={form.mfw_price ?? ""}
                    onChange={(e) => handleChange("mfw_price", e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">₹</InputAdornment>
                      ),
                    }}
                  />
                </FormField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormField label="GST Rate (%) *">
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    type="number"
                    value={form.gst_rate ?? ""}
                    onChange={(e) =>
                      handleChange("gst_rate", parseFloat(e.target.value))
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Percent size={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormField>
              </Grid>
            </>
          )}

          {/* ---------------- STEP 2: INVENTORY & TRACKING ---------------- */}
          {activeStep === 1 && (
            <>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 1 }}>
                  These fields have smart defaults. Review and change only if
                  required.
                </Alert>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormField label="Tracking Type">
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={form.tracking_type || "none"}
                    onChange={(e) =>
                      handleChange("tracking_type", e.target.value)
                    }
                    helperText="How do you want to track this item?"
                  >
                    <MenuItem value="none">
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Layers size={16} /> Standard (Quantity Only)
                      </Box>
                    </MenuItem>
                    <MenuItem value="batch">
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Package size={16} /> Batch Tracking (Expiry/Mfg)
                      </Box>
                    </MenuItem>
                    <MenuItem value="serial">
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <ScanBarcode size={16} /> Serialized (IMEI/Unique ID)
                      </Box>
                    </MenuItem>
                  </TextField>
                </FormField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormField label="Storage Location">
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={form.storage_location || ""}
                    onChange={(e) =>
                      handleChange("storage_location", e.target.value)
                    }
                    placeholder="e.g., Shelf A, Rack 2"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Warehouse size={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormField label="Opening Quantity">
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    type="number"
                    value={form.quantity ?? ""}
                    onChange={(e) =>
                      handleChange("quantity", Number(e.target.value))
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Boxes size={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormField label="Low Stock Threshold">
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={form.low_stock_threshold ?? ""}
                    onChange={(e) =>
                      handleChange(
                        "low_stock_threshold",
                        Number(e.target.value),
                      )
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AlertTriangle size={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormField>
              </Grid>
            </>
          )}

          {/* ---------------- STEP 3: ADDITIONAL INFO ---------------- */}
          {activeStep === 2 && (
            <>
              <Grid item xs={12} sm={4}>
                <FormField label="Brand">
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={form.brand || ""}
                    onChange={(e) => handleChange("brand", e.target.value)}
                    placeholder="e.g., Samsung, Apple"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Tag size={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormField label="Size">
                  <TextField
                    fullWidth
                    size="small"
                    value={form.size || ""}
                    onChange={(e) => handleChange("size", e.target.value)}
                    placeholder="e.g., L, 10x20cm"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Ruler size={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormField label="Weight">
                  <TextField
                    fullWidth
                    size="small"
                    value={form.weight || ""}
                    onChange={(e) => handleChange("weight", e.target.value)}
                    placeholder="e.g., 2.5kg"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Scale size={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormField label="Avg. Purchase Price">
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    type="number"
                    value={form.average_purchase_price ?? 0}
                    onChange={(e) =>
                      handleChange(
                        "average_purchase_price",
                        Math.round(Number(e.target.value) * 100) / 100,
                      )
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">₹</InputAdornment>
                      ),
                    }}
                  />
                </FormField>
              </Grid>

              <Grid item xs={12}>
                <FormField label="Image URL">
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={form.image_url || ""}
                    onChange={(e) => handleChange("image_url", e.target.value)}
                    placeholder="Paste image URL or upload a file..."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <ImageIcon size={18} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Upload from computer">
                            <IconButton onClick={handleUploadClick} edge="end">
                              <Upload size={18} />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormField>
              </Grid>
              <Grid item xs={12}>
                <FormField label="Description">
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    multiline
                    rows={2}
                    value={form.description || ""}
                    onChange={(e) =>
                      handleChange("description", e.target.value)
                    }
                  />
                </FormField>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(form.is_active)}
                      onChange={(e) =>
                        handleChange("is_active", e.target.checked)
                      }
                      color="primary"
                    />
                  }
                  label="Product is Active"
                />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Box sx={{ flex: "1 1 auto" }} />

        <Button disabled={activeStep === 0} onClick={handleBack} sx={{ mr: 1 }}>
          Back
        </Button>

        {activeStep === steps.length - 1 ? (
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={<Save size={18} />}
          >
            {loading
              ? "Saving..."
              : mode === "add"
                ? "Finish & Add"
                : "Finish & Update"}
          </Button>
        ) : (
          <Button onClick={handleNext} variant="contained">
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
