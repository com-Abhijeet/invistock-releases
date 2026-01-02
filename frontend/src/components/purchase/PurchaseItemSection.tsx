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
} from "@mui/material";
import { Trash2, Plus } from "lucide-react";
import { getAllProducts } from "../../lib/api/productService";
import { getShopData } from "../../lib/api/shopService";
import type { Product } from "../../lib/types/product";
import type { PurchaseItem } from "../../lib/types/purchaseTypes";
import type { ShopSetupForm } from "../../lib/types/shopTypes";

interface Props {
  items: PurchaseItem[];
  onItemsChange: (items: PurchaseItem[]) => void;
  readOnly?: boolean;
}

const defaultItem = (): PurchaseItem => ({
  sr_no: 0,
  product_id: 0,
  quantity: 1,
  rate: 0,
  gst_rate: 0,
  discount: 0,
  price: 0,
});

const PurchaseItemSection = ({
  items,
  onItemsChange,
  readOnly = false,
}: Props) => {
  const theme = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [shop, setShop] = useState<ShopSetupForm | null>(null);
  const autocompleteRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [_hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);

  useEffect(() => {
    getAllProducts({
      page: 1,
      limit: 100,
      query: "",
      isActive: 0,
      all: true,
    }).then((data) => setProducts(data.records || []));

    getShopData().then((res) => setShop(res));
  }, []);

  useEffect(() => {
    if (!readOnly && items.length > 0) {
      setTimeout(
        () => autocompleteRefs.current[items.length - 1]?.focus(),
        100
      );
    }
  }, [items.length, readOnly]);

  const calculatePrice = (item: PurchaseItem) => {
    if (!shop) return 0;

    const rate = Number(item.rate) || 0;
    const qty = Number(item.quantity) || 0;
    const gstRate = Number(item.gst_rate) || 0;
    const discountPct = Number(item.discount) || 0;

    const baseAmount = rate * qty;
    const discountAmount = (baseAmount * discountPct) / 100;
    const amountAfterDiscount = baseAmount - discountAmount;

    let finalPrice = amountAfterDiscount;

    if (shop.gst_enabled) {
      if (shop.inclusive_tax_pricing) {
        // INCLUSIVE
        finalPrice = amountAfterDiscount;
      } else {
        // EXCLUSIVE
        const gstAmount = (amountAfterDiscount * gstRate) / 100;
        finalPrice = amountAfterDiscount + gstAmount;
      }
    }

    return finalPrice;
  };

  const handleAddItem = () => {
    if (readOnly) return;
    const newItem = defaultItem();
    newItem.sr_no = items.length + 1;
    onItemsChange([...items, newItem]);
  };

  const handleProductSelect = (index: number, product: Product | null) => {
    if (readOnly) return;
    const updated = [...items];
    if (product) {
      updated[index] = {
        ...updated[index],
        product_id: product.id!,
        rate: product.mop,
        gst_rate: product.gst_rate || 0,
      };
      // Must calculate price after setting fields
      updated[index].price = calculatePrice(updated[index]);
    } else {
      updated[index] = defaultItem();
    }
    onItemsChange(updated);
  };

  const handleFieldChange = (
    index: number,
    field: keyof PurchaseItem,
    value: number
  ) => {
    if (readOnly) return;
    const updated = [...items];
    (updated[index] as any)[field] = value;
    updated[index].price = calculatePrice(updated[index]);
    onItemsChange(updated);
  };

  const handleRemoveItem = (idx: number) => {
    if (readOnly) return;
    const updated = items.filter((_, i) => i !== idx);
    updated.forEach((item, index) => {
      item.sr_no = index + 1;
    });
    onItemsChange(updated);
  };

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
              <TableCell sx={{ ...headerSx, width: "30%" }}>PRODUCT</TableCell>
              {/* Dynamic Rate Header */}
              <TableCell sx={{ ...headerSx, width: "12%" }}>
                {shop?.inclusive_tax_pricing ? "RATE (Inc.)" : "RATE"}
              </TableCell>
              <TableCell sx={{ ...headerSx, width: "8%" }}>QTY</TableCell>
              {shop?.gst_enabled && (
                <TableCell sx={{ ...headerSx, width: "10%" }} align="center">
                  GST%
                </TableCell>
              )}
              {shop?.show_discount_column && (
                <TableCell sx={{ ...headerSx, width: "8%" }} align="center">
                  DISC%
                </TableCell>
              )}
              <TableCell sx={{ ...headerSx, width: "15%" }} align="right">
                AMOUNT
              </TableCell>
              <TableCell sx={{ ...headerSx, width: "5%" }}></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {items?.map((item, idx) => {
              const product = products.find((p) => p.id === item.product_id);

              const rate = item.rate || 0;
              const qty = item.quantity || 0;
              const disc = item.discount || 0;
              const gst = item.gst_rate || 0;

              const baseVal = rate * qty;
              const valAfterDisc = baseVal - (baseVal * disc) / 100;

              let gstAmount = 0;
              if (shop?.gst_enabled) {
                if (shop.inclusive_tax_pricing) {
                  const divisor = 1 + gst / 100;
                  const taxable = valAfterDisc / divisor;
                  gstAmount = valAfterDisc - taxable;
                } else {
                  gstAmount = (valAfterDisc * gst) / 100;
                }
              }

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
                    {item.sr_no}
                  </TableCell>

                  <TableCell sx={{ p: 1, borderBottom: "1px dashed #eee" }}>
                    <Autocomplete
                      disabled={readOnly}
                      options={products}
                      getOptionLabel={(opt) => opt.name}
                      value={product || null}
                      onChange={(_, v) => handleProductSelect(idx, v)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          inputRef={(el) =>
                            (autocompleteRefs.current[idx] = el)
                          }
                          placeholder="Select Product"
                          variant="standard"
                          InputProps={{
                            ...params.InputProps,
                            disableUnderline: true,
                            sx: { fontSize: "0.95rem", fontWeight: 500 },
                          }}
                        />
                      )}
                    />
                  </TableCell>

                  <TableCell sx={{ p: 1, borderBottom: "1px dashed #eee" }}>
                    <TextField
                      type="number"
                      variant="standard"
                      fullWidth
                      value={item.rate}
                      onChange={(e) =>
                        handleFieldChange(idx, "rate", Number(e.target.value))
                      }
                      InputProps={{
                        disableUnderline: true,
                        readOnly,
                        sx: { fontSize: "0.95rem" },
                      }}
                    />
                  </TableCell>

                  <TableCell sx={{ p: 1, borderBottom: "1px dashed #eee" }}>
                    <TextField
                      type="number"
                      variant="standard"
                      fullWidth
                      value={item.quantity}
                      onChange={(e) =>
                        handleFieldChange(
                          idx,
                          "quantity",
                          Number(e.target.value)
                        )
                      }
                      InputProps={{
                        disableUnderline: true,
                        readOnly,
                        sx: { fontSize: "0.95rem", fontWeight: "bold" },
                      }}
                    />
                  </TableCell>

                  {shop?.gst_enabled && (
                    <TableCell
                      sx={{ p: 1, borderBottom: "1px dashed #eee" }}
                      align="center"
                    >
                      <TextField
                        type="number"
                        variant="standard"
                        fullWidth
                        value={item.gst_rate}
                        onChange={(e) =>
                          handleFieldChange(
                            idx,
                            "gst_rate",
                            Number(e.target.value)
                          )
                        }
                        inputProps={{ style: { textAlign: "center" } }}
                        InputProps={{
                          disableUnderline: true,
                          readOnly,
                          sx: { fontSize: "0.95rem" },
                        }}
                      />
                      <Typography
                        variant="caption"
                        display="block"
                        textAlign="center"
                        color="text.secondary"
                        fontWeight={600}
                      >
                        {gstAmount > 0 ? `₹${gstAmount.toFixed(1)}` : ""}
                      </Typography>
                    </TableCell>
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
                        value={item.discount}
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
                          readOnly,
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

                  <TableCell
                    align="center"
                    sx={{ borderBottom: "1px dashed #eee" }}
                  >
                    {!readOnly && (
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveItem(idx)}
                        sx={{
                          color: theme.palette.error.main,
                          opacity: 0.7,
                          "&:hover": { opacity: 1 },
                        }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {!readOnly && (
        <Box sx={{ p: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button
            onClick={handleAddItem}
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
            Add Another Line
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default PurchaseItemSection;
