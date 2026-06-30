"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Stack,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Slider,
} from "@mui/material";
import {
  Printer,
  Move,
  RotateCcw,
  Info,
  Maximize2,
  ChevronRight,
  ChevronDown,
  Save,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";

// Indian Standard Defaults (mm) based on CTS 2010
const DEFAULT_CONFIG = {
  name: "Indian Standard (CTS 2010)",
  width: 203,
  height: 93,
  fields: {
    date: { top: 8, left: 152, spacing: 4.2 }, // Adjusted for standard D D M M Y Y Y Y boxes
    payee: { top: 20, left: 25 },
    wordsLine1: { top: 29, left: 35 },
    wordsLine2: { top: 38, left: 15 },
    amount: { top: 42, left: 155 },
  }
};

interface CheckPrintModalProps {
  open: boolean;
  onClose: () => void;
  initialData?: {
    payee?: string;
    amount?: number;
    date?: string;
  };
}

export default function CheckPrintModal({
  open,
  onClose,
  initialData,
}: CheckPrintModalProps) {
  const [payee, setPayee] = useState(initialData?.payee || "");
  const [amount, setAmount] = useState(initialData?.amount || 0);
  const [date, setDate] = useState(
    initialData?.date || new Date().toISOString().split("T")[0]
  );
  
  const [configs, setConfigs] = useState<any[]>([]);
  const [currentConfigIndex, setCurrentConfigIndex] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);

  // Load cached configs
  useEffect(() => {
    const saved = localStorage.getItem("check_print_configs");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfigs(parsed);
        const lastIdx = localStorage.getItem("check_print_last_idx");
        if (lastIdx !== null) setCurrentConfigIndex(Number(lastIdx));
      } catch (e) {
        setConfigs([DEFAULT_CONFIG]);
      }
    } else {
      setConfigs([DEFAULT_CONFIG]);
    }
  }, []);

  // Sync initial data
  useEffect(() => {
    if (open && initialData) {
      setPayee(initialData.payee || "");
      setAmount(initialData.amount || 0);
      if (initialData.date) setDate(initialData.date);
    }
  }, [open, initialData]);

  const config = configs[currentConfigIndex] || DEFAULT_CONFIG;

  const saveConfigs = (newConfigs: any[]) => {
    setConfigs(newConfigs);
    localStorage.setItem("check_print_configs", JSON.stringify(newConfigs));
  };

  const handleSaveConfig = () => {
    localStorage.setItem("check_print_configs", JSON.stringify(configs));
    localStorage.setItem("check_print_last_idx", currentConfigIndex.toString());
    toast.success("All configurations saved successfully!");
  };

  const handleAddNewConfig = () => {
    const name = prompt("Enter bank name (e.g. HDFC, ICICI, SBI):");
    if (!name) return;
    const newConfigs = [...configs, { ...config, name }];
    saveConfigs(newConfigs);
    setCurrentConfigIndex(newConfigs.length - 1);
  };

  const handleDeleteConfig = () => {
    if (configs.length <= 1) return;
    if (!confirm(`Delete "${config.name}" configuration?`)) return;
    const newConfigs = configs.filter((_, i) => i !== currentConfigIndex);
    saveConfigs(newConfigs);
    setCurrentConfigIndex(0);
  };

  const updateConfigValue = (key: string, val: any) => {
    const newConfigs = [...configs];
    newConfigs[currentConfigIndex] = { ...newConfigs[currentConfigIndex], [key]: val };
    saveConfigs(newConfigs);
  };

  const updateFieldPos = (field: string, axis: string, val: number) => {
    const newConfigs = [...configs];
    const fields = { ...newConfigs[currentConfigIndex].fields };
    fields[field] = { ...fields[field], [axis]: val };
    newConfigs[currentConfigIndex] = { ...newConfigs[currentConfigIndex], fields };
    saveConfigs(newConfigs);
  };

  const handleNudge = (axis: 'top' | 'left', delta: number) => {
    if (!selectedField) return;
    const currentVal = config.fields[selectedField][axis];
    updateFieldPos(selectedField, axis, Math.round((currentVal + delta) * 10) / 10);
  };

  const handlePrint = async () => {
    if (!window.electron) {
      toast.error("Desktop App required for printing");
      return;
    }

    const toastId = toast.loading("Sending to printer...");
    try {
      const res = await window.electron.ipcRenderer.invoke("print-check", {
        payee,
        amount,
        date: date.replace(/-/g, ""),
        config: {
          ...config.fields,
          width: config.width,
          height: config.height,
        },
      });

      if (res.success) {
        toast.success("Printed successfully", { id: toastId });
        onClose();
      } else {
        toast.error("Error: " + res.error, { id: toastId });
      }
    } catch (e) {
      toast.error("Connection failed", { id: toastId });
    }
  };

  // Format date for display in boxes: D D M M Y Y Y Y
  const rawDateStr = date.replace(/-/g, ""); // YYYYMMDD
  const displayDate = rawDateStr.length === 8 
    ? rawDateStr.substring(6, 8) + rawDateStr.substring(4, 6) + rawDateStr.substring(0, 4)
    : "";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        background: "linear-gradient(45deg, #1e293b 30%, #334155 90%)",
        color: "white",
        p: 2
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Printer size={24} />
          <Typography variant="h6" fontWeight={700}>Cheque Master Pro</Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 180, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 1 }}>
            <Select
              value={currentConfigIndex}
              onChange={(e) => setCurrentConfigIndex(Number(e.target.value))}
              sx={{ color: "white", ".MuiOutlinedInput-notchedOutline": { border: "none" } }}
            >
              {configs.map((c, i) => (
                <MenuItem key={i} value={i}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title="Add Bank">
            <IconButton onClick={handleAddNewConfig} sx={{ color: "white", bgcolor: "rgba(255,255,255,0.1)" }}>
              <Plus size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Bank">
            <IconButton onClick={handleDeleteConfig} sx={{ color: "#fca5a5", bgcolor: "rgba(255,255,255,0.1)" }}>
              <Trash2 size={20} />
            </IconButton>
          </Tooltip>
          <Button 
            variant="contained" 
            startIcon={<Save size={18} />} 
            onClick={handleSaveConfig}
            sx={{ bgcolor: "#10b981", '&:hover': { bgcolor: "#059669" } }}
          >
            Save All
          </Button>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: "#f8fafc", display: "flex", gap: 3, p: 3 }}>
        {/* Left Panel: Inputs & Calibration */}
        <Box sx={{ width: "380px", display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e2e8f0" }}>
            <Typography variant="subtitle2" fontWeight={800} mb={2} color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
               Transaction Details
            </Typography>
            <Stack spacing={2}>
              <TextField label="Payee Name" fullWidth size="small" value={payee} onChange={(e) => setPayee(e.target.value)} variant="filled" />
              <TextField label="Amount (₹)" type="number" fullWidth size="small" value={amount} onChange={(e) => setAmount(Number(e.target.value))} variant="filled" />
              <TextField label="Issue Date" type="date" fullWidth size="small" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} variant="filled" />
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e2e8f0" }}>
            <Typography variant="subtitle2" fontWeight={800} mb={2} color="primary">
               Dimensions & Calibration
            </Typography>
            <Stack direction="row" spacing={2} mb={3}>
              <TextField label="Width (mm)" type="number" size="small" value={config.width} onChange={(e) => updateConfigValue("width", Number(e.target.value))} />
              <TextField label="Height (mm)" type="number" size="small" value={config.height} onChange={(e) => updateConfigValue("height", Number(e.target.value))} />
            </Stack>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Select Field to Adjust</InputLabel>
              <Select 
                label="Select Field to Adjust"
                value={selectedField || ""} 
                onChange={(e) => setSelectedField(e.target.value)}
              >
                {Object.keys(config.fields).map(f => (
                  <MenuItem key={f} value={f}>{f.replace(/([A-Z])/g, ' $1').toUpperCase()}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedField && (
              <Box sx={{ p: 2, bgcolor: "#f1f5f9", borderRadius: 2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  NUDGE CONTROLS (0.1mm increments)
                </Typography>
                <Stack direction="row" justifyContent="center" spacing={1} mb={2}>
                  <IconButton size="small" onClick={() => handleNudge('top', -0.1)} sx={{ bgcolor: 'background.paper', border: "1px solid #cbd5e1" }}><ArrowUp size={16} /></IconButton>
                </Stack>
                <Stack direction="row" justifyContent="center" spacing={1} mb={2}>
                  <IconButton size="small" onClick={() => handleNudge('left', -0.1)} sx={{ bgcolor: 'background.paper', border: "1px solid #cbd5e1" }}><ArrowLeft size={16} /></IconButton>
                  <IconButton size="small" onClick={() => handleNudge('left', 0.1)} sx={{ bgcolor: 'background.paper', border: "1px solid #cbd5e1" }}><ArrowRight size={16} /></IconButton>
                </Stack>
                <Stack direction="row" justifyContent="center" spacing={1}>
                  <IconButton size="small" onClick={() => handleNudge('top', 0.1)} sx={{ bgcolor: 'background.paper', border: "1px solid #cbd5e1" }}><ArrowDown size={16} /></IconButton>
                </Stack>
                <Stack direction="row" spacing={2} mt={3}>
                  <TextField label="Top" type="number" size="small" value={config.fields[selectedField].top} onChange={(e) => updateFieldPos(selectedField, "top", Number(e.target.value))} />
                  <TextField label="Left" type="number" size="small" value={config.fields[selectedField].left} onChange={(e) => updateFieldPos(selectedField, "left", Number(e.target.value))} />
                </Stack>
                {selectedField === 'date' && (
                   <Box mt={2}>
                     <Typography variant="caption" fontWeight={700}>Box Spacing</Typography>
                     <Slider 
                       value={config.fields.date.spacing} 
                       min={3} max={6} step={0.1}
                       onChange={(_, val) => updateFieldPos('date', 'spacing', val as number)}
                     />
                   </Box>
                )}
              </Box>
            )}
          </Paper>
        </Box>

        {/* Right Panel: Live Preview */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
           <Paper sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 3, border: "1px solid #e2e8f0", flex: 1, position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
                <Typography variant="caption" sx={{ bgcolor: "#1e293b", color: "white", px: 1, py: 0.5, borderRadius: 1, fontWeight: 700 }}>
                  LIVE CANVAS PREVIEW ({config.width}x{config.height}mm)
                </Typography>
              </Box>

              <Box sx={{ 
                width: "100%", 
                height: "100%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                p: 2
              }}>
                <Box sx={{ 
                  width: `${config.width}mm`, 
                  height: `${config.height}mm`, 
                  border: "1px solid #94a3b8", 
                  position: "relative",
                  bgcolor: 'background.paper',
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                  backgroundImage: "url('https://bankingspirits.com/wp-content/uploads/2021/04/CTS-2010-Standard-Cheque-format.jpg')",
                  backgroundSize: "cover",
                  backgroundAlpha: 0.05,
                  opacity: 0.95,
                  transform: 'scale(1.2)', // Zoom for visibility
                  transition: 'all 0.2s ease-out'
                }}>
                  {/* Field Overlay - Date */}
                  <Box sx={{ 
                    position: "absolute", 
                    top: `${config.fields.date.top}mm`, 
                    left: `${config.fields.date.left}mm`, 
                    fontWeight: "bold", 
                    fontSize: "16px",
                    display: 'flex',
                    border: selectedField === 'date' ? '1px dashed #3b82f6' : 'none',
                    bgcolor: selectedField === 'date' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    cursor: 'pointer'
                  }} onClick={() => setSelectedField('date')}>
                    {displayDate.split("").map((char, i) => (
                      <span key={i} style={{ width: `${config.fields.date.spacing}mm`, textAlign: 'center' }}>{char}</span>
                    ))}
                  </Box>

                  {/* Field Overlay - Payee */}
                  <Box sx={{ 
                    position: "absolute", 
                    top: `${config.fields.payee.top}mm`, 
                    left: `${config.fields.payee.left}mm`, 
                    fontWeight: "bold", 
                    fontSize: "17px",
                    color: "#1e293b",
                    border: selectedField === 'payee' ? '1px dashed #3b82f6' : 'none',
                    bgcolor: selectedField === 'payee' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    cursor: 'pointer',
                    px: 0.5
                  }} onClick={() => setSelectedField('payee')}>
                    {payee || "PAYEE NAME"}
                  </Box>

                  {/* Field Overlay - Amount Words */}
                  <Box sx={{ 
                    position: "absolute", 
                    top: `${config.fields.wordsLine1.top}mm`, 
                    left: `${config.fields.wordsLine1.left}mm`, 
                    fontSize: "14px", 
                    fontStyle: "italic",
                    color: "#475569",
                    border: selectedField === 'wordsLine1' ? '1px dashed #3b82f6' : 'none',
                    bgcolor: selectedField === 'wordsLine1' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    cursor: 'pointer'
                  }} onClick={() => setSelectedField('wordsLine1')}>
                    (Rupees Three Lakh Forty Thousand Only)
                  </Box>

                  {/* Field Overlay - Amount Figure */}
                  <Box sx={{ 
                    position: "absolute", 
                    top: `${config.fields.amount.top}mm`, 
                    left: `${config.fields.amount.left}mm`, 
                    fontWeight: "bold", 
                    fontSize: "20px",
                    color: "#1e293b",
                    border: selectedField === 'amount' ? '1px dashed #3b82f6' : 'none',
                    bgcolor: selectedField === 'amount' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    cursor: 'pointer',
                    px: 1
                  }} onClick={() => setSelectedField('amount')}>
                    ₹ {amount.toLocaleString("en-IN")}/-
                  </Box>

                  {/* Visual Center Crosshair */}
                  <Box sx={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', borderTop: '1px dotted #ccc', opacity: 0.5 }} />
                  <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '1px', borderLeft: '1px dotted #ccc', opacity: 0.5 }} />
                </Box>
              </Box>
           </Paper>

           <Paper elevation={0} sx={{ p: 2, bgcolor: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 3 }}>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Info size={16} color="#d97706" />
                <Typography variant="caption" fontWeight={800} color="#92400e">PRINTER CALIBRATION TIP</Typography>
              </Box>
              <Typography variant="body2" color="#92400e" fontSize="11px">
                Standard Indian cheques are <b>203mm x 93mm</b>. Always align the <b>D D M M Y Y Y Y</b> side first in the printer tray. If the print is off by 1mm, use the nudge controls to fine-tune.
              </Typography>
           </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, bgcolor: 'background.paper', gap: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">Close Utility</Button>
        <Button 
          onClick={handlePrint} 
          variant="contained" 
          startIcon={<Printer />} 
          size="large"
          sx={{ 
            px: 4, 
            py: 1.5, 
            borderRadius: 2, 
            fontWeight: 800,
            background: "linear-gradient(45deg, #2563eb 30%, #3b82f6 90%)",
            boxShadow: "0 4px 14px 0 rgba(59, 130, 246, 0.39)"
          }}
        >
          GENERATE & PRINT
        </Button>
      </DialogActions>
    </Dialog>
  );
}
