import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Box,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import { getSaleById } from "../../lib/api/salesService"; // Assume you have this function
import type { SalePayload } from "../../lib/types/salesTypes";

interface UpdateStatusModalProps {
  open: boolean;
  onClose: () => void;
  saleId: number | null; // Now accepts a sale ID
  onSave: (saleId: number, newStatus: string) => void;
}

const statusOptions = [
  "pending",
  "paid",
  "partial_payment",
  "returned",
];

export default function UpdateSaleStatusModal({
  open,
  onClose,
  saleId,
  onSave,
}: UpdateStatusModalProps) {
  const [loading, setLoading] = useState(true);
  const [sale, setSale] = useState<SalePayload | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("pending");

  useEffect(() => {
    const fetchSaleData = async () => {
      if (!saleId || !open) return;

      setLoading(true);
      try {
        const fetchedSale = await getSaleById(saleId);

        setSale(fetchedSale.data);
        setSelectedStatus(fetchedSale.status);
      } catch (error) {
        toast.error("Failed to fetch sale details.");
        console.error("Failed to fetch sale details:", error);
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchSaleData();
  }, [saleId, open, onClose]);

  const handleSave = () => {
    if (!sale) return;

    onSave(sale.id!, selectedStatus);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Update Sale Status</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            py={4}
          >
            <CircularProgress />
          </Box>
        ) : !sale ? (
          <Typography color="error">
            Sale not found or an error occurred.
          </Typography>
        ) : (
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={selectedStatus}
              label="Status"
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {statusOptions.map((status) => (
                <MenuItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={loading || !sale}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
