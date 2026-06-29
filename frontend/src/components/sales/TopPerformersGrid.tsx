"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import theme from "../../../theme";
import {
  fetchTopCustomers,
  fetchTopProducts,
  fetchPaymentModeBreakdown,
  fetchCreditSales,
} from "../../lib/api/salesStatsService";
import type { DashboardFilter, ApiFilterParams } from "../../lib/types/inventoryDashboardTypes";
import type { TopCustomer, TopProduct, PaymentModeBreakdown } from "../../lib/types/salesStatsTypes";
import { DataCard } from "../../components/DataCard";
import { CreditCard } from "lucide-react";

interface Props {
  filters: DashboardFilter;
}

const currency = (val: number | undefined) => (val ? `₹${val.toLocaleString("en-IN")}` : "₹0");

export default function TopPerformersGrid({ filters }: Props) {
  const [customers, setCustomers] = useState<TopCustomer[]>([]);
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [payments, setPayments] = useState<PaymentModeBreakdown[]>([]);
  const [creditSales, setCreditSales] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const apiParams: ApiFilterParams = {
        filter: filters.filter!,
        startDate: filters.from,
        endDate: filters.to,
        query: filters.query,
      };

      try {
        const [cust, prod, pay, credit] = await Promise.all([
          fetchTopCustomers(apiParams),
          fetchTopProducts(apiParams),
          fetchPaymentModeBreakdown(apiParams),
          fetchCreditSales(apiParams),
        ]);
        setCustomers(cust);
        setProducts(prod);
        setPayments(pay);
        setCreditSales(credit);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box mt={3}>
      <Grid container spacing={2}>
        {/* Top 5 Products */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: "12px", height: '100%', boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>Top 5 Products</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontWeight: '500' }}>{p.name}</TableCell>
                      <TableCell align="right">{p.qty}</TableCell>
                      <TableCell align="right" sx={{ color: theme.palette.success.main, fontWeight: 'bold' }}>{currency(p.revenue)}</TableCell>
                    </TableRow>
                  ))}
                  {products.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">No data</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Top 5 Customers */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: "12px", height: '100%', boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>Top 5 Customers</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customers.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontWeight: '500' }}>{c.name}</TableCell>
                      <TableCell align="right" sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>{currency(c.sales)}</TableCell>
                    </TableRow>
                  ))}
                  {customers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} align="center">No data</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Payment Modes & Credit */}
        <Grid item xs={12} md={4}>
          <Box display="flex" flexDirection="column" gap={2} height="100%">
            <DataCard
              title="Credit Sales Volume"
              value={currency(creditSales)}
              icon={<CreditCard size={24} />}
              color={theme.palette.error.main}
            />
            
            <Paper sx={{ p: 2, borderRadius: "12px", flexGrow: 1, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <Typography variant="h6" fontWeight="bold" mb={2}>Payment Modes</Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {payments.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell sx={{ textTransform: 'capitalize', fontWeight: '500' }}>{p.mode}</TableCell>
                        <TableCell align="right">{currency(p.amount)}</TableCell>
                        <TableCell align="right" sx={{ color: theme.palette.text.secondary }}>{p.percentage}%</TableCell>
                      </TableRow>
                    ))}
                    {payments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">No data</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
