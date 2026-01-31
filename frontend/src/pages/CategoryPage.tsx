"use client";

import {
  Box,
  Typography,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material";
import { Plus, FileDown, X, FolderTree, Tags } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import CategoryTable from "../components/category/CategoryTable";
import CategoryModalForm from "../components/category/CategoryModalForm";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../lib/api/categoryService";
import type { Category } from "../lib/types/categoryTypes";
import DashboardHeader from "../components/DashboardHeader";
import KbdButton from "../components/ui/Button";

const { ipcRenderer } = window.electron || {};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);

  // Format selection pop-up state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      toast.error("Failed to load categories");
    }
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
    try {
      if (editCategory) {
        await updateCategory(editCategory.id!, category);
        toast.success("Updated successfully");
      } else {
        await createCategory(category);
        toast.success("Created successfully");
      }
      setOpenModal(false);
      fetchCategories();
    } catch (err) {
      toast.error("Operation failed");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (confirm("Are you sure you want to delete this category?")) {
      try {
        await deleteCategory(id);
        toast.success("Category deleted");
        fetchCategories();
      } catch (err) {
        toast.error("Failed to delete category");
      }
    }
  };

  const handleExport = async (exportType: "main" | "sub") => {
    setExportDialogOpen(false);

    const handlerName =
      exportType === "main"
        ? "export-main-categories"
        : "export-all-subcategories";

    const toastId = toast.loading(
      `Exporting ${exportType === "main" ? "Main" : "Sub"} categories...`,
    );

    try {
      if (!ipcRenderer) {
        throw new Error("Export only available in Desktop mode");
      }
      const result = await ipcRenderer.invoke(handlerName);
      toast.dismiss(toastId);

      if (result.success) {
        toast.success(`Export successful!`);
      } else {
        toast.error(result.error || "Export failed.");
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || "An unexpected error occurred.");
    }
  };

  const filtered = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Box
      p={3}
      sx={{
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",
      }}
    >
      <DashboardHeader
        title="Categories"
        showSearch={true}
        showDateFilters={false}
        onSearch={setSearch}
        onRefresh={fetchCategories}
        actions={
          <Stack direction="row" spacing={1.5}>
            <KbdButton
              variant="secondary"
              label="Export"
              underlineChar="E"
              shortcut="ctrl+e"
              onClick={() => setExportDialogOpen(true)}
              startIcon={<FileDown size={18} />}
            />
            <KbdButton
              variant="primary"
              label="Add Category"
              underlineChar="A"
              shortcut="ctrl+a"
              onClick={handleOpenAdd}
              startIcon={<Plus size={18} />}
              sx={{ px: 3 }}
            />
          </Stack>
        }
      />

      {/* Export Format Selector Dialog */}
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
            Export Categories
          </Typography>
          <IconButton onClick={() => setExportDialogOpen(false)}>
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pb: 4 }}>
          <Stack spacing={2} mt={1}>
            <Box
              onClick={() => handleExport("main")}
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
                  bgcolor: "#E3F2FD",
                  color: "primary.main",
                }}
              >
                <FolderTree size={24} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Main Categories
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Export primary parent categories
                </Typography>
              </Box>
            </Box>

            <Box
              onClick={() => handleExport("sub")}
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
                  bgcolor: "#F3E5F5",
                  color: "#7B1FA2",
                }}
              >
                <Tags size={24} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  All Subcategories
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Detailed list of all sub-items
                </Typography>
              </Box>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>

      {filtered.length === 0 ? (
        <Typography color="text.secondary" mt={3} align="center">
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
        initialData={editCategory}
        existingCategories={categories}
      />
    </Box>
  );
}
