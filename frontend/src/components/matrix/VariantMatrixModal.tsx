"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Chip,
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
  History,
  RotateCcw,
  Filter,
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
  quickPattern: string;
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

const RECENT_PATTERNS_STORAGE_KEY = "invistock_matrix_recent_patterns_v1";
const PRESET_LAST_PATTERN_STORAGE_KEY = "invistock_matrix_preset_last_pattern_v1";
const AUTO_APPLY_LAST_STORAGE_KEY = "invistock_matrix_auto_apply_last_v1";

/**
 * Parses 100% Numpad-friendly quick size-quantity shorthand like:
 * - "2-4*2" -> sizes 2, 3, 4 = qty 2
 * - "2-4*2+6-8*1" or "2-4*2 6-8*1" -> sizes 2..4 = 2, sizes 6..8 = 1
 * - "2+4+6*2" or "2,4,6*2" -> sizes 2, 4, 6 = 2
 * - "2-4" -> sizes 2, 3, 4 = 1 (default qty 1)
 * - "5*3" -> size 5 = 3
 * (Also backward-compatible with ":", "=", "x", "/" separators)
 */
function parseQuickPattern(
  pattern: string,
  dim1Values: string[]
): Record<string, number> | null {
  const cleaned = pattern
    .trim()
    .replace(/\s*-\s*/g, "-")
    .replace(/\s*([*:=x/])\s*/gi, "$1");
  if (!cleaned) return null;

  const result: Record<string, number> = {};
  let matchedAny = false;

  const applySizePart = (part: string, qty: number) => {
    const rangeMatch = part.match(/^([^-..]+?)(?:-|(?:\.\.))([^-..]+)$/);
    if (rangeMatch) {
      const startStr = rangeMatch[1].trim();
      const endStr = rangeMatch[2].trim();

      const startIdx = dim1Values.findIndex(
        (v) => String(v).trim().toLowerCase() === startStr.toLowerCase()
      );
      const endIdx = dim1Values.findIndex(
        (v) => String(v).trim().toLowerCase() === endStr.toLowerCase()
      );

      if (startIdx !== -1 && endIdx !== -1) {
        const low = Math.min(startIdx, endIdx);
        const high = Math.max(startIdx, endIdx);
        for (let i = low; i <= high; i++) {
          result[dim1Values[i]] = qty;
          matchedAny = true;
        }
      } else {
        const startNum = Number(startStr);
        const endNum = Number(endStr);
        if (!isNaN(startNum) && !isNaN(endNum)) {
          const minNum = Math.min(startNum, endNum);
          const maxNum = Math.max(startNum, endNum);
          dim1Values.forEach((d1) => {
            const d1Num = Number(String(d1).trim());
            if (!isNaN(d1Num) && d1Num >= minNum && d1Num <= maxNum) {
              result[d1] = qty;
              matchedAny = true;
            }
          });
        }
      }
    } else {
      const found = dim1Values.find(
        (v) =>
          String(v).trim().toLowerCase() === part.toLowerCase() ||
          (!isNaN(Number(part)) &&
            !isNaN(Number(v)) &&
            Number(v) === Number(part))
      );
      if (found) {
        result[found] = qty;
        matchedAny = true;
      }
    }
  };

  // Split by "+", ",", ";", or whitespace
  const rawTokens = cleaned
    .split(/[\s,+;]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  let pendingSizeParts: string[] = [];

  for (const token of rawTokens) {
    const sepMatch = token.match(/^(.+?)[*:=x/](\d+(?:\.\d+)?)$/i);
    if (sepMatch) {
      const sizePart = sepMatch[1].trim();
      const qty = Math.max(0, Number(sepMatch[2]));
      if (!isNaN(qty)) {
        pendingSizeParts.push(sizePart);
        pendingSizeParts.forEach((sp) => applySizePart(sp, qty));
      }
      pendingSizeParts = [];
    } else {
      pendingSizeParts.push(token);
    }
  }

  // Any trailing size expressions without an explicit *qty default to qty = 1
  if (pendingSizeParts.length > 0) {
    pendingSizeParts.forEach((sp) => applySizePart(sp, 1));
  }

  return matchedAny ? result : null;
}

/**
 * Summarizes a row's non-zero quantities into a compact Numpad pattern string like "2-4*2" or "2-4*2+6-8*1"
 * so even manual cell entries get cached for fast 1-click/1-keystroke repeats.
 */
function summarizeRowToPattern(
  rowId: string,
  cellMap: Record<string, VariantMatrixCell>,
  dim1Values: string[]
): string {
  const activeIndices: { idx: number; label: string; qty: number }[] = [];
  dim1Values.forEach((d1, idx) => {
    const qty = cellMap[`${rowId}_${d1}`]?.quantity || 0;
    if (qty > 0) {
      activeIndices.push({ idx, label: d1, qty });
    }
  });

  if (activeIndices.length === 0) return "";

  const segments: string[] = [];
  let i = 0;
  while (i < activeIndices.length) {
    const start = activeIndices[i];
    let end = start;
    while (
      i + 1 < activeIndices.length &&
      activeIndices[i + 1].idx === end.idx + 1 &&
      activeIndices[i + 1].qty === start.qty
    ) {
      end = activeIndices[i + 1];
      i++;
    }
    if (start.idx === end.idx) {
      segments.push(`${start.label}*${start.qty}`);
    } else {
      segments.push(`${start.label}-${end.label}*${start.qty}`);
    }
    i++;
  }
  return segments.join("+");
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

  // Filter to show only active (>0 qty) size columns when desired
  const [hideEmptyColumns, setHideEmptyColumns] = useState(false);

  // Cached patterns from localStorage
  const [recentPatterns, setRecentPatterns] = useState<string[]>([]);
  const [presetLastMap, setPresetLastMap] = useState<Record<string, string>>({});
  const [autoApplyLast, setAutoApplyLast] = useState<boolean>(false);
  const [activeRowIdx, setActiveRowIdx] = useState<number>(0);

  // Load cached patterns on mount (and normalize legacy ':' to '*')
  useEffect(() => {
    try {
      const savedRecent = localStorage.getItem(RECENT_PATTERNS_STORAGE_KEY);
      if (savedRecent) {
        const parsed: string[] = JSON.parse(savedRecent);
        setRecentPatterns(parsed.map((p) => p.replace(/:/g, "*")));
      }

      const savedPresetMap = localStorage.getItem(PRESET_LAST_PATTERN_STORAGE_KEY);
      if (savedPresetMap) {
        const parsedMap: Record<string, string> = JSON.parse(savedPresetMap);
        Object.keys(parsedMap).forEach((k) => {
          parsedMap[k] = parsedMap[k].replace(/:/g, "*");
        });
        setPresetLastMap(parsedMap);
      }

      const savedAutoApply = localStorage.getItem(AUTO_APPLY_LAST_STORAGE_KEY);
      if (savedAutoApply) setAutoApplyLast(JSON.parse(savedAutoApply));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const savePatternToCache = (patternStr: string, presetId?: number | string) => {
    const clean = patternStr.trim();
    if (!clean) return;
    try {
      setRecentPatterns((prev) => {
        const next = [clean, ...prev.filter((p) => p !== clean)].slice(0, 8);
        localStorage.setItem(RECENT_PATTERNS_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      if (presetId !== undefined && presetId !== null) {
        setPresetLastMap((prev) => {
          const next = { ...prev, [String(presetId)]: clean };
          localStorage.setItem(
            PRESET_LAST_PATTERN_STORAGE_KEY,
            JSON.stringify(next)
          );
          return next;
        });
      }
    } catch {
      // Ignore storage errors
    }
  };

  const toggleAutoApplyLast = () => {
    setAutoApplyLast((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(AUTO_APPLY_LAST_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

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
  const dim1Values = useMemo(
    () =>
      selectedPreset?.values
        ?.filter((v) => (v.dimension_index ?? 1) === 1)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((v) => v.value_name || v.value) || ["Standard"],
    [selectedPreset]
  );

  const dim2Name = selectedPreset?.dim2_name || "Color";
  const dim2Values = useMemo(
    () =>
      selectedPreset?.values
        ?.filter((v) => v.dimension_index === 2)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((v) => v.value_name || v.value) || [],
    [selectedPreset]
  );

  // Matrix Rows State (Article No + Color + Quick Pattern + Optional Row Pricing)
  const [rows, setRows] = useState<MatrixRowState[]>([]);

  // Cell Map format: `${rowId}_${dim1_value}` => VariantMatrixCell
  const [cellMap, setCellMap] = useState<Record<string, VariantMatrixCell>>({});

  // Refs for full keyboard navigation
  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  const lastPatternForPreset = useMemo(() => {
    const pid = selectedPreset?.id ? String(selectedPreset.id) : "";
    return (pid && presetLastMap[pid]) || recentPatterns[0] || "";
  }, [selectedPreset, presetLastMap, recentPatterns]);

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
        const art = v.article_no || articleNo || "";
        const col = v.dim2_value || "";
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
        const firstWithMop = vars.find(
          (v) => v.mop !== undefined || v.purchase_rate !== undefined
        );

        const rowMopVal =
          firstWithMop?.mop ?? firstWithMop?.purchase_rate ?? initMop;

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

        const derivedPattern = summarizeRowToPattern(
          rowId,
          newCellMap,
          dim1Values
        );

        newRows.push({
          id: rowId,
          articleNo: art,
          color: col,
          quickPattern: derivedPattern,
          rowMrp: firstWithMrp?.mrp ?? initMrp,
          rowMop: rowMopVal,
        });
      });
    } else {
      // Start with a single clean row:
      // 1st Article No auto-defaults to Batch No (passed via articleNo prop)
      // Color defaults to empty string "" (since colors are often not mentioned)
      const rowId = "row-1";
      const defaultArt = articleNo || "";
      const defaultColor = "";

      const pid = selectedPreset?.id ? String(selectedPreset.id) : "";
      const cachedPattern =
        autoApplyLast ? (pid && presetLastMap[pid]) || recentPatterns[0] || "" : "";
      const parsedCached = cachedPattern
        ? parseQuickPattern(cachedPattern, dim1Values)
        : null;

      newRows.push({
        id: rowId,
        articleNo: defaultArt,
        color: defaultColor,
        quickPattern: parsedCached ? cachedPattern : "",
        rowMrp: initMrp,
        rowMop: initMop,
      });

      dim1Values.forEach((d1) => {
        const key = `${rowId}_${d1}`;
        newCellMap[key] = {
          article_no: defaultArt,
          dim1_value: d1,
          dim2_value: defaultColor,
          quantity: parsedCached ? parsedCached[d1] || 0 : 0,
          mrp: initMrp,
          mop: initMop,
        };
      });
    }

    setRows(newRows);
    setCellMap(newCellMap);
    setActiveRowIdx(0);

    // Auto-focus 1st row's Article No input immediately on open
    const focusTimer = setTimeout(() => {
      const firstArtInput = fieldRefs.current["0_article"];
      if (firstArtInput) {
        firstArtInput.focus();
        firstArtInput.select();
      }
    }, 60);

    return () => clearTimeout(focusTimer);
  }, [open, selectedPreset]);

  // Visible size columns (supports hiding 0-qty columns when toggled)
  const visibleDim1Values = useMemo(() => {
    if (!hideEmptyColumns) return dim1Values;
    const activeCols = dim1Values.filter((d1) =>
      rows.some((r) => (cellMap[`${r.id}_${d1}`]?.quantity || 0) > 0)
    );
    return activeCols.length > 0 ? activeCols : dim1Values;
  }, [dim1Values, hideEmptyColumns, rows, cellMap]);

  // Apply a quick pattern string (e.g., "4-6:2") to a specific row
  const applyPatternToRow = (
    row: MatrixRowState,
    patternStr: string,
    saveToHistory = false
  ): boolean => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id ? { ...r, quickPattern: patternStr } : r
      )
    );

    if (!patternStr.trim()) {
      setCellMap((prev) => {
        const updated = { ...prev };
        dim1Values.forEach((d1) => {
          const key = `${row.id}_${d1}`;
          if (updated[key]) {
            updated[key] = { ...updated[key], quantity: 0 };
          }
        });
        return updated;
      });
      return false;
    }

    const parsed = parseQuickPattern(patternStr, dim1Values);
    if (!parsed) return false;

    const fallbackMrp =
      row.rowMrp !== "" && row.rowMrp !== undefined
        ? Number(row.rowMrp)
        : globalMrp !== ""
        ? Number(globalMrp)
        : undefined;
    const fallbackMop =
      row.rowMop !== "" && row.rowMop !== undefined
        ? Number(row.rowMop)
        : globalMop !== ""
        ? Number(globalMop)
        : undefined;

    setCellMap((prev) => {
      const updated = { ...prev };
      dim1Values.forEach((d1) => {
        const key = `${row.id}_${d1}`;
        const existing = updated[key] || {
          article_no: row.articleNo,
          dim1_value: d1,
          dim2_value: row.color,
        };
        updated[key] = {
          ...existing,
          quantity: parsed[d1] || 0,
          mrp: existing.mrp ?? fallbackMrp,
          mop: existing.mop ?? fallbackMop,
        };
      });
      return updated;
    });

    if (saveToHistory) {
      savePatternToCache(patternStr, selectedPreset?.id);
    }
    return true;
  };

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

  const handleAddRow = (focusNewRow = true) => {
    const nextIdx = rows.length;
    const newRowId = `row-${nextIdx + 1}-${Date.now()}`;
    const lastRow = rows[rows.length - 1];
    const defaultArtNo = lastRow?.articleNo || articleNo || "";
    const defaultColor = "";

    const mopVal = globalMop !== "" ? Number(globalMop) : undefined;
    const mrpVal = globalMrp !== "" ? Number(globalMrp) : undefined;

    const prefillPattern = autoApplyLast ? lastPatternForPreset : "";
    const parsedCached = prefillPattern
      ? parseQuickPattern(prefillPattern, dim1Values)
      : null;

    setRows((prev) => [
      ...prev,
      {
        id: newRowId,
        articleNo: defaultArtNo,
        color: defaultColor,
        quickPattern: parsedCached ? prefillPattern : "",
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
          quantity: parsedCached ? parsedCached[d1] || 0 : 0,
          mrp: mrpVal,
          mop: mopVal,
        };
      });
      return updated;
    });

    if (focusNewRow) {
      setTimeout(() => {
        setActiveRowIdx(nextIdx);
        const el = fieldRefs.current[`${nextIdx}_article`];
        if (el) {
          el.focus();
          el.select();
        }
      }, 40);
    }
  };

  const handleLoadPresetColors = () => {
    if (dim2Values.length === 0) return;
    const mopVal = globalMop !== "" ? Number(globalMop) : undefined;
    const mrpVal = globalMrp !== "" ? Number(globalMrp) : undefined;
    const defaultArt = rows[0]?.articleNo || articleNo || "";

    const newRows: MatrixRowState[] = [];
    const newCellMap: Record<string, VariantMatrixCell> = {};

    dim2Values.forEach((d2, idx) => {
      const rowId = `row-color-${idx + 1}-${Date.now()}`;
      newRows.push({
        id: rowId,
        articleNo: defaultArt,
        color: d2,
        quickPattern: "",
        rowMop: mopVal,
        rowMrp: mrpVal,
      });
      dim1Values.forEach((d1) => {
        newCellMap[`${rowId}_${d1}`] = {
          article_no: defaultArt,
          dim1_value: d1,
          dim2_value: d2,
          quantity: 0,
          mrp: mrpVal,
          mop: mopVal,
        };
      });
    });

    setRows(newRows);
    setCellMap(newCellMap);
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

      const nextMap = {
        ...prev,
        [key]: {
          ...existing,
          article_no: row.articleNo,
          dim2_value: row.color,
          quantity: val,
          mrp: fallbackMrp,
          mop: fallbackMop,
        },
      };

      const summarized = summarizeRowToPattern(row.id, nextMap, dim1Values);
      setRows((prevRows) =>
        prevRows.map((r) =>
          r.id === row.id ? { ...r, quickPattern: summarized } : r
        )
      );

      return nextMap;
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

  const focusField = (key: string) => {
    const el = fieldRefs.current[key] || inputRefs.current[key];
    if (el) {
      el.focus();
      el.select();
      return true;
    }
    return false;
  };

  // Keyboard Navigation for Row Metadata Fields (Article No -> Color -> Quick Pattern -> Row Rates / Grid)
  const handleRowFieldKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rIdx: number,
    fieldType: "article" | "color" | "quick" | "mop" | "mrp",
    row: MatrixRowState
  ) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "Enter" || e.key.toLowerCase() === "s")) {
      e.preventDefault();
      handleSave();
      return;
    }

    if (fieldType === "quick" && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      if (recentPatterns.length > 0) {
        e.preventDefault();
        const currIdx = recentPatterns.indexOf(row.quickPattern.trim());
        const nextPatternIdx =
          e.key === "ArrowDown"
            ? (currIdx + 1) % recentPatterns.length
            : (currIdx - 1 + recentPatterns.length) % recentPatterns.length;
        const chosenPattern = recentPatterns[nextPatternIdx];
        applyPatternToRow(row, chosenPattern, false);
        return;
      }
    }

    if (e.key === "ArrowDown" && fieldType !== "quick") {
      if (rIdx < rows.length - 1) {
        e.preventDefault();
        setActiveRowIdx(rIdx + 1);
        focusField(`${rIdx + 1}_${fieldType}`);
      }
      return;
    }

    if (e.key === "ArrowUp" && fieldType !== "quick") {
      if (rIdx > 0) {
        e.preventDefault();
        setActiveRowIdx(rIdx - 1);
        focusField(`${rIdx - 1}_${fieldType}`);
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        if (fieldType === "mrp") focusField(`${rIdx}_mop`);
        else if (fieldType === "mop") focusField(`${rIdx}_quick`);
        else if (fieldType === "quick") focusField(`${rIdx}_color`);
        else if (fieldType === "color") focusField(`${rIdx}_article`);
        else if (fieldType === "article" && rIdx > 0) {
          setActiveRowIdx(rIdx - 1);
          focusField(`${rIdx - 1}_${visibleDim1Values.length - 1}`);
        }
        return;
      }

      if (fieldType === "article") {
        focusField(`${rIdx}_color`);
      } else if (fieldType === "color") {
        focusField(`${rIdx}_quick`);
      } else if (fieldType === "quick") {
        const patternVal = row.quickPattern.trim();
        if (patternVal) {
          const applied = applyPatternToRow(row, patternVal, true);
          if (applied) {
            if (rIdx < rows.length - 1) {
              setActiveRowIdx(rIdx + 1);
              focusField(`${rIdx + 1}_article`);
            } else {
              confirmBtnRef.current?.focus();
            }
            return;
          }
        }
        // If Quick Set is empty, jump straight into the 1st visible size cell
        focusField(`${rIdx}_0`);
      } else if (fieldType === "mop") {
        focusField(`${rIdx}_mrp`);
      } else if (fieldType === "mrp") {
        focusField(`${rIdx}_0`);
      }
    }
  };

  // Keyboard Navigation inside Size Cells
  const handleCellKeyDown = (
    e: React.KeyboardEvent,
    rIdx: number,
    cIdx: number,
    row: MatrixRowState
  ) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "Enter" || e.key.toLowerCase() === "s")) {
      e.preventDefault();
      handleSave();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        if (cIdx > 0) {
          focusField(`${rIdx}_${cIdx - 1}`);
        } else {
          focusField(`${rIdx}_quick`);
        }
        return;
      }

      if (cIdx < visibleDim1Values.length - 1) {
        focusField(`${rIdx}_${cIdx + 1}`);
      } else {
        // End of row: cache row pattern if any, move to next row or Confirm button
        const derived = summarizeRowToPattern(row.id, cellMap, dim1Values);
        if (derived) savePatternToCache(derived, selectedPreset?.id);

        if (rIdx < rows.length - 1) {
          setActiveRowIdx(rIdx + 1);
          focusField(`${rIdx + 1}_article`);
        } else {
          confirmBtnRef.current?.focus();
        }
      }
      return;
    }

    let targetR = rIdx;
    let targetC = cIdx;

    if (e.key === "ArrowRight") {
      targetC += 1;
    } else if (e.key === "ArrowLeft") {
      if (cIdx === 0) {
        e.preventDefault();
        focusField(`${rIdx}_quick`);
        return;
      }
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
      setActiveRowIdx(targetR);
      el.focus();
      el.select();
    }
  };

  // Modal-level keyboard shortcuts (Ctrl+S, Ctrl+Enter, Alt+N, Alt+R)
  useEffect(() => {
    if (!open) return;
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "s" || e.key === "Enter")) {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
        return;
      }
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        e.stopPropagation();
        handleAddRow(true);
        return;
      }
      if (e.altKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        e.stopPropagation();
        const targetRow = rows[activeRowIdx] || rows[0];
        if (targetRow && lastPatternForPreset) {
          applyPatternToRow(targetRow, lastPatternForPreset, true);
          confirmBtnRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKey, true);
    return () => window.removeEventListener("keydown", handleGlobalKey, true);
  });

  const fillAllQty = (val: number) => {
    setCellMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        updated[k] = { ...updated[k], quantity: val };
      });
      return updated;
    });
    if (val === 0) {
      setRows((prev) => prev.map((r) => ({ ...r, quickPattern: "" })));
    }
  };

  const totalQuantity = Object.values(cellMap).reduce(
    (sum, c) => sum + (c.quantity || 0),
    0
  );

  const activeVariantsCount = Object.values(cellMap).filter(
    (c) => c.quantity > 0
  ).length;

  const handleSave = () => {
    // Save any active row patterns to cache for future repeats
    rows.forEach((r) => {
      const summary =
        r.quickPattern.trim() ||
        summarizeRowToPattern(r.id, cellMap, dim1Values);
      if (summary && parseQuickPattern(summary, dim1Values)) {
        savePatternToCache(summary, selectedPreset?.id);
      }
    });

    const validVariants = Object.values(cellMap)
      .filter((c) => c.quantity > 0)
      .map((c) => {
        const art = (c.article_no || articleNo || "ART-1").trim();
        const col = (c.dim2_value || "").trim();
        const size = (c.dim1_value || "").trim();
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
      disableAutoFocus
      disableEnforceFocus
      PaperProps={{
        sx: { borderRadius: 3, p: 1 },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 1.5 }}>
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
              <Grid size={20} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                {productName} — Fast Variant Matrix
              </Typography>
              <Typography variant="caption" color="text.secondary">
                <b>Enter Flow:</b> Article No (Batch No) → {dim2Name} (optional) →{" "}
                <b>Quick Set (e.g. 2-4*2)</b> → Confirm | <b>Ctrl+S / Ctrl+Enter:</b>{" "}
                Save | <b>Alt+R:</b> Repeat Last | <b>Alt+N:</b> Add Row
              </Typography>
            </Box>
          </Stack>

          {/* Mode Switcher (tabIndex=-1 so it never steals initial focus) */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <ToggleButtonGroup
              size="small"
              value={viewMode}
              exclusive
              onChange={(_, val) => val && setViewMode(val)}
              sx={{ height: 34 }}
            >
              <ToggleButton
                value="qty"
                tabIndex={-1}
                sx={{ px: 1.5, fontWeight: 700, fontSize: "0.75rem" }}
              >
                <Layers size={14} style={{ marginRight: 6 }} /> Qty Matrix
              </ToggleButton>
              <ToggleButton
                value="rates"
                tabIndex={-1}
                sx={{ px: 1.5, fontWeight: 700, fontSize: "0.75rem" }}
              >
                <Tag size={14} style={{ marginRight: 6 }} /> Custom Rates
              </ToggleButton>
            </ToggleButtonGroup>

            <IconButton onClick={onClose} size="small" tabIndex={-1}>
              <X size={20} />
            </IconButton>
          </Stack>
        </Stack>
      </DialogTitle>

      <Divider sx={{ my: 0.5 }} />

      <DialogContent sx={{ py: 1.5 }}>
        {/* Datalist for optional color suggestions if preset has dim2Values */}
        {dim2Values.length > 0 && (
          <datalist id="matrix-preset-colors-list">
            {dim2Values.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        )}

        {/* GLOBAL BATCH RATES + CACHED PATTERNS BAR */}
        <Paper
          elevation={0}
          sx={{
            p: 1.25,
            mb: 1.5,
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
            useFlexGap
          >
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                BATCH SELLING RATES:
              </Typography>
              <TextField
                size="small"
                label="Batch MOP (₹)"
                type="number"
                value={globalMop}
                onChange={(e) =>
                  setGlobalMop(
                    e.target.value !== "" ? Number(e.target.value) : ""
                  )
                }
                sx={{ width: 135 }}
                inputProps={{
                  tabIndex: -1,
                  style: { padding: "5px 8px", fontWeight: 600, fontSize: "0.85rem" },
                }}
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
                sx={{ width: 135 }}
                inputProps={{
                  tabIndex: -1,
                  style: { padding: "5px 8px", fontWeight: 700, fontSize: "0.85rem" },
                }}
              />
              <Button
                size="small"
                variant="outlined"
                color="primary"
                tabIndex={-1}
                startIcon={<Zap size={14} />}
                onClick={handleApplyGlobalRatesToAll}
                sx={{
                  borderRadius: 1.5,
                  textTransform: "none",
                  fontWeight: 700,
                  height: 32,
                  fontSize: "0.75rem",
                }}
              >
                Apply Rates to All
              </Button>
            </Stack>

            <Paper
              elevation={0}
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 1.5,
                bgcolor: "primary.50",
                border: "1px solid",
                borderColor: "primary.200",
                display: "flex",
                gap: 2,
                alignItems: "center",
                height: 34,
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

          {/* CACHED SIZE-QTY PATTERNS BAR */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            mt={1}
            pt={1}
            sx={{ borderTop: "1px dashed #cbd5e1", flexWrap: "wrap" }}
            useFlexGap
          >
            <Stack direction="row" spacing={0.5} alignItems="center">
              <History size={14} color="#475569" />
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Cached Repeats:
              </Typography>
            </Stack>

            {recentPatterns.length === 0 ? (
              <Typography variant="caption" color="text.disabled">
                Type <b>2-4*2</b> (or <b>2-4*2+6-8*1</b>) in Quick Set & press Enter — your frequent size sets will be cached here for 1-key repeat.
              </Typography>
            ) : (
              recentPatterns.map((pat, idx) => (
                <Chip
                  key={pat}
                  size="small"
                  color={idx === 0 ? "primary" : "default"}
                  variant={idx === 0 ? "filled" : "outlined"}
                  label={idx === 0 ? `⚡ Last: ${pat} (Alt+R)` : pat}
                  onClick={() => {
                    const targetRow = rows[activeRowIdx] || rows[0];
                    if (targetRow) {
                      applyPatternToRow(targetRow, pat, true);
                      confirmBtnRef.current?.focus();
                    }
                  }}
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    height: 24,
                    cursor: "pointer",
                  }}
                />
              ))
            )}

            <Box sx={{ flexGrow: 1 }} />

            <Tooltip title="When enabled, opening the matrix for the next item automatically pre-fills the last used size-quantity pattern">
              <Chip
                size="small"
                icon={<RotateCcw size={12} />}
                label={
                  autoApplyLast
                    ? "Auto-Repeat Last: ON"
                    : "Auto-Repeat Last: OFF"
                }
                color={autoApplyLast ? "success" : "default"}
                variant={autoApplyLast ? "filled" : "outlined"}
                onClick={toggleAutoApplyLast}
                sx={{ fontWeight: 700, fontSize: "0.72rem", height: 24, cursor: "pointer" }}
              />
            </Tooltip>
          </Stack>
        </Paper>

        {/* Quick Toolbar */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={1.5}
          gap={1.5}
          flexWrap="wrap"
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {/* Preset Selector */}
            {presets.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <InputLabel id="matrix-preset-select-label">Size Preset</InputLabel>
                <Select
                  labelId="matrix-preset-select-label"
                  label="Size Preset"
                  tabIndex={-1}
                  value={selectedPreset?.id || ""}
                  onChange={(e) => {
                    const chosen = presets.find((p) => p.id === e.target.value);
                    if (chosen) setSelectedPreset(chosen);
                  }}
                  sx={{ borderRadius: 1.5, fontSize: "0.8rem", fontWeight: 600, height: 34 }}
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
              tabIndex={-1}
              startIcon={<Plus size={15} />}
              onClick={() => handleAddRow(true)}
              sx={{
                borderRadius: 1.5,
                textTransform: "none",
                fontSize: "0.78rem",
                fontWeight: 700,
                height: 34,
              }}
            >
              + Add Row (Alt+N)
            </Button>

            {dim2Values.length > 0 && rows.length === 1 && !rows[0]?.color && (
              <Button
                size="small"
                variant="outlined"
                tabIndex={-1}
                onClick={handleLoadPresetColors}
                sx={{
                  borderRadius: 1.5,
                  textTransform: "none",
                  fontSize: "0.75rem",
                  height: 34,
                }}
              >
                Load All {dim2Values.length} Preset Colors
              </Button>
            )}

            <Button
              size="small"
              variant={hideEmptyColumns ? "contained" : "outlined"}
              color={hideEmptyColumns ? "info" : "inherit"}
              tabIndex={-1}
              startIcon={<Filter size={14} />}
              onClick={() => setHideEmptyColumns((prev) => !prev)}
              sx={{
                borderRadius: 1.5,
                textTransform: "none",
                fontSize: "0.75rem",
                height: 34,
              }}
            >
              {hideEmptyColumns
                ? `Showing Active Sizes (${visibleDim1Values.length}/${dim1Values.length})`
                : "Filter Active Sizes"}
            </Button>

            <Button
              size="small"
              variant="outlined"
              tabIndex={-1}
              onClick={() => fillAllQty(1)}
              sx={{
                borderRadius: 1.5,
                textTransform: "none",
                fontSize: "0.75rem",
                height: 34,
              }}
            >
              Fill All = 1
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              tabIndex={-1}
              onClick={() => fillAllQty(0)}
              sx={{
                borderRadius: 1.5,
                textTransform: "none",
                fontSize: "0.75rem",
                height: 34,
              }}
            >
              Clear All
            </Button>
          </Stack>
        </Stack>

        {/* MATRIX GRID TABLE */}
        <Box
          sx={{
            overflowX: "auto",
            maxHeight: 460,
            pb: 1,
            borderRadius: 2,
            border: "1px solid #cbd5e1",
          }}
        >
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
                    padding: "8px 10px",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#334155",
                    width: 135,
                    minWidth: 125,
                  }}
                >
                  Article No (Batch)
                </th>
                <th
                  style={{
                    padding: "8px 10px",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#334155",
                    width: 115,
                    minWidth: 105,
                  }}
                >
                  {dim2Name} (Opt)
                </th>
                <th
                  style={{
                    padding: "8px 10px",
                    backgroundColor: "#e0f2fe",
                    border: "1px solid #7dd3fc",
                    textAlign: "left",
                    fontWeight: 800,
                    color: "#0369a1",
                    width: 175,
                    minWidth: 165,
                  }}
                >
                  ⚡ Quick Set (e.g. 2-4*2)
                </th>
                <th
                  style={{
                    padding: "8px 8px",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    textAlign: "center",
                    fontWeight: 700,
                    color: "#334155",
                    width: 165,
                    minWidth: 155,
                  }}
                >
                  Row Rates (MOP / MRP)
                </th>

                {visibleDim1Values.map((d1) => (
                  <th
                    key={d1}
                    style={{
                      padding: "8px 6px",
                      backgroundColor: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      textAlign: "center",
                      fontWeight: 700,
                      color: "#1e293b",
                      minWidth: viewMode === "rates" ? 130 : 62,
                    }}
                  >
                    {d1}
                  </th>
                ))}
                <th
                  style={{
                    padding: "8px 10px",
                    backgroundColor: "#e2e8f0",
                    border: "1px solid #cbd5e1",
                    textAlign: "center",
                    fontWeight: 700,
                    color: "#1e293b",
                    minWidth: 70,
                  }}
                >
                  Total
                </th>
                <th
                  style={{
                    padding: "8px 6px",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    textAlign: "center",
                    width: 44,
                  }}
                ></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => {
                const rowTotal = dim1Values.reduce((sum, d1) => {
                  const key = `${row.id}_${d1}`;
                  return sum + (cellMap[key]?.quantity || 0);
                }, 0);

                return (
                  <tr
                    key={row.id}
                    onClick={() => setActiveRowIdx(rIdx)}
                    style={{
                      backgroundColor:
                        activeRowIdx === rIdx ? "#f8fafc" : "transparent",
                    }}
                  >
                    {/* 1. Article No Input (Auto-focused on Row 1, defaulted to Batch No) */}
                    <td
                      style={{
                        padding: "5px 6px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      <TextField
                        fullWidth
                        size="small"
                        variant="outlined"
                        placeholder="Batch / Art No"
                        value={row.articleNo}
                        inputRef={(el) => {
                          fieldRefs.current[`${rIdx}_article`] = el;
                        }}
                        onFocus={(e) => {
                          setActiveRowIdx(rIdx);
                          e.target.select();
                        }}
                        onChange={(e) =>
                          handleRowArticleNoChange(row.id, e.target.value)
                        }
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                          handleRowFieldKeyDown(e, rIdx, "article", row)
                        }
                        inputProps={{
                          style: {
                            padding: "6px 8px",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                          },
                        }}
                      />
                    </td>

                    {/* 2. Color / Variant Input (Empty by default!) */}
                    <td
                      style={{
                        padding: "5px 6px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      <TextField
                        fullWidth
                        size="small"
                        variant="outlined"
                        placeholder="Optional"
                        value={row.color}
                        inputRef={(el) => {
                          fieldRefs.current[`${rIdx}_color`] = el;
                        }}
                        onFocus={(e) => {
                          setActiveRowIdx(rIdx);
                          e.target.select();
                        }}
                        onChange={(e) =>
                          handleRowColorChange(row.id, e.target.value)
                        }
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                          handleRowFieldKeyDown(e, rIdx, "color", row)
                        }
                        inputProps={{
                          list:
                            dim2Values.length > 0
                              ? "matrix-preset-colors-list"
                              : undefined,
                          style: {
                            padding: "6px 8px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                          },
                        }}
                      />
                    </td>

                    {/* 3. Quick Set Shorthand Input (e.g. "2-4*2" or Up/Down for cached history) */}
                    <td
                      style={{
                        padding: "5px 6px",
                        backgroundColor: "#f0f9ff",
                        border: "1px solid #7dd3fc",
                      }}
                    >
                      <Tooltip
                        title="100% Numpad: Type range*qty like '2-4*2' or '2-4*2+6-8*1' & press Enter. Press ↓/↑ for cached patterns, or leave blank & press Enter to type cell-by-cell."
                        placement="top"
                      >
                        <TextField
                          fullWidth
                          size="small"
                          variant="outlined"
                          placeholder={
                            lastPatternForPreset
                              ? `${lastPatternForPreset} (↓/Enter)`
                              : "e.g. 2-4*2"
                          }
                          value={row.quickPattern}
                          inputRef={(el) => {
                            fieldRefs.current[`${rIdx}_quick`] = el;
                          }}
                          onFocus={(e) => {
                            setActiveRowIdx(rIdx);
                            e.target.select();
                          }}
                          onChange={(e) => {
                            applyPatternToRow(row, e.target.value, false);
                          }}
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                            handleRowFieldKeyDown(e, rIdx, "quick", row)
                          }
                          inputProps={{
                            style: {
                              padding: "6px 8px",
                              fontSize: "0.85rem",
                              fontWeight: 800,
                              color: "#0369a1",
                            },
                          }}
                        />
                      </Tooltip>
                    </td>

                    {/* 4. Row Rate Fill (MOP / MRP) */}
                    <td
                      style={{
                        padding: "5px 6px",
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
                          inputRef={(el) => {
                            fieldRefs.current[`${rIdx}_mop`] = el;
                          }}
                          onFocus={(e) => {
                            setActiveRowIdx(rIdx);
                            e.target.select();
                          }}
                          onChange={(e) =>
                            handleRowMopChange(
                              row.id,
                              e.target.value !== "" ? Number(e.target.value) : ""
                            )
                          }
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                            handleRowFieldKeyDown(e, rIdx, "mop", row)
                          }
                          inputProps={{
                            tabIndex: -1,
                            style: { padding: "5px 6px", fontSize: "0.78rem" },
                          }}
                        />
                        <TextField
                          size="small"
                          placeholder="MRP"
                          type="number"
                          value={row.rowMrp ?? ""}
                          inputRef={(el) => {
                            fieldRefs.current[`${rIdx}_mrp`] = el;
                          }}
                          onFocus={(e) => {
                            setActiveRowIdx(rIdx);
                            e.target.select();
                          }}
                          onChange={(e) =>
                            handleRowMrpChange(
                              row.id,
                              e.target.value !== "" ? Number(e.target.value) : ""
                            )
                          }
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                            handleRowFieldKeyDown(e, rIdx, "mrp", row)
                          }
                          inputProps={{
                            tabIndex: -1,
                            style: {
                              padding: "5px 6px",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                            },
                          }}
                        />
                      </Stack>
                    </td>

                    {/* 5. Size Columns */}
                    {visibleDim1Values.map((d1, cIdx) => {
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
                            backgroundColor:
                              cell.quantity > 0 ? "#e0f2fe" : "white",
                            verticalAlign: "top",
                          }}
                        >
                          {viewMode === "qty" ? (
                            <Box
                              display="flex"
                              flexDirection="column"
                              alignItems="center"
                            >
                              <input
                                ref={(el) => {
                                  inputRefs.current[refKey] = el;
                                }}
                                type="number"
                                min={0}
                                value={cell.quantity === 0 ? "" : cell.quantity}
                                placeholder="0"
                                onFocus={(e) => {
                                  setActiveRowIdx(rIdx);
                                  e.target.select();
                                }}
                                onChange={(e) =>
                                  handleQtyChange(
                                    key,
                                    Number(e.target.value),
                                    row
                                  )
                                }
                                onKeyDown={(e) =>
                                  handleCellKeyDown(e, rIdx, cIdx, row)
                                }
                                style={{
                                  width: "100%",
                                  textAlign: "center",
                                  padding: "7px 2px",
                                  border: "none",
                                  outline: "none",
                                  background: "transparent",
                                  fontWeight: cell.quantity > 0 ? 800 : 400,
                                  fontSize: "0.95rem",
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
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  width={32}
                                  fontWeight={700}
                                >
                                  Qty:
                                </Typography>
                                <input
                                  ref={(el) => {
                                    inputRefs.current[refKey] = el;
                                  }}
                                  type="number"
                                  min={0}
                                  value={
                                    cell.quantity === 0 ? "" : cell.quantity
                                  }
                                  placeholder="0"
                                  onFocus={(e) => {
                                    setActiveRowIdx(rIdx);
                                    e.target.select();
                                  }}
                                  onChange={(e) =>
                                    handleQtyChange(
                                      key,
                                      Number(e.target.value),
                                      row
                                    )
                                  }
                                  onKeyDown={(e) =>
                                    handleCellKeyDown(e, rIdx, cIdx, row)
                                  }
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
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  width={32}
                                >
                                  MOP:
                                </Typography>
                                <input
                                  type="number"
                                  placeholder={String(
                                    row.rowMop ?? globalMop ?? ""
                                  )}
                                  value={cell.mop ?? ""}
                                  onChange={(e) =>
                                    handleCellMopChange(
                                      key,
                                      e.target.value !== ""
                                        ? Number(e.target.value)
                                        : ""
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
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  width={32}
                                  fontWeight={700}
                                >
                                  MRP:
                                </Typography>
                                <input
                                  type="number"
                                  placeholder={String(
                                    row.rowMrp ?? globalMrp ?? ""
                                  )}
                                  value={cell.mrp ?? ""}
                                  onChange={(e) =>
                                    handleCellMrpChange(
                                      key,
                                      e.target.value !== ""
                                        ? Number(e.target.value)
                                        : ""
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
                        padding: "8px",
                        backgroundColor: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        textAlign: "center",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                      }}
                    >
                      {rowTotal}
                    </td>

                    {/* Delete Row Action */}
                    <td
                      style={{
                        padding: "4px",
                        border: "1px solid #cbd5e1",
                        textAlign: "center",
                      }}
                    >
                      <IconButton
                        size="small"
                        color="error"
                        tabIndex={-1}
                        disabled={rows.length <= 1}
                        onClick={() => handleRemoveRow(row.id)}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </td>
                  </tr>
                );
              })}

              {/* Summary / Column Totals Row */}
              <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}>
                <td
                  colSpan={4}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #cbd5e1",
                    textAlign: "right",
                    color: "#334155",
                  }}
                >
                  Size Totals:
                </td>
                {visibleDim1Values.map((d1) => {
                  const colTotal = rows.reduce((sum, row) => {
                    const key = `${row.id}_${d1}`;
                    return sum + (cellMap[key]?.quantity || 0);
                  }, 0);
                  return (
                    <td
                      key={d1}
                      style={{
                        padding: "8px 4px",
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
                    padding: "8px 4px",
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
        <Button onClick={onClose} color="inherit" tabIndex={-1}>
          Cancel (Esc)
        </Button>
        <Button
          ref={confirmBtnRef}
          onClick={handleSave}
          variant="contained"
          color="primary"
          startIcon={<CheckCircle2 size={18} />}
          sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
        >
          Confirm {totalQuantity} Pcs Matrix (Enter / Ctrl+S)
        </Button>
      </DialogActions>
    </Dialog>
  );
}
