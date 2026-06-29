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
  fetchTopSuppliers,
  fetchTopPurchasedProducts,
  fetchPurchasePaymentModeBreakdown,
} from "../../lib/api/purchaseStatsService";
import type { DashboardFilter } from "../../lib/types/inventoryDashboardTypes";
import type { TopSupplierStat, TopPurchasedProduct, PurchasePaymentModeBreakdown } from "../../lib/types/purchaseStatsTypes";

interface Props {
  filters: DashboardFilter;
}

const currency = (val: number | undefined) => (val ? `₹${val.toLocaleString("en-IN")}` : "₹0");

export default function PurchaseTopPerformersGrid({ filters }: Props) {
  const [suppliers, setSuppliers] = useState<TopSupplierStat[]>([]);
  const [products, setProducts] = useState<TopPurchasedProduct[]>([]);
  const [payments, setPayments] = useState<PurchasePaymentModeBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const apiParams: any = {
        filter: filters.filter,
        startDate: filters.from,
        endDate: filters.to,
      };

      try {
        const [supp, prod, pay] = await Promise.all([
          fetchTopSuppliers(apiParams),
          fetchTopPurchasedProducts(apiParams),
          fetchPurchasePaymentModeBreakdown(apiParams),
        ]);
        setSuppliers(supp?.topByAmount || []);
        setProducts(prod);
        setPayments(pay);
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
                    <TableCell align="right">Spend</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontWeight: '500' }}>{p.name}</TableCell>
                      <TableCell align="right">{p.qty}</TableCell>
                      <TableCell align="right" sx={{ color: theme.palette.error.main, fontWeight: 'bold' }}>{currency(p.revenue)}</TableCell>
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

        {/* Top 5 Suppliers */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: "12px", height: '100%', boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>Top 5 Suppliers</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Supplier</TableCell>
                    <TableCell align="right">Spend</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {suppliers.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontWeight: '500' }}>{s.supplier_name}</TableCell>
                      <TableCell align="right" sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>{currency(s.total)}</TableCell>
                    </TableRow>
                  ))}
                  {suppliers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} align="center">No data</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Payment Modes */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: "12px", height: '100%', boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
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
        </Grid>
      </Grid>
    </Box>
  );
}
