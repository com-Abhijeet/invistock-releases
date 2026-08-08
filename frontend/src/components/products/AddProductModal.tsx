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
  ListSubheader,
  CircularProgress,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useState, useEffect, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import { getCategories } from "../../lib/api/categoryService";
import type { Product } from "../../lib/types/product";
import type { Category, Subcategory } from "../../lib/types/categoryTypes";
import {
  createProduct,
  updateProduct,
  fetchNextBarcode,
  fetchNextProductCode,
  lookupBarcodeProduct,
} from "../../lib/api/productService";
import { generateProductCode } from "../../utils/generateProductCode";
import {
  PackagePlus,
  Hash,
  Percent,
  Tag,
  Image as ImageIcon,
  Save,
  Barcode,
  Upload,
  AlertTriangle,
  Scale,
  Ruler,
} from "lucide-react";
import { FormField } from "../FormField";
import { UNIT_FAMILIES, getUnitFamily } from "../../lib/services/unitService";

type Mode = "add" | "edit";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
  initialData?: Partial<Product>;
  mode?: Mode;
};

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
  tracking_type: "batch",
  base_unit: "pcs",
  secondary_unit: "",
  conversion_factor: 1,
};

const steps = ["Required details", "Optional details"];

// Helper to get conversion multiplier for pricing
// e.g. If tracking in 'g' but pricing in 'kg', multiplier is 1000
const getPricingMultiplier = (baseUnit: string, pricingUnit: string) => {
  if (baseUnit === pricingUnit) return 1;
  // Weight
  if (baseUnit === "g" && pricingUnit === "kg") return 1000;
  if (baseUnit === "mg" && pricingUnit === "g") return 1000;
  if (baseUnit === "kg" && pricingUnit === "tonne") return 1000;
  // Volume
  if (baseUnit === "ml" && pricingUnit === "l") return 1000;
  // Length
  if (baseUnit === "cm" && pricingUnit === "m") return 100;
  if (baseUnit === "mm" && pricingUnit === "m") return 1000;

  return 1; // Default fallback
};

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
  const [cachedPreferences, setCachedPreferences] = useState(() => {
    if (typeof window === "undefined") return {} as Record<string, string>;
    try {
      return JSON.parse(
        localStorage.getItem("product_modal_preferences") || "{}",
      ) as Record<string, string>;
    } catch {
      return {} as Record<string, string>;
    }
  });
  const [filteredSubcategories, setFilteredSubcategories] = useState<
    Subcategory[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  // State for Unit Toggle
  const [hasSecondaryUnit, setHasSecondaryUnit] = useState(false);
  const [pricingUnit, setPricingUnit] = useState<string>("pcs");
  const [lookupBarcode, setLookupBarcode] = useState("");
  const [barcodeLookupStatus, setBarcodeLookupStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  // Ref map for keyboard navigation
  const fieldRefs = useRef<{
    [key: string]: HTMLInputElement | HTMLElement | null;
  }>({});

  const isNewCategory = typeof form.category === "string";
  const isNewSubcategory = typeof form.subcategory === "string";

  // Calculate pricing multiplier
  // If base is 'g' and pricing is 'kg', multiplier is 1000.
  // DB stores price per 'g' (e.g. 0.06), UI shows price per 'kg' (e.g. 60)
  const pricingMultiplier = useMemo(() => {
    return getPricingMultiplier(form.base_unit || "pcs", pricingUnit);
  }, [form.base_unit, pricingUnit]);

  // When base unit changes, try to set a smart default for pricing unit
  // e.g. If user selects 'g', default pricing to 'kg' because that's standard for Kirana
  useEffect(() => {
    if (form.base_unit) {
      if (form.base_unit === "g") setPricingUnit("kg");
      else if (form.base_unit === "ml") setPricingUnit("l");
      else if (form.base_unit === "cm") setPricingUnit("m");
      else setPricingUnit(form.base_unit);
    }
  }, [form.base_unit]);

  // Ensure pricing unit stays valid if category changes
  useEffect(() => {
    const baseFamily = getUnitFamily(form.base_unit || "pcs");
    const pricingFamily = getUnitFamily(pricingUnit);
    if (baseFamily && pricingFamily && baseFamily !== pricingFamily) {
      setPricingUnit(form.base_unit || "pcs");
    }
  }, [form.base_unit, pricingUnit]);

  const fieldOrder = [
    "name",
    "category",
    "subcategory",
    "tracking_type",
    "barcode",
    "quantity",
    "storage_location",
    "base_unit",
    "pricing_unit",
    "mrp",
    "mop",
    "mfw_price",
    "hsn",
    "gst_rate",
    "secondary_unit",
    "conversion_factor",
    "brand",
    "size",
    "weight",
    "average_purchase_price",
    "image_url",
    "description",
    "low_stock_threshold",
  ];

  const focusField = (id: string) => {
    const el = fieldRefs.current[id];
    if (el) {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        (el as HTMLInputElement).focus();
        (el as HTMLInputElement).select?.();
      } else {
        el.focus();
      }
    }
  };

  const getFieldNavigationTarget = (
    currentId: string,
    direction: "next" | "prev",
  ) => {
    const currentIndex = fieldOrder.indexOf(currentId);
    if (currentIndex === -1) return null;
    const targetIndex =
      direction === "next" ? currentIndex + 1 : currentIndex - 1;
    return fieldOrder[targetIndex] || null;
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    currentId: string,
    nextId: string | null,
  ) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA") return;

    if (e.key === "Enter") {
      e.preventDefault();
      if (nextId) {
        focusField(nextId);
      } else {
        const fallbackTarget = getFieldNavigationTarget(currentId, "next");
        if (fallbackTarget) {
          focusField(fallbackTarget);
        } else if (activeStep < steps.length - 1) {
          handleNext();
        }
      }
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      const fallbackTarget =
        nextId || getFieldNavigationTarget(currentId, "next");
      if (fallbackTarget) focusField(fallbackTarget);
      return;
    }

    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      const fallbackTarget = getFieldNavigationTarget(currentId, "prev");
      if (fallbackTarget) focusField(fallbackTarget);
    }
  };

  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setError(null);
      setLookupBarcode("");
      setBarcodeLookupStatus("idle");
      const preferences: Record<string, string> = {
        tracking_type: cachedPreferences.tracking_type || "batch",
        storage_location: cachedPreferences.storage_location || "Store",
        gst_rate: cachedPreferences.gst_rate || "0",
      };
      const baseForm =
        mode === "edit"
          ? { ...defaultForm, ...initialData }
          : { ...defaultForm };
      const mergedForm = {
        ...baseForm,
        tracking_type: (initialData?.tracking_type ||
          preferences.tracking_type ||
          baseForm.tracking_type ||
          "batch") as any,
        storage_location: (initialData?.storage_location ||
          preferences.storage_location ||
          baseForm.storage_location ||
          "Store") as any,
        gst_rate: (initialData?.gst_rate ??
          Number(preferences.gst_rate ?? baseForm.gst_rate ?? 0)) as any,
      };
      setForm(mergedForm);

      // Check if secondary unit exists to toggle switch
      if (initialData?.secondary_unit) {
        setHasSecondaryUnit(true);
      } else {
        setHasSecondaryUnit(false);
      }

      // Initialize pricing unit to base unit (smart effect above will upgrade it to kg/l if needed)
      if (initialData?.base_unit) {
        setPricingUnit(initialData.base_unit);
      }

      if (mode === "add") {
        setForm((prev) => ({ ...prev, barcode: "Loading..." }));
        fetchNextBarcode()
          .then((barcode) => handleChange("barcode", barcode))
          .catch(() => handleChange("barcode", "Error"));
      }

      // Auto focus first field
      setTimeout(() => focusField("name"), 100);
    }
  }, [open, mode]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categories = await getCategories();
        setAvailableCategories(categories);
        if (form.category && typeof form.category === "number") {
          const selected = categories.find(
            (cat: { id: number }) => cat.id === Number(form.category),
          );
          setFilteredSubcategories(selected?.subcategories || []);
        } else if (typeof form.category === "string") {
          const normalizedCategoryName = form.category.trim().toLowerCase();
          const selected = categories.find(
            (cat: { name: string }) =>
              cat.name.toLowerCase() === normalizedCategoryName,
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

  useEffect(() => {
    if (mode === "add") {
      if (isNewCategory || isNewSubcategory) {
        setForm((prev) => ({ ...prev, product_code: "Generating..." }));
        return;
      }
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

  const persistPreference = (
    key: "tracking_type" | "storage_location" | "gst_rate",
    value: string | number,
  ) => {
    const nextPreferences = { ...cachedPreferences, [key]: String(value) };
    setCachedPreferences(nextPreferences);
    localStorage.setItem(
      "product_modal_preferences",
      JSON.stringify(nextPreferences),
    );
  };

  const ensureCategoryOption = (
    categoryName?: string | null,
    subcategoryName?: string | null,
  ) => {
    const safeCategory = categoryName?.trim();
    const safeSubcategory = subcategoryName?.trim() || "Misc";
    if (!safeCategory) return;

    setAvailableCategories((prev) => {
      const existingCategoryIndex = prev.findIndex(
        (entry) => entry.name.toLowerCase() === safeCategory.toLowerCase(),
      );
      if (existingCategoryIndex >= 0) {
        const nextCategories = [...prev];
        const existingCategory = nextCategories[existingCategoryIndex];
        const subExists = existingCategory.subcategories.some(
          (entry) =>
            entry.name.toLowerCase() === safeSubcategory?.toLowerCase(),
        );
        if (safeSubcategory && !subExists) {
          nextCategories[existingCategoryIndex] = {
            ...existingCategory,
            subcategories: [
              ...existingCategory.subcategories,
              {
                name: safeSubcategory,
                code:
                  safeSubcategory
                    .slice(0, 3)
                    .toUpperCase()
                    .replace(/[^A-Z]/g, "X") + "001",
              },
            ],
          };
        }
        return nextCategories;
      }

      return [
        ...prev,
        {
          name: safeCategory,
          code:
            safeCategory
              .slice(0, 3)
              .toUpperCase()
              .replace(/[^A-Z]/g, "X") + "001",
          subcategories: safeSubcategory
            ? [
                {
                  name: safeSubcategory,
                  code:
                    safeSubcategory
                      .slice(0, 3)
                      .toUpperCase()
                      .replace(/[^A-Z]/g, "X") + "001",
                },
              ]
            : [],
        },
      ];
    });
  };

  const handleChange = (key: keyof Product, value: any) => {
    setForm((prev) => {
      const newForm = { ...prev, [key]: value };
      if (key === "tracking_type" && value) {
        persistPreference("tracking_type", value as string);
      }
      if (key === "storage_location" && value) {
        persistPreference("storage_location", value as string);
      }
      if (key === "gst_rate" && value !== undefined && value !== null) {
        persistPreference("gst_rate", value as number);
      }
      if (key === "category") {
        if (typeof value === "string") {
          newForm.subcategory = value;
        } else {
          newForm.subcategory = null;
        }
      }
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
        newCode && (newForm.product_code = newCode);
      }
      return newForm;
    });
    if (error) setError(null);
  };

  const normalizeNumericValue = (value: any) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/[^0-9.]/g, "");
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const inferCategoryHints = (data: any) => {
    const rawCategory =
      data?.category || data?.category_name || data?.product_type || "";
    const rawSubcategory = data?.subcategory || data?.product_subcategory || "";

    const parts = String(rawCategory)
      .split(/[>:/|]/)
      .map((part) => part.trim())
      .filter(Boolean);

    return {
      category: parts[0] || "",
      subcategory: parts[1] || rawSubcategory || "",
    };
  };

  const handleBarcodeLookup = async (providedCode?: string) => {
    const barcode = (providedCode ?? lookupBarcode ?? form.barcode ?? "")
      .toString()
      .trim();
    if (!barcode) {
      toast.error("Enter a barcode first.");
      return;
    }

    setLookupBarcode(barcode);
    setBarcodeLookupStatus("loading");
    try {
      const data = await lookupBarcodeProduct(barcode);
      if (!data) {
        setBarcodeLookupStatus("error");
        toast.error("No product matched that barcode.");
        return;
      }

      const categoryHints = inferCategoryHints(data);
      const mrpValue = normalizeNumericValue(
        data?.mrp ?? data?.price ?? data?.retail_price ?? data?.retailPrice,
      );
      const gstValue = normalizeNumericValue(
        data?.gst_rate ?? data?.gst ?? data?.tax_rate ?? data?.tax,
      );
      const hsnValue =
        data?.hsn ||
        data?.hsn_code ||
        data?.hsn_sac ||
        data?.hsn_code_sac ||
        "";

      if (categoryHints.category || categoryHints.subcategory) {
        ensureCategoryOption(categoryHints.category, categoryHints.subcategory);
      }

      setForm((prev) => ({
        ...prev,
        barcode,
        name: data.name || prev.name || "",
        brand: data.brand || prev.brand || "",
        description: data.description || prev.description || "",
        image_url: data.image_url || prev.image_url || "",
        size: data.size || prev.size || "",
        weight: data.weight || prev.weight || "",
        mrp: mrpValue ?? prev.mrp ?? 0,
        hsn: hsnValue || prev.hsn || "",
        gst_rate: gstValue ?? prev.gst_rate ?? 0,
        category: categoryHints.category || (prev.category as any) || null,
        subcategory:
          categoryHints.subcategory || (prev.subcategory as any) || null,
      }));
      setBarcodeLookupStatus("success");
      toast.success("Product details filled in.");
    } catch (err: any) {
      setBarcodeLookupStatus("error");
      toast.error(err?.message || "Unable to look up barcode");
    }
  };

  // Wrapper for price changes to handle multiplier
  const handlePriceChange = (key: keyof Product, uiValue: string) => {
    const numVal = parseFloat(uiValue);
    if (isNaN(numVal)) {
      handleChange(key, 0);
      return;
    }
    // Store value = UI Value / Multiplier
    // e.g. UI says 60/kg. Multiplier is 1000. Stored is 0.06/g.
    handleChange(key, numVal / pricingMultiplier);
  };

  const validateStep = (step: number) => {
    if (step === 0) {
      if (!form.name?.trim()) return "Product Name is required.";
      if (
        form.category === null ||
        form.category === undefined ||
        form.category === ""
      )
        return "Category is required.";
      if (form.gst_rate === undefined || form.gst_rate === null)
        return "GST Rate is required.";
      if (!form.base_unit) return "Base Unit is required.";
      if (hasSecondaryUnit) {
        if (!form.secondary_unit) return "Secondary Unit name is required.";
        if (!form.conversion_factor || form.conversion_factor <= 0)
          return "Valid conversion factor is required.";
      }
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
    setTimeout(() => {
      if (activeStep === 0) focusField("low_stock_threshold");
      if (activeStep === 1) focusField("low_stock_threshold");
    }, 50);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    const err = validateStep(activeStep);
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    try {
      const finalPayload: any = {
        ...form,
        storage_location: form.storage_location || "Store",
        low_stock_threshold: form.low_stock_threshold || 5,
        hsn: form.hsn || "",
        tracking_type: form.tracking_type || "none",
        base_unit: form.base_unit || "pcs",
        secondary_unit: hasSecondaryUnit ? form.secondary_unit : null,
        conversion_factor: hasSecondaryUnit
          ? Number(form.conversion_factor)
          : 1,
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

  const isCategorySet =
    form.category !== null &&
    form.category !== undefined &&
    form.category !== "";
  const isTrackedProduct =
    form.tracking_type === "batch" || form.tracking_type === "serial";
  const showTrackedOpeningWarning =
    isTrackedProduct && Number(form.quantity || 0) > 0;
  const shouldShowPricingFields =
    !isTrackedProduct || Number(form.quantity || 0) > 0;

  // Helper to get allowed pricing units based on selected base unit family
  const getAllowedPricingUnits = () => {
    const familyKey = getUnitFamily(form.base_unit || "pcs");
    if (familyKey && UNIT_FAMILIES[familyKey as keyof typeof UNIT_FAMILIES]) {
      return UNIT_FAMILIES[familyKey as keyof typeof UNIT_FAMILIES].units;
    }
    return [{ value: form.base_unit || "pcs", label: form.base_unit || "pcs" }];
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xl"
      PaperProps={{ sx: { maxHeight: { md: "calc(100vh - 32px)" } } }}
    >
      <DialogTitle sx={{ bgcolor: "text.primary", color: "white", py: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <PackagePlus color="white" />
          <Typography variant="h6" color="white">
            {mode === "add" ? "Add New Product" : "Edit Product"}
          </Typography>
        </Stack>
      </DialogTitle>

      <Box sx={{ width: "100%", px: 3, mt: 1.5 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent
        sx={{
          mt: 1,
          minHeight: { md: "390px" },
          overflowY: { xs: "auto", md: "hidden" },
          px: { xs: 2, md: 3 },
          py: 1,
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Alert
          severity="info"
          sx={{
            mb: 1,
            borderRadius: 2,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            color: "text.primary",
            "& .MuiAlert-icon": { color: "info.main" },
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Typography variant="body2" sx={{ whiteSpace: { sm: "nowrap" } }}>
              Scan a barcode to fill details
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ flex: 1, minWidth: { sm: 360 } }}
            >
              <TextField
                size="small"
                placeholder="Lookup barcode"
                value={lookupBarcode}
                onChange={(e) => setLookupBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleBarcodeLookup(lookupBarcode);
                  }
                }}
                sx={{ flex: 1 }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={() => void handleBarcodeLookup(lookupBarcode)}
                disabled={barcodeLookupStatus === "loading"}
                startIcon={
                  barcodeLookupStatus === "loading" ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Barcode size={16} />
                  )
                }
              >
                {barcodeLookupStatus === "loading" ? "Looking up..." : "Lookup"}
              </Button>
            </Stack>
          </Stack>
        </Alert>

        <Grid container spacing={1.5} mt={0.5}>
          {activeStep === 0 && (
            <>
              <Grid item xs={12}>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  color="text.secondary"
                >
                  Product details
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormField label="Product Name *">
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={form.name || ""}
                    inputRef={(el) => (fieldRefs.current["name"] = el)}
                    onKeyDown={(e) => handleKeyDown(e, "name", "category")}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Enter product name"
                  />
                </FormField>
              </Grid>

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
                    onChange={(_e, newValue) => {
                      if (newValue && typeof newValue === "object") {
                        handleChange("category", newValue.id);
                        handleChange("subcategory", null);
                      } else if (newValue === null) {
                        handleChange("category", null);
                        handleChange("subcategory", null);
                      } else if (typeof newValue === "string") {
                        handleChange("category", newValue);
                        handleChange("subcategory", null);
                      }
                    }}
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
                        if (form.subcategory) handleChange("subcategory", null);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        size="small"
                        placeholder="Select or Type New"
                        inputRef={(el) => (fieldRefs.current["category"] = el)}
                        // onKeyDown={(e) => {
                        //   // Intercept Enter to move to subcategory
                        //   if (e.key === "Enter") {
                        //     e.preventDefault();
                        //     handleKeyDown(e, "category", "subcategory");
                        //     return;
                        //   }
                        //   // Prevent custom form navigation when using Arrow keys inside the dropdown list
                        //   if (
                        //     e.key === "ArrowDown" ||
                        //     e.key === "ArrowUp" ||
                        //     e.key === "ArrowRight" ||
                        //     e.key === "ArrowLeft"
                        //   ) {
                        //     e.stopPropagation();
                        //   }
                        // }}
                      />
                    )}
                  />
                </FormField>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormField label="Subcategory">
                  <Autocomplete
                    freeSolo
                    options={filteredSubcategories}
                    disabled={!isCategorySet}
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
                        inputRef={(el) =>
                          (fieldRefs.current["subcategory"] = el)
                        }
                        // onKeyDown={(e) => {
                        //   // Intercept Enter to move to tracking_type
                        //   if (e.key === "Enter") {
                        //     e.preventDefault();
                        //     handleKeyDown(e, "subcategory", "tracking_type");
                        //     return;
                        //   }
                        //   // Prevent custom form navigation when using Arrow keys inside the dropdown list
                        //   if (
                        //     e.key === "ArrowDown" ||
                        //     e.key === "ArrowUp" ||
                        //     e.key === "ArrowRight" ||
                        //     e.key === "ArrowLeft"
                        //   ) {
                        //     e.stopPropagation();
                        //   }
                        // }}
                      />
                    )}
                  />
                </FormField>
              </Grid>

              <Grid item xs={12}>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  color="text.secondary"
                >
                  Inventory
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormField label="Batch Tracking">
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={form.tracking_type || "none"}
                    inputRef={(el) => (fieldRefs.current["tracking_type"] = el)}
                    onKeyDown={(e) =>
                      handleKeyDown(e, "tracking_type", "barcode")
                    }
                    onChange={(e) =>
                      handleChange("tracking_type", e.target.value)
                    }
                  >
                    <MenuItem value="none">Standard</MenuItem>
                    <MenuItem value="batch">Batch Tracking</MenuItem>
                    <MenuItem value="serial">Serialized</MenuItem>
                  </TextField>
                </FormField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormField label="HSN Code">
                  <TextField
                    fullWidth
                    size="small"
                    value={form.hsn || ""}
                    inputRef={(el) => (fieldRefs.current["hsn"] = el)}
                    onKeyDown={(e) => handleKeyDown(e, "hsn", "barcode")}
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
              <Grid item xs={12} sm={3}>
                <FormField label="Barcode (EAN/UPC)">
                  <TextField
                    fullWidth
                    size="small"
                    value={form.barcode || ""}
                    inputRef={(el) => (fieldRefs.current["barcode"] = el)}
                    placeholder="Scan or type barcode"
                    onChange={(e) => handleChange("barcode", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleBarcodeLookup();
                        focusField("quantity");
                        return;
                      }
                      handleKeyDown(e, "barcode", "quantity");
                    }}
                    InputProps={{
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
                <FormField
                  label={`Opening Quantity (${form.base_unit || "pcs"})`}
                >
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    type="number"
                    value={form.quantity ?? ""}
                    inputRef={(el) => (fieldRefs.current["quantity"] = el)}
                    onKeyDown={(e) =>
                      handleKeyDown(e, "quantity", "storage_location")
                    }
                    onChange={(e) =>
                      handleChange("quantity", Number(e.target.value))
                    }
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          {form.base_unit || "pcs"}
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormField label="Storage Location">
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={form.storage_location || ""}
                    inputRef={(el) =>
                      (fieldRefs.current["storage_location"] = el)
                    }
                    onKeyDown={(e) =>
                      handleKeyDown(e, "storage_location", "base_unit")
                    }
                    onChange={(e) =>
                      handleChange("storage_location", e.target.value)
                    }
                    placeholder="e.g., Shelf A"
                  />
                </FormField>
              </Grid>

              <Grid item xs={12} sm={3}>
                <FormField label="Stock Tracking Unit (Smallest) *">
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={form.base_unit || "pcs"}
                    onChange={(e) => handleChange("base_unit", e.target.value)}
                    inputRef={(el) => (fieldRefs.current["base_unit"] = el)}
                    onKeyDown={(e) =>
                      handleKeyDown(e, "base_unit", "pricing_unit")
                    }
                  >
                    {Object.entries(UNIT_FAMILIES).map(([key, family]) => [
                      <ListSubheader
                        key={`header-${key}`}
                        sx={{ fontWeight: "bold", color: "text.primary" }}
                      >
                        {family.label}
                      </ListSubheader>,
                      ...family.units.map((unit) => (
                        <MenuItem
                          key={unit.value}
                          value={unit.value}
                          sx={{ pl: 4 }}
                        >
                          {unit.label}
                        </MenuItem>
                      )),
                    ])}
                  </TextField>
                </FormField>
              </Grid>
              <Grid item xs={12}>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  color="text.secondary"
                >
                  Pricing
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormField label="Price Input Unit *">
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={pricingUnit}
                    onChange={(e) => setPricingUnit(e.target.value)}
                    inputRef={(el) => (fieldRefs.current["pricing_unit"] = el)}
                    onKeyDown={(e) => handleKeyDown(e, "pricing_unit", "mrp")}
                  >
                    {getAllowedPricingUnits().map((unit) => (
                      <MenuItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </FormField>
              </Grid>

              {showTrackedOpeningWarning && (
                <Grid item xs={12}>
                  <Alert
                    severity="warning"
                    sx={{
                      bgcolor: "background.paper",
                      border: "1px solid",
                      borderColor: "warning.main",
                      color: "text.primary",
                      "& .MuiAlert-icon": { color: "warning.main" },
                    }}
                  >
                    Tracked products with opening stock are best managed through
                    purchase vouchers so batch and serial history stays
                    accurate.
                  </Alert>
                </Grid>
              )}
              {shouldShowPricingFields && (
                <>
                  <Grid item xs={12} sm={3}>
                    <FormField label={`MRP (per ${pricingUnit})`}>
                      <TextField
                        fullWidth
                        size="small"
                        variant="outlined"
                        type="number"
                        value={form.mrp ? form.mrp * pricingMultiplier : ""}
                        inputRef={(el) => (fieldRefs.current["mrp"] = el)}
                        onKeyDown={(e) => handleKeyDown(e, "mrp", "mop")}
                        onChange={(e) =>
                          handlePriceChange("mrp", e.target.value)
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
                    <FormField label={`MOP (per ${pricingUnit})`}>
                      <TextField
                        fullWidth
                        size="small"
                        variant="outlined"
                        type="number"
                        value={form.mop ? form.mop * pricingMultiplier : ""}
                        inputRef={(el) => (fieldRefs.current["mop"] = el)}
                        onKeyDown={(e) => handleKeyDown(e, "mop", "gst_rate")}
                        onChange={(e) =>
                          handlePriceChange("mop", e.target.value)
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
                        inputRef={(el) => (fieldRefs.current["mfw_price"] = el)}
                        onKeyDown={(e) =>
                          handleKeyDown(e, "mfw_price", "gst_rate")
                        }
                        onChange={(e) =>
                          handleChange("mfw_price", e.target.value)
                        }
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">₹</InputAdornment>
                          ),
                        }}
                      />
                    </FormField>
                  </Grid>
                </>
              )}
              <Grid item xs={12} sm={3}>
                <FormField label="GST Rate (%) *">
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    type="number"
                    value={form.gst_rate ?? ""}
                    inputRef={(el) => (fieldRefs.current["gst_rate"] = el)}
                    onKeyDown={(e) => handleKeyDown(e, "gst_rate", null)}
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

          {activeStep === 1 && (
            <>
              <Grid item xs={12}>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  color="text.secondary"
                >
                  Packaging & additional details
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormField label="Has Bulk Packaging?">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={hasSecondaryUnit}
                        onChange={(e) => {
                          setHasSecondaryUnit(e.target.checked);
                          if (!e.target.checked) {
                            handleChange("secondary_unit", null);
                            handleChange("conversion_factor", 1);
                          } else {
                            setTimeout(() => focusField("secondary_unit"), 100);
                          }
                        }}
                      />
                    }
                    label={
                      hasSecondaryUnit
                        ? "Yes, sell in bulk too"
                        : "No, single unit only"
                    }
                  />
                </FormField>
              </Grid>
              {hasSecondaryUnit && (
                <>
                  <Grid item xs={12} sm={4}>
                    <FormField label="Secondary Unit Name *">
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="e.g. Box"
                        value={form.secondary_unit || ""}
                        onChange={(e) =>
                          handleChange("secondary_unit", e.target.value)
                        }
                        inputRef={(el) =>
                          (fieldRefs.current["secondary_unit"] = el)
                        }
                        onKeyDown={(e) =>
                          handleKeyDown(
                            e,
                            "secondary_unit",
                            "conversion_factor",
                          )
                        }
                      />
                    </FormField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormField
                      label={`Qty in 1 ${form.secondary_unit || "Pack"}`}
                    >
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        placeholder="e.g. 25"
                        value={form.conversion_factor || ""}
                        onChange={(e) =>
                          handleChange(
                            "conversion_factor",
                            Number(e.target.value),
                          )
                        }
                        inputRef={(el) =>
                          (fieldRefs.current["conversion_factor"] = el)
                        }
                        onKeyDown={(e) =>
                          handleKeyDown(
                            e,
                            "conversion_factor",
                            "low_stock_threshold",
                          )
                        }
                      />
                    </FormField>
                  </Grid>
                </>
              )}
              <Grid item xs={12} sm={6}>
                <FormField label="Low Stock Threshold">
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={form.low_stock_threshold ?? ""}
                    inputRef={(el) =>
                      (fieldRefs.current["low_stock_threshold"] = el)
                    }
                    onKeyDown={(e) =>
                      handleKeyDown(e, "low_stock_threshold", "brand")
                    }
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
              <Grid item xs={12} sm={4}>
                <FormField label="Brand">
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={form.brand || ""}
                    inputRef={(el) => (fieldRefs.current["brand"] = el)}
                    onKeyDown={(e) => handleKeyDown(e, "brand", "size")}
                    onChange={(e) => handleChange("brand", e.target.value)}
                    placeholder="e.g., Samsung"
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
                    inputRef={(el) => (fieldRefs.current["size"] = el)}
                    onKeyDown={(e) => handleKeyDown(e, "size", "weight")}
                    onChange={(e) => handleChange("size", e.target.value)}
                    placeholder="e.g., L"
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
                    inputRef={(el) => (fieldRefs.current["weight"] = el)}
                    onKeyDown={(e) =>
                      handleKeyDown(e, "weight", "average_purchase_price")
                    }
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
                <FormField label={`Avg. Purchase Price (per ${pricingUnit})`}>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    type="number"
                    value={
                      form.average_purchase_price
                        ? form.average_purchase_price * pricingMultiplier
                        : ""
                    }
                    inputRef={(el) =>
                      (fieldRefs.current["average_purchase_price"] = el)
                    }
                    onKeyDown={(e) =>
                      handleKeyDown(e, "average_purchase_price", "image_url")
                    }
                    onChange={(e) =>
                      handlePriceChange(
                        "average_purchase_price",
                        e.target.value,
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
                    inputRef={(el) => (fieldRefs.current["image_url"] = el)}
                    onKeyDown={(e) =>
                      handleKeyDown(e, "image_url", "description")
                    }
                    onChange={(e) => handleChange("image_url", e.target.value)}
                    placeholder="Paste image URL..."
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
                    inputRef={(el) => (fieldRefs.current["description"] = el)}
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
        {activeStep === 1 ? (
          <Button onClick={handleBack} sx={{ mr: 1 }}>
            Back
          </Button>
        ) : null}
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
          <>
            <Button onClick={handleSubmit} variant="outlined" sx={{ mr: 1 }}>
              Save now
            </Button>
            <Button onClick={handleNext} variant="contained">
              Next
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
