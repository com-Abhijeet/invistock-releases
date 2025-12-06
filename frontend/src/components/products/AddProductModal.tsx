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

const defaultForm: Product = {
  name: "",
  product_code: "",
  hsn: "0",
  gst_rate: 0,
  mrp: 0,
  mop: 0,
  category: null,
  subcategory: null,
  storage_location: "",
  quantity: 0,
  description: "",
  brand: "",
  barcode: "",
  image_url: "",
  mfw_price: "",
  average_purchase_price: 0,
  low_stock_threshold: 0,
  size: "",
  weight: "",
  is_active: 1,
};

export default function AddEditProductModal({
  open,
  onClose,
  onSuccess,
  initialData = {},
  mode = "add",
}: Props) {
  const [form, setForm] = useState<Partial<Product>>(
    initialData || defaultForm
  );
  const [loading, setLoading] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Category[]>(
    []
  );
  const [filteredSubcategories, setFilteredSubcategories] = useState<
    Subcategory[]
  >([]);

  // ✅ EFFECT 1: Initialize form state when modal opens or initialData changes
  useEffect(() => {
    if (open) {
      // Set the form data from initialData in edit mode, or default in add mode
      setForm(mode === "edit" ? initialData : defaultForm);

      // If in "add" mode, immediately fetch the next available barcode
      if (mode === "add") {
        setForm((prev) => ({ ...prev, barcode: "Loading..." }));
        fetchNextBarcode()
          .then((barcode) => handleChange("barcode", barcode))
          .catch(() => handleChange("barcode", "Error"));
      }
    }
  }, [open, mode]);

  // ✅ EFFECT 2: Load categories and set subcategories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categories = await getCategories();
        setAvailableCategories(categories);
        if (form.category) {
          const selected = categories.find(
            (cat: { id: number }) => cat.id === Number(form.category)
          );
          setFilteredSubcategories(selected?.subcategories || []);
        }
      } catch {
        toast.error("Failed to load categories");
      }
    };
    loadCategories();
  }, [form.category]);

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

  // ✅ EFFECT 3: Fetch the product code when category and subcategory are selected
  useEffect(() => {
    // Only run this logic in "add" mode
    if (mode === "add" && form.category && form.subcategory) {
      const selectedCategory = availableCategories.find(
        (c) => c.id === form.category
      );
      const selectedSubcategory = selectedCategory?.subcategories.find(
        (s) => s.id === form.subcategory
      );

      if (selectedCategory && selectedSubcategory) {
        setForm((prev) => ({ ...prev, product_code: "Generating..." }));
        fetchNextProductCode(selectedCategory.code, selectedSubcategory.code)
          .then((code) => handleChange("product_code", code))
          .catch(() => handleChange("product_code", "Error"));
      }
    }
  }, [form.category, form.subcategory, mode, availableCategories]);

  const handleChange = (key: keyof Product, value: any) => {
    setForm((prev) => {
      const newForm = { ...prev, [key]: value };

      if ((key === "category" && value) || (key === "subcategory" && value)) {
        // Use the imported utility function
        const newCode = generateProductCode(
          newForm.category || null,
          newForm.subcategory || null,
          availableCategories,
          products
        );
        newForm.product_code = newCode;
      }

      return newForm;
    });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.category || form.gst_rate == null) {
      toast.error("Name, Category, HSN, and GST Rate are required.");
      return;
    }

    setLoading(true);
    try {
      let result;
      if (mode === "add") {
        result = await createProduct(form as Product);
      } else {
        result = await updateProduct(form.id!, form as Product);
      }

      if (!result) {
        toast.error("Failed to save product.");
        return;
      }

      toast.success(
        `Product ${mode === "add" ? "added" : "updated"} successfully`
      );
      onSuccess(result);
      setForm(defaultForm);
      localStorage.removeItem("cached_products");
      onClose();
    } catch {
      toast.error("Something went wrong");
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
      // Step 1: Ask the main process to open the file dialog
      const originalPath = await window.electron.ipcRenderer.invoke(
        "dialog:open-image"
      );

      // If the user cancelled the dialog, do nothing
      if (!originalPath) return;

      // Step 2: Send the path we received back to the main process to be copied
      toast.loading("Saving image...");
      const result = await window.electron.ipcRenderer.invoke(
        "copy-product-image",
        originalPath
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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <PackagePlus />
          <Typography variant="h6">
            {mode === "add" ? "Add New Product" : "Edit Product"}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2.5} mt={0.5}>
          {/* --- Section 1: Naming & Category --- */}
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
          <Grid item xs={12} sm={4}>
            <FormField label="Category *">
              <TextField
                select
                fullWidth
                size="small"
                variant="outlined"
                value={form.category ?? ""}
                onChange={(e) => {
                  const catId = Number(e.target.value);
                  handleChange("category", catId);
                  const selectedCat = availableCategories.find(
                    (cat) => cat.id === catId
                  );
                  setFilteredSubcategories(selectedCat?.subcategories || []);
                  handleChange("subcategory", null);
                }}
              >
                <MenuItem value="">Select Category</MenuItem>
                {availableCategories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </TextField>
            </FormField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormField label="Subcategory">
              <TextField
                select
                fullWidth
                size="small"
                variant="outlined"
                value={form.subcategory ?? ""}
                onChange={(e) =>
                  handleChange("subcategory", Number(e.target.value))
                }
                disabled={!form.category}
              >
                <MenuItem value="">Select Subcategory</MenuItem>
                {filteredSubcategories.map((sub) => (
                  <MenuItem key={sub.id} value={sub.id}>
                    {sub.name}
                  </MenuItem>
                ))}
              </TextField>
            </FormField>
          </Grid>

          {/* --- Section 2: Codes & Identification --- */}
          <Grid item xs={12} sm={4}>
            <FormField label="Product Code *">
              <TextField
                fullWidth
                size="small"
                value={form.product_code || ""}
                onChange={(e) => handleChange("product_code", e.target.value)}
                placeholder={mode === "add" ? "Select category first" : ""}
                // ✅ Make the field read-only in 'add' mode to prevent manual changes
                InputProps={{
                  readOnly: mode === "add",
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
                // ✅ Make the field read-only in 'add' mode
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

          {/* --- Section 3: Pricing & Tax --- */}
          <Grid item xs={12} sm={3}>
            <FormField label="MRP">
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                type="number"
                value={form.mrp ?? ""}
                onChange={(e) => handleChange("mrp", Number(e.target.value))}
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
                onChange={(e) => handleChange("mop", Number(e.target.value))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                }}
              />
            </FormField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormField label="Avg. Purchase Price">
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                type="number"
                value={form.average_purchase_price ?? 0}
                onChange={(e) =>
                  handleChange("average_purchase_price", Number(e.target.value))
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

          {/* --- Section 4: Inventory --- */}
          {/* ✅ ADDED: Low Stock Threshold */}
          <Grid item xs={12} sm={6}>
            <FormField label="Low Stock Threshold">
              <TextField
                fullWidth
                size="small"
                type="number"
                value={form.low_stock_threshold ?? ""}
                onChange={(e) =>
                  handleChange("low_stock_threshold", Number(e.target.value))
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
          {/* ✅ ADDED: Size */}
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
          {/* ✅ ADDED: Weight */}
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
          <Grid item xs={12} sm={4}>
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

          {/* --- Section 5: Other Details --- */}
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
                        {/* ✅ The button now calls our new handler */}
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
                onChange={(e) => handleChange("description", e.target.value)}
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
          color="primary"
          disabled={loading}
          startIcon={<Save size={18} />}
        >
          {loading
            ? "Saving..."
            : mode === "add"
            ? "Add Product"
            : "Update Product"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
