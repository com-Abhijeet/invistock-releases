"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  Tooltip,
  Chip,
} from "@mui/material";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { CustomerType } from "../../lib/types/customerTypes";

type Props = {
  customers: CustomerType[];
  onEdit: (customer: CustomerType) => void;
  onDelete: (customer: CustomerType) => void;
};

export default function CustomerTable({ customers, onEdit, onDelete }: Props) {
  const theme = useTheme();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerType | null>(
    null
  );

  const handleContextMenu = (e: React.MouseEvent, customer: CustomerType) => {
    e.preventDefault();
    setAnchorEl(e.currentTarget as HTMLElement);
    setSelectedCustomer(customer);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCustomer(null);
  };

  return (
    <>
      <TableContainer
        component={Paper}
        elevation={0}
        variant="outlined"
        sx={{
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          mb: 2,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.grey[100] }}>
              {[
                "Name",
                "Phone",
                "City", // ✅ Updated Column
                "State", // ✅ New Column
                "GSTIN",
                "Credit Limit",
                "Actions",
              ].map((head) => (
                <TableCell
                  key={head}
                  sx={{ color: "text.primary", fontWeight: 600 }}
                >
                  {head}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((c) => (
              <TableRow
                key={c.id}
                hover
                onContextMenu={(e) => handleContextMenu(e, c)}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell sx={{ fontWeight: 500 }}>{c.name}</TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell>{c.city || "—"}</TableCell> {/* ✅ Display City */}
                <TableCell>{c.state || "—"}</TableCell> {/* ✅ Display State */}
                <TableCell>{c.gst_no || "—"}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={`₹${c.credit_limit?.toLocaleString("en-IN") ?? 0}`}
                    color={
                      c.credit_limit && c.credit_limit > 0
                        ? "success"
                        : "default"
                    }
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => onEdit(c)} size="small">
                      <Pencil size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      onClick={() => onDelete(c)}
                      size="small"
                      sx={{ color: "error.main" }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ elevation: 2, sx: { borderRadius: 2 } }}
      >
        <MenuItem
          onClick={() => {
            if (selectedCustomer) onEdit(selectedCustomer);
            handleMenuClose();
          }}
        >
          Edit Customer
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedCustomer) onDelete(selectedCustomer);
            handleMenuClose();
          }}
          sx={{ color: "error.main" }}
        >
          Delete Customer
        </MenuItem>
      </Menu>
    </>
  );
}
