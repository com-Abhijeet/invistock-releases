"use client";

import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  TableContainer,
  Paper,
  Collapse,
  Chip,
} from "@mui/material";
import { MoreVertical, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { Category } from "../../lib/types/categoryTypes";
import React from "react";

interface Props {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
}

/**
 * A reusable component for a single row in the category table, with collapsible content.
 */
function Row({
  category,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: (cat: Category) => void;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <React.Fragment>
      {/* --- Main Category Row --- */}
      <TableRow hover sx={{ "& > *": { borderBottom: "unset" } }}>
        <TableCell sx={{ width: "50px" }}>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <ChevronDown /> : <ChevronRight />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          <Typography variant="body1" fontWeight="bold">
            {category.name}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip label={category.code} size="small" />
        </TableCell>
        <TableCell>{category.subcategories?.length ?? 0} items</TableCell>
        <TableCell align="right">
          <IconButton onClick={handleMenuOpen} size="small">
            <MoreVertical size={18} />
          </IconButton>
          <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleMenuClose}>
            <MenuItem
              onClick={() => {
                onEdit(category);
                handleMenuClose();
              }}
            >
              Edit
            </MenuItem>
            <MenuItem
              onClick={() => {
                onDelete(category.id!);
                handleMenuClose();
              }}
            >
              Delete
            </MenuItem>
          </Menu>
        </TableCell>
      </TableRow>

      {/* --- Collapsible Subcategory Rows --- */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1, ml: 4 }}>
              <Typography
                variant="subtitle2"
                gutterBottom
                component="div"
                color="text.secondary"
              >
                Subcategories
              </Typography>
              {category.subcategories.length > 0 ? (
                <Table size="small" aria-label="subcategories">
                  <TableBody>
                    {category.subcategories.map((sub) => (
                      <TableRow
                        key={sub.id}
                        sx={{ backgroundColor: "action.hover" }}
                      >
                        <TableCell sx={{ borderBottom: "none" }}>
                          {sub.name}
                        </TableCell>
                        <TableCell sx={{ borderBottom: "none" }}>
                          <Chip
                            label={sub.code}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        {/* Placeholder for future subcategory actions */}
                        <TableCell
                          sx={{ borderBottom: "none" }}
                          align="right"
                        ></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography
                  variant="body2"
                  sx={{ p: 2, color: "text.secondary" }}
                >
                  No subcategories found.
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

export default function CategoryTable({ categories, onEdit, onDelete }: Props) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table aria-label="collapsible category table">
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell sx={{ fontWeight: 600 }}>Category Name</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Items</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {categories.map((cat) => (
            <Row
              key={cat.id}
              category={cat}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
