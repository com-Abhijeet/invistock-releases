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
  Tooltip,
  ListItemButton,
  Button,
  useTheme,
  alpha,
} from "@mui/material";
import {
  OctagonAlert,
  Image as ImageIcon,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import {
  fetchLowStockCount,
  fetchLowStockList,
  LowStockProduct,
} from "../../lib/api/productService";
import { useNavigate } from "react-router-dom";

export default function LowStockNotification() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [products, setProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const loadCount = () => {
    fetchLowStockCount()
      .then((data) => setCount(data.count))
      .catch((err) => console.error("Failed to fetch low stock count:", err));
  };

  useEffect(() => {
    loadCount();
  }, []);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setLoading(true);
    fetchLowStockList()
      .then(setProducts)
      .catch((err) => console.error("Failed to fetch low stock list:", err))
      .finally(() => setLoading(false));
  };

  const handleClose = () => setAnchorEl(null);
  const handleItemClick = (id: number) => {
    navigate(`/product/${id}`);
    handleClose();
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Low Stock Alerts">
        <IconButton color="inherit" onClick={handleOpen}>
          <Badge badgeContent={count} color="error" overlap="circular">
            <OctagonAlert size={20} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              width: 420,
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              borderRadius: "16px",
              boxShadow: "0px 12px 40px rgba(0, 0, 0, 0.12)",
            },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2.5,
            bgcolor: "white",
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: "error.main",
                width: 40,
                height: 40,
              }}
            >
              <OctagonAlert size={20} />
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                fontWeight={800}
                color="text.primary"
                lineHeight={1.2}
              >
                Low Stock Alerts
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {count === 0
                  ? "Inventory looks healthy."
                  : `${count} products need restocking soon.`}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Body */}
        <Box sx={{ flexGrow: 1, overflowY: "auto", bgcolor: "grey.50" }}>
          {loading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              height={200}
            >
              <CircularProgress size={28} />
            </Box>
          ) : count === 0 ? (
            <Box textAlign="center" py={8} px={3}>
              <Avatar
                sx={{
                  bgcolor: "success.50",
                  mx: "auto",
                  mb: 2,
                  width: 64,
                  height: 64,
                }}
              >
                <CheckCircle2 size={32} color={theme.palette.success.main} />
              </Avatar>
              <Typography
                variant="subtitle1"
                fontWeight={800}
                color="text.primary"
              >
                Inventory is Healthy
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                All your products are currently above their minimum stock
                thresholds.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {products.map((product) => (
                <ListItem
                  key={product.id}
                  disablePadding
                  divider
                  sx={{ bgcolor: "white" }}
                >
                  <ListItemButton
                    onClick={() => handleItemClick(product.id)}
                    sx={{
                      py: 1.5,
                      px: 2,
                      "&:hover": {
                        bgcolor: alpha(theme.palette.error.main, 0.02),
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        variant="rounded"
                        src={
                          product.image_url
                            ? `app-image://products/${product.image_url}`
                            : undefined
                        }
                        sx={{ bgcolor: "grey.100", color: "grey.500" }}
                      >
                        <ImageIcon size={20} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={700}>
                          {product.name}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={600}
                          display="block"
                          mt={0.5}
                        >
                          Only{" "}
                          <Typography
                            component="span"
                            variant="caption"
                            color="error.main"
                            fontWeight={800}
                          >
                            {product.quantity}
                          </Typography>{" "}
                          left (Restock at {product.low_stock_threshold})
                        </Typography>
                      }
                    />
                    <ChevronRight
                      size={16}
                      color={theme.palette.text.disabled}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {count > 0 && (
          <Box
            sx={{
              bgcolor: "white",
              borderTop: `1px solid ${theme.palette.divider}`,
              p: 1,
            }}
          >
            <Button
              fullWidth
              endIcon={<ArrowRight size={16} />}
              onClick={() => {
                navigate("/products");
                handleClose();
              }}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                color: "error.main",
                py: 1.5,
                borderRadius: "8px",
                "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.04) },
              }}
            >
              View All Inventory
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
}
