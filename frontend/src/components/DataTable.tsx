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
} from "@mui/material";
import { MoreVertical } from "lucide-react";
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
    <Box>
      <TableContainer
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
            >
              {/* 🔹 Serial No Column */}
              <TableCell
                align="center"
                sx={{
                  color: theme.palette.text.secondary,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  py: 1.5,
                  borderRight: `1px solid ${theme.palette.divider}`,
                }}
              >
                Sr No
              </TableCell>

              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align || "left"}
                  sx={{
                    color: theme.palette.text.secondary,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    py: 1.5,
                    borderRight: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  {col.label}
                </TableCell>
              ))}

              {actions.length > 0 && (
                <TableCell
                  align="right"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontWeight: 600,
                    py: 1,
                  }}
                >
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 2}
                  align="center"
                  sx={{ py: 3 }}
                >
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 2}
                  align="center"
                  sx={{ py: 3, color: theme.palette.text.secondary }}
                >
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow
                  key={row.id || i}
                  hover
                  sx={{
                    backgroundColor: i % 2 === 0 ? "#fafafa" : "#fff",
                    transition: "background-color 0.2s ease-in-out",
                    "&:hover": {
                      backgroundColor: "#f1f8ff",
                    },
                  }}
                >
                  <TableCell
                    align="center"
                    sx={{
                      py: 0.75,
                      borderRight: `1px solid ${theme.palette.divider}`,
                      color: theme.palette.text.primary,
                    }}
                  >
                    {page * rowsPerPage + i + 1}
                  </TableCell>

                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      align={col.align || "left"}
                      sx={{
                        py: 0.75,
                        borderRight: `1px solid ${theme.palette.divider}`,
                        color: theme.palette.text.primary,
                      }}
                    >
                      {col.format
                        ? col.format(row[col.key], row)
                        : row[col.key]}
                    </TableCell>
                  ))}

                  {actions.length > 0 && (
                    <TableCell align="right" sx={{ py: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, row)}
                      >
                        <MoreVertical size={18} />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          onRowsPerPageChange(parseInt(e.target.value, 10));
        }}
        rowsPerPageOptions={[5, 10, 20, 50, 100]}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{ elevation: 3 }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {actions.map((action, i) => (
          <MenuItem
            key={i}
            onClick={() => {
              action.onClick(selectedRow);
              handleMenuClose();
            }}
          >
            {action.icon && (
              <Box component="span" sx={{ mr: 1, display: "flex" }}>
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
