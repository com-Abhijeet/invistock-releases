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
  Chip,
  Button,
} from "@mui/material";
import { CalendarClock, Package, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api/api"; // Adjust import based on your api structure

// --- API Service Interfaces & Functions ---
// You can move these to a separate batchExpiryService.ts file later
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
    headers: {
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  });

  return response.data;
};

// --- Component ---
export default function ExpiringItemsNotification() {
  const [count, setCount] = useState(0);
  const [batches, setBatches] = useState<ExpiringBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const navigate = useNavigate();

  // 1. Fetch the data on initial load to get the count
  const loadNotifications = () => {
    fetchExpiryNotifications()
      .then((res) => {
        setCount(res.count);
        // We can pre-load the batches here since the payload is lightweight (<= 7 days)
        setBatches(res.data);
      })
      .catch((err) => console.error("Failed to fetch expiry count:", err));
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // 2. Refresh data when popover opens just to be safe
  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setLoading(true);
    fetchExpiryNotifications()
      .then((res) => {
        setCount(res.count);
        setBatches(res.data);
      })
      .catch((err) => console.error("Failed to fetch expiry list:", err))
      .finally(() => setLoading(false));
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleItemClick = (productId: number) => {
    navigate(`/product/${productId}`); // Navigate to the product detail page
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
          <Badge badgeContent={count} color="warning">
            <CalendarClock />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            width: 380,
            maxHeight: 500,
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" component="div">
            Expiring Soon
          </Typography>
          {count > 0 && (
            <Chip size="small" color="warning" label={`${count} Alerts`} />
          )}
        </Box>
        <Divider />

        <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
          {loading ? (
            <Box display="flex" justifyContent="center" my={3}>
              <CircularProgress />
            </Box>
          ) : (
            <List dense disablePadding>
              {batches.length === 0 ? (
                <Typography
                  sx={{ p: 3, color: "text.secondary", textAlign: "center" }}
                >
                  No batches are expiring in the next 7 days.
                </Typography>
              ) : (
                batches.map((batch) => (
                  <ListItem key={batch.id} disablePadding divider>
                    <ListItemButton
                      onClick={() => handleItemClick(batch.product_id)}
                      sx={{ py: 1.5 }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          variant="rounded"
                          sx={{
                            bgcolor:
                              batch.days_left < 0
                                ? "error.light"
                                : "warning.light",
                          }}
                        >
                          <Package
                            color={batch.days_left < 0 ? "#d32f2f" : "#ed6c02"}
                          />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight="bold">
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
                            >
                              Batch: <b>{batch.batch_number}</b> • Qty:{" "}
                              {batch.quantity}
                            </Typography>
                            <Typography
                              variant="caption"
                              color={
                                batch.days_left < 0
                                  ? "error.main"
                                  : "warning.main"
                              }
                              fontWeight="bold"
                            >
                              {batch.days_left < 0
                                ? `Expired ${Math.abs(batch.days_left)} days ago`
                                : `Expiring in ${batch.days_left} days`}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))
              )}
            </List>
          )}
        </Box>

        {/* View All Button */}
        <Box
          sx={{
            p: 1,
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "grey.50",
          }}
        >
          <Button
            fullWidth
            onClick={handleViewAll}
            endIcon={<ArrowRight size={16} />}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            View All Expiry Reports
          </Button>
        </Box>
      </Popover>
    </>
  );
}
