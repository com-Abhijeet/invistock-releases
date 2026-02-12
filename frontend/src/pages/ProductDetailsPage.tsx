"use client";

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Divider,
  Button,
  Stack,
  Alert,
  AlertTitle,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  FilePenLine,
  Image as ImageIcon,
  Boxes,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sliders,
  ScanBarcode,
  Package,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";

import { fetchProductHistory } from "../lib/api/productService";
import DashboardHeader from "../components/DashboardHeader";
import DataTable from "../components/DataTable";
import StatisticCard from "../components/StatisticCard";
import theme from "../../theme";
import AddProductModal from "../components/products/AddProductModal";
import { productDetails } from "../lib/types/product";
import StockAdjustmentModal from "../components/inventory/StockAdjustmentModal";

type ProductHistoryData = Awaited<ReturnType<typeof fetchProductHistory>>;

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProductHistoryData | null>(null);

  // Edit states
  const [editProduct, setEditProduct] = useState<productDetails | null>();
  const [editOpen, setEditOpen] = useState(false);

  // Pagination state for history
  const [historyPage, setHistoryPage] = useState(0);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(5);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const historyData = await fetchProductHistory(Number(id));
      setData(historyData);
    } catch (error) {
      toast.error("Failed to fetch product details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleStockUpdateSuccess = () => {
    fetchData();
  };

  const handleOnSuccess = () => {
    fetchData();
  };

  const handleEdit = () => {
    setEditOpen(true);
    setEditProduct(data?.productDetails);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={5}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return <Typography sx={{ p: 3 }}>Product not found.</Typography>;
  }

  const { productDetails: product, history, summary } = data;
  const isLowStock =
    (product.low_stock_threshold ?? 0) > 0 &&
    product.quantity <= (product.low_stock_threshold ?? 0);

  const historyColumns = [
    {
      key: "date",
      label: "Date",
      format: (val: string) =>
        new Date(val).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    },
    {
      key: "type",
      label: "Type",
      format: (val: string) => (
        <Chip
          label={val}
          size="small"
          color={val === "Purchase" ? "success" : "primary"}
        />
      ),
    },
    {
      key: "quantity",
      label: `Quantity Change (${product.base_unit || "pcs"})`,
      format: (val: string) => (
        <Typography
          fontWeight="bold"
          color={val.startsWith("+") ? "success.main" : "error.main"}
        >
          {val}
        </Typography>
      ),
    },
  ];

  return (
    <Box p={2} pt={3} sx={{ minHeight: "100vh" }}>
      {/* --- HEADER --- */}
      <DashboardHeader
        title={product.name}
        onRefresh={fetchData}
        showDateFilters={false}
        actions={
          <Stack direction="row" spacing={1.5}>
            {/* NEW Analysis Button */}
            <Button
              variant="outlined"
              color="primary"
              onClick={() => navigate(`/products/${id}/analysis`)}
              startIcon={<BarChart3 size={18} />}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Analysis
            </Button>

            {/* Batch View Button */}
            {(product.tracking_type === "batch" ||
              product.tracking_type === "serial") && (
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => navigate(`/products/${id}/batches`)}
                startIcon={<Boxes size={18} />}
                sx={{
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                View Batches
              </Button>
            )}
            <Button
              variant="outlined"
              color="warning"
              onClick={() => setAdjustOpen(true)}
              startIcon={<Sliders size={18} />}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Adjust Stock
            </Button>
            <Button
              variant="contained"
              onClick={handleEdit}
              startIcon={<FilePenLine size={18} />}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 600,
                px: 3,
              }}
            >
              Edit Product
            </Button>
          </Stack>
        }
      />

      {isLowStock && (
        <Alert
          severity="warning"
          icon={<AlertTriangle />}
          sx={{ mt: 2, mx: 2, mb: 2, borderRadius: 2 }}
        >
          <AlertTitle>Low Stock Warning</AlertTitle>
          This product is at or below its low stock threshold. (Current:{" "}
          <strong>
            {product.quantity} {product.base_unit || "pcs"}
          </strong>{" "}
          | Threshold:{" "}
          <strong>
            {product.low_stock_threshold} {product.base_unit || "pcs"}
          </strong>
          )
        </Alert>
      )}

      {/* --- TOP SECTION: DETAILS & IMAGE --- */}
      <Paper
        variant="outlined"
        sx={{
          p: 1,
          mb: 3,
          borderRadius: 2,
          bgcolor: theme.palette.primary.contrastText,
          border: "none",
        }}
      >
        <Grid container spacing={3}>
          {/* Left Column: Image */}
          <Grid item xs={12} md={4}>
            {product.image_url ? (
              <Box
                component="img"
                src={`app-image://images/products/${product.image_url}`}
                alt={product.name}
                sx={{
                  width: "100%",
                  height: "auto",
                  maxHeight: 350,
                  objectFit: "contain",
                  borderRadius: 2,
                }}
              />
            ) : (
              <Box
                sx={{
                  height: 350,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "grey.50",
                  borderRadius: 2,
                }}
              >
                <ImageIcon size={60} color="#ccc" />
              </Box>
            )}
          </Grid>

          {/* Right Column: Details */}
          <Grid item xs={12} md={8}>
            <Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Typography variant="h5" fontWeight={600}>
                  {product.name}
                </Typography>
                <Chip
                  label={product.is_active ? "Active" : "Inactive"}
                  color={product.is_active ? "success" : "default"}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Stack>
              <Stack
                direction="row"
                spacing={2}
                mt={0.5}
                color="text.secondary"
              >
                <Typography variant="caption">
                  Created:{" "}
                  {new Date(
                    product.created_at ?? new Date(),
                  ).toLocaleDateString("en-IN")}
                </Typography>
              </Stack>
              <Typography variant="body1" color="text.secondary" mt={1.5}>
                {product.description || "No description provided."}
              </Typography>

              {/* Tracking Badge */}
              {product.tracking_type !== "none" && (
                <Stack direction="row" spacing={1} mt={1}>
                  <Chip
                    icon={
                      product.tracking_type === "serial" ? (
                        <ScanBarcode size={14} />
                      ) : (
                        <Package size={14} />
                      )
                    }
                    label={`${product.tracking_type?.toUpperCase()} TRACKING`}
                    color="info"
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                  {/* Link to Batches Page */}
                  <Chip
                    label="View Inventory"
                    size="small"
                    variant="outlined"
                    onClick={() => navigate(`/products/${id}/batches`)}
                    icon={<ExternalLink size={12} />}
                    sx={{ cursor: "pointer", fontWeight: 600 }}
                  />
                </Stack>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={6} sm={4}>
                <DetailItem label="Product Code" value={product.product_code} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <DetailItem label="Category" value={product.category_name} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <DetailItem
                  label="Subcategory"
                  value={product.subcategory_name}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <DetailItem
                  label="Base Unit"
                  value={(product.base_unit || "pcs").toUpperCase()}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <DetailItem
                  label="Bulk Packaging"
                  value={
                    product.secondary_unit
                      ? `1 ${product.secondary_unit} = ${product.conversion_factor} ${
                          product.base_unit || "pcs"
                        }`
                      : "Single unit only"
                  }
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <DetailItem label="Brand" value={product.brand} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <DetailItem label="HSN Code" value={product.hsn} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <DetailItem label="Location" value={product.storage_location} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <DetailItem label="Size" value={product.size} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <DetailItem label="Weight" value={product.weight} />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>

      {/* --- BOTTOM SECTION: HISTORY --- */}
      <Paper sx={{ mb: 3, borderRadius: 2, border: "none" }}>
        <Typography
          variant="h6"
          sx={{
            py: 1.5,
            px: 2,
            color: "primary.main",
            fontWeight: 600,
            borderBottom: `2px solid ${theme.palette.divider}`,
          }}
        >
          Stock Movement History
        </Typography>

        <Box p={2}>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={4}>
              <StatisticCard
                icon={<TrendingUp size={28} />}
                title="Total Purchased"
                value={`${summary.totalPurchased} ${
                  product.base_unit || "pcs"
                }`}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatisticCard
                icon={<TrendingDown size={28} />}
                title="Total Sold"
                value={`${summary.totalSold} ${product.base_unit || "pcs"}`}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatisticCard
                icon={<Boxes size={28} />}
                title="Current Stock"
                value={`${summary.currentQuantity} ${
                  product.base_unit || "pcs"
                }`}
              />
            </Grid>
          </Grid>

          <DataTable
            columns={historyColumns}
            rows={history}
            loading={loading}
            total={history.length}
            page={historyPage}
            rowsPerPage={historyRowsPerPage}
            onPageChange={setHistoryPage}
            onRowsPerPageChange={setHistoryRowsPerPage}
          />
        </Box>
      </Paper>

      {product.id && (
        <StockAdjustmentModal
          open={adjustOpen}
          onClose={() => setAdjustOpen(false)}
          onSuccess={handleStockUpdateSuccess}
          productName={product.name}
          productId={product.id}
          currentStock={product.quantity}
        />
      )}
      {editProduct && (
        <AddProductModal
          open={editOpen}
          onClose={() => {
            setEditOpen(false);
            setEditProduct(null);
          }}
          initialData={editProduct}
          onSuccess={handleOnSuccess}
          mode="edit"
        />
      )}
    </Box>
  );
}

const DetailItem = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography fontWeight={500}>{value || "—"}</Typography>
  </Box>
);
