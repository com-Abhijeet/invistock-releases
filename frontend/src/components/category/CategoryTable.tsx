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
  useTheme,
  alpha,
  Stack,
} from "@mui/material";
import {
  MoreVertical,
  ChevronDown,
  Folder,
  GitCommitHorizontal,
} from "lucide-react";
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
  const theme = useTheme();
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
      <TableRow
        hover
        sx={{
          "& > *": { borderBottom: "unset" },
          cursor: "pointer",
          transition: "background-color 0.2s",
          backgroundColor: open
            ? alpha(theme.palette.primary.main, 0.04)
            : "inherit",
        }}
        onClick={() => setOpen(!open)}
      >
        <TableCell sx={{ width: "50px", pl: 2 }}>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
            sx={{
              transform: open ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 0.2s ease",
              color: open ? "primary.main" : "text.secondary",
            }}
          >
            <ChevronDown size={18} />
          </IconButton>
        </TableCell>

        <TableCell component="th" scope="row">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Folder size={18} />
            </Box>
            <Box>
              <Typography variant="body1" fontWeight={600} color="text.primary">
                {category.name}
              </Typography>
              <Typography
                variant="caption"
                fontFamily="monospace"
                color="text.secondary"
                sx={{ letterSpacing: 0.5 }}
              >
                {category.code}
              </Typography>
            </Box>
          </Stack>
        </TableCell>

        <TableCell>
          <Chip
            label={`${category.subcategories?.length ?? 0} Subcategories`}
            size="small"
            variant="outlined"
            sx={{
              fontWeight: 500,
              color: "text.secondary",
              borderColor: theme.palette.divider,
            }}
          />
        </TableCell>

        <TableCell align="right" sx={{ pr: 3 }}>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handleMenuOpen(e);
            }}
            size="small"
            sx={{ color: "text.secondary" }}
          >
            <MoreVertical size={18} />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={!!anchorEl}
            onClose={handleMenuClose}
            onClick={(e) => e.stopPropagation()}
            elevation={3}
            PaperProps={{
              sx: {
                borderRadius: 3,
                minWidth: 140,
                mt: 1,
                overflow: "hidden",
              },
            }}
          >
            <MenuItem
              onClick={() => {
                onEdit(category);
                handleMenuClose();
              }}
              sx={{ fontSize: "0.9rem", py: 1 }}
            >
              Edit Category
            </MenuItem>
            <MenuItem
              onClick={() => {
                onDelete(category.id!);
                handleMenuClose();
              }}
              sx={{
                color: "error.main",
                fontSize: "0.9rem",
                py: 1,
                "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.08) },
              }}
            >
              Delete
            </MenuItem>
          </Menu>
        </TableCell>
      </TableRow>

      {/* --- Collapsible Subcategory Content --- */}
      <TableRow>
        <TableCell
          style={{
            paddingBottom: 0,
            paddingTop: 0,
            paddingLeft: 0,
            paddingRight: 0,
          }}
          colSpan={6}
        >
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box
              sx={{
                py: 2,
                px: 3,
                bgcolor: alpha(theme.palette.background.default, 0.5),
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography
                variant="subtitle2"
                gutterBottom
                color="text.secondary"
                sx={{
                  ml: 8,
                  mb: 1.5,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Subcategories
              </Typography>

              {category.subcategories.length > 0 ? (
                <Stack spacing={1} sx={{ ml: 8, mb: 1 }}>
                  {category.subcategories.map((sub) => (
                    <Paper
                      key={sub.id}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderColor: "divider",
                        borderRadius: 2,
                        maxWidth: "500px",
                        bgcolor: "background.paper",
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <GitCommitHorizontal
                          size={16}
                          color={theme.palette.text.disabled}
                        />
                        <Typography variant="body2" fontWeight={500}>
                          {sub.name}
                        </Typography>
                      </Stack>
                      <Chip
                        label={sub.code}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          borderRadius: 1,
                          bgcolor: alpha(theme.palette.secondary.main, 0.08),
                          color: "secondary.main",
                        }}
                      />
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Box sx={{ ml: 8, py: 1 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontStyle="italic"
                  >
                    No subcategories found. Add one by editing the category.
                  </Typography>
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

export default function CategoryTable({ categories, onEdit, onDelete }: Props) {
  const theme = useTheme();

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <Table aria-label="collapsible category table">
        <TableHead>
          <TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
            <TableCell width="60px" />
            <TableCell
              sx={{
                fontWeight: 700,
                color: "text.secondary",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                py: 2,
              }}
            >
              Category Details
            </TableCell>
            <TableCell
              sx={{
                fontWeight: 700,
                color: "text.secondary",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                py: 2,
              }}
            >
              Structure
            </TableCell>
            <TableCell
              align="right"
              sx={{
                fontWeight: 700,
                color: "text.secondary",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                py: 2,
                pr: 4,
              }}
            >
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
