"use client";

import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Chip,
  Paper,
  Stack,
} from "@mui/material";
import { X, Tag, Hash, Percent, ShoppingCart } from "lucide-react";
import Grid from "@mui/material/GridLegacy";
import { type ProductOverviewType } from "../../lib/types/product"; // Adjust path as needed
import { useEffect, useState } from "react";
import { getProduct } from "../../lib/api/productService";
import { getShopData } from "../../lib/api/shopService";
import type { ShopSetupForm } from "../../lib/types/shopTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  productId: string;
}

// Helper for displaying key-value details
const DetailItem = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) => (
  <Box sx={{ display: "flex", alignItems: "center" }}>
    {icon}
    <Typography
      variant="body2"
      sx={{ ml: 1.5, color: "text.secondary", minWidth: 100 }}
    >
      {label}:
    </Typography>
    <Typography variant="body2" fontWeight={500}>
      {value || "—"}
    </Typography>
  </Box>
);

export default function ProductOverviewModal({
  open,
  onClose,
  productId,
}: Props) {
  const [product, setProduct] = useState<ProductOverviewType | null>(null);
  const [shop, setShop] = useState<ShopSetupForm | null>(null);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    // Don't fetch if the modal isn't open or there's no ID
    if (!open || !productId) {
      return;
    }

    const loadAllData = async () => {
      setLoading(true);
      try {
        // Fetch product and shop data in parallel for efficiency
        const [productData, shopData] = await Promise.all([
          getProduct(productId),
          getShopData(),
        ]);

        setProduct(productData || null);
        setShop(shopData || null);
      } catch (error) {
        console.error("Failed to load data for product overview:", error);
        setProduct(null); // Clear product on error
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [productId, open]);

  const getStockChipColor = () => {
    if (
      !product?.quantity ||
      product.quantity <= (shop?.low_stock_threshold ?? 5)
    )
      return "error";
    if (product.quantity <= 5) return "warning";
    return "success";
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Product Overview
        </Typography>
        <IconButton onClick={onClose}>
          <X />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {/* ✅ ADDED: Conditionally rendered product image cover */}
          {product?.image_url && (
            <Box
              component="img"
              src={`app-image://products/${product.image_url}`}
              alt={product.name}
              sx={{
                width: "100%",
                height: "200px",
                objectFit: "cover",
                borderRadius: 2,
                backgroundColor: "grey.100",
              }}
            />
          )}

          {/* --- Section 1: Main Info --- */}
          <Box>
            <Chip
              label={product?.category_name || "Uncategorized"}
              color="secondary"
              size="small"
              sx={{ mb: 1 }}
            />
            <Typography variant="h5" fontWeight={700}>
              {product?.name}
            </Typography>
            <Stack direction="row" spacing={1} mt={0.5}>
              <Chip label={`Code: ${product?.product_code}`} size="small" />
              <Chip
                label={`Barcode: ${product?.barcode || "N/A"}`}
                size="small"
              />
            </Stack>
          </Box>

          {/* --- Section 2: Pricing & Stock --- */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={4} sx={{ textAlign: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  Selling Price (MOP)
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  ₹{product?.mop?.toLocaleString("en-IN")}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textDecoration: "line-through" }}
                >
                  MRP: ₹{product?.mrp?.toLocaleString("en-IN")}
                </Typography>
              </Grid>
              <Grid
                item
                xs={4}
                sx={{
                  textAlign: "center",
                  borderLeft: 1,
                  borderRight: 1,
                  borderColor: "divider",
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Latest Purchase Price
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  ₹{product?.latest_purchase_price?.toLocaleString("en-IN")}
                </Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  Current Stock
                </Typography>
                <Box mt={1}>
                  <Chip
                    label={`${product?.quantity} Units`}
                    color={getStockChipColor()}
                  />
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* --- Section 3: Details --- */}
          <Box>
            <Grid container spacing={1}>
              <Grid item xs={12} sm={6}>
                <DetailItem
                  icon={<Tag size={16} />}
                  label="Brand"
                  value={product?.brand}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailItem
                  icon={<Hash size={16} />}
                  label="HSN Code"
                  value={product?.hsn}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailItem
                  icon={<ShoppingCart size={16} />}
                  label="Location"
                  value={product?.storage_location}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DetailItem
                  icon={<Percent size={16} />}
                  label="GST Rate"
                  value={`${product?.gst_rate}%`}
                />
              </Grid>
            </Grid>
          </Box>

          {/* --- Section 4: Description --- */}
          {product?.description && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Description
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {product?.description}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
