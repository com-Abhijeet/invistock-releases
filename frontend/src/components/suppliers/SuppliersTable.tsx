"use client";

import { useState } from "react";
import type { SupplierType } from "../../lib/types/supplierTypes";
import DataTable from "../DataTable";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { deleteSupplier } from "../../lib/api/supplierService";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

type Props = {
  suppliers: SupplierType[];
  onEdit: (supplier: SupplierType) => void;
  refresh: () => void;
};

export default function SuppliersTable({ suppliers, onEdit, refresh }: Props) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();

  const paginatedSuppliers = suppliers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleDelete = async (supplier: SupplierType) => {
    const response = await deleteSupplier(supplier.id!);
    toast.success(response.message);
    refresh();
  };

  return (
    <DataTable
      rows={paginatedSuppliers}
      columns={[
        { key: "name", label: "Name" },
        { key: "contact_person", label: "Contact Person" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "address", label: "Address" },
        { key: "gst_number", label: "GST Number" },
        { key: "supplier_type", label: "Supply Type" },
      ]}
      actions={[
        {
          label: "View",
          icon: <Eye size={16} />,
          onClick: (row) => {
            navigate(`/viewSupplier/${row.id}`);
          },
        },
        {
          label: "Edit",
          icon: <Pencil size={16} />,
          onClick: (row) => onEdit(row),
        },
        {
          label: "Delete",
          icon: <Trash2 size={16} color="red" />,
          onClick: (row) => handleDelete(row),
        },
      ]}
      total={suppliers.length}
      page={page}
      rowsPerPage={rowsPerPage}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      loading={false}
    />
  );
}
