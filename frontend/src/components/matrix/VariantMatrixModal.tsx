"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  IconButton,
  Paper,
  Divider,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from "@mui/material";
import {
  Grid,
  X,
  CheckCircle2,
  Plus,
  Trash2,
  Zap,
  Tag,
  Layers,
} from "lucide-react";
import type { AttributePreset } from "../../lib/api/attributePresetService";

export interface VariantMatrixCell {
  article_no?: string;
  dim1_value?: string;
  dim2_value?: string;
  quantity: number;
  mrp?: number;
  mop?: number;
  purchase_rate?: number;
  barcode?: string;
  sku?: string;
}

export interface MatrixRowState {
  id: string;
  articleNo: string;
  color: string;
  rowMop?: number | "";
  rowMrp?: number | "";
}

interface VariantMatrixModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (matrixData: VariantMatrixCell[]) => void;
  preset?: AttributePreset | null;
  presets?: AttributePreset[];
  productName: string;
  articleNo?: string;
  initialVariants?: VariantMatrixCell[];
  defaultMrp?: number;
  defaultMop?: number;
  defaultPurchaseRate?: number;
}

export default function VariantMatrixModal({
  open,
  onClose,
  onSave,
  preset: initialPreset,
  presets = [],
  productName,
  articleNo = "",
  initialVariants = [],
  defaultMrp,
  defaultMop,
  defaultPurchaseRate,
}: VariantMatrixModalProps) {
  // Selected Preset state (allow switching presets inside modal)
  const [selectedPreset, setSelectedPreset] = useState<AttributePreset | null>(
    initialPreset || presets[0] || null
  );

  // Global Batch Rates (at modal level: MRP & MOP)
  const [globalMrp, setGlobalMrp] = useState<number | "">(
    defaultMrp !== undefined && defaultMrp !== null ? defaultMrp : ""
  );
  const [globalMop, setGlobalMop] = useState<number | "">(
    defaultMop !== undefined && defaultMop !== null
      ? defaultMop
      : defaultPurchaseRate !== undefined && defaultPurchaseRate !== null
      ? defaultPurchaseRate
      : ""
  );

  // View Mode: "qty" (Standard Grid) vs "rates" (Detailed Selling Rates Grid)
  const [viewMode, setViewMode] = useState<"qty" | "rates">("qty");

  useEffect(() => {
    if (initialPreset) {
      setSelectedPreset(initialPreset);
    } else if (presets.length > 0 && !selectedPreset) {
      setSelectedPreset(presets[0]);
    }
  }, [initialPreset, presets]);

  useEffect(() => {
    if (defaultMrp !== undefined && defaultMrp !== null) {
      setGlobalMrp(defaultMrp);
    }
    if (defaultMop !== undefined && defaultMop !== null) {
      setGlobalMop(defaultMop);
    } else if (defaultPurchaseRate !== undefined && defaultPurchaseRate !== null) {
      setGlobalMop(defaultPurchaseRate);
    }
  }, [defaultMrp, defaultMop, defaultPurchaseRate]);

  // Extract dimension values
  const dim1Name =
    selectedPreset?.dim1_name || selectedPreset?.dimension_label || "Size";
  const dim1Values =
    selectedPreset?.values
      ?.filter((v) => (v.dimension_index ?? 1) === 1)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((v) => v.value_name || v.value) || ["Standard"];

  const dim2Name = selectedPreset?.dim2_name || "Color";
  const dim2Values =
    selectedPreset?.values
      ?.filter((v) => v.dimension_index === 2)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((v) => v.value_name || v.value) || [];

  // Matrix Rows State (Article No + Color + Optional Row Pricing)
  const [rows, setRows] = useState<MatrixRowState[]>([]);

  // Cell Map format: `${rowId}_${dim1_value}` => VariantMatrixCell
  const [cellMap, setCellMap] = useState<Record<string, VariantMatrixCell>>({});

  // Refs for arrow key grid navigation
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!open) return;

    const newCellMap: Record<string, VariantMatrixCell> = {};
    const newRows: MatrixRowState[] = [];

    const initMrp =
      defaultMrp !== undefined && defaultMrp !== null ? defaultMrp : undefined;
    const initMop =
      defaultMop !== undefined && defaultMop !== null
        ? defaultMop
        : defaultPurchaseRate !== undefined && defaultPurchaseRate !== null
        ? defaultPurchaseRate
        : undefined;

    if (initialVariants && initialVariants.length > 0) {
      // Group existing variants by unique (article_no, dim2_value) combination
      const rowGroupMap = new Map<
        string,
        { articleNo: string; color: string; vars: VariantMatrixCell[] }
      >();

      initialVariants.forEach((v) => {
        const art = v.article_no || articleNo || "ART-1";
        const col = v.dim2_value || "Default";
        const groupKey = `${art}___${col}`;

        if (!rowGroupMap.has(groupKey)) {
          rowGroupMap.set(groupKey, { articleNo: art, color: col, vars: [] });
        }
        rowGroupMap.get(groupKey)!.vars.push(v);
      });

      let rIdx = 1;
      rowGroupMap.forEach(({ articleNo: art, color: col, vars }) => {
        const rowId = `row-${rIdx++}`;
        const firstWithMrp = vars.find((v) => v.mrp !== undefined);
        const firstWithMop = vars.find((v) => (v.mop !== undefined || v.purchase_rate !== undefined));

        const rowMopVal = firstWithMop?.mop ?? firstWithMop?.purchase_rate ?? initMop;

        newRows.push({
          id: rowId,
          articleNo: art,
          color: col,
          rowMrp: firstWithMrp?.mrp ?? initMrp,
          rowMop: rowMopVal,
        });

        dim1Values.forEach((d1) => {
          const key = `${rowId}_${d1}`;
          const existing = vars.find((v) => v.dim1_value === d1);
          newCellMap[key] = {
            article_no: art,
            dim1_value: d1,
            dim2_value: col,
            quantity: existing?.quantity || 0,
            mrp: existing?.mrp ?? firstWithMrp?.mrp ?? initMrp,
            mop: existing?.mop ?? existing?.purchase_rate ?? rowMopVal,
            barcode: existing?.barcode,
            sku: existing?.sku,
          };
        });
      });
    } else if (dim2Values.length > 0) {
      // Preset has colors (2D preset) - populate default color rows
      dim2Values.forEach((d2, idx) => {
        const rowId = `row-${idx + 1}`;
        const defaultArt = articleNo || "ART-1";
        newRows.push({
          id: rowId,
          articleNo: defaultArt,
          color: d2,
          rowMrp: initMrp,
          rowMop: initMop,
        });

        dim1Values.forEach((d1) => {
          const key = `${rowId}_${d1}`;
          newCellMap[key] = {
            article_no: defaultArt,
            dim1_value: d1,
            dim2_value: d2,
            quantity: 0,
            mrp: initMrp,
            mop: initMop,
          };
        });
      });
    } else {
      // Default initial row
      const rowId = "row-1";
      const defaultArt = articleNo || "ART-1";
      const defaultColor = "Red";
      newRows.push({
        id: rowId,
        articleNo: defaultArt,
        color: defaultColor,
        rowMrp: initMrp,
        rowMop: initMop,
      });

      dim1Values.forEach((d1) => {
        const key = `${rowId}_${d1}`;
        newCellMap[key] = {
          article_no: defaultArt,
          dim1_value: d1,
          dim2_value: defaultColor,
          quantity: 0,
          mrp: initMrp,
          mop: initMop,
        };
      });
    }

    setRows(newRows);
    setCellMap(newCellMap);
  }, [open, selectedPreset]);

  // Global Auto-Fill Pricing to All Variants
  const handleApplyGlobalRatesToAll = () => {
    const mopVal =
      globalMop !== "" && globalMop !== undefined
        ? Number(globalMop)
        : undefined;
    const mrpVal =
      globalMrp !== "" && globalMrp !== undefined
        ? Number(globalMrp)
        : undefined;

    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        rowMop: mopVal ?? r.rowMop,
        rowMrp: mrpVal ?? r.rowMrp,
      }))
    );

    setCellMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        updated[k] = {
          ...updated[k],
          mrp: mrpVal ?? updated[k].mrp,
          mop: mopVal ?? updated[k].mop,
        };
      });
      return updated;
    });
  };

  const handleAddRow = () => {
    const nextIdx = rows.length + 1;
    const newRowId = `row-${nextIdx}-${Date.now()}`;
    const defaultArtNo = articleNo || `ART-${nextIdx}`;
    const defaultColor =
      dim2Values.length > 0 && dim2Values[nextIdx - 1]
        ? dim2Values[nextIdx - 1]
        : `Color ${nextIdx}`;

    const mopVal = globalMop !== "" ? Number(globalMop) : undefined;
    const mrpVal = globalMrp !== "" ? Number(globalMrp) : undefined;

    setRows((prev) => [
      ...prev,
      {
        id: newRowId,
        articleNo: defaultArtNo,
        color: defaultColor,
        rowMop: mopVal,
        rowMrp: mrpVal,
      },
    ]);

    setCellMap((prev) => {
      const updated = { ...prev };
      dim1Values.forEach((d1) => {
        const key = `${newRowId}_${d1}`;
        updated[key] = {
          article_no: defaultArtNo,
          dim1_value: d1,
          dim2_value: defaultColor,
          quantity: 0,
          mrp: mrpVal,
          mop: mopVal,
        };
      });
      return updated;
    });
  };

  const handleRemoveRow = (rowId: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    setCellMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        if (k.startsWith(`${rowId}_`)) {
          delete updated[k];
        }
      });
      return updated;
    });
  };

  const handleRowArticleNoChange = (rowId: string, newArtNo: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, articleNo: newArtNo } : r))
    );
    setCellMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        if (k.startsWith(`${rowId}_`)) {
          updated[k] = { ...updated[k], article_no: newArtNo };
        }
      });
      return updated;
    });
  };

  const handleRowColorChange = (rowId: string, newColor: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, color: newColor } : r))
    );
    setCellMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        if (k.startsWith(`${rowId}_`)) {
          updated[k] = { ...updated[k], dim2_value: newColor };
        }
      });
      return updated;
    });
  };

  const handleRowMopChange = (rowId: string, val: number | "") => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, rowMop: val } : r))
    );
    setCellMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        if (k.startsWith(`${rowId}_`)) {
          updated[k] = {
            ...updated[k],
            mop: val !== "" ? Number(val) : undefined,
          };
        }
      });
      return updated;
    });
  };

  const handleRowMrpChange = (rowId: string, val: number | "") => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, rowMrp: val } : r))
    );
    setCellMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        if (k.startsWith(`${rowId}_`)) {
          updated[k] = {
            ...updated[k],
            mrp: val !== "" ? Number(val) : undefined,
          };
        }
      });
      return updated;
    });
  };

  const handleQtyChange = (key: string, qty: number, row: MatrixRowState) => {
    const val = Math.max(0, qty);
    setCellMap((prev) => {
      const existing = prev[key] || {};
      const fallbackMrp =
        existing.mrp ??
        (row.rowMrp !== "" && row.rowMrp !== undefined
          ? Number(row.rowMrp)
          : globalMrp !== ""
          ? Number(globalMrp)
          : undefined);
      const fallbackMop =
        existing.mop ??
        (row.rowMop !== "" && row.rowMop !== undefined
          ? Number(row.rowMop)
          : globalMop !== ""
          ? Number(globalMop)
          : undefined);

      return {
        ...prev,
        [key]: {
          ...existing,
          quantity: val,
          mrp: fallbackMrp,
          mop: fallbackMop,
        },
      };
    });
  };

  const handleCellMopChange = (key: string, mopVal: number | "") => {
    setCellMap((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        mop: mopVal !== "" ? Number(mopVal) : undefined,
      },
    }));
  };

  const handleCellMrpChange = (key: string, mrpVal: number | "") => {
    setCellMap((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        mrp: mrpVal !== "" ? Number(mrpVal) : undefined,
      },
    }));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    rIdx: number,
    cIdx: number
  ) => {
    let targetR = rIdx;
    let targetC = cIdx;

    if (e.key === "ArrowRight") {
      targetC += 1;
    } else if (e.key === "ArrowLeft") {
      targetC -= 1;
    } else if (e.key === "ArrowDown") {
      targetR += 1;
    } else if (e.key === "ArrowUp") {
      targetR -= 1;
    } else {
      return;
    }

    const refKey = `${targetR}_${targetC}`;
    const el = inputRefs.current[refKey];
    if (el) {
      e.preventDefault();
      el.focus();
      el.select();
    }
  };

  const fillAllQty = (val: number) => {
    setCellMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        updated[k] = { ...updated[k], quantity: val };
      });
      return updated;
    });
  };

  const totalQuantity = Object.values(cellMap).reduce(
    (sum, c) => sum + (c.quantity || 0),
    0
  );

  const activeVariantsCount = Object.values(cellMap).filter(
    (c) => c.quantity > 0
  ).length;

  const handleSave = () => {
    const validVariants = Object.values(cellMap)
      .filter((c) => c.quantity > 0)
      .map((c) => {
        const art = c.article_no || articleNo || "ART-1";
        const col = c.dim2_value || "";
        const size = c.dim1_value || "";
        const skuStr = c.sku || `${art}-${col ? `${col}-` : ""}${size}`;
        const finalMrp =
          c.mrp !== undefined && c.mrp !== null
            ? c.mrp
            : globalMrp !== ""
            ? Number(globalMrp)
            : undefined;
        const finalMop =
          c.mop !== undefined && c.mop !== null
            ? c.mop
            : globalMop !== ""
            ? Number(globalMop)
            : undefined;

        return {
          ...c,
          article_no: art,
          dim2_value: col,
          mrp: finalMrp,
          mop: finalMop,
          sku: skuStr,
        };
      });
    onSave(validVariants);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, p: 1 },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                bgcolor: "primary.main",
                color: "white",
                p: 1,
                borderRadius: 2,
                display: "flex",
              }}
            >
              <Grid size={22} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {productName} Multi-Article Size & Selling Price Matrix
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Dimension: <b>{dim1Name}</b> (Columns) | Enter quantity & selling rates (MRP & MOP) per Article No & {dim2Name} (Rows)
              </Typography>
            </Box>
          </Stack>

          {/* Mode Switcher */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <ToggleButtonGroup
              size="small"
              value={viewMode}
              exclusive
              onChange={(_, val) => val && setViewMode(val)}
              sx={{ height: 36 }}
            >
              <ToggleButton value="qty" sx={{ px: 2, fontWeight: 700 }}>
                <Layers size={15} style={{ marginRight: 6 }} /> Qty Matrix
              </ToggleButton>
              <ToggleButton value="rates" sx={{ px: 2, fontWeight: 700 }}>
                <Tag size={15} style={{ marginRight: 6 }} /> Custom Rates Mode
              </ToggleButton>
            </ToggleButtonGroup>

            <IconButton onClick={onClose} size="small">
              <X size={20} />
            </IconButton>
          </Stack>
        </Stack>
      </DialogTitle>

      <Divider sx={{ my: 1 }} />

      <DialogContent sx={{ py: 1.5 }}>
        {/* GLOBAL BATCH RATES BAR (MRP & MOP) */}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            mb: 2,
            borderRadius: 2,
            bgcolor: "#f8fafc",
            border: "1px solid #e2e8f0",
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                Default Batch Selling Rates:
              </Typography>
              <TextField
                size="small"
                label="Batch MOP / Selling (₹)"
                type="number"
                value={globalMop}
                onChange={(e) =>
                  setGlobalMop(
                    e.target.value !== "" ? Number(e.target.value) : ""
                  )
                }
                sx={{ width: 170 }}
                inputProps={{ style: { padding: "6px 10px", fontWeight: 600 } }}
              />
              <TextField
                size="small"
                label="Batch MRP (₹)"
                type="number"
                value={globalMrp}
                onChange={(e) =>
                  setGlobalMrp(
                    e.target.value !== "" ? Number(e.target.value) : ""
                  )
                }
                sx={{ width: 160 }}
                inputProps={{ style: { padding: "6px 10px", fontWeight: 700 } }}
              />
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<Zap size={15} />}
                onClick={handleApplyGlobalRatesToAll}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, height: 38 }}
              >
                ⚡ Auto-Fill MRP & MOP to All
              </Button>
            </Stack>

            <Paper
              elevation={0}
              sx={{
                px: 2,
                py: 0.75,
                borderRadius: 2,
                bgcolor: "primary.50",
                border: "1px solid",
                borderColor: "primary.200",
                display: "flex",
                gap: 2,
                alignItems: "center",
                height: 38,
              }}
            >
              <Typography variant="body2" color="primary.main" fontWeight={600}>
                Variants: <strong>{activeVariantsCount}</strong>
              </Typography>
              <Typography variant="body2" color="primary.main" fontWeight={700}>
                Total Qty: <strong>{totalQuantity} Pcs</strong>
              </Typography>
            </Paper>
          </Stack>
        </Paper>

        {/* Quick Toolbar */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
          gap={2}
          flexWrap="wrap"
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            {/* Preset Selector */}
            {presets.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="matrix-preset-select-label">Size Preset</InputLabel>
                <Select
                  labelId="matrix-preset-select-label"
                  label="Size Preset"
                  value={selectedPreset?.id || ""}
                  onChange={(e) => {
                    const chosen = presets.find((p) => p.id === e.target.value);
                    if (chosen) setSelectedPreset(chosen);
                  }}
                  sx={{ borderRadius: 2, fontSize: "0.85rem", fontWeight: 600 }}
                >
                  {presets.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name} ({p.dim1_name || p.dimension_label || "Size"})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Button
              size="small"
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={handleAddRow}
              sx={{ borderRadius: 2, textTransform: "none", fontSize: "0.8rem", fontWeight: 700, height: 38 }}
            >
              + Add Article & Color Row
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => fillAllQty(1)}
              sx={{ borderRadius: 2, textTransform: "none", fontSize: "0.8rem", height: 38 }}
            >
              Fill All Qty = 1
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              onClick={() => fillAllQty(0)}
              sx={{ borderRadius: 2, textTransform: "none", fontSize: "0.8rem", height: 38 }}
            >
              Clear All
            </Button>
          </Stack>
        </Stack>

        {/* MATRIX GRID TABLE */}
        <Box sx={{ overflowX: "auto", maxH: 480, pb: 1, borderRadius: 2, border: "1px solid #cbd5e1" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.875rem",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    padding: "10px 12px",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#334155",
                    width: 140,
                  }}
                >
                  Article No
                </th>
                <th
                  style={{
                    padding: "10px 12px",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#334155",
                    width: 130,
                  }}
                >
                  {dim2Name}
                </th>
                <th
                  style={{
                    padding: "10px 8px",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    textAlign: "center",
                    fontWeight: 700,
                    color: "#334155",
                    width: 190,
                  }}
                >
                  Row Rates (MOP / MRP)
                </th>

                {dim1Values.map((d1) => (
                  <th
                    key={d1}
                    style={{
                      padding: "10px 8px",
                      backgroundColor: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      textAlign: "center",
                      fontWeight: 700,
                      color: "#1e293b",
                      minWidth: viewMode === "rates" ? 140 : 70,
                    }}
                  >
                    {d1}
                  </th>
                ))}
                <th
                  style={{
                    padding: "10px 12px",
                    backgroundColor: "#e2e8f0",
                    border: "1px solid #cbd5e1",
                    textAlign: "center",
                    fontWeight: 700,
                    color: "#1e293b",
                    minWidth: 80,
                  }}
                >
                  Row Total
                </th>
                <th
                  style={{
                    padding: "10px 8px",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    textAlign: "center",
                    width: 50,
                  }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => {
                const rowTotal = dim1Values.reduce((sum, d1) => {
                  const key = `${row.id}_${d1}`;
                  return sum + (cellMap[key]?.quantity || 0);
                }, 0);

                return (
                  <tr key={row.id}>
                    {/* Article No Input */}
                    <td
                      style={{
                        padding: "6px 8px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      <TextField
                        fullWidth
                        size="small"
                        variant="outlined"
                        placeholder="e.g. ART-1"
                        value={row.articleNo}
                        onChange={(e) =>
                          handleRowArticleNoChange(row.id, e.target.value)
                        }
                        inputProps={{
                          style: { padding: "6px 8px", fontSize: "0.85rem", fontWeight: 700 },
                        }}
                      />
                    </td>

                    {/* Color / Variant Input */}
                    <td
                      style={{
                        padding: "6px 8px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      <TextField
                        fullWidth
                        size="small"
                        variant="outlined"
                        placeholder="e.g. Red / 512GB"
                        value={row.color}
                        onChange={(e) =>
                          handleRowColorChange(row.id, e.target.value)
                        }
                        inputProps={{
                          style: { padding: "6px 8px", fontSize: "0.85rem", fontWeight: 600 },
                        }}
                      />
                    </td>

                    {/* Row Rate Fill (MOP / MRP) */}
                    <td
                      style={{
                        padding: "6px 8px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      <Stack direction="row" spacing={0.5}>
                        <TextField
                          size="small"
                          placeholder="MOP"
                          type="number"
                          value={row.rowMop ?? ""}
                          onChange={(e) =>
                            handleRowMopChange(
                              row.id,
                              e.target.value !== "" ? Number(e.target.value) : ""
                            )
                          }
                          inputProps={{ style: { padding: "4px 6px", fontSize: "0.8rem" } }}
                        />
                        <TextField
                          size="small"
                          placeholder="MRP"
                          type="number"
                          value={row.rowMrp ?? ""}
                          onChange={(e) =>
                            handleRowMrpChange(
                              row.id,
                              e.target.value !== "" ? Number(e.target.value) : ""
                            )
                          }
                          inputProps={{ style: { padding: "4px 6px", fontSize: "0.8rem", fontWeight: 700 } }}
                        />
                      </Stack>
                    </td>

                    {/* Size Columns */}
                    {dim1Values.map((d1, cIdx) => {
                      const key = `${row.id}_${d1}`;
                      const cell = cellMap[key] || { quantity: 0 };
                      const refKey = `${rIdx}_${cIdx}`;

                      const isCustomPrice =
                        (cell.mrp !== undefined && cell.mrp !== globalMrp) ||
                        (cell.mop !== undefined && cell.mop !== globalMop);

                      return (
                        <td
                          key={d1}
                          style={{
                            padding: "4px",
                            border: "1px solid #cbd5e1",
                            textAlign: "center",
                            backgroundColor: cell.quantity > 0 ? "#e0f2fe" : "white",
                            verticalAlign: "top",
                          }}
                        >
                          {viewMode === "qty" ? (
                            <Box display="flex" flexDirection="column" alignItems="center">
                              <input
                                ref={(el) => {
                                  inputRefs.current[refKey] = el;
                                }}
                                type="number"
                                min={0}
                                value={cell.quantity === 0 ? "" : cell.quantity}
                                placeholder="0"
                                onChange={(e) =>
                                  handleQtyChange(key, Number(e.target.value), row)
                                }
                                onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                                style={{
                                  width: "100%",
                                  textAlign: "center",
                                  padding: "8px 4px",
                                  border: "none",
                                  outline: "none",
                                  background: "transparent",
                                  fontWeight: cell.quantity > 0 ? 700 : 400,
                                  fontSize: "1rem",
                                }}
                              />
                              {cell.quantity > 0 && isCustomPrice && (
                                <Tooltip
                                  title={`MOP: ₹${cell.mop ?? row.rowMop ?? globalMop ?? 0} | MRP: ₹${cell.mrp ?? row.rowMrp ?? globalMrp ?? 0}`}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontSize: "0.65rem",
                                      fontWeight: 700,
                                      color: "#0284c7",
                                      bgcolor: "#e0f2fe",
                                      px: 0.5,
                                      borderRadius: 1,
                                    }}
                                  >
                                    ₹{cell.mrp ?? globalMrp ?? "Custom"}
                                  </Typography>
                                </Tooltip>
                              )}
                            </Box>
                          ) : (
                            /* Rates & Pricing Detailed View Mode */
                            <Stack spacing={0.5} p={0.5}>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Typography variant="caption" color="text.secondary" width={32} fontWeight={700}>
                                  Qty:
                                </Typography>
                                <input
                                  ref={(el) => {
                                    inputRefs.current[refKey] = el;
                                  }}
                                  type="number"
                                  min={0}
                                  value={cell.quantity === 0 ? "" : cell.quantity}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleQtyChange(key, Number(e.target.value), row)
                                  }
                                  onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                                  style={{
                                    width: "100%",
                                    textAlign: "center",
                                    padding: "2px 4px",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "4px",
                                    fontWeight: 700,
                                  }}
                                />
                              </Box>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Typography variant="caption" color="text.secondary" width={32}>
                                  MOP:
                                </Typography>
                                <input
                                  type="number"
                                  placeholder={String(row.rowMop ?? globalMop ?? "")}
                                  value={cell.mop ?? ""}
                                  onChange={(e) =>
                                    handleCellMopChange(
                                      key,
                                      e.target.value !== "" ? Number(e.target.value) : ""
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    textAlign: "center",
                                    padding: "2px 4px",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "4px",
                                    fontSize: "0.75rem",
                                  }}
                                />
                              </Box>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Typography variant="caption" color="text.secondary" width={32} fontWeight={700}>
                                  MRP:
                                </Typography>
                                <input
                                  type="number"
                                  placeholder={String(row.rowMrp ?? globalMrp ?? "")}
                                  value={cell.mrp ?? ""}
                                  onChange={(e) =>
                                    handleCellMrpChange(
                                      key,
                                      e.target.value !== "" ? Number(e.target.value) : ""
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    textAlign: "center",
                                    padding: "2px 4px",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "4px",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                  }}
                                />
                              </Box>
                            </Stack>
                          )}
                        </td>
                      );
                    })}

                    {/* Row Total */}
                    <td
                      style={{
                        padding: "10px",
                        backgroundColor: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        textAlign: "center",
                        fontWeight: 700,
                        fontSize: "1rem",
                      }}
                    >
                      {rowTotal}
                    </td>

                    {/* Delete Row Action */}
                    <td
                      style={{
                        padding: "6px",
                        border: "1px solid #cbd5e1",
                        textAlign: "center",
                      }}
                    >
                      <IconButton
                        size="small"
                        color="error"
                        disabled={rows.length <= 1}
                        onClick={() => handleRemoveRow(row.id)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </td>
                  </tr>
                );
              })}

              {/* Summary / Column Totals Row */}
              <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}>
                <td
                  colSpan={3}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #cbd5e1",
                    textAlign: "right",
                    color: "#334155",
                  }}
                >
                  Size Totals:
                </td>
                {dim1Values.map((d1) => {
                  const colTotal = rows.reduce((sum, row) => {
                    const key = `${row.id}_${d1}`;
                    return sum + (cellMap[key]?.quantity || 0);
                  }, 0);
                  return (
                    <td
                      key={d1}
                      style={{
                        padding: "10px 4px",
                        border: "1px solid #cbd5e1",
                        textAlign: "center",
                        color: colTotal > 0 ? "#0284c7" : "#64748b",
                      }}
                    >
                      {colTotal}
                    </td>
                  );
                })}
                <td
                  style={{
                    padding: "10px 4px",
                    border: "1px solid #cbd5e1",
                    textAlign: "center",
                    color: "#0f172a",
                    fontSize: "1rem",
                  }}
                >
                  {totalQuantity}
                </td>
                <td style={{ border: "1px solid #cbd5e1" }}></td>
              </tr>
            </tbody>
          </table>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          startIcon={<CheckCircle2 size={18} />}
          sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
        >
          Confirm {totalQuantity} Pcs Matrix
        </Button>
      </DialogActions>
    </Dialog>
  );
}

