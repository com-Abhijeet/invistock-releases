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
  CalendarClock,
  Package,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api/api";

export interface ExpiringBatch {
  id: number;
  product_id: number;
  product_name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  location: string;
  days_left: number;
  status: string;
}

const fetchExpiryNotifications = async (): Promise<{
  count: number;
  data: ExpiringBatch[];
}> => {
  const response = await api.get("/api/batches/expiry/notifications", {
    headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
  });
  return response.data;
};

export default function ExpiringItemsNotification() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [batches, setBatches] = useState<ExpiringBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const loadNotifications = () => {
    fetchExpiryNotifications()
      .then((res) => {
        setCount(res.count);
        setBatches(res.data);
      })
      .catch((err) => console.error("Failed to fetch expiry count:", err));
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setLoading(true);
    fetchExpiryNotifications()
      .then((res) => {
        setCount(res.count);
        setBatches(res.data);
      })
      .finally(() => setLoading(false));
  };

  const handleClose = () => setAnchorEl(null);
  const handleItemClick = (productId: number) => {
    navigate(`/product/${productId}`);
    handleClose();
  };
  const handleViewAll = () => {
    navigate(`/expiry-report`);
    handleClose();
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Expiry Alerts (7 Days)">
        <IconButton color="inherit" onClick={handleOpen}>
          <Badge badgeContent={count} color="warning" overlap="circular">
            <CalendarClock size={20} />
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
                bgcolor: alpha(theme.palette.warning.main, 0.1),
                color: "warning.dark",
                width: 40,
                height: 40,
              }}
            >
              <CalendarClock size={20} />
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                fontWeight={800}
                color="text.primary"
                lineHeight={1.2}
              >
                Expiring Soon
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {count === 0
                  ? "No upcoming expiries."
                  : `${count} batches expiring in the next 7 days.`}
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
                Stock is Fresh!
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                You have no tracked batches expiring within the next week.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {batches.map((batch) => {
                const isExpired = batch.days_left < 0;
                return (
                  <ListItem
                    key={batch.id}
                    disablePadding
                    divider
                    sx={{ bgcolor: "white" }}
                  >
                    <ListItemButton
                      onClick={() => handleItemClick(batch.product_id)}
                      sx={{
                        py: 1.5,
                        px: 2,
                        "&:hover": {
                          bgcolor: alpha(theme.palette.warning.main, 0.02),
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          variant="rounded"
                          sx={{
                            bgcolor: isExpired ? "error.50" : "warning.50",
                            color: isExpired ? "error.main" : "warning.dark",
                          }}
                        >
                          <Package size={20} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight={700}>
                            {batch.product_name}
                          </Typography>
                        }
                        secondary={
                          <Box
                            sx={{
                              mt: 0.5,
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.5,
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              fontWeight={500}
                            >
                              Batch: {batch.batch_number} • Qty:{" "}
                              {batch.quantity}
                            </Typography>
                            <Typography
                              variant="caption"
                              color={isExpired ? "error.main" : "warning.dark"}
                              fontWeight={800}
                            >
                              {isExpired
                                ? `Expired ${Math.abs(batch.days_left)} days ago`
                                : `Expiring in ${batch.days_left} days`}
                            </Typography>
                          </Box>
                        }
                      />
                      <ChevronRight
                        size={16}
                        color={theme.palette.text.disabled}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
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
              onClick={handleViewAll}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                color: "warning.dark",
                py: 1.5,
                borderRadius: "8px",
                "&:hover": { bgcolor: alpha(theme.palette.warning.main, 0.04) },
              }}
            >
              View Full Expiry Report
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
}
