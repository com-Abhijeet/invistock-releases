import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Breadcrumbs,
  Link,
  TextField,
  InputAdornment,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
} from "@mui/material";
import {
  ArrowLeft,
  Search,
  Printer,
  Boxes,
  Barcode as BarcodeIcon,
  CheckSquare,
  Square,
} from "lucide-react";
import toast from "react-hot-toast";

import { fetchProductHistory } from "../lib/api/productService";
import { getProductBatches } from "../lib/api/batchService";
import { getVariantsByProductId } from "../lib/api/variantService";
import DashboardHeader from "../components/DashboardHeader";
import DataTable from "../components/DataTable";
import type { Column, Action } from "../lib/types/DataTableTypes";
import { BatchVariant } from "../types/variant";
import { Product } from "../lib/types/product";
import VariantPrintModal from "../components/variant/VariantPrintModal";

interface BatchItemOption {
  id: number;
  batch_number: string;
}

export default function ProductVariantsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialBatchId = searchParams.get("batchId");

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [batches, setBatches] = useState<BatchItemOption[]>([]);
  const [variants, setVariants] = useState<BatchVariant[]>([]);

  // Filter & Search State
  const [search, setSearch] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    initialBatchId ? String(initialBatchId) : "all"
  );
  const [inStockOnly, setInStockOnly] = useState(false);

  // Selection for bulk label printing
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<number>>(new Set());

  // Print Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [modalVariants, setModalVariants] = useState<BatchVariant[]>([]);

  // Pagination state for DataTable
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1. Fetch Product
      const historyData = await fetchProductHistory(Number(id));
      setProduct(historyData.productDetails);

      // 2. Fetch Batches for dropdown
      const trackingType = (historyData.productDetails?.tracking_type as "batch" | "serial") || "batch";
      const rawBatches = await getProductBatches(Number(id), trackingType);
      if (Array.isArray(rawBatches)) {
        setBatches(
          rawBatches.map((b: any) => ({
            id: b.batch_id || b.id,
            batch_number: b.batch_number || "DEFAULT",
          }))
        );
      }

      // 3. Fetch Product Variants
      const variantList = await getVariantsByProductId(Number(id));
      setVariants(variantList);
    } catch (error: any) {
      toast.error(error.message || "Failed to load product variants");
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering by Search Keyword, Batch, and Stock status
  const filteredVariants = useMemo(() => {
    return variants.filter((v) => {
      // Batch filter
      if (selectedBatchId !== "all" && String(v.batch_id) !== selectedBatchId) {
        return false;
      }
      // Stock filter
      if (inStockOnly && v.quantity <= 0) {
        return false;
      }
      // Keyword search filter
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        const matchesArticle = v.article_no && v.article_no.toLowerCase().includes(term);
        const matchesDim1 = v.dim1_value && v.dim1_value.toLowerCase().includes(term);
        const matchesDim2 = v.dim2_value && v.dim2_value.toLowerCase().includes(term);
        const matchesBarcode = v.barcode && v.barcode.toLowerCase().includes(term);
        const matchesSku = v.sku && v.sku.toLowerCase().includes(term);
        const matchesBatch = v.batch_number && v.batch_number.toLowerCase().includes(term);

        if (
          !matchesArticle &&
          !matchesDim1 &&
          !matchesDim2 &&
          !matchesBarcode &&
          !matchesSku &&
          !matchesBatch
        ) {
          return false;
        }
      }
      return true;
    });
  }, [variants, search, selectedBatchId, inStockOnly]);

  const toggleSelectAll = () => {
    if (selectedVariantIds.size === filteredVariants.length && filteredVariants.length > 0) {
      setSelectedVariantIds(new Set());
    } else {
      setSelectedVariantIds(new Set(filteredVariants.map((v) => v.id)));
    }
  };

  const toggleSelectVariant = (variantId: number) => {
    const next = new Set(selectedVariantIds);
    if (next.has(variantId)) next.delete(variantId);
    else next.add(variantId);
    setSelectedVariantIds(next);
  };

  const handleOpenPrintModalForSelected = () => {
    let targetVariants: BatchVariant[] = [];
    if (selectedVariantIds.size > 0) {
      targetVariants = variants.filter((v) => selectedVariantIds.has(v.id));
    } else {
      targetVariants = filteredVariants;
    }

    if (targetVariants.length === 0) {
      toast.error("No variants available for printing");
      return;
    }

    setModalVariants(targetVariants);
    setPrintModalOpen(true);
  };

  const handleOpenPrintModalSingle = (variant: BatchVariant) => {
    setModalVariants([variant]);
    setPrintModalOpen(true);
  };

  const columns: Column[] = [
    {
      key: "select",
      label: "",
      format: (_: any, row: BatchVariant) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            toggleSelectVariant(row.id);
          }}
          color={selectedVariantIds.has(row.id) ? "primary" : "default"}
        >
          {selectedVariantIds.has(row.id) ? (
            <CheckSquare size={18} className="text-indigo-600" />
          ) : (
            <Square size={18} className="text-gray-400" />
          )}
        </IconButton>
      ),
    },
    {
      key: "article_no",
      label: "Article No",
      format: (val: string) => (
        <Typography variant="body2" fontWeight={700} color="primary.main">
          {val || "N/A"}
        </Typography>
      ),
    },
    {
      key: "dim1_value",
      label: "Color / Attr 1",
      format: (val: string) =>
        val ? <Chip label={val} size="small" variant="outlined" color="info" /> : "-",
    },
    {
      key: "dim2_value",
      label: "Size / Attr 2",
      format: (val: string) => (val ? <Chip label={val} size="small" color="primary" /> : "-"),
    },
    {
      key: "batch_number",
      label: "Batch",
      format: (val: string) => (
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{ bgcolor: "action.hover", px: 1, py: 0.5, borderRadius: 1 }}
        >
          {val || "DEFAULT"}
        </Typography>
      ),
    },
    {
      key: "quantity",
      label: "Stock Qty",
      align: "center",
      format: (val: number) => (
        <Typography
          variant="body2"
          fontWeight={700}
          color={val > 0 ? "success.main" : "error.main"}
        >
          {val} units
        </Typography>
      ),
    },
    {
      key: "mrp",
      label: "MRP (₹)",
      align: "right",
      format: (val: number) => `₹${Number(val || 0).toLocaleString()}`,
    },
    {
      key: "mop",
      label: "Selling Price (₹)",
      align: "right",
      format: (val: number) => (
        <Typography variant="body2" fontWeight={700} color="text.primary">
          ₹{Number(val || 0).toLocaleString()}
        </Typography>
      ),
    },
    {
      key: "barcode",
      label: "Barcode",
      format: (val: string) => (
        <Stack direction="row" alignItems="center" gap={0.5}>
          <BarcodeIcon size={14} className="text-gray-400" />
          <Typography variant="caption" fontFamily="monospace" fontWeight={700}>
            {val || "N/A"}
          </Typography>
        </Stack>
      ),
    },
  ];

  const actions: Action[] = [
    {
      icon: <Printer size={16} />,
      label: "Print Barcode Label",
      onClick: (row: BatchVariant) => handleOpenPrintModalSingle(row),
    },
  ];

  const paginatedRows = filteredVariants.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: "0 auto" }}>
      {/* Breadcrumbs */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <Button
          startIcon={<ArrowLeft size={16} />}
          onClick={() => navigate(`/products/${id}/batches`)}
          size="small"
          sx={{ textTransform: "none", color: "text.secondary" }}
        >
          Back to Batches
        </Button>
        <Breadcrumbs separator="›" aria-label="breadcrumb">
          <Link
            underline="hover"
            color="inherit"
            onClick={() => navigate("/products")}
            sx={{ cursor: "pointer" }}
          >
            Products
          </Link>
          <Typography color="text.primary" fontWeight={600}>
            {product?.name || "Product"}
          </Typography>
          <Typography color="text.primary" fontWeight={600}>
            Variants
          </Typography>
        </Breadcrumbs>
      </Stack>

      <DashboardHeader
        title={`Variants: ${product?.name || ""}`}
        showDateFilters={false}
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<Boxes size={18} />}
              onClick={() => navigate(`/products/${id}/batches`)}
              sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 600 }}
            >
              View Batches
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Printer size={18} />}
              onClick={handleOpenPrintModalForSelected}
              disabled={filteredVariants.length === 0}
              sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}
            >
              {selectedVariantIds.size > 0
                ? `Print Selected (${selectedVariantIds.size})`
                : `Print Filtered (${filteredVariants.length})`}
            </Button>
          </Stack>
        }
      />

      {/* Filter & Search Bar */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
          {/* Keyword Search */}
          <TextField
            size="small"
            placeholder="Search by Article No (e.g. 32), Color (e.g. Red), Size, Barcode..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            sx={{ flexGrow: 1, minWidth: 260 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} />
                </InputAdornment>
              ),
            }}
          />

          {/* Batch Filter Dropdown */}
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Batch</InputLabel>
            <Select
              value={selectedBatchId}
              label="Filter by Batch"
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="all">All Batches</MenuItem>
              {batches.map((b) => (
                <MenuItem key={b.id} value={String(b.id)}>
                  Batch: {b.batch_number}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* In-Stock Toggle */}
          <Button
            size="small"
            variant={inStockOnly ? "contained" : "outlined"}
            color={inStockOnly ? "success" : "inherit"}
            onClick={() => setInStockOnly(!inStockOnly)}
            sx={{ textTransform: "none", borderRadius: "8px", whitespace: "nowrap" }}
          >
            {inStockOnly ? "In Stock Only ✓" : "Show All Stock"}
          </Button>

          {/* Select All Toggle */}
          <Button
            size="small"
            variant="outlined"
            onClick={toggleSelectAll}
            sx={{ textTransform: "none", borderRadius: "8px", whitespace: "nowrap" }}
          >
            {selectedVariantIds.size === filteredVariants.length && filteredVariants.length > 0
              ? "Deselect All"
              : "Select All"}
          </Button>
        </Stack>
      </Paper>

      {/* DataTable */}
      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        <DataTable
          rows={paginatedRows}
          columns={columns}
          actions={actions}
          loading={loading}
          total={filteredVariants.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(newPage) => setPage(newPage)}
          onRowsPerPageChange={(newLimit) => {
            setRowsPerPage(newLimit);
            setPage(0);
          }}
        />
      </Paper>

      {/* Variant Print Pop-up Modal */}
      {product && (
        <VariantPrintModal
          open={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          variants={modalVariants}
          productName={product.name}
        />
      )}
    </Box>
  );
}
