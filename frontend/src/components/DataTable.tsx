"use client";

import {
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  Paper,
  Typography,
} from "@mui/material";
import { MoreHorizontal } from "lucide-react";
import { useState, type MouseEvent } from "react";
import type { DataTableProps } from "../lib/types/DataTableTypes";

export default function DataTable({
  rows,
  columns,
  actions = [],
  loading,
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  hidePagination = false,
  rowsPerPageOptions = [5, 10, 20, 50, 100],
}: DataTableProps) {
  const theme = useTheme();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const handleMenuOpen = (event: MouseEvent<HTMLButtonElement>, row: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  return (
    <Box
      sx={{
        width: "100%",
        overflow: "hidden",
        borderRadius: 2, // Slightly more rounded
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.05)", // Very subtle shadow
      }}
    >
      <TableContainer>
        <Table size="small">
          {" "}
          {/* Keeping small size for density */}
          <TableHead>
            <TableRow sx={{ height: 48 }}>
              {" "}
              {/* Fixed header height */}
              <TableCell
                align="center"
                sx={{
                  color: theme.palette.text.secondary,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  width: 60,
                  pl: 2, // Left padding for first col
                }}
              >
                #
              </TableCell>
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align || "left"}
                  sx={{
                    color: theme.palette.text.secondary,
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    borderBottom: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  {col.label}
                </TableCell>
              ))}
              {actions.length > 0 && (
                <TableCell
                  align="right"
                  sx={{
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    width: 60,
                    pr: 2, // Right padding for last col
                  }}
                />
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 2}
                  align="center"
                  sx={{ py: 6, borderBottom: "none" }}
                >
                  <CircularProgress size={24} thickness={4} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 2}
                  align="center"
                  sx={{ py: 6, borderBottom: "none" }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No data available
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow
                  key={row.id || i}
                  hover
                  sx={{
                    "&:last-child td, &:last-child th": { border: 0 },
                    transition: "background-color 0.15s ease",
                    cursor: "default",
                    height: 44, // Consistent row height
                    "&:hover": {
                      backgroundColor: theme.palette.action.hover, // Subtle hover
                    },
                  }}
                >
                  <TableCell
                    align="center"
                    sx={{
                      color: theme.palette.text.disabled,
                      fontWeight: 500,
                      fontSize: "0.8125rem",
                      pl: 2,
                    }}
                  >
                    {page * rowsPerPage + i + 1}
                  </TableCell>

                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      align={col.align || "left"}
                      sx={{
                        color: theme.palette.text.primary,
                        fontSize: "0.8125rem",
                        fontWeight: 400,
                      }}
                    >
                      {col.format
                        ? col.format(row[col.key], row)
                        : row[col.key] || "-"}
                    </TableCell>
                  ))}

                  {actions.length > 0 && (
                    <TableCell align="right" sx={{ pr: 1 }}>
                      {" "}
                      {/* Reduced padding for action button */}
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, row)}
                        sx={{
                          color: theme.palette.text.secondary,
                          padding: "4px", // Smaller touch target visual
                          "&:hover": {
                            color: theme.palette.primary.main,
                            bgcolor: theme.palette.action.selected,
                          },
                        }}
                      >
                        <MoreHorizontal size={16} />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {!hidePagination && (
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => onPageChange(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            onRowsPerPageChange(parseInt(e.target.value, 10));
          }}
          rowsPerPageOptions={rowsPerPageOptions}
          sx={{
            borderTop: `1px solid ${theme.palette.divider}`,
            minHeight: 48, // Slimmer pagination bar
            ".MuiTablePagination-toolbar": {
              minHeight: 48,
              pl: 2,
              pr: 2,
            },
            ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows":
              {
                fontSize: "0.75rem",
                color: theme.palette.text.secondary,
                fontWeight: 500,
                marginBottom: 0,
                marginTop: 0,
              },
            ".MuiTablePagination-select": {
              fontSize: "0.75rem",
              paddingTop: "6px !important", // Alignment tweak
              paddingBottom: "6px !important",
            },
            ".MuiTablePagination-actions": {
              marginLeft: 1,
            },
          }}
        />
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3, // Slightly higher elevation for menu
          sx: {
            borderRadius: 2,
            minWidth: 140,
            mt: 0.5,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)", // Softer shadow
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {actions.map((action, i) => (
          <MenuItem
            key={i}
            onClick={() => {
              action.onClick(selectedRow);
              handleMenuClose();
            }}
            sx={{
              fontSize: "0.8125rem", // Consistent font size
              py: 1,
              px: 2,
              gap: 1.5,
              fontWeight: 500,
              color: theme.palette.text.secondary,
              minHeight: 36, // Compact menu items
              "&:hover": {
                color: theme.palette.primary.main,
                bgcolor: theme.palette.action.hover,
              },
            }}
          >
            {action.icon && (
              <Box
                component="span"
                sx={{ display: "flex", alignItems: "center", opacity: 0.8 }} // Slight opacity on icons
              >
                {action.icon}
              </Box>
            )}
            {action.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
