"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Chip,
  Button,
  Tabs,
  Tab,
  Stack,
  IconButton,
  Tooltip,
  Paper,
  InputAdornment,
  Divider,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import {
  ScanBarcode,
  ClipboardPaste,
  Binary,
  Trash2,
  CheckCircle2,
  Zap,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

interface FastSerialScannerInputProps {
  serials: string[];
  onChange: (serials: string[]) => void;
  autoFocus?: boolean;
}

// Audio Cues using Web Audio API for fast zero-latency feedback
const playSoundCue = (type: "success" | "error") => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3 low pitch
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch (err) {
    // Ignore audio context errors
  }
};

export default function FastSerialScannerInput({
  serials,
  onChange,
  autoFocus = true,
}: FastSerialScannerInputProps) {
  const [tabIndex, setTabIndex] = useState(0);
  const [scanInput, setScanInput] = useState("");
  const [pasteInput, setPasteInput] = useState("");

  // Sequence generator states
  const [prefix, setPrefix] = useState("SN-");
  const [suffix] = useState("");
  const [startNum, setStartNum] = useState(1);
  const [count, setCount] = useState(10);
  const [padZeros, setPadZeros] = useState(3);

  // Scan feedback state
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && tabIndex === 0 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus, tabIndex]);

  // Handle barcode scanner input (triggered by Enter keypress from scanner)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = scanInput.trim();
      if (!val) return;

      if (serials.includes(val)) {
        setIsError(true);
        playSoundCue("error");
        toast.error(`Duplicate Serial: "${val}"`);
        setTimeout(() => setIsError(false), 500);
        return;
      }

      // Add valid serial
      onChange([...serials, val]);
      setLastScanned(val);
      setIsError(false);
      playSoundCue("success");
      setScanInput("");

      // Keep focus on scan input for continuous barcode scanning
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 10);
    }
  };

  // Bulk Paste Handler
  const handleProcessPaste = () => {
    if (!pasteInput.trim()) return;
    const rawTokens = pasteInput.split(/[\n,\r\t;]+/);
    const parsed = rawTokens
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (parsed.length === 0) {
      toast.error("No valid serial numbers found in pasted text");
      return;
    }

    const existingSet = new Set(serials);
    const newItems: string[] = [];
    let duplicatesCount = 0;

    for (const item of parsed) {
      if (existingSet.has(item) || newItems.includes(item)) {
        duplicatesCount++;
      } else {
        newItems.push(item);
      }
    }

    if (newItems.length > 0) {
      onChange([...serials, ...newItems]);
      playSoundCue("success");
      toast.success(
        `Added ${newItems.length} serial numbers!${
          duplicatesCount > 0 ? ` (${duplicatesCount} duplicates skipped)` : ""
        }`
      );
      setPasteInput("");
      setTabIndex(0);
    } else {
      playSoundCue("error");
      toast.error("All pasted serial numbers already exist in the list.");
    }
  };

  // Sequence Generator Handler
  const handleGenerateSequence = () => {
    if (count <= 0 || count > 500) {
      toast.error("Count must be between 1 and 500");
      return;
    }

    const generated: string[] = [];
    const existingSet = new Set(serials);
    let dupeCount = 0;

    for (let i = 0; i < count; i++) {
      const numStr = String(startNum + i).padStart(padZeros, "0");
      const sn = `${prefix}${numStr}${suffix}`;
      if (existingSet.has(sn)) {
        dupeCount++;
      } else {
        generated.push(sn);
      }
    }

    if (generated.length > 0) {
      onChange([...serials, ...generated]);
      playSoundCue("success");
      toast.success(
        `Generated ${generated.length} serial numbers!${
          dupeCount > 0 ? ` (${dupeCount} duplicates skipped)` : ""
        }`
      );
      setTabIndex(0);
    } else {
      toast.error("All generated serials already exist in list.");
    }
  };

  const removeSerial = (indexToRemove: number) => {
    onChange(serials.filter((_, idx) => idx !== indexToRemove));
  };

  const clearAll = () => {
    if (serials.length === 0) return;
    onChange([]);
    toast.success("Cleared all scanned serial numbers");
  };

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: isError ? "error.main" : "divider",
        borderRadius: 3,
        bgcolor: "#fafafa",
        overflow: "hidden",
        transition: "all 0.2s ease-in-out",
        boxShadow: isError ? "0 0 12px rgba(211, 47, 47, 0.3)" : "none",
      }}
    >
      {/* Header bar with total counter */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          px: 2,
          py: 1,
          bgcolor: "#f0f4f8",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <ScanBarcode size={18} className="text-blue-600" />
          <Typography variant="subtitle2" fontWeight={700} color="text.primary">
            Serial Numbers Input
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            icon={<Zap size={14} />}
            label={`${serials.length} Scanned`}
            color={serials.length > 0 ? "primary" : "default"}
            size="small"
            sx={{ fontWeight: 700 }}
          />
          {serials.length > 0 && (
            <Tooltip title="Clear all serial numbers">
              <IconButton size="small" onClick={clearAll} color="error">
                <Trash2 size={16} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {/* Input Mode Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "#fff" }}>
        <Tabs
          value={tabIndex}
          onChange={(_, val) => setTabIndex(val)}
          variant="fullWidth"
          sx={{ minHeight: 40 }}
        >
          <Tab
            icon={<ScanBarcode size={16} />}
            iconPosition="start"
            label="Barcode Scan"
            sx={{ textTransform: "none", fontWeight: 600, minHeight: 40 }}
          />
          <Tab
            icon={<ClipboardPaste size={16} />}
            iconPosition="start"
            label="Bulk Paste"
            sx={{ textTransform: "none", fontWeight: 600, minHeight: 40 }}
          />
          <Tab
            icon={<Binary size={16} />}
            iconPosition="start"
            label="Sequence Generator"
            sx={{ textTransform: "none", fontWeight: 600, minHeight: 40 }}
          />
        </Tabs>
      </Box>

      <Box p={2}>
        {/* Tab 0: Fast Barcode Scanner Mode */}
        {tabIndex === 0 && (
          <Stack spacing={1.5}>
            <Box position="relative">
              <TextField
                inputRef={inputRef}
                fullWidth
                size="medium"
                placeholder="Scan barcode or type serial number and press Enter..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleKeyDown}
                error={isError}
                autoComplete="off"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ScanBarcode
                        size={20}
                        color={isError ? "#d32f2f" : "#2563eb"}
                      />
                    </InputAdornment>
                  ),
                  endAdornment: scanInput.trim() ? (
                    <InputAdornment position="end">
                      <Chip
                        label="Press Enter"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontSize: "0.65rem", height: 22 }}
                      />
                    </InputAdornment>
                  ) : null,
                  sx: {
                    bgcolor: "#fff",
                    borderRadius: 2,
                    fontWeight: 600,
                    fontFamily: "monospace",
                  },
                }}
              />
            </Box>

            {lastScanned && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <CheckCircle2 size={14} color="#16a34a" />
                <Typography variant="caption" color="success.main" fontWeight={600}>
                  Just added: <code style={{ fontWeight: 700 }}>{lastScanned}</code>
                </Typography>
              </Stack>
            )}

            <Typography variant="caption" color="text.secondary">
              ⚡ <b>Scan Mode Active:</b> Point scanner at product barcodes. Scanned items are appended instantly!
            </Typography>
          </Stack>
        )}

        {/* Tab 1: Bulk Paste Mode */}
        {tabIndex === 1 && (
          <Stack spacing={1.5}>
            <TextField
              multiline
              rows={4}
              fullWidth
              placeholder="Paste serial numbers here (one per line, comma, tab, or space separated)...&#10;e.g.&#10;SN100201&#10;SN100202&#10;SN100203"
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              sx={{
                bgcolor: "#fff",
                borderRadius: 2,
                fontFamily: "monospace",
                fontSize: "0.85rem",
              }}
            />
            <Button
              variant="contained"
              startIcon={<ClipboardPaste size={16} />}
              onClick={handleProcessPaste}
              disabled={!pasteInput.trim()}
              sx={{ alignSelf: "flex-end", textTransform: "none" }}
            >
              Parse & Add Serials
            </Button>
          </Stack>
        )}

        {/* Tab 2: Sequence Generator */}
        {tabIndex === 2 && (
          <Stack spacing={2}>
            <Grid container spacing={1.5}>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Prefix"
                  size="small"
                  fullWidth
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Start #"
                  type="number"
                  size="small"
                  fullWidth
                  value={startNum}
                  onChange={(e) => setStartNum(Number(e.target.value))}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Count"
                  type="number"
                  size="small"
                  fullWidth
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Zeros (Digits)"
                  type="number"
                  size="small"
                  fullWidth
                  value={padZeros}
                  onChange={(e) => setPadZeros(Number(e.target.value))}
                  helperText="e.g. 3 => 001"
                />
              </Grid>
            </Grid>

            <Box
              sx={{
                p: 1.5,
                bgcolor: "#fff",
                borderRadius: 2,
                border: "1px dashed #ccc",
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block">
                Sample preview of generated format:
              </Typography>
              <Typography variant="body2" fontFamily="monospace" fontWeight={700} color="primary">
                {`${prefix}${String(startNum).padStart(padZeros, "0")}${suffix}`} ... {`${prefix}${String(startNum + Math.max(0, count - 1)).padStart(padZeros, "0")}${suffix}`}
              </Typography>
            </Box>

            <Button
              variant="contained"
              color="secondary"
              startIcon={<Sparkles size={16} />}
              onClick={handleGenerateSequence}
              sx={{ alignSelf: "flex-end", textTransform: "none" }}
            >
              Generate {count} Serials
            </Button>
          </Stack>
        )}

        {/* Scanned Items Badges Chip Cloud */}
        {serials.length > 0 && (
          <Box mt={2}>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="caption" color="text.secondary" fontWeight={600} gutterBottom display="block">
              SCANNED SERIAL NUMBERS LIST ({serials.length})
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                maxHeight: 140,
                overflowY: "auto",
                bgcolor: "#fff",
                borderRadius: 2,
                display: "flex",
                flexWrap: "wrap",
                gap: 0.8,
              }}
            >
              {serials.map((sn, idx) => (
                <Chip
                  key={`${sn}-${idx}`}
                  label={sn}
                  size="small"
                  onDelete={() => removeSerial(idx)}
                  color="default"
                  sx={{
                    fontFamily: "monospace",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    bgcolor: "#e2e8f0",
                    "&:hover": { bgcolor: "#cbd5e1" },
                  }}
                />
              ))}
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
}
