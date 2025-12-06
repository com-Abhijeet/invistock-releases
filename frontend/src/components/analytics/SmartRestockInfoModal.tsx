"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Divider,
  Alert,
} from "@mui/material";
import { Info, TrendingUp, AlertTriangle, Clock } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SmartRestockInfoModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Info color="#1976d2" />
          <Typography variant="h6">How Smart Restock Works</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" paragraph>
          InviStock analyzes your sales history from the last{" "}
          <strong>30 days</strong> to predict exactly when you will run out of
          stock.
        </Typography>

        <Stack spacing={3} mt={2}>
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
              <TrendingUp size={20} color="#2e7d32" />
              <Typography variant="subtitle2" fontWeight="bold">
                Sales Velocity (Sales/Day)
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ pl: 4, display: "block" }}
            >
              The average number of units you sell per day. Calculated as:{" "}
              <br />
              <code>Total Sold (Last 30 Days) ÷ 30</code>
            </Typography>
          </Box>

          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
              <Clock size={20} color="#ed6c02" />
              <Typography variant="subtitle2" fontWeight="bold">
                Days Left
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ pl: 4, display: "block" }}
            >
              How long your current stock will last at the current sales speed.
              <br />
              <code>Current Stock ÷ Sales Velocity</code>
            </Typography>
          </Box>

          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
              <AlertTriangle size={20} color="#d32f2f" />
              <Typography variant="subtitle2" fontWeight="bold">
                Buy Qty (Recommendation)
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ pl: 4, display: "block" }}
            >
              The quantity you need to buy to have enough stock for the next{" "}
              <strong>30 days</strong>.<br />
              <code>(Sales Velocity × 30) - Current Stock</code>
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Alert severity="info" sx={{ alignItems: "center" }}>
          <Typography variant="caption">
            <strong>Note on Capital Required:</strong> This is calculated using
            the
            <strong> Average Purchase Price</strong>. If it shows ₹0, it means
            you haven't recorded a purchase price for that item yet.
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Understood
        </Button>
      </DialogActions>
    </Dialog>
  );
}
