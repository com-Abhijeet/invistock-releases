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
  IndianRupee,
} from "lucide-react";
import toast from "react-hot-toast";

import { fetchProductHistory } from "../lib/api/productService";
import { getProductBatches } from "../lib/api/batchService";
import DashboardHeader from "../components/DashboardHeader";
// Adjust this import path based on where you placed the file
import LabelPrintDialog from "../components/LabelPrintModal";
import { Product } from "../lib/types/product";

// Types for our local state
interface BatchGroup {
  batch_id: number;
  batch_number: string;
  batch_uid?: string;
  expiry_date?: string;
  mrp?: number;
  quantity: number;
  serials: SerialEntry[];
}

interface SerialEntry {
  id: number;
  serial_number: string;
  status: string;
}

export default function ProductBatchesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [batchGroups, setBatchGroups] = useState<BatchGroup[]>([]);

  // UI State
  const [expandedBatch, setExpandedBatch] = useState<number | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

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
      // Fix: Explicitly cast tracking_type to satisfy the API signature
      const rawData = await getProductBatches(
        Number(id),
        prod.tracking_type as "batch" | "serial"
      );

      // 3. Process Data into Groups
      const groups: Record<string, BatchGroup> = {};

      if (prod.tracking_type === "serial") {
        // Raw data is a list of serials with batch info
        rawData.forEach((item: any) => {
          const bId = item.batch_id || 0;
          if (!groups[bId]) {
            groups[bId] = {
              batch_id: bId,
              batch_number: item.batch_number || "Unknown Batch",
              expiry_date: item.expiry_date,
              mrp: item.mrp,
              quantity: 0,
              serials: [],
            };
          }

          // Normalize status: treat missing status as 'available' for both display and counting
          const currentStatus = item.status || "available";

          groups[bId].serials.push({
            id: item.id,
            serial_number: item.serial_number,
            status: currentStatus,
          });

          // Count only 'available' serials towards the batch quantity
          if (currentStatus === "available") {
            groups[bId].quantity += 1;
          }
        });
      } else {
        // Batch Tracking: Raw data is a list of batches
        rawData.forEach((item: any) => {
          groups[item.id] = {
            batch_id: item.id,
            batch_number: item.batch_number,
            batch_uid: item.batch_uid,
            expiry_date: item.expiry_date,
            mrp: item.mrp,
            quantity: item.quantity,
            serials: [],
          };
        });
      }

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
          <Typography color="text.primary">Batches</Typography>
        </Breadcrumbs>
      </Stack>

      <DashboardHeader
        title={`Batch Management: ${product.name}`}
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
          <Typography variant="h6" color="text.secondary">
            This product is not tracked by Batch or Serial.
          </Typography>
          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => navigate(`/products/${id}`)}
          >
            Go Back
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {batchGroups.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  No active batches found.
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
                    transition: "box-shadow 0.2s",
                    "&:hover": { boxShadow: 4 },
                  }}
                >
                  <CardContent sx={{ pb: 1 }}>
                    {/* Header */}
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
                          }}
                        >
                          <Hash size={12} /> BATCH NUMBER
                        </Typography>
                        <Typography variant="h6" fontWeight={700}>
                          {batch.batch_number}
                        </Typography>
                      </Box>
                      <Chip
                        label={
                          product.tracking_type === "serial"
                            ? `${batch.quantity} Available`
                            : `${batch.quantity} Units`
                        }
                        color={batch.quantity > 0 ? "success" : "warning"}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </Stack>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Details Grid */}
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Stack spacing={0.5}>
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={1}
                            color="text.secondary"
                          >
                            <Calendar size={14} />
                            <Typography variant="caption">
                              Expiry Date
                            </Typography>
                          </Box>
                          <Typography variant="body2" fontWeight={500}>
                            {batch.expiry_date
                              ? new Date(batch.expiry_date).toLocaleDateString()
                              : "N/A"}
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
                            <IndianRupee size={14} />
                            <Typography variant="caption">MRP</Typography>
                          </Box>
                          <Typography variant="body2" fontWeight={500}>
                            ₹{batch.mrp || 0}
                          </Typography>
                        </Stack>
                      </Grid>
                    </Grid>
                  </CardContent>

                  {/* Actions Area */}
                  <CardActions
                    sx={{
                      px: 2,
                      pb: 2,
                      pt: 0,
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
                        sx={{ textTransform: "none", color: "text.secondary" }}
                      >
                        {expandedBatch === batch.batch_id ? "Hide" : "View"}{" "}
                        {batch.serials.length} Serials
                      </Button>
                    ) : (
                      <Box />
                    )}

                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => setPrintModalOpen(true)}
                      title="Print Labels for this Batch"
                    >
                      <Printer size={18} />
                    </IconButton>
                  </CardActions>

                  {/* Collapsible Serial List */}
                  <Collapse
                    in={expandedBatch === batch.batch_id}
                    timeout="auto"
                    unmountOnExit
                  >
                    <Box
                      sx={{
                        bgcolor: "grey.50",
                        borderTop: "1px solid #eee",
                        p: 0,
                      }}
                    >
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell
                              sx={{
                                color: "text.secondary",
                                fontSize: "0.75rem",
                              }}
                            >
                              Serial Number
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                color: "text.secondary",
                                fontSize: "0.75rem",
                              }}
                            >
                              Status
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {batch.serials.map((sn) => (
                            <TableRow key={sn.id}>
                              <TableCell
                                sx={{
                                  fontFamily: "monospace",
                                  fontSize: "0.85rem",
                                }}
                              >
                                {sn.serial_number}
                              </TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={sn.status}
                                  size="small"
                                  variant="outlined"
                                  color={
                                    sn.status === "available"
                                      ? "success"
                                      : "default"
                                  }
                                  sx={{ height: 20, fontSize: "0.7rem" }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
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

      {/* Print Modal */}
      {product && (
        <LabelPrintDialog
          open={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          product={product}
        />
      )}
    </Box>
  );
}
