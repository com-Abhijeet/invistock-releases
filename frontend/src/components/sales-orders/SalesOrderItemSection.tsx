"use client";

import { useEffect, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Stack,
} from "@mui/material";
import { Trash2, Plus, ScanBarcode, Package } from "lucide-react";
import { getAllProducts } from "../../lib/api/productService";
import { getProductBatches } from "../../lib/api/batchService";
import type { Product } from "../../lib/types/product";
import type { SalesOrderItem } from "../../lib/api/salesOrderService";

interface Props {
  items: SalesOrderItem[];
  onItemsChange: (items: SalesOrderItem[]) => void;
  mode: "new" | "view" | "edit";
}

const defaultItem = (): SalesOrderItem => ({
  product_id: 0,
  quantity: 1,
  rate: 0,
  gst_rate: 0,
  discount: 0,
  price: 0,
  tracking_type: "none",
});

export default function SalesOrderItemSection({
  items,
  onItemsChange,
  mode,
}: Props) {
  const theme = useTheme();
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const autocompleteRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);

  // Batch Modal State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [pendingItemIndex, setPendingItemIndex] = useState<number | null>(null);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);

  // Load products dynamically
  useEffect(() => {
    if (inputValue.trim() === "") {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      getAllProducts({
        query: inputValue,
        isActive: 1,
        page: 1,
        limit: 20,
        all: false,
      }).then((data) => {
        setSearchResults(data.records || []);
        setLoading(false);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Auto-focus logic
  useEffect(() => {
    if (items.length > 0 && mode !== "view") {
      const lastIdx = items.length - 1;
      // Only focus if last item is new/empty
      if (items[lastIdx].product_id === 0) {
        setEditingRowIndex(lastIdx);
        setTimeout(() => autocompleteRefs.current[lastIdx]?.focus(), 100);
      }
    }
  }, [items.length]);

  const handleAddItem = () => {
    if (mode === "view") return;
    if (items.length > 0 && items[items.length - 1].product_id === 0) return;
    const newItem = defaultItem();
    onItemsChange([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (mode === "view") return;
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
  };

  const handleProductSelect = async (
    index: number,
    product: Product | null
  ) => {
    if (!product) return;

    // Check tracking
    if (
      product.tracking_type === "batch" ||
      product.tracking_type === "serial"
    ) {
      setPendingItemIndex(index);
      setPendingProduct(product);
      setLoadingBatches(true);
      setBatchModalOpen(true);
      try {
        const batches = await getProductBatches(
          product.id!,
          product.tracking_type
        );
        setAvailableBatches(batches);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingBatches(false);
      }
      return;
    }

    addItemToTable(index, product);
  };

  const addItemToTable = (
    index: number,
    product: Product,
    batchInfo: any = null
  ) => {
    const updated = [...items];
    const rate = batchInfo?.mrp || product.mop || product.mrp || 0;

    updated[index] = {
      ...updated[index],
      product_id: product.id!,
      product_name: product.name, // Storing only name as requested
      rate: rate,
      quantity: 1,
      gst_rate: product.gst_rate || 0,
      tracking_type: product.tracking_type as any,

      batch_id: batchInfo?.id,
      serial_id: product.tracking_type === "serial" ? batchInfo?.id : undefined, // API returns serial ID as ID in serial mode
      batch_number: batchInfo?.batch_number,
      serial_number: batchInfo?.serial_number,
    };

    updated[index].price = calculatePrice(updated[index]);
    onItemsChange(updated);
    setInputValue("");
    setBatchModalOpen(false);
  };

  const handleBatchSelect = (batch: any) => {
    if (pendingItemIndex !== null && pendingProduct) {
      addItemToTable(pendingItemIndex, pendingProduct, batch);
    }
  };

  const calculatePrice = (item: SalesOrderItem) => {
    const base = item.rate * item.quantity;
    const discountAmount = (base * (item.discount || 0)) / 100;
    return base - discountAmount;
    // Note: GST calculation depends on inclusive/exclusive logic from Shop Settings (omitted for brevity but fits here)
  };

  const handleFieldChange = (
    index: number,
    field: keyof SalesOrderItem,
    value: number
  ) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    updated[index].price = calculatePrice(updated[index]);
    onItemsChange(updated);
  };

  const headerSx = {
    fontWeight: 700,
    color: "text.secondary",
    fontSize: "0.75rem",
    borderBottom: `2px solid ${theme.palette.divider}`,
    py: 1.5,
  };

  return (
    <Box
      sx={{
        flexGrow: 1,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TableContainer sx={{ flexGrow: 1, overflowY: "auto" }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerSx, width: "5%" }} align="center">
                #
              </TableCell>
              <TableCell sx={{ ...headerSx, width: "40%" }}>PRODUCT</TableCell>
              <TableCell sx={{ ...headerSx, width: "15%" }}>RATE</TableCell>
              <TableCell sx={{ ...headerSx, width: "10%" }}>QTY</TableCell>
              <TableCell sx={{ ...headerSx, width: "10%" }}>DISC%</TableCell>
              <TableCell sx={{ ...headerSx, width: "15%" }} align="right">
                AMOUNT
              </TableCell>
              <TableCell sx={{ ...headerSx, width: "5%" }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={idx} hover>
                <TableCell align="center" sx={{ color: "text.secondary" }}>
                  {idx + 1}
                </TableCell>

                {/* Product */}
                <TableCell sx={{ p: 1 }}>
                  {mode !== "view" && editingRowIndex === idx ? (
                    <Autocomplete
                      options={searchResults}
                      getOptionLabel={(opt) => opt.name}
                      loading={loading}
                      inputValue={inputValue}
                      onInputChange={(_, val) => setInputValue(val)}
                      onChange={(_, val) => handleProductSelect(idx, val)}
                      renderOption={(props, option) => (
                        <li {...props} key={option.id}>
                          <Stack>
                            <Typography variant="body2" fontWeight={500}>
                              {option.name}
                            </Typography>
                            {option.product_code && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Code: {option.product_code}
                                {option.barcode
                                  ? ` | Barcode: ${option.barcode}`
                                  : ""}
                              </Typography>
                            )}
                          </Stack>
                        </li>
                      )}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="standard"
                          inputRef={(el) =>
                            (autocompleteRefs.current[idx] = el)
                          }
                          placeholder="Scan / Search..."
                          InputProps={{
                            ...params.InputProps,
                            disableUnderline: true,
                            endAdornment: (
                              <>{loading && <CircularProgress size={16} />}</>
                            ),
                          }}
                        />
                      )}
                    />
                  ) : (
                    <Box
                      onClick={() => {
                        if (mode !== "view") setEditingRowIndex(idx);
                      }}
                      sx={{ cursor: mode !== "view" ? "pointer" : "default" }}
                    >
                      <Typography variant="body2" fontWeight={500}>
                        {item.product_name || "Select Product"}
                      </Typography>
                      {(item.batch_number || item.serial_number) && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "flex", gap: 1, alignItems: "center" }}
                        >
                          {item.serial_number ? (
                            <ScanBarcode size={12} />
                          ) : (
                            <Package size={12} />
                          )}
                          {item.serial_number || item.batch_number}
                        </Typography>
                      )}
                    </Box>
                  )}
                </TableCell>

                {/* Rate */}
                <TableCell sx={{ p: 1 }}>
                  <TextField
                    type="number"
                    variant="standard"
                    fullWidth
                    value={item.rate}
                    onChange={(e) =>
                      handleFieldChange(idx, "rate", Number(e.target.value))
                    }
                    disabled={mode === "view"}
                    InputProps={{ disableUnderline: true }}
                  />
                </TableCell>

                {/* Qty */}
                <TableCell sx={{ p: 1 }}>
                  <TextField
                    type="number"
                    variant="standard"
                    fullWidth
                    value={item.quantity}
                    onChange={(e) =>
                      handleFieldChange(idx, "quantity", Number(e.target.value))
                    }
                    disabled={
                      mode === "view" || item.tracking_type === "serial"
                    }
                    InputProps={{
                      disableUnderline: true,
                      sx: { fontWeight: "bold" },
                    }}
                  />
                </TableCell>

                {/* Disc */}
                <TableCell sx={{ p: 1 }}>
                  <TextField
                    type="number"
                    variant="standard"
                    fullWidth
                    value={item.discount}
                    onChange={(e) =>
                      handleFieldChange(idx, "discount", Number(e.target.value))
                    }
                    disabled={mode === "view"}
                    InputProps={{ disableUnderline: true }}
                  />
                </TableCell>

                {/* Amount */}
                <TableCell align="right">
                  <Typography fontWeight={700}>
                    {item.price.toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </Typography>
                </TableCell>

                {/* Actions */}
                <TableCell align="center">
                  {mode !== "view" && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveItem(idx)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {mode !== "view" && (
        <Box sx={{ p: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button
            onClick={handleAddItem}
            size="small"
            startIcon={<Plus size={16} />}
            sx={{ color: "text.secondary" }}
          >
            Add Item
          </Button>
        </Box>
      )}

      {/* --- Batch Selection Modal (Reused Logic) --- */}
      <Dialog
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Select{" "}
          {pendingProduct?.tracking_type === "serial" ? "Serial" : "Batch"}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {loadingBatches ? (
            <Box p={3} textAlign="center">
              <CircularProgress />
            </Box>
          ) : availableBatches.length === 0 ? (
            <Box p={3} textAlign="center">
              No Stock
            </Box>
          ) : (
            <List>
              {availableBatches.map((b: any) => (
                <ListItemButton
                  key={b.id}
                  onClick={() => handleBatchSelect(b)}
                  divider
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" justifyContent="space-between">
                        <Typography fontWeight={600}>
                          {b.serial_number || b.batch_number}
                        </Typography>
                        <Chip size="small" label={b.quantity} color="success" />
                      </Stack>
                    }
                    secondary={`MRP: ${b.mrp} | Exp: ${b.expiry_date || "N/A"}`}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchModalOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
