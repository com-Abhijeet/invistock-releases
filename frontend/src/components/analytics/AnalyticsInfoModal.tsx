"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Stack,
} from "@mui/material";
import { Info, Trophy, UserX, Users, UserPlus } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AnalyticsInfoModal({ open, onClose }: Props) {
  const segments = [
    {
      title: "VIP Customer",
      icon: <Trophy size={20} />,
      color: "warning", // Gold/Orange
      description:
        "High-value customers who have spent more than ₹50,000 in total lifetime revenue.",
    },
    {
      title: "Regular Customer",
      icon: <Users size={20} />,
      color: "primary", // Blue
      description:
        "Active customers with multiple purchases who visit frequently (last seen within 90 days).",
    },
    {
      title: "New Customer",
      icon: <UserPlus size={20} />,
      color: "info", // Light Blue
      description: "Customers who have made exactly one purchase.",
    },
    {
      title: "Dormant (At Risk)",
      icon: <UserX size={20} />,
      color: "error", // Red
      description:
        "Customers who have not made a purchase in the last 90 days. These are at risk of churning.",
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Info color="#1976d2" />
          <Typography variant="h6">Customer Segments Guide</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" paragraph>
          InviStock automatically categorizes your customers based on their
          purchase history and behavior. Here is what each segment means:
        </Typography>

        <Stack spacing={3} mt={2}>
          {segments.map((segment) => (
            <Box key={segment.title}>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
                <Box sx={{ color: `${segment.color}.main` }}>
                  {segment.icon}
                </Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {segment.title}
                </Typography>
                <Chip
                  label={segment.title.split(" ")[0]}
                  size="small"
                  color={segment.color as any}
                  variant="outlined"
                  sx={{ height: 20, fontSize: "0.7rem" }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
                {segment.description}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Box
          mt={4}
          p={2}
          bgcolor="grey.50"
          borderRadius={2}
          border="1px dashed #ddd"
        >
          <Typography variant="subtitle2" gutterBottom>
            Other Metrics
          </Typography>
          <Typography variant="caption" display="block" mb={1}>
            <strong>CLV (Customer Lifetime Value):</strong> Total money a
            customer has spent at your shop since their first visit.
          </Typography>
          <Typography variant="caption" display="block">
            <strong>AOV (Average Order Value):</strong> The average amount a
            customer spends per visit (Total Spent / Number of Orders).
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
}
