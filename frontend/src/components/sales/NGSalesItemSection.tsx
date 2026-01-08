/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  TableContainer,
  Autocomplete,
} from "@mui/material";
import { SetStateAction, useEffect, useRef, useState } from "react";
import type { NonGstSaleItem } from "../../lib/types/nonGstSalesTypes";
import { Trash2 } from "lucide-react";
import theme from "../../../theme";
import { getUniqueProductNames } from "../../lib/api/nonGstSalesService";

const defaultItem = (): NonGstSaleItem => ({
  sr_no: "",
  product_name: "",
  rate: 0,
  quantity: 1,
  discount: 0,
  price: 0,
});

interface Props {
  items: NonGstSaleItem[];
  onItemsChange: (items: NonGstSaleItem[]) => void;
}

export default function NGSaleItemSection({ items, onItemsChange }: Props) {
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const nameInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [productSuggestions, setProductSuggestions] = useState<string[]>([]);

  // Fetch unique product names for suggestions on mount
  useEffect(() => {
    getUniqueProductNames()
      .then((names: SetStateAction<string[]>) => setProductSuggestions(names))
      .catch((err: any) =>
        console.error("Failed to load product suggestions", err)
      );
  }, []);

  // Auto-focus logic for new rows
  useEffect(() => {
    if (items.length > 0) {
      const lastIndex = items.length - 1;
      if (!items[lastIndex].product_name) {
        setTimeout(() => {
          nameInputRefs.current[lastIndex]?.focus();
        }, 100);
      }
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

  const handleAddRow = (currentItems: NonGstSaleItem[]): NonGstSaleItem[] => {
    const lastItem = currentItems[currentItems.length - 1];
    if (
      currentItems.length === 0 ||
      (lastItem.product_name && lastItem.product_name.trim() !== "")
    ) {
      const newItem = defaultItem();
      return [...currentItems, newItem];
    }
    return currentItems;
  };

  const handleFieldChange = (
    index: number,
    field: keyof NonGstSaleItem,
    value: any
  ) => {
    const updated = [...items];
    const currentItem = updated[index];
    (currentItem as any)[field] = value;
    currentItem.price = calculateItemPrice(currentItem);
    onItemsChange(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent, _index: number) => {
    // Add row on 'Enter' if field is not empty, or Alt+A
    if (e.key === "Enter" || (e.altKey && e.key.toLowerCase() === "a")) {
      e.preventDefault();
      onItemsChange(handleAddRow(items));
    }
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
    <Box sx={{ display: "flex", flexDirection: "column", height: "80%" }}>
      <TableContainer sx={{ flexGrow: 1 }}>
        <Table stickyHeader size="small" sx={{ borderCollapse: "collapse" }}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  backgroundColor: "#E0E0E0",
                  fontWeight: 700,
                  borderRight: "1px solid #ccc",
                  width: "50px",
                  p: "6px 8px",
                }}
              >
                #
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: "#E0E0E0",
                  fontWeight: 700,
                  borderRight: "1px solid #ccc",
                  width: "40%",
                  p: "6px 8px",
                }}
              >
                Particulars / Item Name
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  backgroundColor: "#E0E0E0",
                  fontWeight: 700,
                  borderRight: "1px solid #ccc",
                  width: "15%",
                  p: "6px 8px",
                }}
              >
                Rate
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  backgroundColor: "#E0E0E0",
                  fontWeight: 700,
                  borderRight: "1px solid #ccc",
                  width: "10%",
                  p: "6px 8px",
                }}
              >
                Qty
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  backgroundColor: "#E0E0E0",
                  fontWeight: 700,
                  borderRight: "1px solid #ccc",
                  width: "10%",
                  p: "6px 8px",
                }}
              >
                Disc %
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  backgroundColor: "#E0E0E0",
                  fontWeight: 700,
                  borderRight: "1px solid #ccc",
                  width: "15%",
                  p: "6px 8px",
                }}
              >
                Amount
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: "#E0E0E0",
                  width: "50px",
                  p: "6px 8px",
                }}
              ></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {items.map((item, idx) => (
              <TableRow
                key={idx}
                onMouseEnter={() => setHoveredRowIndex(idx)}
                onMouseLeave={() => setHoveredRowIndex(null)}
                sx={{
                  "&:hover": { backgroundColor: "#f5f5f5" },
                }}
              >
                <TableCell
                  align="center"
                  sx={{
                    borderRight: "1px solid #eee",
                    borderBottom: "1px solid #eee",
                    color: "text.secondary",
                    p: "4px",
                  }}
                >
                  {idx + 1}
                </TableCell>

                <TableCell
                  sx={{
                    borderRight: "1px solid #eee",
                    borderBottom: "1px solid #eee",
                    p: 0,
                  }}
                >
                  <Autocomplete
                    freeSolo
                    options={productSuggestions}
                    value={item.product_name}
                    onChange={(_event, newValue) => {
                      handleFieldChange(idx, "product_name", newValue || "");
                    }}
                    onInputChange={(_event, newInputValue) => {
                      handleFieldChange(idx, "product_name", newInputValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        variant="standard"
                        placeholder="Item description"
                        // Attach the ref directly to the input element so existing auto-focus logic works
                        inputRef={(el) => (nameInputRefs.current[idx] = el)}
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                        InputProps={{
                          ...params.InputProps,
                          disableUnderline: true,
                          style: { padding: "8px 12px", fontSize: "0.95rem" },
                        }}
                      />
                    )}
                  />
                </TableCell>

                <TableCell
                  sx={{
                    borderRight: "1px solid #eee",
                    borderBottom: "1px solid #eee",
                    p: 0,
                  }}
                >
                  <TextField
                    type="number"
                    variant="standard"
                    fullWidth
                    placeholder="0"
                    value={item.rate === 0 ? "" : item.rate}
                    onChange={(e) =>
                      handleFieldChange(idx, "rate", Number(e.target.value))
                    }
                    inputProps={{
                      style: {
                        textAlign: "right",
                        padding: "8px 12px",
                        fontSize: "0.95rem",
                      },
                    }}
                    InputProps={{ disableUnderline: true }}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                  />
                </TableCell>

                <TableCell
                  sx={{
                    borderRight: "1px solid #eee",
                    borderBottom: "1px solid #eee",
                    p: 0,
                  }}
                >
                  <TextField
                    type="number"
                    variant="standard"
                    fullWidth
                    value={item.quantity}
                    onChange={(e) =>
                      handleFieldChange(idx, "quantity", Number(e.target.value))
                    }
                    inputProps={{
                      style: {
                        textAlign: "center",
                        padding: "8px 12px",
                        fontSize: "0.95rem",
                      },
                    }}
                    InputProps={{ disableUnderline: true }}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                  />
                </TableCell>

                <TableCell
                  sx={{
                    borderRight: "1px solid #eee",
                    borderBottom: "1px solid #eee",
                    p: 0,
                  }}
                >
                  <TextField
                    type="number"
                    variant="standard"
                    fullWidth
                    value={item.discount === 0 ? "" : item.discount}
                    onChange={(e) =>
                      handleFieldChange(idx, "discount", Number(e.target.value))
                    }
                    inputProps={{
                      style: {
                        textAlign: "center",
                        padding: "8px 12px",
                        fontSize: "0.95rem",
                      },
                    }}
                    InputProps={{ disableUnderline: true }}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                  />
                </TableCell>

                <TableCell
                  align="right"
                  sx={{
                    borderRight: "1px solid #eee",
                    borderBottom: "1px solid #eee",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    color: theme.palette.text.primary,
                    p: "4px 12px",
                  }}
                >
                  {item.price.toFixed(2)}
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    borderBottom: "1px solid #eee",
                    p: "2px",
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveRow(idx)}
                    sx={{
                      color: theme.palette.error.main,
                      visibility:
                        hoveredRowIndex === idx ? "visible" : "hidden",
                    }}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {/* Empty Row for adding new items easily if last is filled */}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onItemsChange(handleAddRow(items))}
                  >
                    + Add First Item
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
