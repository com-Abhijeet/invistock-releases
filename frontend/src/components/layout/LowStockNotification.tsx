"use client";

import { useEffect, useState } from "react";
import {
  IconButton,
  Badge,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  CircularProgress,
  Box,
  Divider,
  Tooltip,
  ListItemButton,
} from "@mui/material";
import { OctagonAlert, Image as ImageIcon } from "lucide-react";
import {
  fetchLowStockCount,
  fetchLowStockList,
  LowStockProduct,
} from "../../lib/api/productService";
import { useNavigate } from "react-router-dom";

export default function LowStockNotification() {
  const [count, setCount] = useState(0);
  const [products, setProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const navigate = useNavigate();

  // 1. Fetch the count on initial load
  const loadCount = () => {
    fetchLowStockCount()
      .then((data) => setCount(data.count))
      .catch((err) => console.error("Failed to fetch low stock count:", err));
  };

  useEffect(() => {
    loadCount();
  }, []);

  // 2. When the popover opens, fetch the full list
  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setLoading(true);
    fetchLowStockList()
      .then(setProducts)
      .catch((err) => console.error("Failed to fetch low stock list:", err))
      .finally(() => setLoading(false));
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleItemClick = (id: number) => {
    navigate(`/product/${id}`); // Navigate to the product detail page
    handleClose();
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Low Stock Alerts">
        <IconButton color="inherit" onClick={handleOpen}>
          <Badge badgeContent={count} color="error">
            <OctagonAlert />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { width: 360, maxHeight: 400 } }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" component="div">
            Low Stock Alerts
          </Typography>
        </Box>
        <Divider />

        {loading ? (
          <Box display="flex" justifyContent="center" my={3}>
            <CircularProgress />
          </Box>
        ) : (
          // ✅ Use disablePadding on List
          <List dense disablePadding>
            {products.length === 0 ? (
              <Typography sx={{ p: 2, color: "text.secondary" }}>
                No products are currently low on stock.
              </Typography>
            ) : (
              products.map((product) => (
                // ✅ ListItem no longer has the 'button' prop
                <ListItem key={product.id} disablePadding>
                  {/* ✅ Wrap the content in ListItemButton */}
                  <ListItemButton onClick={() => handleItemClick(product.id)}>
                    <ListItemAvatar>
                      <Avatar
                        variant="rounded"
                        src={
                          product.image_url
                            ? `app-image://products/${product.image_url}`
                            : undefined
                        }
                      >
                        <ImageIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={product.name}
                      secondary={`Current: ${product.quantity} (Threshold: ${product.low_stock_threshold})`}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </List>
        )}
      </Popover>
    </>
  );
}
