import { IconButton, Menu, MenuItem } from "@mui/material";
import { EllipsisVertical } from "lucide-react";
import { useState } from "react";
import type { SupplierType } from "../../lib/types/supplierTypes";
import { deleteSupplier } from "../../lib/api/supplierService";
import toast from "react-hot-toast";

type Props = {
  supplier: SupplierType;
  onEdit: (supplier: SupplierType) => void;
  refresh: () => void;
};

export default function SupplierRowMenu({ supplier, onEdit, refresh }: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDelete = async () => {
    const response = await deleteSupplier(supplier.id!);
    toast.success(response.message);
    refresh();
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
        <EllipsisVertical />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => onEdit(supplier)}>Edit</MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
          Delete
        </MenuItem>
      </Menu>
    </>
  );
}
