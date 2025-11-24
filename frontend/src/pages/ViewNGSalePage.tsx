"use client";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Divider,
  Stack,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import toast from "react-hot-toast";
import {
  getNonGstSaleById,
  FullNonGstSale,
} from "../lib/api/nonGstSalesService";
import DashboardHeader from "../components/DashboardHeader";
import { Printer } from "lucide-react";

const { ipcRenderer } = window.electron;

// ✅ Create the new print handler function
const handleNonGstPrint = async (saleData: FullNonGstSale) => {
  try {
    const result = await ipcRenderer.invoke("print-non-gst-receipt", saleData);
    if (!result.success) {
      throw new Error(result.error);
    }
    toast.success("Receipt sent to printer.");
  } catch (err: any) {
    toast.error(`Print failed: ${err}`);
  }
};

// Helper component for the final summary
const InfoRow = ({
  label,
  value,
  isBold = false,
  color = "text.primary",
}: {
  label: string;
  value: React.ReactNode;
  isBold?: boolean;
  color?: string;
}) => (
  <Box display="flex" justifyContent="space-between" py={0.5}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography fontWeight={isBold ? 600 : 500} color={color}>
      {value}
    </Typography>
  </Box>
);

export default function ViewNGSalePage() {
  const { id } = useParams<{ id: string }>();
  const [sale, setSale] = useState<FullNonGstSale | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    if (!id) return;
    setLoading(true);
    getNonGstSaleById(Number(id))
      .then(setSale)
      .catch(() => toast.error("Failed to fetch sale details."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handlePrint = () => {
    if (sale) {
      handleNonGstPrint(sale);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={5}>
        <CircularProgress />
      </Box>
    );
  }

  if (!sale) {
    return <Typography sx={{ p: 3 }}>Sale not found.</Typography>;
  }

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        // backgroundColor: "#F4F6F8",

        minHeight: "100vh",
      }}
    >
      <DashboardHeader
        title={`Cash Sale: ${sale.reference_no}`}
        onRefresh={fetchData}
        actions={
          <Button
            variant="contained"
            onClick={handlePrint}
            startIcon={<Printer size={18} />}
          >
            Print Receipt
          </Button>
        }
        showDateFilters={false}
      />

      <Paper
        variant="outlined"
        sx={{ p: 3, mt: 3, maxWidth: "900px", mx: "auto" }}
      >
        {/* --- Header Details --- */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={7}>
            <Typography variant="h6" gutterBottom>
              Sold To:
            </Typography>
            {sale.customer_name ? (
              <>
                <Typography variant="body1" fontWeight="bold">
                  {sale.customer_name}
                </Typography>
                <Typography variant="body2">{sale.customer_address}</Typography>
                <Typography variant="body2">
                  {sale.customer_city}, {sale.customer_state} -{" "}
                  {sale.customer_pincode}
                </Typography>
                <Typography variant="body2">
                  Ph: {sale.customer_phone}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Walk-in Customer
              </Typography>
            )}
          </Grid>
          <Grid item xs={12} md={5} sx={{ textAlign: { md: "right" } }}>
            <Typography variant="body2" color="text.secondary">
              Reference #
            </Typography>
            <Typography variant="body1" fontWeight="bold" gutterBottom>
              {sale.reference_no}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Date
            </Typography>
            <Typography variant="body1" fontWeight="500" gutterBottom>
              {new Date(sale.created_at ?? new Date()).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Status
            </Typography>
            <Chip
              label={sale.status}
              color={sale.status === "paid" ? "success" : "warning"}
              size="small"
            />
          </Grid>
        </Grid>

        {/* --- Items Table --- */}
        <Typography variant="h6" gutterBottom>
          Items
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Sr.</TableCell>
                <TableCell>Product</TableCell>
                <TableCell align="right">Rate</TableCell>
                <TableCell align="center">Qty</TableCell>
                <TableCell align="right">Discount</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sale.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.sr_no}</TableCell>
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell align="right">
                    ₹{item.rate.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell align="center">{item.quantity}</TableCell>
                  <TableCell align="right">
                    {item.discount?.toLocaleString("en-IN")}%
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    ₹{item.price.toLocaleString("en-IN")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 3 }} />

        {/* --- Summary --- */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Typography variant="body2" color="text.secondary">
              Notes:
            </Typography>
            <Typography variant="body1" sx={{ fontStyle: "italic" }}>
              {sale.note || "No notes provided."}
            </Typography>
          </Grid>
          <Grid item xs={12} md={5}>
            <Stack spacing={1}>
              <InfoRow
                label="Sub-Total"
                value={`₹${sale.total_amount.toLocaleString("en-IN")}`}
              />
              <InfoRow
                label="Discount"
                value={`- ₹${Number(sale.discount || 0).toLocaleString(
                  "en-IN"
                )}`}
              />
              <Divider />
              <InfoRow
                label="Grand Total"
                value={`₹${sale.total_amount.toLocaleString("en-IN")}`}
                isBold
              />
              <InfoRow
                label="Amount Paid"
                value={`₹${sale.paid_amount.toLocaleString("en-IN")}`}
              />
              <InfoRow
                label="Amount Due"
                value={`₹${(
                  sale.total_amount - sale.paid_amount
                ).toLocaleString("en-IN")}`}
                isBold
                color={
                  sale.total_amount - sale.paid_amount > 0
                    ? "error.main"
                    : "success.main"
                }
              />
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
