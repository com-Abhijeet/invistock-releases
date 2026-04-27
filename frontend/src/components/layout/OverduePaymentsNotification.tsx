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
  ListSubheader,
  Chip,
  Tooltip,
  ListItemButton,
  Button,
  useTheme,
  alpha,
  Avatar,
} from "@mui/material";
import {
  BookAlert,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  UserCircle,
} from "lucide-react";
import {
  fetchCustomerOverdueSummary,
  OverdueSummary,
} from "../../lib/api/customerService";
import { useNavigate } from "react-router-dom";

export default function OverduePaymentsNotification() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<OverdueSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const loadSummary = () => {
    fetchCustomerOverdueSummary()
      .then(setSummary)
      .catch((err) => console.error("Failed to fetch overdue summary:", err));
  };

  useEffect(() => {
    loadSummary();
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

  const handleClose = () => setAnchorEl(null);
  const handleItemClick = (id: number) => {
    navigate(`/customer/${id}`);
    handleClose();
  };
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
          <Badge badgeContent={badgeCount} color="error" overlap="circular">
            <BookAlert size={20} />
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
              width: 440,
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
              <BookAlert size={20} />
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                fontWeight={800}
                color="text.primary"
                lineHeight={1.2}
              >
                Overdue Payments
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {badgeCount === 0
                  ? "No pending payments."
                  : `${badgeCount} customers have outstanding balances.`}
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
          ) : badgeCount === 0 ? (
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
                Ledgers are Clear!
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                You currently have no customers with overdue bill payments.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {summary?.buckets.map(
                (bucket) =>
                  bucket.customers.length > 0 && (
                    <Box key={bucket.range}>
                      <ListSubheader
                        sx={{
                          bgcolor: "grey.100",
                          fontWeight: 800,
                          color: "text.primary",
                          py: 1,
                          lineHeight: 1.5,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                          borderTop: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        Delay: {bucket.range}
                      </ListSubheader>
                      {bucket.customers.map((customer) => (
                        <ListItem
                          key={customer.id}
                          disablePadding
                          divider
                          sx={{ bgcolor: "white" }}
                        >
                          <ListItemButton
                            onClick={() => handleItemClick(customer.id)}
                            sx={{
                              py: 1.5,
                              px: 2,
                              "&:hover": {
                                bgcolor: alpha(theme.palette.error.main, 0.02),
                              },
                            }}
                          >
                            <Box
                              sx={{
                                mr: 2,
                                color: "text.secondary",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <UserCircle size={32} strokeWidth={1.5} />
                            </Box>
                            <ListItemText
                              primary={
                                <Typography variant="body2" fontWeight={700}>
                                  {customer.name}
                                </Typography>
                              }
                              secondary={
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  fontWeight={500}
                                  mt={0.5}
                                  display="block"
                                >
                                  {customer.overdue_bills_count} bill
                                  {customer.overdue_bills_count > 1
                                    ? "s"
                                    : ""}{" "}
                                  pending
                                </Typography>
                              }
                            />
                            <Box display="flex" alignItems="center" gap={1.5}>
                              <Chip
                                label={`₹${customer.total_due.toLocaleString("en-IN")}`}
                                color="error"
                                size="small"
                                sx={{ fontWeight: 800, borderRadius: "6px" }}
                              />
                              <ChevronRight
                                size={16}
                                color={theme.palette.text.disabled}
                              />
                            </Box>
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </Box>
                  ),
              )}
            </List>
          )}
        </Box>

        {/* Footer */}
        {badgeCount > 0 && (
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
                color: "error.main",
                py: 1.5,
                borderRadius: "8px",
                "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.04) },
              }}
            >
              Review All Customer Ledgers
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
}
