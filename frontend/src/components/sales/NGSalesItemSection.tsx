/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Paper,
  TableContainer,
  Tooltip,
  Stack,
  CircularProgress,
  Select,
  MenuItem,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { getAllProducts } from "../../lib/api/productService";
import type { Product } from "../../lib/types/product";
import type { NonGstSaleItem } from "../../lib/types/nonGstSalesTypes";
import { Eye, Trash2, ChevronDown } from "lucide-react";
import theme from "../../../theme";
import toast from "react-hot-toast";

const defaultItem = (): NonGstSaleItem => ({
  sr_no: "",
  product_id: 0,
  rate: 0,
  quantity: 1,
  discount: 0,
  price: 0,
});

interface Props {
  items: NonGstSaleItem[];
  onItemsChange: (items: NonGstSaleItem[]) => void;
  onOpenOverview: (productId: string) => void;
}

type PriceType = "mrp" | "mop" | "mfw";

export default function NGSaleItemSection({
  items,
  onItemsChange,
  onOpenOverview,
}: Props) {
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [priceType, setPriceType] = useState<PriceType>("mrp");

  const autocompleteRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);

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
    if (items.length > 0) {
      const lastIndex = items.length - 1;
      setEditingRowIndex(lastIndex);
      setTimeout(() => {
        autocompleteRefs.current[lastIndex]?.focus();
      }, 100);
    }
  }, [items.length]);

  const calculateItemPrice = (item: NonGstSaleItem) => {
    const rate = Number(item.rate) || 0;
    const qty = Number(item.quantity) || 0;
    const discountPct = Number(item.discount) || 0;

    const base = rate * qty;
    const discountedAmount = base - (discountPct / 100) * base;

    return parseFloat(discountedAmount.toFixed(2));
  };

  const getProductPrice = (product: Product, type: PriceType) => {
    const p = product as any;
    const val = Number(p[type]);
    if (val && val > 0) return val;
    return Number(p.mrp) || 0;
  };

  const handlePriceTypeChange = (newType: PriceType) => {
    setPriceType(newType);

    const updatedItems = items.map((item) => {
      if (!item.product_id) return item;
      const product = productCache[item.product_id];
      if (!product) return item;

      const newRate = getProductPrice(product, newType);
      const updatedItem = { ...item, rate: newRate };
      return { ...updatedItem, price: calculateItemPrice(updatedItem) };
    });

    onItemsChange(updatedItems);
    toast.success(`Updated prices to ${newType.toUpperCase()}`);
  };

  const handleAddRow = (currentItems: NonGstSaleItem[]): NonGstSaleItem[] => {
    if (
      currentItems.length === 0 ||
      currentItems[currentItems.length - 1].product_id !== 0
    ) {
      const newItem = defaultItem();
      return [...currentItems, newItem];
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

    let nextItems: NonGstSaleItem[];

    if (existingItemIndex > -1) {
      toast.success("Adding item to pre-existing item");
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
          const newItem: NonGstSaleItem = {
            ...item,
            product_id: product.id!,
            rate: getProductPrice(product, priceType),
            quantity: 1,
            discount: 0,
            price: 0,
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
    field: keyof NonGstSaleItem,
    value: number
  ) => {
    const updated = [...items];
    const currentItem = updated[index];
    (currentItem as any)[field] = value;
    currentItem.price = calculateItemPrice(currentItem);
    onItemsChange(updated);
  };

  function handleRemoveRow(idx: number): void {
    const newItems = [...items];
    newItems.splice(idx, 1);
    newItems.forEach((item, index) => {
      item.sr_no = (index + 1).toString();
    });
    onItemsChange(newItems);
  }

  return (
    <Box mt={1}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Sale Items
      </Typography>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ borderRadius: 2, borderColor: theme.palette.divider }}
      >
        <Table size="small">
          <TableHead sx={{ backgroundColor: theme.palette.grey[50] }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: "5%" }}>Sr.</TableCell>
              <TableCell sx={{ fontWeight: 600, width: "40%" }}>
                Product
              </TableCell>
              {/* ✅ Rate Header is now the Selector */}
              <TableCell sx={{ fontWeight: 600, width: "15%", p: 0.5 }}>
                <Select
                  value={priceType}
                  onChange={(e) =>
                    handlePriceTypeChange(e.target.value as PriceType)
                  }
                  variant="standard"
                  disableUnderline
                  IconComponent={ChevronDown}
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    color: "text.primary",
                    "& .MuiSelect-select": {
                      paddingRight: "24px !important",
                      py: 1,
                    },
                    "& .MuiSvgIcon-root": {
                      right: -4,
                      fontSize: "1.1rem",
                    },
                  }}
                  renderValue={(selected) => {
                    if (selected === "mrp") return "Rate (MRP)";
                    if (selected === "mop") return "Rate (MOP)";
                    return "Rate (MFW)";
                  }}
                >
                  <MenuItem value="mrp">Rate (Retail / MRP)</MenuItem>
                  <MenuItem value="mop">Rate (Operating / MOP)</MenuItem>
                  <MenuItem value="mfw">Rate (Wholesale / MFW)</MenuItem>
                </Select>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, width: "10%" }}>Qty</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, width: "10%" }}>
                Disc(%)
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, width: "15%" }}>
                Price
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: 600, width: "5%" }}
              ></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {items.map((item, idx) => {
              const product = productCache[item.product_id];
              return (
                <TableRow
                  key={idx}
                  onMouseEnter={() => setHoveredRowIndex(idx)}
                  onMouseLeave={() => setHoveredRowIndex(null)}
                  sx={{
                    "&:nth-of-type(odd)": {
                      backgroundColor: theme.palette.action.hover,
                    },
                    "&:last-child td, &:last-child th": { border: 0 },
                  }}
                >
                  <TableCell align="center">{idx + 1}</TableCell>

                  <TableCell sx={{ p: 0.5 }}>
                    {editingRowIndex === idx ? (
                      <Autocomplete
                        options={searchResults}
                        getOptionLabel={(opt) =>
                          typeof opt === "string"
                            ? opt
                            : `${opt.name} (${
                                opt.barcode || opt.product_code || ""
                              })`
                        }
                        value={product || null}
                        inputValue={editingRowIndex === idx ? inputValue : ""}
                        loading={loading}
                        filterOptions={(x) => x}
                        onChange={(_, v) =>
                          handleProductSelect(idx, v as Product)
                        }
                        onInputChange={(_, newValue) => {
                          setInputValue(newValue);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            inputRef={(el) =>
                              (autocompleteRefs.current[idx] = el)
                            }
                            onKeyDown={(e) => handleKeyDown(e, idx)}
                            placeholder="Scan Barcode or Search by Name..."
                            variant="outlined"
                            size="small"
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                "& fieldset": { border: "none" },
                              },
                            }}
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {loading ? (
                                    <CircularProgress
                                      color="inherit"
                                      size={20}
                                    />
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
                        sx={{
                          cursor: "pointer",
                          padding: "8.5px 14px",
                          minHeight: "40px",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {product?.name || "N/A"}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ p: 0.5 }}>
                    <TextField
                      type="number"
                      size="small"
                      variant="outlined"
                      fullWidth
                      value={item.rate ?? ""}
                      onChange={(e) =>
                        handleFieldChange(idx, "rate", Number(e.target.value))
                      }
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { border: "none" },
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ p: 0.5 }}>
                    <TextField
                      type="number"
                      size="small"
                      variant="outlined"
                      fullWidth
                      value={item.quantity ?? ""}
                      onChange={(e) =>
                        handleFieldChange(
                          idx,
                          "quantity",
                          Number(e.target.value)
                        )
                      }
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { border: "none" },
                        },
                      }}
                    />
                  </TableCell>

                  <TableCell sx={{ p: 0.5 }}>
                    <TextField
                      type="number"
                      size="small"
                      variant="outlined"
                      fullWidth
                      value={item.discount ?? ""}
                      onChange={(e) =>
                        handleFieldChange(
                          idx,
                          "discount",
                          Number(e.target.value)
                        )
                      }
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { border: "none" },
                        },
                      }}
                    />
                  </TableCell>

                  <TableCell
                    align="right"
                    sx={{ fontWeight: 500, fontSize: "0.8rem" }}
                  >
                    {item.price.toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" justifyContent="center">
                      {product && (
                        <Tooltip title="View Product Details">
                          <IconButton
                            size="small"
                            onClick={() =>
                              onOpenOverview(product.id?.toString() ?? "0")
                            }
                            sx={{
                              visibility:
                                hoveredRowIndex === idx ? "visible" : "hidden",
                            }}
                          >
                            <Eye size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete Row">
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveRow(idx)}
                          color="error"
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box mt={2} display="flex" gap={1}>
        <Button
          onClick={() => onItemsChange(handleAddRow(items))}
          size="small"
          variant="contained"
        >
          + Add Item
        </Button>
      </Box>
      <Dialog open={!!error} onClose={() => setError(null)}>
        <DialogTitle>Validation Error</DialogTitle>
        <DialogContent>{error}</DialogContent>
        <DialogActions>
          <Button onClick={() => setError(null)}>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
