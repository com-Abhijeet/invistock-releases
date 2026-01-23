"use client";

import { Box, Button, Menu, MenuItem, Stack, TextField } from "@mui/material";
import { useState } from "react";
import ProductTable from "../components/products/ProductTable";
import toast from "react-hot-toast";
import type { Product } from "../lib/types/product";
import AddProductModal from "../components/products/AddProductModal";
import DashboardHeader from "../components/DashboardHeader";
import { Download, Filter, Plus, Upload } from "lucide-react";
import { exportToExcel } from "../lib/exportToExcel";
import { deleteProduct, getAllProducts } from "../lib/api/productService";
import ProductImportModal from "../components/products/ProductImportModal";
import ConfirmModal from "../components/ConfirmModal";
import theme from "../../theme";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const exportMenuOpen = Boolean(anchorEl);
  const [importOpen, setImportOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const [isActiveFilter, setIsActiveFilter] = useState(1);

  // ✅ ADDED: State to trigger a refresh in the child table
  const [refreshKey, setRefreshKey] = useState(0);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setAnchorEl(null);
  };

  const handleExportFormat = async (format: string) => {
    handleExportClose();
    if (format === "Excel") {
      toast.loading("Preparing export...");
      try {
        // Fetch all products without any filters
        const allProductsData = await getAllProducts({
          all: true,
          page: 0,
          limit: 0,
          query: "",
          isActive: undefined, // Ensure both active and inactive are fetched
        });

        await exportToExcel({
          data: allProductsData.records,
          fileName: "Product_List_Full", // Updated filename
          columnMap: {
            // --- Core Details ---
            name: "Product Name",
            name_local: "Product Name (Marathi)", // ✅ ADDED
            product_code: "Product Code",
            barcode: "Barcode",
            hsn: "HSN Code",
            // --- Category ---
            category_name: "Category",
            subcategory_name: "Subcategory",
            // --- Pricing ---
            mrp: "MRP",
            mop: "MOP (Min. Operating Price)",
            mfw_price: "MF/W Price", // ✅ ADDED
            average_purchase_price: "Avg. Purchase Price",
            gst_rate: "GST Rate (%)",
            // --- Inventory & Physical ---
            quantity: "Stock Quantity",
            low_stock_threshold: "Low Stock Threshold", // ✅ ADDED
            size: "Size", // ✅ ADDED
            weight: "Weight", // ✅ ADDED
            storage_location: "Storage Location",
            brand: "Brand",
            // --- Other ---
            description: "Description",
            is_active: "Is Active (1=Yes, 0=No)",
            image_url: "Image URL",
            created_at: "Created At",
            updated_at: "Last Updated At",
          },
        });
        toast.dismiss();
        toast.success("Excel exported successfully.");
      } catch (err) {
        toast.dismiss();
        console.error("Export failed:", err);
        toast.error("Failed to export Excel.");
      }
    } else {
      toast("Unsupported format: " + format);
    }
  };

  // ✅ UPDATED: Handlers now trigger a refresh instead of updating stale state
  const handleSuccess = () => {
    setAddOpen(false);
    setEditOpen(false);
    setEditProduct(null);
    setRefreshKey((prevKey) => prevKey + 1); // Increment key to trigger refetch
  };

  // ✅ 3. New handlers for the delete process
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
      // Use the 'deleteProduct' function which now does a soft delete
      await deleteProduct(String(productToDelete.id!));
      toast.success(`"${productToDelete.name}" was deactivated successfully.`);
      setRefreshKey((prevKey) => prevKey + 1); // Refresh the table
    } catch (error: any) {
      toast.error(error.message || "Failed to deactivate product.");
    }
    // The modal closes itself, but we reset the state
    setProductToDelete(null);
  };

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        backgroundColor: "#fff",

        minHeight: "100vh",
      }}
    >
      <DashboardHeader
        title="Products"
        showSearch={true}
        onSearch={setSearch}
        onRefresh={() => setRefreshKey((prevKey) => prevKey + 1)}
        showDateFilters={false}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            {/* ✅ 1. Status Filter (Styled like Header inputs) */}
            <TextField
              select
              size="small"
              value={isActiveFilter}
              onChange={(e) => setIsActiveFilter(e.target.value as any)}
              sx={{
                minWidth: 130,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px", // Matching rounded style
                  backgroundColor: theme.palette.grey[50],
                  "& fieldset": { borderColor: theme.palette.divider },
                  "&:hover fieldset": {
                    borderColor: theme.palette.text.secondary,
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <Filter size={16} style={{ marginRight: 8, opacity: 0.5 }} />
                ),
              }}
            >
              <MenuItem value="1">Active</MenuItem>
              <MenuItem value="0">Inactive</MenuItem>
            </TextField>

            {/* ✅ 2. Import Button (Soft styling) */}
            <Button
              variant="outlined"
              onClick={() => setImportOpen(true)}
              startIcon={<Upload size={18} />}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 600,
                borderColor: theme.palette.divider,
                color: theme.palette.text.secondary,
                "&:hover": {
                  borderColor: theme.palette.text.primary,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              Import
            </Button>

            {/* ✅ 3. Export Button (Soft styling) */}
            <Button
              variant="outlined"
              onClick={handleExportClick}
              startIcon={<Download size={18} />}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 600,
                borderColor: theme.palette.divider,
                color: theme.palette.text.secondary,
                "&:hover": {
                  borderColor: theme.palette.text.primary,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              Export
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={exportMenuOpen}
              onClose={handleExportClose}
              PaperProps={{ sx: { borderRadius: 2, mt: 1 } }}
            >
              <MenuItem onClick={() => handleExportFormat("Excel")}>
                Excel (.xlsx)
              </MenuItem>
              <MenuItem onClick={() => handleExportFormat("CSV")}>CSV</MenuItem>
            </Menu>

            {/* ✅ 4. Add Button (Primary Action) */}
            <Button
              variant="contained"
              color="primary"
              startIcon={<Plus size={18} />}
              onClick={() => setAddOpen(true)}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 600,
                px: 3,
                boxShadow: "none",
                "&:hover": {
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                },
              }}
            >
              Add Product
            </Button>
          </Stack>
        }
      />

      <ProductTable
        key={refreshKey} // ✅ ADDED: Pass the key to force re-mounting on change
        onEdit={(product) => {
          setEditProduct(product);
          setEditOpen(true);
        }}
        onDelete={handleOpenDeleteModal}
        searchQuery={search}
        isActive={isActiveFilter}
      />

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
        disclaimer={`Are you sure you want to deactivate "${productToDelete?.name}"? This will hide it from the POS and new sales, but it will still appear in old reports.`}
      />
    </Box>
  );
}
