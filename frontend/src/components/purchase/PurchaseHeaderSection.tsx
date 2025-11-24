import { useEffect, useState } from "react";

import { Box, InputAdornment, MenuItem, TextField } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { Hash, NotebookPen } from "lucide-react";

import { FormField } from "../FormField";
import { getSuppliers as getAllSuppliers } from "../../lib/api/supplierService";
import type { PurchasePayload } from "../../lib/types/purchaseTypes";
import type { SupplierType as Supplier } from "../../lib/types/supplierTypes";

interface Props {
  purchase: PurchasePayload;
  onPurchaseChange: (data: PurchasePayload) => void;
  readOnly?: boolean;
}

const PurchaseHeaderSection = ({
  purchase,
  onPurchaseChange,
  readOnly = false,
}: Props) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    getAllSuppliers().then((data) => {
      setSuppliers(data || []);
    });
  }, []);

  const handleChange = (field: keyof PurchasePayload, value: any) => {
    if (!readOnly) {
      onPurchaseChange({ ...purchase, [field]: value });
    }
  };

  return (
    <Box p={2}>
      <Grid container spacing={2}>
        {/* Supplier */}
        <Grid item xs={12} sm={6}>
          <FormField label="Supplier *">
            <TextField
              fullWidth
              select
              variant="outlined"
              size="small"
              value={purchase.supplier_id}
              onChange={(e) => handleChange("supplier_id", e.target.value)}
              disabled={readOnly}
            >
              {suppliers.map((supplier) => (
                <MenuItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </MenuItem>
              ))}
            </TextField>
          </FormField>
        </Grid>

        {/* Reference No */}
        <Grid item xs={12} sm={3}>
          <FormField label="Bill No. / Ref No.">
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              value={purchase.reference_no}
              onChange={(e) => handleChange("reference_no", e.target.value)}
              InputProps={{
                readOnly: readOnly,
                startAdornment: (
                  <InputAdornment position="start">
                    <Hash size={18} />
                  </InputAdornment>
                ),
              }}
            />
          </FormField>
        </Grid>

        {/* Purchase Date */}
        <Grid item xs={12} sm={3}>
          <FormField label="Purchase Date">
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              type="date"
              value={purchase.date}
              onChange={(e) => handleChange("date", e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{ readOnly: readOnly }}
            />
          </FormField>
        </Grid>

        {/* Notes */}
        <Grid item xs={12}>
          <FormField label="Notes">
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              multiline
              rows={2}
              value={purchase.note}
              onChange={(e) => handleChange("note", e.target.value)}
              InputProps={{
                readOnly: readOnly,
                startAdornment: (
                  <InputAdornment position="start">
                    <NotebookPen size={18} />
                  </InputAdornment>
                ),
              }}
            />
          </FormField>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PurchaseHeaderSection;
