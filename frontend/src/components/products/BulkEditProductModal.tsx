import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Typography,
  Box,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Info, X } from "lucide-react";
import { useState } from "react";
import type { Product } from "../../lib/types/product";
import { bulkUpdateProducts } from "../../lib/api/productService";
import KbdButton from "../ui/Button";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedProducts: Product[];
  onSuccess: () => void;
};

export default function BulkEditProductModal({ open, onClose, selectedProducts, onSuccess }: Props) {
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [reviewMode, setReviewMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof Product, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev };
      if (value === "" || value === null) {
        delete newData[field];
      } else {
        newData[field] = value;
      }
      return newData;
    });
  };

  const handleReview = () => {
    setReviewMode(true);
  };

  const handleSubmit = async () => {
    if (Object.keys(formData).length === 0) {
      onClose();
      return;
    }

    setLoading(true);
    const productIds = selectedProducts.map(p => p.id).filter(id => id !== undefined) as number[];
    const result = await bulkUpdateProducts(productIds, formData);
    setLoading(false);
    
    if (result && !result.isAxiosError) {
      onSuccess();
      onClose();
      // reset state
      setFormData({});
      setReviewMode(false);
    }
  };

  const handleClose = () => {
    setFormData({});
    setReviewMode(false);
    onClose();
  };

  const getReviewChanges = () => {
    const changes = [];
    if (formData.storage_location !== undefined) changes.push({ field: "Storage Location", value: formData.storage_location });
    if (formData.quantity !== undefined) changes.push({ field: "Quantity", value: formData.quantity });
    if (formData.base_unit !== undefined) changes.push({ field: "Base Unit", value: formData.base_unit });
    if (formData.secondary_unit !== undefined) changes.push({ field: "Secondary Unit", value: formData.secondary_unit });
    if (formData.conversion_factor !== undefined) changes.push({ field: "Conversion Factor", value: formData.conversion_factor });
    if (formData.brand !== undefined) changes.push({ field: "Brand", value: formData.brand });
    if (formData.is_active !== undefined) changes.push({ field: "Status", value: formData.is_active === 1 ? "Active" : "Inactive" });
    if (formData.low_stock_threshold !== undefined) changes.push({ field: "Low Stock Threshold", value: formData.low_stock_threshold });
    return changes;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {reviewMode ? "Review Bulk Edit" : "Bulk Edit Products"}
        <IconButton onClick={handleClose}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {!reviewMode ? (
          <Stack spacing={3}>
            <Box sx={{ bgcolor: "info.light", p: 2, borderRadius: 1, color: "info.contrastText" }}>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500 }}>
                <Info size={18} />
                Instructions
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Fill only the fields you want to update for the <b>{selectedProducts.length}</b> selected products. 
                Fields left blank will remain unchanged.
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Tooltip title="Update storage location for all selected products" placement="top-start">
                <TextField
                  label="Storage Location"
                  size="small"
                  value={formData.storage_location || ""}
                  onChange={(e) => handleChange("storage_location", e.target.value)}
                  fullWidth
                />
              </Tooltip>

              <Tooltip title="Update quantity for all selected products" placement="top-start">
                <TextField
                  label="Quantity"
                  type="number"
                  size="small"
                  value={formData.quantity !== undefined ? formData.quantity : ""}
                  onChange={(e) => handleChange("quantity", e.target.value !== "" ? Number(e.target.value) : "")}
                  fullWidth
                />
              </Tooltip>

              <Tooltip title="Update base unit (e.g. pcs, kg)" placement="top-start">
                <TextField
                  label="Base Unit"
                  size="small"
                  value={formData.base_unit || ""}
                  onChange={(e) => handleChange("base_unit", e.target.value)}
                  fullWidth
                />
              </Tooltip>

              <Tooltip title="Update secondary unit (e.g. box, pack)" placement="top-start">
                <TextField
                  label="Secondary Unit"
                  size="small"
                  value={formData.secondary_unit || ""}
                  onChange={(e) => handleChange("secondary_unit", e.target.value)}
                  fullWidth
                />
              </Tooltip>

              <Tooltip title="Update conversion factor (Base unit per Secondary unit)" placement="top-start">
                <TextField
                  label="Conversion Factor"
                  type="number"
                  size="small"
                  value={formData.conversion_factor !== undefined ? formData.conversion_factor : ""}
                  onChange={(e) => handleChange("conversion_factor", e.target.value !== "" ? Number(e.target.value) : "")}
                  fullWidth
                />
              </Tooltip>

              <Tooltip title="Update brand name" placement="top-start">
                <TextField
                  label="Brand"
                  size="small"
                  value={formData.brand || ""}
                  onChange={(e) => handleChange("brand", e.target.value)}
                  fullWidth
                />
              </Tooltip>

              <Tooltip title="Update low stock warning threshold" placement="top-start">
                <TextField
                  label="Low Stock Threshold"
                  type="number"
                  size="small"
                  value={formData.low_stock_threshold !== undefined ? formData.low_stock_threshold : ""}
                  onChange={(e) => handleChange("low_stock_threshold", e.target.value !== "" ? Number(e.target.value) : "")}
                  fullWidth
                />
              </Tooltip>

              <Tooltip title="Update active status" placement="top-start">
                <TextField
                  select
                  label="Status"
                  size="small"
                  value={formData.is_active !== undefined ? formData.is_active : ""}
                  onChange={(e) => handleChange("is_active", e.target.value !== "" ? Number(e.target.value) : "")}
                  fullWidth
                >
                  <MenuItem value=""><em>Do not change</em></MenuItem>
                  <MenuItem value={1}>Active</MenuItem>
                  <MenuItem value={0}>Inactive</MenuItem>
                </TextField>
              </Tooltip>
            </Box>
          </Stack>
        ) : (
          <Stack spacing={3}>
            <Box sx={{ bgcolor: "warning.light", p: 2, borderRadius: 1, color: "warning.contrastText" }}>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                ⚠️ Review Changes
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                You are about to update <b>{selectedProducts.length}</b> products.
                Only the following fields will be modified. All other data will remain untouched.
              </Typography>
            </Box>

            {Object.keys(formData).length === 0 ? (
              <Typography color="text.secondary">No fields were modified.</Typography>
            ) : (
              <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
                {getReviewChanges().map((change, idx) => (
                  <Box key={change.field} sx={{ display: 'flex', p: 1.5, borderBottom: idx < getReviewChanges().length - 1 ? 1 : 0, borderColor: "divider" }}>
                    <Typography sx={{ width: '40%', fontWeight: 500 }}>{change.field}</Typography>
                    <Typography sx={{ width: '60%' }}>{change.value?.toString()}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={reviewMode ? () => setReviewMode(false) : handleClose} color="inherit">
          {reviewMode ? "Back" : "Cancel"}
        </Button>
        {!reviewMode ? (
          <KbdButton 
            variant="primary" 
            onClick={handleReview}
            disabled={Object.keys(formData).length === 0}
            label="Review Updates"
          >
            Review Updates
          </KbdButton>
        ) : (
          <KbdButton 
            variant="primary" 
            onClick={handleSubmit} 
            loading={loading}
            disabled={Object.keys(formData).length === 0}
            label="Confirm & Update"
          >
            Confirm & Update
          </KbdButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
