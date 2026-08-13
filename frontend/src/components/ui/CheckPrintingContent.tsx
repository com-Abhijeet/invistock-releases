"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Stack,
  IconButton,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Slider,
  useTheme,
  Chip,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Printer,
  Info,
  Save,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  X,
  Building2,
  Check,
  RotateCcw,
  Grid,
} from "lucide-react";
import toast from "react-hot-toast";
import { ToWords } from "to-words";

const toWords = new ToWords({
  localeCode: "en-IN",
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
    currencyOptions: {
      name: "Rupee",
      plural: "Rupees",
      symbol: "₹",
      fractionalUnit: {
        name: "Paisa",
        plural: "Paise",
        symbol: "",
      },
    },
  },
});

// Indian Standard Defaults (mm) based on CTS 2010
const DEFAULT_CONFIG = {
  name: "Indian Standard (CTS 2010)",
  width: 203,
  height: 93,
  fields: {
    date: { top: 8, left: 152, spacing: 4.2 },
    payee: { top: 20, left: 25 },
    wordsLine1: { top: 29, left: 35 },
    wordsLine2: { top: 38, left: 15 },
    amount: { top: 42, left: 155 },
  },
};

const SUGGESTED_BANKS = [
  "HDFC Bank",
  "ICICI Bank",
  "State Bank of India",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank",
  "Bank of Baroda",
];

export interface CheckPrintingContentProps {
  initialData?: {
    payee?: string;
    amount?: number;
    date?: string;
  };
  isModal?: boolean;
  onCloseModal?: () => void;
  onHeaderActionsChange?: (actions: React.ReactNode) => void;
}

// Utility to convert YYYY-MM-DD or raw date string to DDMMYYYY
const formatToDDMMYYYY = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, "0")}${month.padStart(2, "0")}${year}`;
  }
  return dateStr.replace(/\D/g, "");
};

// Utility to split amount words into line 1 and line 2
const getAmountInWordsLines = (num: number, maxLine1Length = 45) => {
  if (!num || num <= 0) return { line1: "", line2: "" };
  let words = "";
  try {
    words = toWords.convert(num);
  } catch (e) {
    words = "";
  }

  if (words.length <= maxLine1Length) {
    return { line1: words, line2: "" };
  }

  const wordsArr = words.split(" ");
  let line1 = "";
  let line2 = "";

  for (const word of wordsArr) {
    if ((line1 + " " + word).trim().length <= maxLine1Length) {
      line1 = (line1 + " " + word).trim();
    } else {
      line2 = (line2 + " " + word).trim();
    }
  }

  return { line1, line2 };
};

export default function CheckPrintingContent({
  initialData,
  isModal = false,
  onCloseModal,
  onHeaderActionsChange,
}: CheckPrintingContentProps) {
  const theme = useTheme();

  const [payee, setPayee] = useState(initialData?.payee || "");
  const [amount, setAmount] = useState(initialData?.amount || 0);
  const [date, setDate] = useState(
    initialData?.date || new Date().toISOString().split("T")[0],
  );

  const [configs, setConfigs] = useState<any[]>([DEFAULT_CONFIG]);
  const [currentConfigIndex, setCurrentConfigIndex] = useState(0);
  const [selectedField, setSelectedField] = useState<string | null>(null);

  // Gridlines View Toggle State
  const [showGridlines, setShowGridlines] = useState<boolean>(() => {
    const saved = localStorage.getItem("check_print_show_gridlines");
    return saved !== null ? saved === "true" : true;
  });

  const toggleGridlines = () => {
    setShowGridlines((prev) => {
      const next = !prev;
      localStorage.setItem("check_print_show_gridlines", String(next));
      return next;
    });
  };

  // Add Bank Modal state
  const [addBankModalOpen, setAddBankModalOpen] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [newBankBaseTemplate, setNewBankBaseTemplate] = useState<"current" | "default">("current");

  // Delete Confirm Modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Reset Confirm Modal state
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetOption, setResetOption] = useState<"current" | "all">("current");

  // Load cached configs
  useEffect(() => {
    const saved = localStorage.getItem("check_print_configs");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConfigs(parsed);
          const lastIdx = localStorage.getItem("check_print_last_idx");
          if (lastIdx !== null && !isNaN(Number(lastIdx))) {
            const idx = Number(lastIdx);
            if (idx >= 0 && idx < parsed.length) {
              setCurrentConfigIndex(idx);
            } else {
              setCurrentConfigIndex(0);
            }
          }
        } else {
          setConfigs([DEFAULT_CONFIG]);
        }
      } catch (e) {
        console.error("Failed to parse check_print_configs", e);
        setConfigs([DEFAULT_CONFIG]);
      }
    } else {
      setConfigs([DEFAULT_CONFIG]);
    }
  }, []);

  // Sync initial data
  useEffect(() => {
    if (initialData) {
      if (initialData.payee !== undefined) setPayee(initialData.payee);
      if (initialData.amount !== undefined) setAmount(initialData.amount);
      if (initialData.date) setDate(initialData.date);
    }
  }, [initialData]);

  const config = configs[currentConfigIndex] || DEFAULT_CONFIG;

  const saveConfigsToStorage = (newConfigs: any[], activeIndex?: number) => {
    const idx = activeIndex !== undefined ? activeIndex : currentConfigIndex;
    setConfigs(newConfigs);
    localStorage.setItem("check_print_configs", JSON.stringify(newConfigs));
    localStorage.setItem("check_print_last_idx", idx.toString());
  };

  const handleSaveAllConfig = () => {
    saveConfigsToStorage(configs, currentConfigIndex);
    toast.success("All bank configurations saved successfully!");
  };

  const handlePrint = async () => {
    if (!window.electron?.ipcRenderer) {
      toast.error("Desktop App required for printing");
      return;
    }

    const toastId = toast.loading("Sending cheque to printer...");
    try {
      const formattedDate = formatToDDMMYYYY(date);
      const res = await window.electron.ipcRenderer.invoke("print-check", {
        payee,
        amount,
        date: formattedDate,
        config: {
          ...config.fields,
          width: config.width,
          height: config.height,
        },
      });

      if (res.success) {
        toast.success("Printed successfully!", { id: toastId });
        if (isModal && onCloseModal) onCloseModal();
      } else {
        toast.error("Error: " + res.error, { id: toastId });
      }
    } catch (e) {
      toast.error("Print connection failed", { id: toastId });
    }
  };

  // Sync primary CTA actions to DashboardHeader when not in modal
  useEffect(() => {
    if (!isModal && onHeaderActionsChange) {
      onHeaderActionsChange(
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<Save size={16} />}
            onClick={handleSaveAllConfig}
            sx={{
              fontWeight: 700,
              borderRadius: "10px",
              textTransform: "none",
              px: 2.5,
              height: 40,
              bgcolor: "background.paper",
            }}
          >
            Save Configurations
          </Button>

          <Button
            onClick={handlePrint}
            variant="contained"
            color="primary"
            startIcon={<Printer size={18} />}
            size="medium"
            sx={{
              px: 3,
              height: 40,
              borderRadius: "10px",
              fontWeight: 800,
              textTransform: "none",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
            }}
          >
            Generate & Print Cheque
          </Button>
        </Stack>
      );
    }
  }, [isModal, onHeaderActionsChange, configs, currentConfigIndex, payee, amount, date]);

  const handleCreateBankConfig = () => {
    const trimmedName = newBankName.trim();
    if (!trimmedName) {
      toast.error("Please enter a bank name.");
      return;
    }

    const baseConfig =
      newBankBaseTemplate === "current" && configs[currentConfigIndex]
        ? configs[currentConfigIndex]
        : DEFAULT_CONFIG;

    const newConfig = JSON.parse(JSON.stringify(baseConfig));
    newConfig.name = trimmedName;

    const newConfigs = [...configs, newConfig];
    const newIndex = newConfigs.length - 1;

    saveConfigsToStorage(newConfigs, newIndex);
    setCurrentConfigIndex(newIndex);

    setAddBankModalOpen(false);
    setNewBankName("");
    toast.success(`Bank configuration "${trimmedName}" created!`);
  };

  const handleDeleteBankConfig = () => {
    if (configs.length <= 1) {
      toast.error("At least one bank configuration must be kept.");
      setDeleteConfirmOpen(false);
      return;
    }
    const bankToDelete = config.name || "Bank";
    const newConfigs = configs.filter((_, i) => i !== currentConfigIndex);
    const newIndex = Math.max(0, currentConfigIndex - 1);

    saveConfigsToStorage(newConfigs, newIndex);
    setCurrentConfigIndex(newIndex);
    setDeleteConfirmOpen(false);
    toast.success(`Deleted configuration "${bankToDelete}"`);
  };

  const handleResetDefaults = () => {
    if (resetOption === "all") {
      const defaultConfigs = [JSON.parse(JSON.stringify(DEFAULT_CONFIG))];
      saveConfigsToStorage(defaultConfigs, 0);
      setCurrentConfigIndex(0);
      toast.success("All bank configurations reset to CTS 2010 defaults!");
    } else {
      const currentName = config.name || "Indian Standard (CTS 2010)";
      const resetSingleConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      resetSingleConfig.name = currentName;

      const newConfigs = JSON.parse(JSON.stringify(configs));
      newConfigs[currentConfigIndex] = resetSingleConfig;

      saveConfigsToStorage(newConfigs, currentConfigIndex);
      toast.success(`Reset "${currentName}" coordinates to CTS 2010 defaults!`);
    }
    setResetConfirmOpen(false);
  };

  const updateConfigValue = (key: string, val: any) => {
    const newConfigs = JSON.parse(JSON.stringify(configs));
    if (!newConfigs[currentConfigIndex]) return;
    newConfigs[currentConfigIndex][key] = val;
    saveConfigsToStorage(newConfigs);
  };

  const updateFieldPos = (field: string, axis: string, val: number) => {
    const newConfigs = JSON.parse(JSON.stringify(configs));
    if (!newConfigs[currentConfigIndex]?.fields?.[field]) return;
    newConfigs[currentConfigIndex].fields[field][axis] = val;
    saveConfigsToStorage(newConfigs);
  };

  const handleNudge = (axis: "top" | "left", delta: number) => {
    if (!selectedField || !config.fields?.[selectedField]) return;
    const currentVal = config.fields[selectedField][axis];
    updateFieldPos(
      selectedField,
      axis,
      Math.round((currentVal + delta) * 10) / 10,
    );
  };

  const displayDate = formatToDDMMYYYY(date);
  const { line1: amountWordsLine1, line2: amountWordsLine2 } =
    getAmountInWordsLines(amount);

  return (
    <Box sx={{ width: "100%" }}>
      {/* Secondary Bank Toolbar Bar */}
      <Paper
        elevation={0}
        sx={{
          px: 3,
          py: 1.5,
          mb: 2.5,
          bgcolor: "background.paper",
          borderRadius: "16px",
          border: `1px solid ${theme.palette.divider}`,
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Typography variant="body2" fontWeight={700} color="text.secondary">
            Active Bank Profile:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 220, bgcolor: "background.paper" }}>
            <Select
              value={currentConfigIndex}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setCurrentConfigIndex(idx);
                localStorage.setItem("check_print_last_idx", idx.toString());
              }}
              sx={{ borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem" }}
            >
              {configs.map((c, i) => (
                <MenuItem key={i} value={i} sx={{ fontWeight: 600 }}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Add Bank Button */}
          <Button
            variant="contained"
            color="secondary"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={() => {
              setNewBankName("");
              setAddBankModalOpen(true);
            }}
            sx={{ fontWeight: 700, borderRadius: "8px", textTransform: "none", px: 2 }}
          >
            Add New Bank
          </Button>

          {/* Delete Bank Button */}
          <Button
            variant="outlined"
            color="error"
            size="small"
            disabled={configs.length <= 1}
            startIcon={<Trash2 size={16} />}
            onClick={() => setDeleteConfirmOpen(true)}
            sx={{ fontWeight: 700, borderRadius: "8px", textTransform: "none" }}
          >
            Delete Profile
          </Button>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center">
          {/* Gridlines View Toggle */}
          <Button
            variant={showGridlines ? "contained" : "outlined"}
            color={showGridlines ? "primary" : "inherit"}
            size="small"
            startIcon={<Grid size={16} />}
            onClick={toggleGridlines}
            sx={{
              fontWeight: 700,
              borderRadius: "8px",
              textTransform: "none",
              px: 2,
              borderColor: showGridlines ? "transparent" : theme.palette.divider,
            }}
          >
            Gridlines: {showGridlines ? "ON" : "OFF"}
          </Button>

          {/* Reset to Default Button */}
          <Button
            variant="outlined"
            color="warning"
            size="small"
            startIcon={<RotateCcw size={16} />}
            onClick={() => setResetConfirmOpen(true)}
            sx={{ fontWeight: 700, borderRadius: "8px", textTransform: "none", px: 2 }}
          >
            Reset to Default
          </Button>

          {/* Render CTA buttons here if inside a Modal */}
          {isModal && (
            <>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<Save size={16} />}
                onClick={handleSaveAllConfig}
                sx={{ fontWeight: 700, borderRadius: "8px", textTransform: "none", px: 2.5 }}
              >
                Save Configurations
              </Button>

              <Button
                onClick={handlePrint}
                variant="contained"
                color="primary"
                startIcon={<Printer size={18} />}
                size="medium"
                sx={{
                  px: 3,
                  borderRadius: "8px",
                  fontWeight: 800,
                  textTransform: "none",
                }}
              >
                Generate & Print Cheque
              </Button>
            </>
          )}
        </Stack>
      </Paper>

      {/* Main Grid Panels */}
      <Box sx={{ display: "flex", gap: 3, flexWrap: { xs: "wrap", md: "nowrap" } }}>
        {/* Left Panel: Inputs & Calibration */}
        <Box
          sx={{
            width: { xs: "100%", md: "380px" },
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
            flexShrink: 0,
          }}
        >
          <Paper
            elevation={0}
            sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={800}
              mb={2}
              color="primary"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              Transaction Details
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Payee Name"
                fullWidth
                size="small"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                placeholder="e.g. M/s ABC Enterprises"
              />
              <TextField
                label="Amount (₹)"
                type="number"
                fullWidth
                size="small"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              <TextField
                label="Issue Date"
                type="date"
                fullWidth
                size="small"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={800}
              mb={2}
              color="primary"
            >
              Dimensions & Calibration
            </Typography>
            <Stack direction="row" spacing={2} mb={3}>
              <TextField
                label="Width (mm)"
                type="number"
                size="small"
                value={config.width}
                onChange={(e) =>
                  updateConfigValue("width", Number(e.target.value))
                }
              />
              <TextField
                label="Height (mm)"
                type="number"
                size="small"
                value={config.height}
                onChange={(e) =>
                  updateConfigValue("height", Number(e.target.value))
                }
              />
            </Stack>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Select Field to Calibrate</InputLabel>
              <Select
                label="Select Field to Calibrate"
                value={selectedField || ""}
                onChange={(e) => setSelectedField(e.target.value)}
              >
                {Object.keys(config.fields || {}).map((f) => (
                  <MenuItem key={f} value={f}>
                    {f.replace(/([A-Z])/g, " $1").toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedField && config.fields[selectedField] && (
              <Box sx={{ p: 2, bgcolor: "#f1f5f9", borderRadius: 2 }}>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{ display: "block", mb: 2 }}
                >
                  NUDGE CONTROLS (0.1mm increments)
                </Typography>
                <Stack
                  direction="row"
                  justifyContent="center"
                  spacing={1}
                  mb={1.5}
                >
                  <IconButton
                    size="small"
                    onClick={() => handleNudge("top", -0.1)}
                    sx={{
                      bgcolor: "background.paper",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    <ArrowUp size={16} />
                  </IconButton>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="center"
                  spacing={1.5}
                  mb={1.5}
                >
                  <IconButton
                    size="small"
                    onClick={() => handleNudge("left", -0.1)}
                    sx={{
                      bgcolor: "background.paper",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    <ArrowLeft size={16} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleNudge("left", 0.1)}
                    sx={{
                      bgcolor: "background.paper",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    <ArrowRight size={16} />
                  </IconButton>
                </Stack>
                <Stack direction="row" justifyContent="center" spacing={1}>
                  <IconButton
                    size="small"
                    onClick={() => handleNudge("top", 0.1)}
                    sx={{
                      bgcolor: "background.paper",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    <ArrowDown size={16} />
                  </IconButton>
                </Stack>

                <Stack direction="row" spacing={2} mt={2.5}>
                  <TextField
                    label="Top (mm)"
                    type="number"
                    size="small"
                    value={config.fields[selectedField].top}
                    onChange={(e) =>
                      updateFieldPos(
                        selectedField,
                        "top",
                        Number(e.target.value),
                      )
                    }
                  />
                  <TextField
                    label="Left (mm)"
                    type="number"
                    size="small"
                    value={config.fields[selectedField].left}
                    onChange={(e) =>
                      updateFieldPos(
                        selectedField,
                        "left",
                        Number(e.target.value),
                      )
                    }
                  />
                </Stack>

                {selectedField === "date" && (
                  <Box mt={2}>
                    <Typography variant="caption" fontWeight={700}>
                      Date Box Spacing (mm)
                    </Typography>
                    <Slider
                      value={config.fields.date.spacing || 4.2}
                      min={3}
                      max={6}
                      step={0.1}
                      onChange={(_, val) =>
                        updateFieldPos("date", "spacing", val as number)
                      }
                    />
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Box>

        {/* Right Panel: Live Preview */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2.5, minWidth: 0 }}>
          <Paper
            sx={{
              p: 2,
              bgcolor: "background.paper",
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              flex: 1,
              minHeight: 460,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box sx={{ position: "absolute", top: 16, left: 16, right: 16, zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography
                variant="caption"
                sx={{
                  bgcolor: "primary.main",
                  color: "white",
                  px: 1.5,
                  py: 0.6,
                  borderRadius: 1,
                  fontWeight: 700,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                LIVE CHEQUE CANVAS PREVIEW ({config.width}x{config.height}mm)
              </Typography>

              <Chip
                icon={<Grid size={13} />}
                label={showGridlines ? "Gridlines ON" : "Gridlines OFF"}
                size="small"
                onClick={toggleGridlines}
                color={showGridlines ? "primary" : "default"}
                variant={showGridlines ? "filled" : "outlined"}
                sx={{
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                  bgcolor: showGridlines ? undefined : "background.paper",
                }}
              />
            </Box>

            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 3,
                pt: 6,
              }}
            >
              <Box
                sx={{
                  width: `${config.width}mm`,
                  height: `${config.height}mm`,
                  border: "1px solid #94a3b8",
                  position: "relative",
                  bgcolor: "background.paper",
                  boxShadow:
                    "0 12px 30px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                  backgroundImage:
                    "url('https://bankingspirits.com/wp-content/uploads/2021/04/CTS-2010-Standard-Cheque-format.jpg')",
                  backgroundSize: "cover",
                  opacity: 0.95,
                  transform: "scale(1.15)",
                  transition: "all 0.2s ease-out",
                }}
              >
                {/* Millimeter Gridline Overlay */}
                {showGridlines && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      pointerEvents: "none",
                      zIndex: 5,
                      backgroundImage: `
                        linear-gradient(to right, rgba(37, 99, 235, 0.3) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(37, 99, 235, 0.3) 1px, transparent 1px),
                        linear-gradient(to right, rgba(148, 163, 184, 0.25) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(148, 163, 184, 0.25) 1px, transparent 1px)
                      `,
                      backgroundSize: "10mm 10mm, 10mm 10mm, 2mm 2mm, 2mm 2mm",
                    }}
                  >
                    {/* Top Ruler Markers (Horizontal mm) */}
                    {Array.from({ length: Math.floor(config.width / 20) + 1 }).map((_, i) => {
                      const pos = i * 20;
                      if (pos > config.width) return null;
                      return (
                        <Box
                          key={`x-${pos}`}
                          sx={{
                            position: "absolute",
                            top: 1,
                            left: `${pos}mm`,
                            fontSize: "7.5px",
                            fontWeight: 800,
                            color: "#1e40af",
                            lineHeight: 1,
                            transform: pos === 0 ? "none" : "translateX(-50%)",
                            bgcolor: "rgba(255, 255, 255, 0.9)",
                            px: 0.3,
                            borderRadius: "2px",
                            border: "1px solid rgba(37, 99, 235, 0.3)",
                          }}
                        >
                          {pos}mm
                        </Box>
                      );
                    })}
                    {/* Left Ruler Markers (Vertical mm) */}
                    {Array.from({ length: Math.floor(config.height / 20) + 1 }).map((_, i) => {
                      const pos = i * 20;
                      if (pos === 0 || pos > config.height) return null;
                      return (
                        <Box
                          key={`y-${pos}`}
                          sx={{
                            position: "absolute",
                            left: 1,
                            top: `${pos}mm`,
                            fontSize: "7.5px",
                            fontWeight: 800,
                            color: "#1e40af",
                            lineHeight: 1,
                            transform: "translateY(-50%)",
                            bgcolor: "rgba(255, 255, 255, 0.9)",
                            px: 0.3,
                            borderRadius: "2px",
                            border: "1px solid rgba(37, 99, 235, 0.3)",
                          }}
                        >
                          {pos}mm
                        </Box>
                      );
                    })}
                  </Box>
                )}
                {/* Field Overlay - Date */}
                <Box
                  sx={{
                    position: "absolute",
                    top: `${config.fields.date.top}mm`,
                    left: `${config.fields.date.left}mm`,
                    fontWeight: "bold",
                    fontSize: "16px",
                    display: "flex",
                    border:
                      selectedField === "date" ? "1.5px dashed #2563eb" : "none",
                    bgcolor:
                      selectedField === "date"
                        ? "rgba(37, 99, 235, 0.12)"
                        : "transparent",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedField("date")}
                >
                  {displayDate.split("").map((char, i) => (
                    <span
                      key={i}
                      style={{
                        width: `${config.fields.date.spacing || 4.2}mm`,
                        textAlign: "center",
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </Box>

                {/* Field Overlay - Payee */}
                <Box
                  sx={{
                    position: "absolute",
                    top: `${config.fields.payee.top}mm`,
                    left: `${config.fields.payee.left}mm`,
                    fontWeight: "bold",
                    fontSize: "17px",
                    color: "#1e293b",
                    border:
                      selectedField === "payee" ? "1.5px dashed #2563eb" : "none",
                    bgcolor:
                      selectedField === "payee"
                        ? "rgba(37, 99, 235, 0.12)"
                        : "transparent",
                    cursor: "pointer",
                    px: 0.5,
                  }}
                  onClick={() => setSelectedField("payee")}
                >
                  {payee || "PAYEE NAME HERE"}
                </Box>

                {/* Field Overlay - Amount Words Line 1 */}
                <Box
                  sx={{
                    position: "absolute",
                    top: `${config.fields.wordsLine1.top}mm`,
                    left: `${config.fields.wordsLine1.left}mm`,
                    fontSize: "14px",
                    fontStyle: "italic",
                    fontWeight: 600,
                    color: "#334155",
                    border:
                      selectedField === "wordsLine1"
                        ? "1.5px dashed #2563eb"
                        : "none",
                    bgcolor:
                      selectedField === "wordsLine1"
                        ? "rgba(37, 99, 235, 0.12)"
                        : "transparent",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedField("wordsLine1")}
                >
                  {amountWordsLine1 || "Rupees Zero Only"}
                </Box>

                {/* Field Overlay - Amount Words Line 2 */}
                <Box
                  sx={{
                    position: "absolute",
                    top: `${config.fields.wordsLine2.top}mm`,
                    left: `${config.fields.wordsLine2.left}mm`,
                    fontSize: "14px",
                    fontStyle: "italic",
                    fontWeight: 600,
                    color: "#334155",
                    border:
                      selectedField === "wordsLine2"
                        ? "1.5px dashed #2563eb"
                        : "none",
                    bgcolor:
                      selectedField === "wordsLine2"
                        ? "rgba(37, 99, 235, 0.12)"
                        : "transparent",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedField("wordsLine2")}
                >
                  {amountWordsLine2}
                </Box>

                {/* Field Overlay - Amount Figure */}
                <Box
                  sx={{
                    position: "absolute",
                    top: `${config.fields.amount.top}mm`,
                    left: `${config.fields.amount.left}mm`,
                    fontWeight: "bold",
                    fontSize: "20px",
                    color: "#1e293b",
                    border:
                      selectedField === "amount"
                        ? "1.5px dashed #2563eb"
                        : "none",
                    bgcolor:
                      selectedField === "amount"
                        ? "rgba(37, 99, 235, 0.12)"
                        : "transparent",
                    cursor: "pointer",
                    px: 1,
                  }}
                  onClick={() => setSelectedField("amount")}
                >
                  ₹ {amount.toLocaleString("en-IN")}/-
                </Box>
              </Box>
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: 3,
            }}
          >
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <Info size={16} color="#d97706" />
              <Typography variant="caption" fontWeight={800} color="#92400e">
                PRINTER CALIBRATION TIP
              </Typography>
            </Box>
            <Typography variant="body2" color="#92400e" fontSize="11px">
              Standard Indian CTS 2010 cheques are <b>203mm x 93mm</b>. Always align the{" "}
              <b>D D M M Y Y Y Y</b> side first in the printer tray. If print is off by 1mm, use the nudge arrow controls on the left panel to fine-tune coordinates.
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* --- ADD NEW BANK CONFIGURATION MODAL --- */}
      <Dialog
        open={addBankModalOpen}
        onClose={() => setAddBankModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "primary.main",
            color: "white",
            py: 1.5,
            px: 2.5,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Building2 size={20} color="white" />
            <Typography variant="subtitle1" fontWeight={700}>
              Create New Bank Config
            </Typography>
          </Box>
          <IconButton onClick={() => setAddBankModalOpen(false)} size="small" sx={{ color: "white" }}>
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5 }}>
          <Stack spacing={2.5} mt={1}>
            <TextField
              label="Bank Profile Name"
              fullWidth
              size="small"
              autoFocus
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
              placeholder="e.g. HDFC Bank, SBI, ICICI"
            />

            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: "block" }}>
                Quick Suggestions:
              </Typography>
              <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                {SUGGESTED_BANKS.map((b) => (
                  <Chip
                    key={b}
                    label={b}
                    size="small"
                    clickable
                    onClick={() => setNewBankName(b)}
                    color={newBankName === b ? "primary" : "default"}
                    variant={newBankName === b ? "filled" : "outlined"}
                    sx={{ fontWeight: 600, fontSize: "0.72rem" }}
                  />
                ))}
              </Stack>
            </Box>

            <Divider light />

            <FormControl fullWidth size="small">
              <InputLabel>Base Template Coordinates</InputLabel>
              <Select
                label="Base Template Coordinates"
                value={newBankBaseTemplate}
                onChange={(e) => setNewBankBaseTemplate(e.target.value as any)}
              >
                <MenuItem value="current">
                  Copy from current selected bank ({config.name})
                </MenuItem>
                <MenuItem value="default">
                  Default CTS 2010 Standard Template
                </MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, px: 2.5, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button onClick={() => setAddBankModalOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateBankConfig}
            variant="contained"
            color="primary"
            startIcon={<Check size={18} />}
            sx={{ fontWeight: 700, px: 2.5 }}
          >
            Create Bank Profile
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "error.main" }}>
          Delete Bank Profile?
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Are you sure you want to delete the configuration profile for{" "}
            <strong>"{config.name}"</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteBankConfig}
            variant="contained"
            color="error"
            startIcon={<Trash2 size={16} />}
            sx={{ fontWeight: 700 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- RESET TO DEFAULT CONFIRMATION MODAL --- */}
      <Dialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "warning.main",
            color: "warning.contrastText",
            py: 1.5,
            px: 2.5,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <RotateCcw size={20} />
            <Typography variant="subtitle1" fontWeight={700}>
              Reset Cheque Coordinates
            </Typography>
          </Box>
          <IconButton onClick={() => setResetConfirmOpen(false)} size="small" sx={{ color: "inherit" }}>
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5 }}>
          <Stack spacing={2} mt={1}>
            <Typography variant="body2" fontWeight={600}>
              Choose reset scope for Cheque Calibration:
            </Typography>

            <FormControl fullWidth size="small">
              <Select
                value={resetOption}
                onChange={(e) => setResetOption(e.target.value as any)}
                sx={{ borderRadius: "8px", fontWeight: 700 }}
              >
                <MenuItem value="current">
                  Reset active profile only ("{config.name}")
                </MenuItem>
                <MenuItem value="all">
                  Reset all bank profiles to CTS 2010 factory defaults
                </MenuItem>
              </Select>
            </FormControl>

            <Typography variant="caption" color="text.secondary">
              This will restore standard CTS 2010 cheque dimensions (203mm x 93mm) and default field coordinates for date, payee, amount words, and amount figure.
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, px: 2.5, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button onClick={() => setResetConfirmOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleResetDefaults}
            variant="contained"
            color="warning"
            startIcon={<RotateCcw size={16} />}
            sx={{ fontWeight: 700, px: 2.5 }}
          >
            Confirm Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
