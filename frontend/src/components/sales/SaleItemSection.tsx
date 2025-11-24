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
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { getAllProducts } from "../../lib/api/productService";
import type { Product } from "../../lib/types/product";
import type { SaleItemPayload } from "../../lib/types/salesTypes";
import { getShopData } from "../../lib/api/shopService";
import type { ShopSetupForm } from "../../lib/types/shopTypes";
import { Eye, Trash2 } from "lucide-react";
import theme from "../../../theme";
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

const SaleItemSection = ({
  items,
  onItemsChange,
  mode,
  onOpenOverview,
}: SaleItemSectionProps) => {
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const autocompleteRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [error, setError] = useState<string | null>(null);
  const [shop, setShop] = useState<ShopSetupForm>();
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);

  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(0);
  const [productCache, setProductCache] = useState<{ [id: number]: Product }>(
    {}
  );
  // ✅ NEW: Debounced effect to fetch products as user types
  useEffect(() => {
    // Don't search on an empty query
    if (inputValue.trim() === "") {
      setSearchResults([]);
      return;
    }

    setLoading(true);

    // Debounce timer
    const timer = setTimeout(() => {
      getAllProducts({
        query: inputValue,
        isActive: 1, // Only search for active products
        limit: 20, // Limit results for performance
        page: 1,
        all: false,
      }).then((data) => {
        setSearchResults(data.records || []);
        setLoading(false);
      });
    }, 400); // 400ms delay

    // Cleanup function to cancel the timer if user keeps typing
    return () => clearTimeout(timer);
  }, [inputValue]);

  // ✅ STEP 2: Update the focus/edit effect
  // This now also sets which row is in "edit mode"
  useEffect(() => {
    if (items.length > 0 && mode !== "view") {
      const lastIndex = items.length - 1;
      setEditingRowIndex(lastIndex); // Set the last row as the editing one
      setTimeout(() => {
        autocompleteRefs.current[lastIndex]?.focus();
      }, 100);
    }
  }, [items.length, mode]);

  useEffect(() => {
    const fetchShop = async () => {
      const res = await getShopData();
      setShop(res!);
    };
    fetchShop();
  }, []);

  // Focus the last added row
  useEffect(() => {
    if (items.length > 0) {
      setTimeout(() => {
        const lastIndex = items.length - 1;
        autocompleteRefs.current[lastIndex]?.focus();
      }, 100);
    }
  }, [items.length]);

  /*
Step 1 : Calculate Base Rate
Step 2 : Calculate Discounted Price
Step 3 : Calculate GST on Discounted Price if Gst enabled && not inclusive tax pricing
Step 4 : Calculate Final Price
*/
  const calculateItemPrice = (item: SaleItemPayload) => {
    const rate = Number(item.rate) || 0;
    const qty = Number(item.quantity) || 0;
    const gstRate = Number(item.gst_rate) || 0;
    const discountPct = Number(item.discount) || 0;

    // Step 1: Base amount
    const base = rate * qty;

    // Step 2: Apply discount first
    const discountedAmount = base - (discountPct / 100) * base;

    // Step 3: GST calculation
    let finalPrice = discountedAmount;
    if (shop?.gst_enabled) {
      if (shop?.inclusive_tax_pricing) {
        // GST is already in price → extract GST but final price stays same
        // This keeps calculations correct for reporting
        const divisor = 1 + gstRate / 100;
        const taxableValue = discountedAmount / divisor;
        const gstAmount = discountedAmount - taxableValue;
        finalPrice = taxableValue + gstAmount; // same as discountedAmount
      } else {
        // GST exclusive → add GST after discount
        const gstAmount = (discountedAmount * gstRate) / 100;
        finalPrice = discountedAmount + gstAmount;
      }
    }

    return parseFloat(finalPrice.toFixed(2));
  };

  const handleAddRow = (currentItems: SaleItemPayload[]): SaleItemPayload[] => {
    // Check if the list is empty or if the last item has a product.
    if (
      currentItems.length === 0 ||
      currentItems[currentItems.length - 1].product_id !== 0
    ) {
      const newItem = defaultItem();
      return [...currentItems, newItem];
    }
    // If the last row is already blank, return the list unchanged.
    return currentItems;
  };

  const handleProductSelect = (index: number, product: Product | null) => {
    if (!product) return;

    // Cache the product details for display
    setProductCache((prev) => ({ ...prev, [product.id!]: product }));

    // Get the row that's being edited (the one that triggered this function)
    const currentItem = items[index];

    // Check if the selected product already exists in another row
    const existingItemIndex = items.findIndex(
      (item, i) => item.product_id === product.id && i !== index
    );

    let nextItems;

    if (existingItemIndex > -1) {
      // --- DUPLICATE PRODUCT LOGIC ---
      toast.success("adding item to pre-existing item");

      // 1. Create a new array with the updated quantity
      nextItems = items.map((item, i) => {
        if (i === existingItemIndex) {
          // ✅ CORRECTED: Add the quantity from the current row to the existing one
          const newQuantity = item.quantity + currentItem.quantity;
          return {
            ...item,
            quantity: newQuantity,
            price: calculateItemPrice({ ...item, quantity: newQuantity }),
          };
        }
        return item; // Return other items unchanged
      });

      // 2. Filter out the row that was just used (the one at `index`)
      nextItems = nextItems.filter((_, i) => i !== index);
    } else {
      // --- NEW PRODUCT LOGIC ---

      // 1. Create a new array, replacing the empty row with the selected product
      nextItems = items.map((item, i) => {
        if (i === index) {
          const newItem = {
            ...item,
            product_id: product.id!,
            rate: product.mrp,
            gst_rate: product.gst_rate ?? 0,
            quantity: 1, // A new item always starts with quantity 1
          };
          return { ...newItem, price: calculateItemPrice(newItem) };
        }
        return item;
      });
    }

    // Finally, renumber everything and call the state update ONCE
    const finalItems = nextItems.map((item, i) => ({
      ...item,
      sr_no: (i + 1).toString(),
    }));

    onItemsChange(finalItems);
    setInputValue("");
  };

  // ✅ NEW: Handle Enter key for barcode scanner
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      // If there's exactly one search result, it's a confident match. Select it.
      if (!loading && searchResults.length === 1) {
        e.preventDefault();
        handleProductSelect(index, searchResults[0]);
      }
    }
    // Handle hotkey to add new row
    if (e.altKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      handleAddRow(items);
    }
  };
  const handleFieldChange = (
    index: number,
    field: keyof SaleItemPayload,
    value: number
  ) => {
    const updated = [...items];
    const currentItem = updated[index];

    // Check for rate < MOP
    if (field === "rate") {
      // ✅ CORRECTED: Look up the product in the cache
      const product = productCache[currentItem.product_id];

      if (product && value < product.mop) {
        setError(`Rate cannot be lower than MOP (₹${product.mop}).`);
        return; // Stop the update if validation fails
      }
    }

    // Update the field and recalculate the price
    (currentItem as any)[field] = value;
    currentItem.price = calculateItemPrice(currentItem);

    onItemsChange(updated);
  };

  function handleRemoveRow(idx: number): void {
    const newItems = [...items];
    newItems.splice(idx, 1);
    // Reassign serial numbers after removal
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
            {/* --- MAIN HEADER ROW --- */}
            <TableRow>
              <TableCell
                rowSpan={Boolean(shop?.gst_enabled) ? 2 : 1}
                sx={{ fontWeight: 600, width: "5%" }}
              >
                Sr.
              </TableCell>

              {/* ✅ FIXED: Conditionally render the HSN column */}
              {Boolean(shop?.hsn_required) && (
                <TableCell
                  rowSpan={Boolean(shop?.gst_enabled) ? 2 : 1}
                  sx={{ fontWeight: 600, width: "8%" }}
                >
                  HSN
                </TableCell>
              )}

              <TableCell
                rowSpan={Boolean(shop?.gst_enabled) ? 2 : 1}
                sx={{ fontWeight: 600, width: "25%" }}
              >
                Product
              </TableCell>
              <TableCell
                rowSpan={Boolean(shop?.gst_enabled) ? 2 : 1}
                sx={{ fontWeight: 600, width: "12%" }}
              >
                Rate
              </TableCell>
              <TableCell
                rowSpan={Boolean(shop?.gst_enabled) ? 2 : 1}
                sx={{ fontWeight: 600, width: "10%" }}
              >
                Qty
              </TableCell>

              {/* ✅ FIXED: Converted to a boolean check */}
              {Boolean(shop?.gst_enabled) && (
                <>
                  <TableCell
                    colSpan={2}
                    align="center"
                    sx={{ fontWeight: 600 }}
                  >
                    CGST
                  </TableCell>
                  <TableCell
                    colSpan={2}
                    align="center"
                    sx={{ fontWeight: 600 }}
                  >
                    SGST
                  </TableCell>
                </>
              )}

              {/* ✅ FIXED: Converted to a boolean check */}
              {Boolean(shop?.show_discount_column) && (
                <TableCell
                  rowSpan={Boolean(shop?.gst_enabled) ? 2 : 1}
                  align="center"
                  sx={{ fontWeight: 600, width: "10%" }}
                >
                  Disc(%)
                </TableCell>
              )}

              <TableCell
                rowSpan={Boolean(shop?.gst_enabled) ? 2 : 1}
                align="right"
                sx={{ fontWeight: 600, width: "15%" }}
              >
                Price
              </TableCell>
              <TableCell
                rowSpan={Boolean(shop?.gst_enabled) ? 2 : 1}
                align="center"
                sx={{ fontWeight: 600, width: "5%" }}
              ></TableCell>
            </TableRow>

            {/* --- GST SUB-HEADER ROW --- */}
            {Boolean(shop?.gst_enabled) && (
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: 500 }}>
                  Rate
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 500 }}>
                  Amt
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 500 }}>
                  Rate
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 500 }}>
                  Amt
                </TableCell>
              </TableRow>
            )}
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
                  {shop?.hsn_required && (
                    <TableCell>{product?.hsn || "—"}</TableCell>
                  )}
                  <TableCell sx={{ p: 0.5 }}>
                    {editingRowIndex === idx && mode !== "view" ? (
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
                        // Don't filter client-side, server does it
                        filterOptions={(x) => x}
                        // When user selects an item from dropdown
                        onChange={(_, v) =>
                          handleProductSelect(idx, v as Product)
                        }
                        // When user types in the box
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
                      // --- DISPLAY MODE ---
                      <Typography
                        variant="body2"
                        onClick={() => setEditingRowIndex(idx)}
                        sx={{
                          cursor: "pointer",
                          padding: "8.5px 14px", // Mimic TextField padding
                          minHeight: "40px", // Mimic TextField height
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {product?.name || item.product_name}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ p: 0.5 }}>
                    <TextField
                      type="number"
                      size="small"
                      variant="outlined"
                      fullWidth
                      disabled={mode === "view"}
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
                      disabled={mode === "view"}
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
                  {Boolean(shop?.gst_enabled) && (
                    <>
                      <TableCell align="center">
                        {cgstRate.toFixed(1)}%
                      </TableCell>
                      <TableCell align="right">
                        {cgstAmount.toFixed(2)}
                      </TableCell>
                      <TableCell align="center">
                        {sgstRate.toFixed(1)}%
                      </TableCell>
                      <TableCell align="right">
                        {sgstAmount.toFixed(2)}
                      </TableCell>
                    </>
                  )}
                  {shop?.show_discount_column && (
                    <TableCell sx={{ p: 0.5 }}>
                      <TextField
                        type="number"
                        size="small"
                        variant="outlined"
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
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            "& fieldset": { border: "none" },
                          },
                        }}
                      />
                    </TableCell>
                  )}
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
                      {mode !== "view" && (
                        <Tooltip title="Delete Row">
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveRow(idx)}
                            color="error"
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </Tooltip>
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
        <>
          <Box mt={2} display="flex" gap={1}>
            <Button
              onClick={() => {
                const newItems = handleAddRow(items);
                onItemsChange(newItems);
              }}
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
        </>
      )}
    </Box>
  );
};

export default SaleItemSection;
