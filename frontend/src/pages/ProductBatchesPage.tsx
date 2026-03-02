"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Stack,
  Breadcrumbs,
  Link,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Divider,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Printer,
  Calendar,
  AlertCircle,
  Hash,
  PackageOpen,
  Plus,
  MapPin,
  Barcode,
  Factory,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";

import { fetchProductHistory } from "../lib/api/productService";
import { getProductBatches } from "../lib/api/batchService";
import DashboardHeader from "../components/DashboardHeader";
import LabelPrintDialog from "../components/LabelPrintModal";
import AssignBatchModal from "../components/batch/AssignBatchModal";
import { Product } from "../lib/types/product";

// Types mapping to SQL Schema
interface BatchGroup {
  batch_id: number;
  batch_uid?: string;
  batch_number: string;
  barcode?: string;
  expiry_date?: string;
  mfg_date?: string;
  mrp?: number;
  margin?: number;
  mop?: number;
  mfw_price?: string;
  quantity: number;
  location?: string;
  is_active?: number | boolean;
  serials: SerialEntry[];
}

interface SerialEntry {
  id: number;
  serial_number: string;
  status: string; // 'available', 'sold', 'returned', 'defective', 'in_repair', 'adjusted_out'
}

export default function ProductBatchesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [batchGroups, setBatchGroups] = useState<BatchGroup[]>([]);
  const [totalTracked, setTotalTracked] = useState(0);

  // UI State
  const [expandedBatch, setExpandedBatch] = useState<number | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1. Fetch Product Info
      const historyData = await fetchProductHistory(Number(id));
      const prod = historyData.productDetails;
      setProduct(prod);

      if (prod.tracking_type === "none" || !prod.tracking_type) {
        setLoading(false);
        return;
      }

      // 2. Fetch Stock Data
      const rawData = await getProductBatches(
        Number(id),
        prod.tracking_type as "batch" | "serial",
      );

      // 3. Process Data into Groups
      const groups: Record<string, BatchGroup> = {};
      let calculatedTracked = 0;

      if (prod.tracking_type === "serial") {
        rawData.forEach((item: any) => {
          const bId = item.batch_id || 0;
          if (!groups[bId]) {
            groups[bId] = {
              batch_id: bId,
              batch_uid: item.batch_uid,
              batch_number: item.batch_number || "Unknown Batch",
              barcode: item.barcode,
              expiry_date: item.expiry_date,
              mfg_date: item.mfg_date,
              mrp: item.mrp,
              margin: item.margin,
              mop: item.mop,
              mfw_price: item.mfw_price,
              location: item.location,
              is_active: item.is_active,
              quantity: 0,
              serials: [],
            };
          }

          const currentStatus = item.status || "available";
          groups[bId].serials.push({
            id: item.id,
            serial_number: item.serial_number,
            status: currentStatus,
          });

          if (currentStatus === "available") {
            groups[bId].quantity += 1;
            calculatedTracked += 1;
          }
        });
      } else {
        rawData.forEach((item: any) => {
          groups[item.id] = {
            batch_id: item.id,
            batch_uid: item.batch_uid,
            batch_number: item.batch_number,
            barcode: item.barcode,
            expiry_date: item.expiry_date,
            mfg_date: item.mfg_date,
            mrp: item.mrp,
            margin: item.margin,
            mop: item.mop,
            mfw_price: item.mfw_price,
            location: item.location,
            is_active: item.is_active,
            quantity: item.quantity,
            serials: [],
          };
          calculatedTracked += item.quantity || 0;
        });
      }

      setTotalTracked(calculatedTracked);
      setBatchGroups(Object.values(groups));
    } catch (error) {
      console.error(error);
      toast.error("Failed to load batch data");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (batchId: number) => {
    setExpandedBatch(expandedBatch === batchId ? null : batchId);
  };

  const untrackedQuantity = (product?.quantity || 0) - totalTracked;

  // Helper for Serial Status Colors
  const getSerialStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "success";
      case "sold":
        return "default";
      case "returned":
        return "warning";
      case "defective":
        return "error";
      case "in_repair":
        return "info";
      case "adjusted_out":
        return "error";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        height="50vh"
        alignItems="center"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!product) return <Typography p={4}>Product not found</Typography>;

  return (
    <Box p={3} sx={{ minHeight: "100vh", bgcolor: "#f9fafb" }}>
      {/* Navigation Breadcrumbs */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <Button
          startIcon={<ArrowLeft />}
          onClick={() => navigate(-1)}
          sx={{ color: "text.secondary" }}
        >
          Back
        </Button>
        <Breadcrumbs>
          <Link
            underline="hover"
            color="inherit"
            onClick={() => navigate("/products")}
            sx={{ cursor: "pointer" }}
          >
            Products
          </Link>
          <Link
            underline="hover"
            color="inherit"
            onClick={() => navigate(`/product/${id}`)}
            sx={{ cursor: "pointer" }}
          >
            {product.name}
          </Link>
          <Typography color="text.primary" fontWeight={600}>
            Batches & Serials
          </Typography>
        </Breadcrumbs>
      </Stack>

      <DashboardHeader
        title={`Inventory: ${product.name}`}
        showDateFilters={false}
        actions={
          <Button
            variant="contained"
            startIcon={<Printer size={18} />}
            onClick={() => setPrintModalOpen(true)}
          >
            Print Labels
          </Button>
        }
      />

      {product.tracking_type === "none" ? (
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
          <AlertCircle size={48} className="text-gray-400 mx-auto mb-2" />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            This product is not tracked by Batch or Serial.
          </Typography>
          <Typography
            variant="h4"
            fontWeight={700}
            color="primary"
            sx={{ my: 2 }}
          >
            {product.quantity} Units in Stock
          </Typography>
          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => navigate(`/products/${id}`)}
          >
            View Details
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* General / Unassigned Stock Card */}
          {untrackedQuantity !== 0 && (
            <Grid item xs={12} md={6} lg={4}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  borderColor: "warning.light",
                  bgcolor: "warning.50",
                  height: "100%",
                }}
              >
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    mb={2}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        color="warning.dark"
                        fontWeight={700}
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <PackageOpen size={14} /> UNTRACKED STOCK
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        color="text.primary"
                      >
                        General Inventory
                      </Typography>
                    </Box>
                    <Chip
                      label={`${untrackedQuantity} Units`}
                      color={untrackedQuantity > 0 ? "warning" : "error"}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>
                  <Divider sx={{ my: 1.5, borderColor: "warning.200" }} />
                  <Typography variant="body2" color="text.secondary" paragraph>
                    This quantity is recorded in the master inventory but is not
                    assigned to any specific Batch or Serial number.
                  </Typography>

                  {untrackedQuantity > 0 ? (
                    <Button
                      variant="contained"
                      color="warning"
                      fullWidth
                      startIcon={<Plus size={16} />}
                      onClick={() => setAssignModalOpen(true)}
                      sx={{ mt: 1, boxShadow: 0 }}
                    >
                      Assign to Batch
                    </Button>
                  ) : (
                    <Typography
                      variant="caption"
                      color="error"
                      fontWeight={600}
                      display="flex"
                      alignItems="center"
                      gap={0.5}
                      mt={1}
                    >
                      <ShieldAlert size={14} /> Warning: Tracked stock exceeds
                      master inventory count.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Batch Cards */}
          {batchGroups.length === 0 && untrackedQuantity === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  No active batches found and stock is 0.
                </Typography>
              </Paper>
            </Grid>
          ) : (
            batchGroups.map((batch) => (
              <Grid item xs={12} md={6} lg={4} key={batch.batch_id}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 3,
                    borderColor: "divider",
                    transition: "box-shadow 0.2s, transform 0.2s",
                    "&:hover": { boxShadow: 4, transform: "translateY(-2px)" },
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                  }}
                >
                  <CardContent sx={{ pb: 1, flexGrow: 1 }}>
                    {/* Header: Batch Number & Status */}
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      mb={2}
                    >
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={600}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          <Hash size={12} /> BATCH
                        </Typography>
                        <Typography variant="h6" fontWeight={800}>
                          {batch.batch_number}
                        </Typography>
                        {batch.batch_uid && (
                          <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{ fontFamily: "monospace" }}
                          >
                            UID: {batch.batch_uid}
                          </Typography>
                        )}
                      </Box>
                      <Stack alignItems="flex-end" spacing={1}>
                        <Chip
                          label={
                            product.tracking_type === "serial"
                              ? `${batch.quantity} Available`
                              : `${batch.quantity} Units`
                          }
                          color={batch.quantity > 0 ? "success" : "default"}
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                        {batch.is_active === 0 || batch.is_active === false ? (
                          <Chip
                            label="Inactive"
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        ) : null}
                      </Stack>
                    </Stack>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Dates & Location info */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={6}>
                        <Stack spacing={0.5}>
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={1}
                            color="text.secondary"
                          >
                            <Factory size={14} />
                            <Typography variant="caption">Mfg Date</Typography>
                          </Box>
                          <Typography variant="body2" fontWeight={600}>
                            {batch.mfg_date
                              ? new Date(batch.mfg_date).toLocaleDateString()
                              : "--"}
                          </Typography>
                        </Stack>
                      </Grid>
                      <Grid item xs={6}>
                        <Stack spacing={0.5}>
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={1}
                            color="text.secondary"
                          >
                            <Calendar size={14} />
                            <Typography variant="caption">Expiry</Typography>
                          </Box>
                          <Typography variant="body2" fontWeight={600}>
                            {batch.expiry_date
                              ? new Date(batch.expiry_date).toLocaleDateString()
                              : "--"}
                          </Typography>
                        </Stack>
                      </Grid>

                      <Grid item xs={6}>
                        <Stack spacing={0.5}>
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={1}
                            color="text.secondary"
                          >
                            <MapPin size={14} />
                            <Typography variant="caption">Location</Typography>
                          </Box>
                          <Typography variant="body2" fontWeight={600}>
                            {batch.location || "--"}
                          </Typography>
                        </Stack>
                      </Grid>
                      <Grid item xs={6}>
                        <Stack spacing={0.5}>
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={1}
                            color="text.secondary"
                          >
                            <Barcode size={14} />
                            <Typography variant="caption">Barcode</Typography>
                          </Box>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{
                              fontFamily: batch.barcode
                                ? "monospace"
                                : "inherit",
                            }}
                          >
                            {batch.barcode || "--"}
                          </Typography>
                        </Stack>
                      </Grid>
                    </Grid>

                    {/* Pricing Block */}
                    <Box
                      sx={{
                        bgcolor: "grey.50",
                        p: 1.5,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "grey.200",
                      }}
                    >
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            MRP
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            color="primary.main"
                          >
                            ₹{batch.mrp?.toFixed(2) || "0.00"}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            MOP
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            ₹{batch.mop?.toFixed(2) || "0.00"}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="flex"
                            alignItems="center"
                            gap={0.5}
                          >
                            Margin
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {batch.margin}%
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            MFW Price
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {batch.mfw_price ? `₹${batch.mfw_price}` : "--"}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </CardContent>

                  {/* Actions & Expansion */}
                  <CardActions
                    sx={{
                      px: 2,
                      pb: 2,
                      pt: 1,
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    {product.tracking_type === "serial" ? (
                      <Button
                        size="small"
                        onClick={() => toggleExpand(batch.batch_id)}
                        endIcon={
                          expandedBatch === batch.batch_id ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )
                        }
                        sx={{
                          textTransform: "none",
                          color: "text.primary",
                          fontWeight: 600,
                        }}
                      >
                        {expandedBatch === batch.batch_id ? "Hide" : "View"}{" "}
                        {batch.serials.length} Serials
                      </Button>
                    ) : (
                      <Box /> // Spacer
                    )}

                    <Tooltip title="Print Labels for this Batch">
                      <IconButton
                        size="small"
                        sx={{
                          color: "primary.main",
                          bgcolor: "primary.lighter",
                          "&:hover": {
                            bgcolor: "primary.light",
                            color: "#fff",
                          },
                        }}
                        onClick={() => setPrintModalOpen(true)}
                      >
                        <Printer size={18} />
                      </IconButton>
                    </Tooltip>
                  </CardActions>

                  <Collapse
                    in={expandedBatch === batch.batch_id}
                    timeout="auto"
                    unmountOnExit
                  >
                    <Box
                      sx={{
                        bgcolor: "grey.50",
                        borderTop: "1px solid",
                        borderColor: "divider",
                        maxHeight: "250px",
                        overflowY: "auto",
                      }}
                    >
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell
                              sx={{
                                color: "text.secondary",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                bgcolor: "grey.100",
                              }}
                            >
                              SERIAL NUMBER
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                color: "text.secondary",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                bgcolor: "grey.100",
                              }}
                            >
                              STATUS
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {batch.serials.length > 0 ? (
                            batch.serials.map((sn) => (
                              <TableRow
                                key={sn.id}
                                hover
                                sx={{
                                  "&:last-child td, &:last-child th": {
                                    border: 0,
                                  },
                                }}
                              >
                                <TableCell
                                  sx={{
                                    fontFamily: "monospace",
                                    fontSize: "0.85rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  {sn.serial_number}
                                </TableCell>
                                <TableCell align="right">
                                  <Chip
                                    label={sn.status.replace("_", " ")}
                                    size="small"
                                    color={
                                      getSerialStatusColor(sn.status) as any
                                    }
                                    sx={{
                                      height: 22,
                                      fontSize: "0.7rem",
                                      fontWeight: 600,
                                      textTransform: "capitalize",
                                    }}
                                  />
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={2}
                                align="center"
                                sx={{ py: 3, color: "text.secondary" }}
                              >
                                No serials found for this batch.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </Box>
                  </Collapse>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* --- Modals --- */}
      {product && (
        <>
          <AssignBatchModal
            open={assignModalOpen}
            onClose={() => setAssignModalOpen(false)}
            product={product}
            maxQuantity={untrackedQuantity}
            onSuccess={loadData}
          />
          <LabelPrintDialog
            open={printModalOpen}
            onClose={() => setPrintModalOpen(false)}
            product={product}
          />
        </>
      )}
    </Box>
  );
}
