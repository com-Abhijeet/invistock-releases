"use client";

// ✅ 1. IMPORT additional components for the menu and toasts
import {
  Box,
  Button,
  Typography,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import { Plus, FileDown } from "lucide-react"; // FileDown for the export icon
import { useEffect, useState } from "react";
import toast from "react-hot-toast"; // For user feedback

import CategoryTable from "../components/category/CategoryTable";
import CategoryModalForm from "../components/category/CategoryModalForm";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../lib/api/categoryService";
import type { Category } from "../lib/types/categoryTypes";
import SearchFilterBar from "../components/products/SearchFilterBar";

// ✅ Assuming you have access to ipcRenderer via your preload script
const { ipcRenderer } = window.electron;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);

  // ✅ 2. STATE for the export menu anchor
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(
    null
  );

  const fetchCategories = async () => {
    const data = await getCategories();
    setCategories(data);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAdd = () => {
    setEditCategory(null);
    setOpenModal(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditCategory(cat);
    setOpenModal(true);
  };

  const handleModalSubmit = async (category: Category) => {
    if (editCategory) {
      await updateCategory(editCategory.id!, category);
      toast.success("Updated successfully");
    } else {
      await createCategory(category);
      toast.success("created successfully");
    }
    setOpenModal(false);
    fetchCategories();
  };

  const handleDeleteCategory = async (id: number) => {
    if (confirm("Are you sure you want to delete this category?")) {
      await deleteCategory(id);
      fetchCategories();
    }
  };

  // ✅ 3. HANDLERS for opening/closing the export menu
  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  // ✅ 4. GENERIC HANDLER for triggering the exports
  const handleExport = async (exportType: "main" | "sub") => {
    handleExportMenuClose(); // Close the menu after an option is clicked

    const handlerName =
      exportType === "main"
        ? "export-main-categories"
        : "export-all-subcategories";

    const toastId = toast.loading(`Exporting ${exportType} categories...`);

    try {
      const result = await ipcRenderer.invoke(handlerName);
      toast.dismiss(toastId);

      if (result.success) {
        toast.success(`Export successful!`);
      } else {
        toast.error(result.error || "Export failed or was canceled.");
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      console.error("Export error:", err);
      toast.error(err.message || "An unexpected error occurred.");
    }
  };

  const filtered = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        backgroundColor: "#fff",
      }}
      minHeight={"100vh"}
    >
      <Typography
        variant="subtitle1"
        fontWeight={600}
        mb={1}
        color="primary.main"
      >
        Categories
      </Typography>

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
        mb={2}
      >
        <Box flex={1} minWidth="250px">
          <SearchFilterBar
            search={search}
            onSearchChange={setSearch}
            onRefresh={fetchCategories}
          />
        </Box>

        {/* ✅ 5. UI for the Export and Add buttons */}
        <Box display="flex" gap={1}>
          <IconButton
            onClick={handleExportMenuOpen}
            color="primary"
            title="Export Data"
          >
            <FileDown size={20} /> <Typography>Export Data</Typography>
          </IconButton>
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={handleExportMenuClose}
          >
            <MenuItem onClick={() => handleExport("main")}>
              Export Main Categories
            </MenuItem>
            <MenuItem onClick={() => handleExport("sub")}>
              Export Subcategories
            </MenuItem>
          </Menu>

          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={18} />}
            onClick={handleOpenAdd}
          >
            Add Category
          </Button>
        </Box>
      </Box>

      {/* ... (rest of the component JSX is unchanged) ... */}
      {filtered.length === 0 ? (
        <Typography color="text.secondary" mt={3}>
          No categories found.
        </Typography>
      ) : (
        <CategoryTable
          categories={filtered}
          onEdit={handleOpenEdit}
          onDelete={handleDeleteCategory}
        />
      )}

      <CategoryModalForm
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSave={handleModalSubmit}
        // ✅ ADD THIS LINE: Pass the category data to the modal
        initialData={editCategory}
        existingCategories={categories}
      />
    </Box>
  );
}
