"use client";

import { useEffect, useRef, useState } from "react";

import {
  Autocomplete,
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Trash2 } from "lucide-react";

import theme from "../../../theme";
import { getAllProducts } from "../../lib/api/productService";
import type { Product } from "../../lib/types/product";
import type { PurchaseItem } from "../../lib/types/purchaseTypes";

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
  const [products, setProducts] = useState<Product[]>([]);
  const autocompleteRefs = useRef<Array<HTMLInputElement | null>>([]);

  const params = {
    page: 1,
    limit: 100,
    query: "",
    isActive: 0,
    all: true,
  };
  useEffect(() => {
    getAllProducts(params)
      .then((data) => setProducts(data.records || []))
      .then(() => console.log(products));
  }, []);

  useEffect(() => {
    if (!readOnly && items.length > 0) {
      const lastIndex = items.length - 1;
      setTimeout(() => {
        autocompleteRefs.current[lastIndex]?.focus();
      }, 100);
    }
  }, [items.length, readOnly]);

  const calculatePrice = (item: PurchaseItem) => {
    const base = item.rate * item.quantity;
    const discountAmt = (item.discount * base) / 100;
    const gstAmt = (item.gst_rate * (base - discountAmt)) / 100;
    return base - discountAmt + gstAmt;
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
        gst_rate: 0,
        price: calculatePrice({ ...updated[index], rate: product.mop }),
      };
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

  // const filterOptions = useMemo(
  //   () =>
  //     (options: Product[], { inputValue }: any) =>
  //       options.filter((p) =>
  //         [p.name, p.product_code, p.barcode]
  //           .filter(Boolean)
  //           .some((field) =>
  //             field
  //               ? field.toLowerCase().includes(inputValue.toLowerCase())
  //               : false
  //           )
  //       ),
  //   []
  // );

  return (
    <Box mt={1}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Purchase Items
      </Typography>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ borderRadius: 2, borderColor: theme.palette.divider }}
      >
        <Table size="small">
          <TableHead sx={{ backgroundColor: theme.palette.grey[50] }}>
            <TableRow>
              <TableCell
                rowSpan={2}
                sx={{
                  fontWeight: 600,
                  width: "5%",
                  borderRight: `1px solid ${theme.palette.divider}`,
                }}
              >
                Sr.
              </TableCell>
              <TableCell
                rowSpan={2}
                sx={{
                  fontWeight: 600,
                  width: "5%",
                  borderRight: `1px solid ${theme.palette.divider}`,
                }}
              >
                HSN
              </TableCell>
              <TableCell
                rowSpan={2}
                sx={{
                  fontWeight: 600,
                  width: "28%",
                  borderRight: `1px solid ${theme.palette.divider}`,
                }}
              >
                Product
              </TableCell>
              <TableCell
                rowSpan={2}
                sx={{
                  fontWeight: 600,
                  width: "12%",
                  borderRight: `1px solid ${theme.palette.divider}`,
                }}
              >
                Rate
              </TableCell>
              <TableCell
                rowSpan={2}
                sx={{
                  fontWeight: 600,
                  width: "10%",
                  borderRight: `1px solid ${theme.palette.divider}`,
                }}
              >
                Qty
              </TableCell>
              <TableCell
                colSpan={2}
                align="center"
                sx={{
                  width: "15%",
                  fontWeight: 600,
                  borderRight: `1px solid ${theme.palette.divider}`,
                }}
              >
                GST
              </TableCell>
              <TableCell
                rowSpan={2}
                align="center"
                sx={{
                  fontWeight: 600,
                  width: "5%",
                  borderRight: `1px solid ${theme.palette.divider}`,
                }}
              >
                Discount
              </TableCell>
              <TableCell
                rowSpan={2}
                align="right"
                sx={{ fontWeight: 600, width: "15%" }}
              >
                Price
              </TableCell>
              <TableCell
                rowSpan={2}
                align="center"
                sx={{
                  fontWeight: 600,
                  width: "5%",
                  borderLeft: `1px solid ${theme.palette.divider}`,
                }}
              ></TableCell>
            </TableRow>
            <TableRow>
              <TableCell
                align="center"
                sx={{
                  fontWeight: 500,
                  width: "7%",
                  borderRight: `1px solid ${theme.palette.divider}`,
                }}
              >
                Rate
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 500,
                  width: "8%",
                  borderRight: `1px solid ${theme.palette.divider}`,
                }}
              >
                Amt
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {items?.map((item, idx) => {
              const product = products.find((p) => p.id === item.product_id);

              item.gst_rate = product?.gst_rate || 0;
              const taxableAmount =
                item.rate * item.quantity * (1 - (item.discount || 0) / 100);
              const gstAmount = (taxableAmount * (item.gst_rate || 0)) / 100;

              function handleRemoveItem(idx: number): void {
                if (readOnly) return;
                const updated = items.filter((_, i) => i !== idx);
                // Update serial numbers after removal
                updated.forEach((item, index) => {
                  item.sr_no = index + 1;
                });
                onItemsChange(updated);
              }

              return (
                <TableRow
                  key={idx}
                  sx={{
                    "&:nth-of-type(odd)": {
                      backgroundColor: theme.palette.action.hover,
                    },
                    "&:last-child td, &:last-child th": { border: 0 },
                  }}
                >
                  <TableCell align="center">{item.sr_no}</TableCell>
                  <TableCell>{product?.hsn || "—"}</TableCell>
                  <TableCell sx={{ p: 0.5 }}>
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
                          placeholder="Search Product..."
                          variant="outlined"
                          size="small"
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              "& fieldset": { border: "none" },
                            },
                          }}
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell sx={{ p: 0.5 }}>
                    <TextField
                      type="number"
                      size="small"
                      variant="outlined"
                      fullWidth
                      value={(item as any)["rate"]}
                      onChange={(e) =>
                        handleFieldChange(idx, "rate", Number(e.target.value))
                      }
                      InputProps={{ readOnly }}
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
                      value={(item as any)["quantity"]}
                      onChange={(e) =>
                        handleFieldChange(
                          idx,
                          "quantity",
                          Number(e.target.value)
                        )
                      }
                      InputProps={{ readOnly }}
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
                      // ✅ Use the product's GST rate if available
                      value={item.gst_rate ?? product?.gst_rate}
                      onChange={(e) =>
                        handleFieldChange(
                          idx,
                          "gst_rate",
                          Number(e.target.value)
                        )
                      }
                      InputProps={{ readOnly }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { border: "none" },
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {/* ✅ GST Amount is now displayed */}
                    {gstAmount.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ p: 0.5 }}>
                    <TextField
                      type="number"
                      size="small"
                      variant="outlined"
                      fullWidth
                      value={(item as any)["discount"]}
                      onChange={(e) =>
                        handleFieldChange(
                          idx,
                          "discount",
                          Number(e.target.value)
                        )
                      }
                      InputProps={{ readOnly }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { border: "none" },
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 500 }}>
                    {item.price.toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </TableCell>
                  <TableCell align="center">
                    {!readOnly && (
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveItem(idx)}
                        color="error"
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
        <Box mt={2}>
          <Button onClick={handleAddItem} size="small" variant="contained">
            + Add Item
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default PurchaseItemSection;
