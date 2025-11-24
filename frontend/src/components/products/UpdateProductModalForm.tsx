"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useState } from "react";
import toast from "react-hot-toast";
import { updateProduct } from "../../lib/api/productService";
import type { Product } from "../../lib/types/product";

type UpdateProductModalProps = {
  open: boolean;
  onClose: () => void;
  product: Product;
  onSuccess: (updatedProduct: Product) => void;
};

export default function UpdateProductModalForm({
  open,
  onClose,
  product,
  onSuccess,
}: UpdateProductModalProps) {
  const [form, setForm] = useState<Product>(product);
  const [loading, setLoading] = useState(false);

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

  const getOptions = (field: keyof Product) =>
    Array.from(new Set(products.map((p) => p[field]).filter(Boolean)));

  const handleChange = (key: keyof Product, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.category || !form.product_code) {
      toast.error("Name, Category, and product_code are required.");
      return;
    }

    setLoading(true);
    try {
      const updatedProduct = await updateProduct(product.id || 0, form);
      toast.success("Product updated successfully!");

      const cached = localStorage.getItem("cached_products");
      let products = [];
      if (cached) {
        try {
          products = JSON.parse(cached);
          if (!Array.isArray(products)) products = [];
        } catch {
          products = [];
        }
      }
      const updatedList = products.map((p: Product) =>
        p.id === updatedProduct.id ? updatedProduct : p
      );
      localStorage.setItem("cached_products", JSON.stringify(updatedList));

      onSuccess(updatedProduct);
      onClose();
    } catch {
      toast.error("Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Update Product</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {(
            [
              "name",
              "product_code",
              "product_code",
              "category",
              "subcategory",
              "storage_location",
              "brand",
              "description",
            ] as (keyof Product)[]
          ).map((field) => (
            <Grid item xs={12} sm={6} key={field}>
              <Autocomplete
                freeSolo
                options={[...getOptions(field), "Other"]}
                value={form[field] || ""}
                onChange={(_, value) => {
                  setForm((prev) => ({
                    ...prev,
                    [field]: value === "Other" ? "" : (value as string),
                  }));
                }}
                onInputChange={(_, value) =>
                  setForm((prev) => ({ ...prev, [field]: value }))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={field
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                    multiline={field === "description"}
                    rows={field === "description" ? 2 : undefined}
                  />
                )}
              />
            </Grid>
          ))}

          <Grid container item xs={12} spacing={2}>
            {(["mrp", "mop", "quantity"] as const).map((field) => (
              <Grid item xs={4} key={field}>
                <TextField
                  fullWidth
                  label={field.toUpperCase()}
                  type="number"
                  value={form[field] || ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [field]: e.target.value }))
                  }
                />
              </Grid>
            ))}
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="is-active-label">Is Active</InputLabel>
              <Select
                labelId="is-active-label"
                label="Is Active"
                value={
                  typeof form.is_active === "boolean"
                    ? form.is_active
                      ? 1
                      : 0
                    : form.is_active ?? 1
                }
                onChange={(e) =>
                  handleChange(
                    "is_active",
                    Number(e.target.value) === 1 ? 1 : 0
                  )
                }
              >
                <MenuItem value={1}>Active</MenuItem>
                <MenuItem value={0}>Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading}
        >
          {loading ? "Updating..." : "Update Product"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
