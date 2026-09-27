"use client";

import {
  Box,
  Typography,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Chip,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  alpha,
} from "@mui/material";
import {
  Plus,
  FileDown,
  X,
  FolderTree,
  Tags,
  Folder,
  Layers,
  Pencil,
  Trash2,
  Table as TableIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import CategoryTable from "../components/category/CategoryTable";
import CategoryModalForm from "../components/category/CategoryModalForm";
import DataTable from "../components/DataTable";
import type { Column, Action } from "../lib/types/DataTableTypes";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../lib/api/categoryService";
import {
  getAttributePresets,
  AttributePreset,
} from "../lib/api/attributePresetService";
import type { Category } from "../lib/types/categoryTypes";
import DashboardHeader from "../components/DashboardHeader";
import KbdButton from "../components/ui/Button";

const { ipcRenderer } = window.electron || {};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [presets, setPresets] = useState<AttributePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);

  // View Mode: 'datatable' or 'tree'
  const [viewMode, setViewMode] = useState<"datatable" | "tree">("datatable");

  // Pagination for DataTable
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Format selection pop-up state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const [catData, presetData] = await Promise.all([
        getCategories(),
        getAttributePresets().catch(() => []),
      ]);
      setCategories(catData);
      setPresets(presetData);
    } catch (err) {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
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

  const filtered = categories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(search.toLowerCase()) ||
      cat.code.toLowerCase().includes(search.toLowerCase()),
  );

  const paginatedRows = filtered.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  // DataTable Columns
  const columns: Column[] = [
    {
      key: "name",
      label: "Category Details",
      format: (_, cat: Category) => (
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              color: "text.primary",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Folder size={18} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={600} color="text.primary">
              {cat.name}
            </Typography>
            <Typography
              variant="caption"
              fontFamily="monospace"
              color="text.secondary"
              sx={{ letterSpacing: 0.5 }}
            >
              {cat.code}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: "default_preset_id",
      label: "Default Matrix Preset",
      format: (presetId: any) => {
        const p = presets.find((pr) => pr.id === Number(presetId));
        if (!p) {
          return (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontStyle: "italic" }}
            >
              None
            </Typography>
          );
        }
        return (
          <Chip
            icon={<Layers size={14} />}
            label={`${p.name}`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600, borderRadius: 2 }}
          />
        );
      },
    },
    {
      key: "subcategories",
      label: "Subcategories",
      format: (subs: any) => {
        const subList = Array.isArray(subs) ? subs : [];
        if (subList.length === 0) {
          return (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontStyle: "italic" }}
            >
              No Subcategories
            </Typography>
          );
        }
        return (
          <Stack
            direction="row"
            spacing={0.5}
            flexWrap="wrap"
            useFlexGap
            sx={{ py: 0.5 }}
          >
            {subList.slice(0, 3).map((sub: any) => (
              <Chip
                key={sub.id || sub.code}
                label={`${sub.name}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.725rem", height: 22, fontWeight: 500 }}
              />
            ))}
            {subList.length > 3 && (
              <Tooltip
                title={subList
                  .map((s: any) => `${s.name} (${s.code})`)
                  .join(", ")}
              >
                <Chip
                  label={`+${subList.length - 3} more`}
                  size="small"
                  color="primary"
                  sx={{ fontSize: "0.725rem", height: 22, fontWeight: 700 }}
                />
              </Tooltip>
            )}
          </Stack>
        );
      },
    },
  ];

  // DataTable Actions
  const actions: Action[] = [
    {
      label: "Edit Category",
      icon: <Pencil size={15} />,
      onClick: (cat: Category) => handleOpenEdit(cat),
    },
    {
      label: "Delete Category",
      icon: <Trash2 size={15} color="#ef4444" />,
      onClick: (cat: Category) => handleDeleteCategory(cat.id!),
    },
  ];

  return (
    <Box
      p={3}
      sx={{
        bgcolor: "background.default",
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
          <Stack direction="row" spacing={1.5} alignItems="center">
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, val) => val && setViewMode(val)}
              size="small"
              sx={{
                bgcolor: "background.paper",
                borderRadius: 2,
                "& .MuiToggleButton-root": { py: 0.75 },
              }}
            >
              <ToggleButton value="datatable" sx={{ textTransform: "none", gap: 1, px: 2 }}>
                <TableIcon size={16} />
                Data Table
              </ToggleButton>
              <ToggleButton value="tree" sx={{ textTransform: "none", gap: 1, px: 2 }}>
                <FolderTree size={16} />
                Tree / Collapsible
              </ToggleButton>
            </ToggleButtonGroup>

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
                  color: "text.primary",
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

      {/* Main Table Views */}
      {viewMode === "datatable" ? (
        <DataTable
          rows={paginatedRows}
          columns={columns}
          actions={actions}
          loading={loading}
          total={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(newPage) => setPage(newPage)}
          onRowsPerPageChange={(newLimit) => {
            setRowsPerPage(newLimit);
            setPage(0);
          }}
        />
      ) : (
        <CategoryTable
          categories={filtered}
          presets={presets}
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
