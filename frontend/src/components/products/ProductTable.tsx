"use client";

import { Chip } from "@mui/material";
import { Pencil, Trash2, Printer, Eye } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import type { Product } from "../../lib/types/product";
import DataTable from "../DataTable";
import LabelPrintDialog from "../LabelPrintModal";
import { getAllProducts } from "../../lib/api/productService";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

type Props = {
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  // ✅ Accept filter props from the parent component
  searchQuery: string;
  isActive: number;
};

export default function ProductTable({
  onEdit,
  onDelete,
  searchQuery,
  isActive,
}: Props) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  // ✅ Component now manages its own data and loading state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Pagination state is now managed here
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const navigate = useNavigate();

  // ✅ Data fetching logic is now centralized and dynamic
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllProducts({
        page: page + 1,
        limit: rowsPerPage,
        query: searchQuery,
        isActive: isActive,
        all: false,
      });
      setProducts(data.records || []);
      setTotalRecords(data.totalRecords || 0);
    } catch {
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchQuery, isActive]); // Depend on all filter/pagination states

  // ✅ useEffect now triggers a refetch whenever filters or pagination change
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProducts();
    }, 300); // Debounce to prevent rapid firing
    return () => clearTimeout(handler);
  }, [fetchProducts]);

  const columns = [
    { key: "name", label: "Name" },
    { key: "category_name", label: "Category" },
    { key: "brand", label: "Brand" },
    {
      key: "mrp",
      label: "MRP",
      format: (val: number) => `₹${val?.toLocaleString("en-IN")}`,
    },
    {
      key: "mop",
      label: "MOP",
      format: (val: number) => `₹${val?.toLocaleString("en-IN")}`,
    },
    { key: "product_code", label: "Code" },
    { key: "quantity", label: "Stock Qty" },
    {
      key: "is_active",
      label: "Status",
      format: (val: boolean) => (
        <Chip
          size="small"
          label={val ? "Active" : "Inactive"}
          color={val ? "success" : "error"}
          variant="outlined"
        />
      ),
    },
  ];

  const actions = [
    {
      label: "View Product",
      icon: <Eye size={16} />,
      onClick: (row: Product) => {
        navigate(`/product/${row.id}`);
      },
    },
    {
      label: "Edit",
      icon: <Pencil size={16} />,
      onClick: (row: Product) => onEdit(row),
    },
    {
      label: "Delete",
      icon: <Trash2 size={16} />,
      onClick: (row: Product) => onDelete(row),
    },
    {
      label: "Print Label",
      icon: <Printer size={16} />,
      onClick: (row: Product) => {
        setSelectedProduct(row);
        setPrintDialogOpen(true);
      },
    },
  ];

  return (
    <>
      <DataTable
        rows={products} // Use products state
        columns={columns}
        actions={actions}
        loading={loading}
        total={totalRecords}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(newLimit) => {
          setRowsPerPage(newLimit);
          setPage(0); // Reset to first page on limit change
        }}
      />

      {selectedProduct && (
        <LabelPrintDialog
          open={printDialogOpen}
          onClose={() => setPrintDialogOpen(false)}
          product={selectedProduct}
        />
      )}
    </>
  );
}
