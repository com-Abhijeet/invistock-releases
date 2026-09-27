"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Stack,
  Tooltip,
  Alert,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { Plus, Edit2, Trash2, Layers, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  getAllAttributePresets,
  createAttributePreset,
  updateAttributePreset,
  deleteAttributePreset,
  type AttributePreset,
} from "../../lib/api/attributePresetService";

export default function AttributePresetsTab() {
  const [presets, setPresets] = useState<AttributePreset[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [openModal, setOpenModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState<AttributePreset | null>(null);
  const [presetName, setPresetName] = useState("");
  const [dimensionLabel, setDimensionLabel] = useState("");
  const [values, setValues] = useState<string[]>([]);
  const [newValueInput, setNewValueInput] = useState("");

  const loadPresets = async () => {
    setLoading(true);
    try {
      const data = await getAllAttributePresets();
      setPresets(data);
    } catch (e) {
      toast.error("Failed to load variant presets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPresets();
  }, []);

  const handleOpenCreate = () => {
    setEditingPreset(null);
    setPresetName("");
    setDimensionLabel("Size");
    setValues(["S", "M", "L", "XL"]);
    setNewValueInput("");
    setOpenModal(true);
  };

  const handleOpenEdit = (preset: AttributePreset) => {
    setEditingPreset(preset);
    setPresetName(preset.name);
    setDimensionLabel(preset.dimension_label);
    setValues(preset.values.map((v) => v.value));
    setNewValueInput("");
    setOpenModal(true);
  };

  const handleAddValue = () => {
    const trimmed = newValueInput.trim();
    if (!trimmed) return;
    if (values.includes(trimmed)) {
      toast.error("Value already exists in this preset.");
      return;
    }
    setValues([...values, trimmed]);
    setNewValueInput("");
  };

  const handleRemoveValue = (indexToRemove: number) => {
    setValues(values.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      toast.error("Preset Name is required.");
      return;
    }
    if (!dimensionLabel.trim()) {
      toast.error("Dimension Label is required.");
      return;
    }
    if (values.length === 0) {
      toast.error("At least one size / value is required.");
      return;
    }

    try {
      if (editingPreset) {
        await updateAttributePreset(editingPreset.id, {
          name: presetName.trim(),
          dimension_label: dimensionLabel.trim(),
          values,
        });
        toast.success("Preset updated successfully!");
      } else {
        await createAttributePreset({
          name: presetName.trim(),
          dimension_label: dimensionLabel.trim(),
          values,
        });
        toast.success("Preset created successfully!");
      }
      setOpenModal(false);
      loadPresets();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save preset.");
    }
  };

  const handleDeletePreset = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this preset?")) return;
    try {
      await deleteAttributePreset(id);
      toast.success("Preset deleted successfully!");
      loadPresets();
    } catch (e) {
      toast.error("Failed to delete preset.");
    }
  };

  return (
    <Box sx={{ p: 1 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Variant & Size Matrix Presets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Define reusable size, weight, storage, or custom attribute schemes for Garments, Electronics, Kirana, Footwear, etc.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={handleOpenCreate}
          sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
        >
          Create New Preset
        </Button>
      </Box>

      {presets.length === 0 && !loading && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No attribute presets found. Click "Create New Preset" to define size or weight schemes.
        </Alert>
      )}

      <Grid container spacing={2.5}>
        {presets.map((preset) => (
          <Grid item xs={12} sm={6} md={4} key={preset.id}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 3,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderColor: "divider",
                transition: "all 0.2s ease",
                "&:hover": {
                  boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
                  borderColor: "primary.main",
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  mb={1.5}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <Layers size={20} color="#2563eb" />
                    <Typography variant="subtitle1" fontWeight={800}>
                      {preset.name}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Edit Preset">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEdit(preset)}
                      >
                        <Edit2 size={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Preset">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeletePreset(preset.id)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>

                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{ display: "block", mb: 1.5 }}
                >
                  Dimension Label: <b>{preset.dimension_label}</b>
                </Typography>

                <Box display="flex" flexWrap="wrap" gap={0.8}>
                  {preset.values.map((v) => (
                    <Chip
                      key={v.id}
                      label={v.value}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        borderRadius: "6px",
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* CREATE / EDIT DIALOG */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle fontWeight={800}>
          {editingPreset ? "Edit Variant Preset" : "Create Variant Preset"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Preset Name"
              placeholder="e.g. Garment Adult Sizes, Mobile Storage"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              fullWidth
              size="small"
            />

            <TextField
              label="Dimension Label"
              placeholder="e.g. Size, Pack Weight, Storage, Shoe Size"
              value={dimensionLabel}
              onChange={(e) => setDimensionLabel(e.target.value)}
              fullWidth
              size="small"
            />

            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                Preset Values / Sizes ({values.length})
              </Typography>

              <Stack direction="row" spacing={1} mb={2}>
                <TextField
                  placeholder="Add value (e.g. XXL, 1kg, 256GB)"
                  value={newValueInput}
                  onChange={(e) => setNewValueInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddValue();
                    }
                  }}
                  size="small"
                  fullWidth
                />
                <Button
                  variant="outlined"
                  onClick={handleAddValue}
                  sx={{ borderRadius: 1.5, fontWeight: 700 }}
                >
                  Add
                </Button>
              </Stack>

              <Box
                sx={{
                  p: 2,
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 2,
                  bgcolor: "#f8fafc",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  minHeight: 60,
                  alignItems: "center",
                }}
              >
                {values.length === 0 ? (
                  <Typography variant="body2" color="text.disabled">
                    No values added yet. Type a size/value above and click Add.
                  </Typography>
                ) : (
                  values.map((val, idx) => (
                    <Chip
                      key={idx}
                      label={val}
                      onDelete={() => handleRemoveValue(idx)}
                      deleteIcon={<X size={14} />}
                      color="primary"
                      variant="filled"
                      sx={{ fontWeight: 700 }}
                    />
                  ))
                )}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 2 }}>
          <Button onClick={() => setOpenModal(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSavePreset}
            sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
          >
            Save Preset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
