"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Box,
  Chip,
} from "@mui/material";
import { Info, TrendingUp, Package, AlertCircle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ProductABCInfoModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Info color="#1976d2" />
          <Typography variant="h6">About ABC Analysis</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" paragraph>
          ABC Analysis helps you categorize your inventory based on revenue
          importance. It follows the{" "}
          <strong>Pareto Principle (80/20 rule)</strong>.
        </Typography>

        <Stack spacing={3} mt={2}>
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
              <TrendingUp size={20} color="#2e7d32" />
              <Typography variant="subtitle1" fontWeight="bold">
                Class A (High Value)
              </Typography>
              <Chip
                label="Top 80% Revenue"
                size="small"
                color="success"
                variant="outlined"
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
              The top 20% of items that generate the majority of your income.
              <br />
              <strong>Action:</strong> Keep strictly in stock. Review prices
              often. These are your money makers.
            </Typography>
          </Box>

          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
              <Package size={20} color="#ed6c02" />
              <Typography variant="subtitle1" fontWeight="bold">
                Class B (Medium Value)
              </Typography>
              <Chip
                label="Next 15% Revenue"
                size="small"
                color="warning"
                variant="outlined"
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
              The middle 30% of items.
              <br />
              <strong>Action:</strong> Maintain standard stock levels. Reorder
              regularly.
            </Typography>
          </Box>

          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
              <AlertCircle size={20} color="#d32f2f" />
              <Typography variant="subtitle1" fontWeight="bold">
                Class C (Low Value)
              </Typography>
              <Chip
                label="Bottom 5% Revenue"
                size="small"
                color="error"
                variant="outlined"
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
              The bottom 50% of items that contribute very little to sales.
              <br />
              <strong>Action:</strong> These tie up cash and shelf space.
              Consider clearing them out or ordering less frequently.
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Understood
        </Button>
      </DialogActions>
    </Dialog>
  );
}
