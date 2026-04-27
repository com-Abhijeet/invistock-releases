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
  Typography,
  Checkbox,
  Button,
  alpha,
} from "@mui/material";
import { MoreHorizontal } from "lucide-react";
import {
  useState,
  useRef,
  useEffect,
  type MouseEvent,
  type KeyboardEvent,
} from "react";
import type { DataTableProps as BaseDataTableProps } from "../lib/types/DataTableTypes";

// Extended props to include optional bulk actions without breaking existing usages
export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedRows: any[]) => void;
}

export type DataTableProps = BaseDataTableProps & {
  bulkActions?: boolean;
  bulkActionsList?: BulkAction[];
};

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
  bulkActions = false,
  bulkActionsList = [],
}: DataTableProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [_focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Bulk Selection States
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);

  // Ref to the table container to manage focus within the list
  const tableRef = useRef<HTMLTableSectionElement>(null);

  // Auto-focus the first row when the data is loaded and rows are available
  useEffect(() => {
    if (!loading && rows.length > 0) {
      setFocusedIndex(0);
      const firstRow = tableRef.current?.childNodes[0] as HTMLElement;
      if (firstRow) {
        firstRow.focus();
      }
    }
  }, [loading, rows.length]);

  const handleMenuOpen = (
    event: MouseEvent<HTMLButtonElement> | HTMLElement,
    row: any,
  ) => {
    const target = "currentTarget" in event ? event.currentTarget : event;
    setAnchorEl(target);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  // --- Bulk Selection Handlers ---
  const isRowSelected = (row: any, index: number) => {
    const id = row.id || index;
    return selectedItems.some((item) => (item.id || rows.indexOf(item)) === id);
  };

  const handleSelect = (row: any, index: number) => {
    const id = row.id || index;
    setSelectedItems((prev) => {
      const exists = prev.some(
        (item) => (item.id || rows.indexOf(item)) === id,
      );
      if (exists) {
        return prev.filter((item) => (item.id || rows.indexOf(item)) !== id);
      } else {
        return [...prev, row];
      }
    });
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelections = [...selectedItems];
      rows.forEach((row, i) => {
        const id = row.id || i;
        if (
          !newSelections.some((item) => (item.id || rows.indexOf(item)) === id)
        ) {
          newSelections.push(row);
        }
      });
      setSelectedItems(newSelections);
    } else {
      const currentPageIds = rows.map((r, i) => r.id || i);
      setSelectedItems((prev) =>
        prev.filter((item) => {
          const id = item.id || rows.indexOf(item);
          return !currentPageIds.includes(id);
        }),
      );
    }
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    index: number,
    row: any,
  ) => {
    // Enter bulk selection mode with Shift + Enter
    if (bulkActions && event.shiftKey && event.key === "Enter") {
      event.preventDefault();
      setIsBulkMode((prev) => !prev);
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        const nextIndex = Math.min(index + 1, rows.length - 1);
        setFocusedIndex(nextIndex);
        (tableRef.current?.childNodes[nextIndex] as HTMLElement)?.focus();
        break;
      case "ArrowUp":
        event.preventDefault();
        const prevIndex = Math.max(index - 1, 0);
        setFocusedIndex(prevIndex);
        (tableRef.current?.childNodes[prevIndex] as HTMLElement)?.focus();
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (bulkActions && isBulkMode) {
          handleSelect(row, index);
        } else if (actions.length > 0) {
          handleMenuOpen(event.currentTarget, row);
        }
        break;
      default:
        break;
    }
  };

  const isAllCurrentPageSelected =
    rows.length > 0 && rows.every((row, i) => isRowSelected(row, i));
  const isSomeCurrentPageSelected =
    rows.some((row, i) => isRowSelected(row, i)) && !isAllCurrentPageSelected;

  const colSpanCount =
    columns.length + (actions.length > 0 ? 2 : 1) + (bulkActions ? 1 : 0);

  return (
    <Box
      sx={{
        width: "100%",
        overflow: "hidden",
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.05)",
        backgroundColor: theme.palette.background.paper,
      }}
    >
      {/* --- BULK ACTIONS TOOLBAR --- */}
      {bulkActions && selectedItems.length > 0 && (
        <Box
          sx={{
            px: 2,
            py: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="subtitle2" color="primary.main" fontWeight={700}>
            {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""}{" "}
            selected
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {bulkActionsList.map((action, idx) => (
              <Button
                key={idx}
                size="small"
                variant="contained"
                disableElevation
                startIcon={action.icon}
                onClick={() => action.onClick(selectedItems)}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        </Box>
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ height: 48 }}>
              {bulkActions && (
                <TableCell
                  padding="checkbox"
                  sx={{
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    width: 48,
                    pl: 1,
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={isAllCurrentPageSelected}
                    indeterminate={isSomeCurrentPageSelected}
                    onChange={handleSelectAll}
                    color="primary"
                  />
                </TableCell>
              )}
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
                  pl: bulkActions ? 1 : 2,
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
                    pr: 2,
                  }}
                />
              )}
            </TableRow>
          </TableHead>
          <TableBody ref={tableRef}>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={colSpanCount}
                  align="center"
                  sx={{ py: 6, borderBottom: "none" }}
                >
                  <CircularProgress size={24} thickness={4} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colSpanCount}
                  align="center"
                  sx={{ py: 6, borderBottom: "none" }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No data available
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => {
                const isSelected = isRowSelected(row, i);

                return (
                  <TableRow
                    key={row.id || i}
                    hover
                    tabIndex={0}
                    onKeyDown={(e) => handleKeyDown(e, i, row)}
                    onFocus={() => setFocusedIndex(i)}
                    selected={isSelected}
                    sx={{
                      outline: "none",
                      "&:last-child td, &:last-child th": { border: 0 },
                      transition: "background-color 0.15s ease",
                      cursor: "default",
                      height: 44,
                      // Visual indicator for keyboard focus and selection
                      backgroundColor: isSelected
                        ? alpha(theme.palette.primary.main, 0.04)
                        : "inherit",
                      "&:focus-visible": {
                        backgroundColor: theme.palette.action.selected,
                        boxShadow: `inset 4px 0 0 0 ${theme.palette.primary.main}`,
                      },
                      "&:hover": {
                        backgroundColor: isSelected
                          ? alpha(theme.palette.primary.main, 0.08)
                          : theme.palette.action.hover,
                      },
                    }}
                  >
                    {bulkActions && (
                      <TableCell padding="checkbox" sx={{ pl: 1 }}>
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          onChange={() => handleSelect(row, i)}
                          tabIndex={-1} // Prevent tabbing to checkbox so row receives keyboard events
                          color="primary"
                        />
                      </TableCell>
                    )}
                    <TableCell
                      align="center"
                      sx={{
                        color: theme.palette.text.disabled,
                        fontWeight: 500,
                        fontSize: "0.8125rem",
                        pl: bulkActions ? 1 : 2,
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
                        <IconButton
                          size="small"
                          tabIndex={-1}
                          onClick={(e) => handleMenuOpen(e, row)}
                          sx={{
                            color: theme.palette.text.secondary,
                            padding: "4px",
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
                );
              })
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
            minHeight: 48,
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
              paddingTop: "6px !important",
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
        autoFocus
        PaperProps={{
          elevation: 3,
          sx: {
            borderRadius: 2,
            minWidth: 140,
            mt: 0.5,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
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
              fontSize: "0.8125rem",
              py: 1,
              px: 2,
              gap: 1.5,
              fontWeight: 500,
              color: theme.palette.text.secondary,
              minHeight: 36,
              "&:hover": {
                color: theme.palette.primary.main,
                bgcolor: theme.palette.action.hover,
              },
            }}
          >
            {action.icon && (
              <Box
                component="span"
                sx={{ display: "flex", alignItems: "center", opacity: 0.8 }}
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
