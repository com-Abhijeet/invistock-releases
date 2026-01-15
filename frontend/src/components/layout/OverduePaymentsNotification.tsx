"use client";

import { useEffect, useState } from "react";
import {
  IconButton,
  Badge,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Box,
  Divider,
  ListSubheader,
  Chip,
  Tooltip,
  ListItemButton,
  Button, // ✅ Added Button import
} from "@mui/material";
import { BookAlert } from "lucide-react";
import {
  fetchCustomerOverdueSummary,
  OverdueSummary,
} from "../../lib/api/customerService"; //
import { useNavigate } from "react-router-dom"; //

export default function OverduePaymentsNotification() {
  const [summary, setSummary] = useState<OverdueSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const navigate = useNavigate();

  const loadSummary = () => {
    fetchCustomerOverdueSummary()
      .then(setSummary)
      .catch((err) => console.error("Failed to fetch overdue summary:", err));
  };

  useEffect(() => {
    loadSummary();
    // Also, refresh the count every 5 minutes
    const interval = setInterval(loadSummary, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setLoading(true);
    fetchCustomerOverdueSummary()
      .then(setSummary)
      .finally(() => setLoading(false));
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleItemClick = (id: number) => {
    navigate(`/customer/${id}`); // Navigate to the customer detail page
    handleClose();
  };

  // ✅ New Handler for the View All button
  const handleViewAll = () => {
    navigate("/customers/accounts");
    handleClose();
  };

  const open = Boolean(anchorEl);
  const badgeCount = summary?.totalOverdueCustomers || 0;

  return (
    <>
      <Tooltip title="Overdue Payments">
        <IconButton color="inherit" onClick={handleOpen}>
          <Badge badgeContent={badgeCount} color="error">
            <BookAlert />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { width: 400, maxHeight: 450 } }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" component="div">
            Overdue Payments
          </Typography>
        </Box>
        <Divider />

        {loading ? (
          <Box display="flex" justifyContent="center" my={3}>
            <CircularProgress />
          </Box>
        ) : (
          <List dense disablePadding>
            {badgeCount === 0 ? (
              <Typography sx={{ p: 2, color: "text.secondary" }}>
                No customers have overdue payments.
              </Typography>
            ) : (
              summary?.buckets.map(
                (bucket) =>
                  bucket.customers.length > 0 && (
                    <li key={bucket.range}>
                      <ul>
                        <ListSubheader
                          sx={{ fontWeight: "bold", bgcolor: "grey.100" }}
                        >
                          {bucket.range}
                        </ListSubheader>
                        {bucket.customers.map((customer) => (
                          <ListItem
                            key={customer.id}
                            disablePadding
                            secondaryAction={
                              <Chip
                                label={`₹${customer.total_due.toLocaleString(
                                  "en-IN"
                                )}`}
                                color="error"
                                size="small"
                                sx={{ mr: 1 }}
                              />
                            }
                          >
                            <ListItemButton
                              onClick={() => handleItemClick(customer.id)}
                            >
                              <ListItemText
                                primary={customer.name}
                                secondary={`${customer.overdue_bills_count} bill(s) overdue`}
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </ul>
                    </li>
                  )
              )
            )}
          </List>
        )}

        {/* ✅ New Footer Section */}
        <Divider />
        <Box sx={{ p: 1 }}>
          <Button fullWidth onClick={handleViewAll} color="primary">
            View All Accounts
          </Button>
        </Box>
      </Popover>
    </>
  );
}
