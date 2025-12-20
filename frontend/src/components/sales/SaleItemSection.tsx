"use client";
import {
  Autocomplete,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  IconButton,
  TableContainer,
  Tooltip,
  Stack,
  CircularProgress,
  useTheme,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { getAllProducts } from "../../lib/api/productService";
import type { Product } from "../../lib/types/product";
import type { SaleItemPayload } from "../../lib/types/salesTypes";
import { getShopData } from "../../lib/api/shopService";
import type { ShopSetupForm } from "../../lib/types/shopTypes";
import { Eye, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const defaultItem = (): SaleItemPayload => ({
  sr_no: "",
  product_id: 0,
  rate: 0,
  quantity: 1,
  gst_rate: 0,
  discount: 0,
  price: 0,
  hsn: "",
});

interface SaleItemSectionProps {
  items: SaleItemPayload[];
  onItemsChange: (items: SaleItemPayload[]) => void;
  mode: "new" | "view";
  onOpenOverview: (productId: string) => void;
}

export default function SaleItemSection({
  items,
  onItemsChange,
  mode,
  onOpenOverview,
}: SaleItemSectionProps) {
  const theme = useTheme();
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const autocompleteRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [error, setError] = useState<string | null>(null);
  const [shop, setShop] = useState<ShopSetupForm>();
  const [_hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(0);
  const [productCache, setProductCache] = useState<{ [id: number]: Product }>(
    {}
  );

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
        limit: 20,
        page: 1,
        all: false,
      }).then((data) => {
        setSearchResults(data.records || []);
        setLoading(false);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [inputValue]);

  useEffect(() => {
    if (items.length > 0 && mode !== "view") {
      const lastIndex = items.length - 1;
      setEditingRowIndex(lastIndex);
      setTimeout(() => autocompleteRefs.current[lastIndex]?.focus(), 100);
    }
  }, [items.length, mode]);

  useEffect(() => {
    getShopData().then((res) => setShop(res!));
  }, []);

  useEffect(() => {
    if (items.length > 0)
      setTimeout(
        () => autocompleteRefs.current[items.length - 1]?.focus(),
        100
      );
  }, [items.length]);

  const calculateItemPrice = (item: SaleItemPayload) => {
    const rate = Number(item.rate) || 0;
    const qty = Number(item.quantity) || 0;
    const gstRate = Number(item.gst_rate) || 0;
    const discountPct = Number(item.discount) || 0;
    const base = rate * qty;
    const discountedAmount = base - (discountPct / 100) * base;
    let finalPrice = discountedAmount;
    if (shop?.gst_enabled) {
      if (shop?.inclusive_tax_pricing) {
        const divisor = 1 + gstRate / 100;
        const taxableValue = discountedAmount / divisor;
        const gstAmount = discountedAmount - taxableValue;
        finalPrice = taxableValue + gstAmount;
      } else {
        const gstAmount = (discountedAmount * gstRate) / 100;
        finalPrice = discountedAmount + gstAmount;
      }
    }
    return parseFloat(finalPrice.toFixed(2));
  };

  const handleAddRow = (currentItems: SaleItemPayload[]) => {
    if (
      currentItems.length === 0 ||
      currentItems[currentItems.length - 1].product_id !== 0
    ) {
      return [...currentItems, defaultItem()];
    }
    return currentItems;
  };

  const handleProductSelect = (index: number, product: Product | null) => {
    if (!product) return;
    setProductCache((prev) => ({ ...prev, [product.id!]: product }));
    const currentItem = items[index];
    const existingItemIndex = items.findIndex(
      (item, i) => item.product_id === product.id && i !== index
    );
    let nextItems;
    if (existingItemIndex > -1) {
      toast.success("Added to existing item");
      nextItems = items.map((item, i) => {
        if (i === existingItemIndex) {
          const newQuantity = item.quantity + currentItem.quantity;
          return {
            ...item,
            quantity: newQuantity,
            price: calculateItemPrice({ ...item, quantity: newQuantity }),
          };
        }
        return item;
      });
      nextItems = nextItems.filter((_, i) => i !== index);
    } else {
      nextItems = items.map((item, i) => {
        if (i === index) {
          const newItem = {
            ...item,
            product_id: product.id!,
            rate: product.mrp,
            gst_rate: product.gst_rate ?? 0,
            quantity: 1,
          };
          return { ...newItem, price: calculateItemPrice(newItem) };
        }
        return item;
      });
    }
    const finalItems = nextItems.map((item, i) => ({
      ...item,
      sr_no: (i + 1).toString(),
    }));
    onItemsChange(finalItems);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      if (!loading && searchResults.length === 1) {
        e.preventDefault();
        handleProductSelect(index, searchResults[0]);
      }
    }
    if (e.altKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      onItemsChange(handleAddRow(items));
    }
  };

  const handleFieldChange = (
    index: number,
    field: keyof SaleItemPayload,
    value: number
  ) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    updated[index].price = calculateItemPrice(updated[index]);
    onItemsChange(updated);
  };

  const handleRemoveRow = (idx: number) => {
    const newItems = [...items];
    newItems.splice(idx, 1);
    newItems.forEach((item, index) => {
      item.sr_no = (index + 1).toString();
    });
    onItemsChange(newItems);
  };

  // Reusable header style matching Summary
  const headerSx = {
    fontWeight: 700,
    color: "text.secondary",
    fontSize: "0.75rem",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    borderBottom: `2px solid ${theme.palette.divider}`,
    py: 1.5,
  };

  return (
    <Box overflow="hidden">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerSx, width: "5%" }} align="center">
                #
              </TableCell>
              {shop?.hsn_required && (
                <TableCell sx={{ ...headerSx, width: "8%" }}>HSN</TableCell>
              )}
              <TableCell sx={{ ...headerSx, width: "30%" }}>PRODUCT</TableCell>
              <TableCell sx={{ ...headerSx, width: "10%" }}>RATE</TableCell>
              <TableCell sx={{ ...headerSx, width: "8%" }}>QTY</TableCell>
              {shop?.gst_enabled && (
                <>
                  <TableCell sx={headerSx} align="center">
                    CGST
                  </TableCell>
                  <TableCell sx={headerSx} align="center">
                    SGST
                  </TableCell>
                </>
              )}
              {shop?.show_discount_column && (
                <TableCell sx={{ ...headerSx, width: "8%" }} align="center">
                  DISC%
                </TableCell>
              )}
              <TableCell sx={{ ...headerSx, width: "12%" }} align="right">
                AMOUNT
              </TableCell>
              <TableCell sx={{ ...headerSx, width: "5%" }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, idx) => {
              const product = productCache[item.product_id];
              const taxableAmount =
                item.rate * item.quantity * (1 - (item.discount || 0) / 100);
              const gstRate = item.gst_rate ?? 0;
              const gstAmount = (taxableAmount * gstRate) / 100;
              const cgstRate = gstRate / 2;
              const sgstRate = gstRate / 2;
              const cgstAmount = gstAmount / 2;
              const sgstAmount = gstAmount / 2;

              return (
                <TableRow
                  key={idx}
                  hover
                  onMouseEnter={() => setHoveredRowIndex(idx)}
                  onMouseLeave={() => setHoveredRowIndex(null)}
                >
                  <TableCell
                    align="center"
                    sx={{
                      borderBottom: "1px dashed #eee",
                      color: "text.secondary",
                      fontSize: "0.9rem",
                    }}
                  >
                    {idx + 1}
                  </TableCell>
                  {shop?.hsn_required && (
                    <TableCell
                      sx={{
                        borderBottom: "1px dashed #eee",
                        fontSize: "0.85rem",
                        color: "text.secondary",
                      }}
                    >
                      {product?.hsn || "—"}
                    </TableCell>
                  )}

                  {/* Product Input / Display */}
                  <TableCell sx={{ p: 1, borderBottom: "1px dashed #eee" }}>
                    {editingRowIndex === idx && mode !== "view" ? (
                      <Autocomplete
                        options={searchResults}
                        getOptionLabel={(opt) =>
                          typeof opt === "string"
                            ? opt
                            : `${opt.name} (${opt.barcode || ""})`
                        }
                        value={product || null}
                        inputValue={editingRowIndex === idx ? inputValue : ""}
                        loading={loading}
                        filterOptions={(x) => x}
                        onChange={(_, v) =>
                          handleProductSelect(idx, v as Product)
                        }
                        onInputChange={(_, newValue) => setInputValue(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            inputRef={(el) =>
                              (autocompleteRefs.current[idx] = el)
                            }
                            onKeyDown={(e) => handleKeyDown(e, idx)}
                            placeholder="Scan or Search..."
                            variant="standard"
                            InputProps={{
                              ...params.InputProps,
                              disableUnderline: true,
                              sx: { fontSize: "0.95rem" },
                              endAdornment: (
                                <>
                                  {loading ? (
                                    <CircularProgress size={16} />
                                  ) : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                      />
                    ) : (
                      <Typography
                        variant="body2"
                        onClick={() => setEditingRowIndex(idx)}
                        sx={{ cursor: "pointer", fontWeight: 500 }}
                      >
                        {product?.name || "Select Product"}
                      </Typography>
                    )}
                  </TableCell>

                  {/* Rate Input */}
                  <TableCell sx={{ p: 1, borderBottom: "1px dashed #eee" }}>
                    <TextField
                      type="number"
                      variant="standard"
                      fullWidth
                      disabled={mode === "view"}
                      value={item.rate ?? ""}
                      onChange={(e) =>
                        handleFieldChange(idx, "rate", Number(e.target.value))
                      }
                      InputProps={{
                        disableUnderline: true,
                        sx: { fontSize: "0.95rem" },
                      }}
                    />
                  </TableCell>

                  {/* Qty Input */}
                  <TableCell sx={{ p: 1, borderBottom: "1px dashed #eee" }}>
                    <TextField
                      type="number"
                      variant="standard"
                      fullWidth
                      disabled={mode === "view"}
                      value={item.quantity ?? ""}
                      onChange={(e) =>
                        handleFieldChange(
                          idx,
                          "quantity",
                          Number(e.target.value)
                        )
                      }
                      InputProps={{
                        disableUnderline: true,
                        style: { fontWeight: "bold", fontSize: "0.95rem" },
                      }}
                    />
                  </TableCell>

                  {shop?.gst_enabled && (
                    <>
                      <TableCell
                        align="center"
                        sx={{ borderBottom: "1px dashed #eee" }}
                      >
                        <Typography
                          variant="caption"
                          display="block"
                          color="text.secondary"
                        >
                          {cgstRate}%
                        </Typography>
                        <Typography variant="caption" fontWeight={600}>
                          {cgstAmount.toFixed(1)}
                        </Typography>
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ borderBottom: "1px dashed #eee" }}
                      >
                        <Typography
                          variant="caption"
                          display="block"
                          color="text.secondary"
                        >
                          {sgstRate}%
                        </Typography>
                        <Typography variant="caption" fontWeight={600}>
                          {sgstAmount.toFixed(1)}
                        </Typography>
                      </TableCell>
                    </>
                  )}

                  {shop?.show_discount_column && (
                    <TableCell
                      sx={{ p: 1, borderBottom: "1px dashed #eee" }}
                      align="center"
                    >
                      <TextField
                        type="number"
                        variant="standard"
                        fullWidth
                        disabled={mode === "view"}
                        value={item.discount ?? ""}
                        onChange={(e) =>
                          handleFieldChange(
                            idx,
                            "discount",
                            Number(e.target.value)
                          )
                        }
                        inputProps={{ style: { textAlign: "center" } }}
                        InputProps={{
                          disableUnderline: true,
                          sx: { fontSize: "0.95rem" },
                        }}
                      />
                    </TableCell>
                  )}

                  <TableCell
                    align="right"
                    sx={{ borderBottom: "1px dashed #eee" }}
                  >
                    <Typography
                      fontWeight={700}
                      color="text.primary"
                      fontSize="0.95rem"
                    >
                      {item.price.toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                      })}
                    </Typography>
                  </TableCell>

                  {/* Actions */}
                  <TableCell
                    align="center"
                    sx={{ borderBottom: "1px dashed #eee" }}
                  >
                    <Stack direction="row" spacing={0} justifyContent="center">
                      {product && (
                        <Tooltip title="Details">
                          <IconButton
                            size="small"
                            onClick={() =>
                              onOpenOverview(product.id?.toString() ?? "0")
                            }
                            sx={{ color: theme.palette.action.active }}
                          >
                            <Eye size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {mode !== "view" && (
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveRow(idx)}
                          sx={{
                            color: theme.palette.error.main,
                            opacity: 0.7,
                            "&:hover": { opacity: 1 },
                          }}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {mode !== "view" && (
        <Box sx={{ p: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button
            onClick={() => onItemsChange(handleAddRow(items))}
            size="small"
            variant="text"
            startIcon={<Plus size={16} />}
            sx={{
              color: "text.secondary",
              textTransform: "none",
              fontWeight: 600,
              "&:hover": { color: "primary.main", bgcolor: "transparent" },
            }}
          >
            Add Another Item
          </Button>
        </Box>
      )}

      {/* Error Dialog */}
      <Dialog open={!!error} onClose={() => setError(null)}>
        <DialogTitle>Error</DialogTitle>
        <DialogContent>{error}</DialogContent>
        <DialogActions>
          <Button onClick={() => setError(null)}>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
