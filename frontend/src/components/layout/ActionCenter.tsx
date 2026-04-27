"use client";

import { useEffect, useState, useCallback } from "react";
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
  Button,
  Card,
  alpha,
  useTheme,
} from "@mui/material";
import {
  BellRing,
  PackageX,
  ArrowRight,
  AlertCircle,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { api } from "../../lib/api/api";

export default function ActionCenter() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [loading, setLoading] = useState(false);

  // Action Data States
  const [missingBatches, setMissingBatches] = useState<any[]>([]);

  // Fetch all action items
  const fetchActionItems = useCallback(async () => {
    setLoading(true);
    try {
      const [missingBatchesRes] = await Promise.all([
        api.get("/api/products/missing-batches").catch(() => ({ data: [] })),
      ]);

      const payload = missingBatchesRes?.data;

      // Handle both direct array responses OR wrapped responses
      if (Array.isArray(payload)) {
        setMissingBatches(payload);
      } else if (payload?.status === "success" || payload?.data) {
        setMissingBatches(payload.data || []);
      } else {
        setMissingBatches([]);
      }
    } catch (error) {
      console.error("Failed to fetch action center data:", error);
      setMissingBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load for badge count
  useEffect(() => {
    fetchActionItems();
  }, [fetchActionItems]);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    fetchActionItems(); // Refresh data when opened
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleClose();
  };

  const open = Boolean(anchorEl);

  // Aggregate total actions across all sections
  const totalActions = missingBatches.length;

  return (
    <>
      <Tooltip title="Action Center">
        <IconButton color="inherit" onClick={handleOpen}>
          <Badge badgeContent={totalActions} color="error" overlap="circular">
            <BellRing size={20} />
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
              width: 440, // Wider for a "panel" feel
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              borderRadius: "16px",
              boxShadow: "0px 12px 40px rgba(0, 0, 0, 0.12)",
              bgcolor: "#f8fafc", // Slight off-white to make cards pop
              overflow: "hidden",
            },
          },
        }}
      >
        {/* --- ACTION CENTER HEADER --- */}
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
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: "primary.main",
                width: 40,
                height: 40,
              }}
            >
              <BellRing size={20} />
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                fontWeight={800}
                color="text.primary"
                lineHeight={1.2}
              >
                Action Center
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {totalActions === 0
                  ? "All caught up! No pending actions."
                  : `${totalActions} items require your attention`}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* --- ACTION CENTER BODY --- */}
        <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
          {loading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              height={200}
            >
              <CircularProgress size={28} />
            </Box>
          ) : totalActions === 0 ? (
            // EMPTY STATE
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
                You're all caught up!
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Your inventory and shop configurations are fully optimized.
              </Typography>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap={2.5}>
              {/* --- SECTION 1: MISSING BATCHES --- */}
              {missingBatches.length > 0 && (
                <Card
                  elevation={0}
                  sx={{
                    border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                    borderRadius: "12px",
                    overflow: "hidden",
                    bgcolor: "white",
                  }}
                >
                  {/* Section Header */}
                  <Box
                    sx={{
                      px: 2,
                      py: 1.5,
                      bgcolor: alpha(theme.palette.error.main, 0.04),
                      borderBottom: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <AlertCircle size={18} color={theme.palette.error.main} />
                      <Typography
                        variant="subtitle2"
                        fontWeight={800}
                        color="error.dark"
                      >
                        Missing Batches
                      </Typography>
                    </Box>
                    <Badge
                      badgeContent={missingBatches.length}
                      color="error"
                      sx={{ "& .MuiBadge-badge": { fontWeight: 800 } }}
                    />
                  </Box>

                  {/* Section List (Max 5 Preview) */}
                  <List disablePadding>
                    {missingBatches.slice(0, 5).map((product, index) => (
                      <Box key={`mb-${product.id}`}>
                        <ListItem disablePadding>
                          <ListItemButton
                            onClick={() =>
                              handleNavigate(`/product/${product.id}`)
                            }
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
                                sx={{
                                  bgcolor: "error.50",
                                  color: "error.main",
                                  width: 40,
                                  height: 40,
                                }}
                              >
                                <PackageX size={20} />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Typography
                                  variant="body2"
                                  fontWeight={700}
                                  color="text.primary"
                                >
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
                                  Untracked Stock:{" "}
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    color="error.main"
                                    fontWeight={800}
                                  >
                                    {product.quantity}
                                  </Typography>
                                </Typography>
                              }
                            />
                            <ChevronRight
                              size={16}
                              color={theme.palette.text.disabled}
                            />
                          </ListItemButton>
                        </ListItem>
                        {index < Math.min(missingBatches.length, 5) - 1 && (
                          <Divider component="li" />
                        )}
                      </Box>
                    ))}
                  </List>

                  {/* Section Footer (View All Link) */}
                  <Box
                    sx={{
                      bgcolor: "grey.50",
                      borderTop: `1px solid ${theme.palette.divider}`,
                      p: 1,
                    }}
                  >
                    <Button
                      fullWidth
                      endIcon={<ArrowRight size={16} />}
                      onClick={() => handleNavigate("/missing-batches")}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        color: "error.main",
                        py: 1,
                        borderRadius: "8px",
                        "&:hover": {
                          bgcolor: alpha(theme.palette.error.main, 0.04),
                        },
                      }}
                    >
                      View All {missingBatches.length} Missing Batches
                    </Button>
                  </Box>
                </Card>
              )}

              {/* --- SECTION 2: FUTURE ACTIONS GO HERE --- */}
              {/* You can easily duplicate the Card structure above for Low Stock, Unpaid Invoices, etc. */}
            </Box>
          )}
        </Box>
      </Popover>
    </>
  );
}
