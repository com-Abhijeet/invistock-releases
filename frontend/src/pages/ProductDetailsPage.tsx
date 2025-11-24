"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import Barcode from "react-barcode";
import { fetchProductHistory } from "../lib/api/productService"; // Adjust import path
import DashboardHeader from "../components/DashboardHeader"; // Your header component
import DataTable from "../components/DataTable"; // Your data table component
import StatisticCard from "../components/StatisticCard";
import theme from "../../theme";
import AddProductModal from "../components/products/AddProductModal";
import { productDetails } from "../lib/types/product";

import StockAdjustmentModal from "../components/inventory/StockAdjustmentModal";
import { Sliders } from "lucide-react"; // Icon for the button
// Define the type for the data state
type ProductHistoryData = Awaited<ReturnType<typeof fetchProductHistory>>;

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProductHistoryData | null>(null);

  //edit states
  const [editProduct, setEditProduct] = useState<productDetails | null>();
  const [editOpen, setEditOpen] = useState(false);
  // Pagination state for the history DataTable
  const [historyPage, setHistoryPage] = useState(0);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(5);

  const [adjustOpen, setAdjustOpen] = useState(false);

  const handleStockUpdateSuccess = () => {
    // Refresh the data to show the new stock and the new history entry
    fetchProductHistory(Number(id)).then(setData);
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchProductHistory(Number(id))
        .then(setData)
        .catch(() => toast.error("Failed to fetch product history."))
        .finally(() => setLoading(false));
    }
  }, [id]);

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

  console.log(data);
  const { productDetails: product, history, summary } = data;

  const handleOnSuccess = () => {
    if (id) {
      setLoading(true);
      fetchProductHistory(Number(id))
        .then(setData)
        .catch(() => toast.error("Failed to fetch product history."))
        .finally(() => setLoading(false));
    }
  };

  const isLowStock =
    (product.low_stock_threshold ?? 0) > 0 &&
    product.quantity <= (product.low_stock_threshold ?? 0);

  // Define columns for the DataTable
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
      label: "Quantity Change",
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

  function handleEdit() {
    setEditOpen(true);
    setEditProduct(data?.productDetails);
  }

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        // backgroundColor: "#F4F6F8",

        minHeight: "100vh",
      }}
    >
      {/* --- HEADER --- */}
      <DashboardHeader
        title={product.name}
        onRefresh={() => {
          fetchProductHistory(Number(id)).then(setData);
        }}
        showDateFilters={false}
        actions={
          <Stack direction="row" spacing={1.5}>
            {/* ✅ Adjust Stock Button (Rounded & Outlined) */}
            <Button
              variant="outlined"
              color="warning"
              onClick={() => setAdjustOpen(true)}
              startIcon={<Sliders size={18} />}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 600,
                borderWidth: "1px",
                "&:hover": {
                  borderWidth: "1px", // Prevent border width jump on hover
                },
              }}
            >
              Adjust Stock
            </Button>

            {/* ✅ Edit Product Button (Rounded & Primary) */}
            <Button
              variant="contained"
              onClick={handleEdit}
              startIcon={<FilePenLine size={18} />}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 600,
                px: 3,
                boxShadow: "none",
                "&:hover": {
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                },
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
          sx={{ mt: 2, mx: 2, borderRadius: 2 }}
        >
          <AlertTitle>Low Stock Warning</AlertTitle>
          This product is at or below its low stock threshold. (Current:{" "}
          <strong>{product.quantity}</strong> | Threshold:{" "}
          <strong>{product.low_stock_threshold}</strong>)
        </Alert>
      )}

      {/* --- TOP SECTION: DETAILS & IMAGE --- */}
      <Paper
        variant="outlined"
        sx={{
          p: 1,
          mb: 3,
          borderRadius: 2,
          variant: "outlined",
          backgroundColor: theme.palette.primary.contrastText,
          borderColor: theme.palette.divider,
          boxShadow: "none",
        }}
      >
        <Grid container spacing={3}>
          {/* Left Column: Image */}
          <Grid item xs={12} md={4}>
            {product.image_url ? (
              <Box
                component="img"
                src={`app-image://products/${product.image_url}`}
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
            {/* --- Top Info: Name, Dates, Description, and Status --- */}
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
                    product.created_at ?? new Date()
                  ).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Typography>
                <Typography variant="caption">
                  Updated:{" "}
                  {new Date(
                    product.updated_at ?? new Date()
                  ).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Typography>
              </Stack>
              <Typography variant="body1" color="text.secondary" mt={1.5}>
                {product.description || "No description provided."}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* --- Barcode --- */}
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Barcode
                value={product.barcode || product.product_code}
                height={50}
                fontSize={12}
                textMargin={2}
                margin={0}
                width={1.5}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* --- Main Details Grid --- */}
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
                <DetailItem label="Brand" value={product.brand} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <DetailItem label="HSN Code" value={product.hsn} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <DetailItem
                  label="Storage Location"
                  value={product.storage_location}
                />
              </Grid>
              {/* --- ✅ NEWLY ADDED FIELDS --- */}
              <Grid item xs={6} sm={4}>
                <DetailItem label="Size" value={product.size} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <DetailItem label="Weight" value={product.weight} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <DetailItem
                  label="Low Stock Alert"
                  value={product.low_stock_threshold}
                />
              </Grid>
              {/* --- END OF NEW FIELDS --- */}
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* --- Pricing Grid --- */}
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <DetailItem
                  label="MRP"
                  value={`₹${product.mrp?.toLocaleString("en-IN")}`}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <DetailItem
                  label="MOP"
                  value={`₹${product.mop?.toLocaleString("en-IN")}`}
                />
              </Grid>
              {/* --- ✅ NEWLY ADDED FIELD --- */}
              <Grid item xs={6} sm={3}>
                <DetailItem
                  label="MF/W Price"
                  value={
                    product.mfw_price
                      ? `₹${product.mfw_price.toLocaleString("en-IN")}`
                      : "—"
                  }
                />
              </Grid>
              {/* --- END OF NEW FIELD --- */}
              <Grid item xs={6} sm={3}>
                <DetailItem
                  label="Avg. Purchase Price"
                  value={
                    product.average_purchase_price
                      ? `₹${Number(
                          product.average_purchase_price
                        ).toLocaleString("en-IN")}`
                      : "—"
                  }
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>

      {/* --- BOTTOM SECTION: INVENTORY & HISTORY --- */}
      <Paper
        // variant="outlined"
        sx={{
          mb: 3,
          borderRadius: 2,
          variant: "outlined",
          backgroundColor: theme.palette.primary.contrastText,
          borderColor: theme.palette.divider,
          boxShadow: "none",
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            py: 1,
            px: 2,
            borderRadius: 0,
            color: "primary.main",
            fontWeight: 600,
            // Creates a colored underline for the active tab
            borderBottom: `2px solid ${theme.palette.primary.main}`,

            // This makes the active tab's underline sit perfectly on the container's border
            marginBottom: "-1px",
          }}
        >
          Inventory & Stock History
        </Typography>
        <Box
          my={2}
          display="grid"
          gridTemplateColumns={{
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          }}
          gap={2}
        >
          <StatisticCard
            icon={<TrendingUp size={28} />}
            title="Total Purchased"
            value={summary.totalPurchased}
          />
          <StatisticCard
            icon={<TrendingDown size={28} />}
            title="Total Sold"
            value={summary.totalSold}
          />
          <StatisticCard
            icon={<Boxes size={28} />}
            title="Current Stock"
            value={summary.currentQuantity}
          />
          {summary.unmarkedAdded > 0 && (
            <StatisticCard
              icon={<HelpCircle size={28} />}
              title="Unmarked Added"
              value={summary.unmarkedAdded}
            />
          )}
          {summary.unmarkedRemoved > 0 && (
            <StatisticCard
              icon={<HelpCircle size={28} />}
              title="Unmarked Removed"
              value={summary.unmarkedRemoved}
            />
          )}
        </Box>
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

// Helper component for details grid
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
