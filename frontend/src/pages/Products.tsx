"use client";

import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  Typography,
  TextField,
  MenuItem,
  IconButton,
} from "@mui/material";
import { useState } from "react";
import ProductTable from "../components/products/ProductTable";
import toast from "react-hot-toast";
import type { Product } from "../lib/types/product";
import AddProductModal from "../components/products/AddProductModal";
import DashboardHeader from "../components/DashboardHeader";
import { Download, Filter, Plus, Upload, FileText, X } from "lucide-react";
import { exportToExcel } from "../lib/exportToExcel";
import { deleteProduct, getAllProducts } from "../lib/api/productService";
import ProductImportModal from "../components/products/ProductImportModal";
import ConfirmModal from "../components/ConfirmModal";
import theme from "../../theme";
import KbdButton from "../components/ui/Button";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const [isActiveFilter, setIsActiveFilter] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const handleExportFormat = async (format: "Excel" | "PDF") => {
    setExportDialogOpen(false);

    if (format === "Excel") {
      const loadId = toast.loading("Preparing Excel export...");
      try {
        const allProductsData = await getAllProducts({
          all: true,
          page: 0,
          limit: 0,
          query: "",
          isActive: undefined,
        });

        await exportToExcel({
          data: allProductsData.records,
          fileName: "Product_List_Full",
          columnMap: {
            name: "Product Name",
            name_local: "Product Name (Local)",
            product_code: "Code",
            barcode: "Barcode",
            category_name: "Category",
            mrp: "MRP",
            quantity: "Stock",
            is_active: "Active Status",
          },
        });
        toast.success("Excel exported successfully.", { id: loadId });
      } catch (err) {
        toast.error("Failed to export Excel.", { id: loadId });
      }
    } else {
      // Logic for PDF would go here
      toast.error("PDF Export logic is coming soon!");
    }
  };

  const handleSuccess = () => {
    setAddOpen(false);
    setEditOpen(false);
    setEditProduct(null);
    setRefreshKey((prevKey) => prevKey + 1);
  };

  const handleOpenDeleteModal = (product: Product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setProductToDelete(null);
    setDeleteModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(String(productToDelete.id!));
      toast.success(`"${productToDelete.name}" deactivated.`);
      setRefreshKey((prevKey) => prevKey + 1);
    } catch (error: any) {
      toast.error(error.message || "Failed to deactivate.");
    }
    setProductToDelete(null);
  };

  return (
    <Box p={2} pt={3} sx={{ backgroundColor: "#fff", minHeight: "100vh" }}>
      <DashboardHeader
        title="Products"
        showSearch={true}
        onSearch={setSearch}
        onRefresh={() => setRefreshKey((prevKey) => prevKey + 1)}
        showDateFilters={false}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            {/* Status Filter */}
            <TextField
              select
              size="small"
              value={isActiveFilter}
              onChange={(e) => setIsActiveFilter(e.target.value as any)}
              sx={{
                minWidth: 130,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  backgroundColor: theme.palette.grey[50],
                  "& fieldset": { borderColor: theme.palette.divider },
                },
              }}
              InputProps={{
                startAdornment: (
                  <Filter size={16} style={{ marginRight: 8, opacity: 0.5 }} />
                ),
              }}
            >
              <MenuItem value="1">Active Only</MenuItem>
              <MenuItem value="0">Inactive Only</MenuItem>
            </TextField>

            <KbdButton
              variant="secondary"
              label="Import"
              underlineChar="I"
              shortcut="ctrl+i"
              onClick={() => setImportOpen(true)}
              startIcon={<Upload size={18} />}
            />

            {/* Export Action */}
            <KbdButton
              variant="secondary"
              label="Export"
              underlineChar="E"
              shortcut="ctrl+e"
              onClick={() => setExportDialogOpen(true)}
              startIcon={<Download size={18} />}
            />

            <KbdButton
              variant="primary"
              label="Add Product"
              underlineChar="A"
              shortcut="ctrl+a"
              onClick={() => setAddOpen(true)}
              startIcon={<Plus size={18} />}
              sx={{ px: 3 }}
            />
          </Stack>
        }
      />

      <ProductTable
        key={refreshKey}
        onEdit={(product) => {
          setEditProduct(product);
          setEditOpen(true);
        }}
        onDelete={handleOpenDeleteModal}
        searchQuery={search}
        isActive={isActiveFilter}
      />

      {/* Export Format Pop-up Selector */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        PaperProps={{
          sx: { borderRadius: "20px", width: "100%", maxWidth: 400 },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Select Export Format
          </Typography>
          <IconButton onClick={() => setExportDialogOpen(false)}>
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pb: 4 }}>
          <Stack spacing={2} mt={1}>
            <Box
              onClick={() => handleExportFormat("Excel")}
              sx={{
                p: 2.5,
                borderRadius: "16px",
                border: "2px solid",
                borderColor: "divider",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 2,
                "&:hover": {
                  borderColor: "primary.main",
                  backgroundColor: "rgba(25, 118, 210, 0.04)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "12px",
                  bgcolor: "#E8F5E9",
                  color: "#2E7D32",
                }}
              >
                <Download size={24} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Excel (.xlsx)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Best for inventory management & editing
                </Typography>
              </Box>
            </Box>

            <Box
              onClick={() => handleExportFormat("PDF")}
              sx={{
                p: 2.5,
                borderRadius: "16px",
                border: "2px solid",
                borderColor: "divider",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 2,
                "&:hover": {
                  borderColor: "primary.main",
                  backgroundColor: "rgba(25, 118, 210, 0.04)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "12px",
                  bgcolor: "#FFEBEE",
                  color: "#C62828",
                }}
              >
                <FileText size={24} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  PDF Document
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Best for printing or sharing as a report
                </Typography>
              </Box>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>

      <AddProductModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={handleSuccess}
      />

      {editProduct && (
        <AddProductModal
          open={editOpen}
          onClose={() => {
            setEditOpen(false);
            setEditProduct(null);
          }}
          initialData={editProduct}
          onSuccess={handleSuccess}
          mode="edit"
        />
      )}
      <ProductImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
      <ConfirmModal
        open={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        header="Deactivate Product"
        disclaimer={`Are you sure you want to deactivate "${productToDelete?.name}"?`}
      />
    </Box>
  );
}
