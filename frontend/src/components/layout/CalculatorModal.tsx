"use client";

import { useState, useEffect, useCallback } from "react";
import {
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Stack,
  Paper,
  alpha,
  useTheme,
  Tabs,
  Tab,
  List,
  ListItem,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { Calculator as CalcIcon, X, Delete, Equal, Trash2 } from "lucide-react";

interface HistoryItem {
  expression: string;
  result: string;
  timestamp: number;
}

export default function GlobalCalculator() {
  const theme = useTheme();

  // UI States
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Math States
  const [display, setDisplay] = useState("0");
  const [equation, setEquation] = useState("");
  const [shouldReset, setShouldReset] = useState(false);

  // Memory & History
  const [memory, setMemory] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Open via Global Event
  useEffect(() => {
    const handleOpenRequest = () => setOpen(true);
    window.addEventListener("open-kosh-calc", handleOpenRequest);
    return () =>
      window.removeEventListener("open-kosh-calc", handleOpenRequest);
  }, []);

  // Load/Save History
  useEffect(() => {
    const saved = localStorage.getItem("kosh_calc_history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "kosh_calc_history",
      JSON.stringify(history.slice(0, 50)),
    );
  }, [history]);

  const handleClose = () => setOpen(false);

  // --- Core Calculation Logic ---
  const evaluateInternal = (expr: string) => {
    try {
      const clean = expr.replace(/×/g, "*").replace(/÷/g, "/");
      // eslint-disable-next-line no-eval
      const res = eval(clean);
      return Math.round((res + Number.EPSILON) * 10000) / 10000;
    } catch {
      return null;
    }
  };

  const handleClear = useCallback(() => {
    setDisplay("0");
    setEquation("");
    setShouldReset(false);
  }, []);

  const handleBackspace = useCallback(() => {
    setDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
  }, []);

  const handleNumber = useCallback(
    (num: string) => {
      setDisplay((prev) => {
        // Logic: If we just pressed M+, M-, or Equals, the next number clears the screen
        if (shouldReset) {
          setShouldReset(false);
          return num;
        }
        if (num === "." && prev.includes(".")) return prev;
        return prev === "0" && num !== "." ? num : prev + num;
      });
    },
    [shouldReset],
  );

  const handleOperator = useCallback(
    (op: string) => {
      // If I have a result on screen, use it as the base for next expression
      setEquation(
        (prev) => (shouldReset ? display : prev + display) + " " + op + " ",
      );
      setDisplay("0");
      setShouldReset(false);
    },
    [display, shouldReset],
  );

  const calculate = useCallback(() => {
    if (!equation) return;
    const fullExpr = equation + display;
    const result = evaluateInternal(fullExpr);

    if (result !== null) {
      setHistory((prev) => [
        { expression: fullExpr, result: String(result), timestamp: Date.now() },
        ...prev,
      ]);
      setDisplay(String(result));
      setEquation("");
      setShouldReset(true);
    } else {
      setDisplay("Error");
    }
  }, [display, equation]);

  // --- Refined Memory Logic ---
  const handleMemoryAdd = () => {
    const fullExpr = equation + display;
    const currentVal = evaluateInternal(fullExpr) ?? parseFloat(display);

    setMemory((prev) => prev + currentVal);
    setDisplay(String(currentVal)); // Show the result of the expression added
    setEquation("");
    setShouldReset(true); // Crucial: Next input clears this result
  };

  const handleMemorySub = () => {
    const fullExpr = equation + display;
    const currentVal = evaluateInternal(fullExpr) ?? parseFloat(display);

    setMemory((prev) => prev - currentVal);
    setDisplay(String(currentVal));
    setEquation("");
    setShouldReset(true);
  };

  const handleMemoryRecall = () => {
    setDisplay(String(memory));
    setShouldReset(true);
  };

  const handleMemoryClear = () => {
    setMemory(0);
  };

  // Keyboard Support
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleNumber(e.key);
      else if (e.key === ".") handleNumber(".");
      else if (e.key === "+") handleOperator("+");
      else if (e.key === "-") handleOperator("-");
      else if (e.key === "*") handleOperator("×");
      else if (e.key === "/") {
        e.preventDefault();
        handleOperator("÷");
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        calculate();
      } else if (e.key === "Backspace") handleBackspace();
      else if (e.key === "Escape") handleClose();
      else if (e.key.toLowerCase() === "c") handleClear();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    open,
    handleNumber,
    handleOperator,
    calculate,
    handleBackspace,
    handleClear,
  ]);

  const CalcButton = ({ label, onClick, type = "num", xs = 3 }: any) => {
    const isEquals = type === "equals";
    const isOp = type === "op" || type === "mem";
    const isClear = type === "clear";

    return (
      <Grid item xs={xs}>
        <Button
          fullWidth
          onClick={onClick}
          sx={{
            height: 56,
            fontSize: type === "mem" ? "0.85rem" : "1.2rem",
            fontWeight: 800,
            borderRadius: "12px",
            color: isEquals
              ? "#fff"
              : isClear
                ? "#ef4444"
                : isOp
                  ? theme.palette.primary.main
                  : "#eee",
            backgroundColor: isEquals ? theme.palette.primary.main : "#222",
            border: "1px solid #333",
            "&:hover": {
              backgroundColor: isEquals ? theme.palette.primary.dark : "#333",
              borderColor: alpha(theme.palette.primary.main, 0.4), // Brighten border on hover
              filter: "brightness(1.2)", // Standard brightening effect
            },
            transition: "all 0.1s ease",
            textTransform: "none",
          }}
        >
          {label}
        </Button>
      </Grid>
    );
  };

  return (
    <>
      <Tooltip title="Calculator">
        <IconButton color="inherit" onClick={() => setOpen(true)}>
          <CalcIcon size={22} />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "24px",
            bgcolor: "#111",
            border: "1px solid #333",
            overflow: "hidden",
          },
        }}
      >
        <Box
          px={2.5}
          py={2}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          bgcolor="#1a1a1a"
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              p={0.8}
              bgcolor={alpha(theme.palette.primary.main, 0.1)}
              borderRadius={1.5}
            >
              <CalcIcon size={18} color={theme.palette.primary.main} />
            </Box>
            <Typography variant="subtitle2" fontWeight={900} color="#fff">
              QUICK CALC
            </Typography>
          </Stack>
          <IconButton onClick={handleClose} size="small" sx={{ color: "#555" }}>
            <X size={20} />
          </IconButton>
        </Box>

        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="fullWidth"
          sx={{
            bgcolor: "#1a1a1a",
            minHeight: 40,
            "& .MuiTab-root": { color: "#666", fontWeight: 800 },
            "& .Mui-selected": { color: "#fff !important" },
          }}
        >
          <Tab label="Calc" />
          <Tab label="History" />
        </Tabs>

        <DialogContent sx={{ p: 2, bgcolor: "#111" }}>
          {activeTab === 0 ? (
            <Box>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  mb: 2,
                  textAlign: "right",
                  bgcolor: "#000",
                  borderRadius: "16px",
                  border: "1px solid #222",
                  minHeight: 110,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.primary.main,
                    fontFamily: "monospace",
                    opacity: 0.8,
                    letterSpacing: 1,
                    minHeight: "1.2em",
                  }}
                >
                  {equation || "\u00A0"}
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    color: "#fff",
                    fontFamily: "monospace",
                    overflow: "hidden",
                  }}
                >
                  {display}
                </Typography>
                {memory !== 0 && (
                  <Typography
                    variant="caption"
                    sx={{ color: "warning.main", fontWeight: 900, mt: 0.5 }}
                  >
                    M = {memory}
                  </Typography>
                )}
              </Paper>

              <Grid container spacing={1.5}>
                {/* Memory Row */}
                <CalcButton label="MC" onClick={handleMemoryClear} type="mem" />
                <CalcButton
                  label="MR"
                  onClick={handleMemoryRecall}
                  type="mem"
                />
                <CalcButton label="M+" onClick={handleMemoryAdd} type="mem" />
                <CalcButton label="M-" onClick={handleMemorySub} type="mem" />

                <CalcButton label="C" onClick={handleClear} type="clear" />
                <CalcButton
                  label={<Delete size={20} />}
                  onClick={handleBackspace}
                  type="op"
                />
                <CalcButton
                  label="%"
                  onClick={() => setDisplay(String(parseFloat(display) / 100))}
                  type="op"
                />
                <CalcButton
                  label="÷"
                  onClick={() => handleOperator("/")}
                  type="op"
                />

                <CalcButton label="7" onClick={() => handleNumber("7")} />
                <CalcButton label="8" onClick={() => handleNumber("8")} />
                <CalcButton label="9" onClick={() => handleNumber("9")} />
                <CalcButton
                  label="×"
                  onClick={() => handleOperator("*")}
                  type="op"
                />

                <CalcButton label="4" onClick={() => handleNumber("4")} />
                <CalcButton label="5" onClick={() => handleNumber("5")} />
                <CalcButton label="6" onClick={() => handleNumber("6")} />
                <CalcButton
                  label="-"
                  onClick={() => handleOperator("-")}
                  type="op"
                />

                <CalcButton label="1" onClick={() => handleNumber("1")} />
                <CalcButton label="2" onClick={() => handleNumber("2")} />
                <CalcButton label="3" onClick={() => handleNumber("3")} />
                <CalcButton
                  label="+"
                  onClick={() => handleOperator("+")}
                  type="op"
                />

                <CalcButton
                  label="0"
                  onClick={() => handleNumber("0")}
                  xs={3}
                />
                <CalcButton label="." onClick={() => handleNumber(".")} />
                <CalcButton
                  label={<Equal size={28} />}
                  onClick={calculate}
                  type="equals"
                  xs={6}
                />
              </Grid>
            </Box>
          ) : (
            <Box sx={{ height: 420, overflowY: "auto" }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                p={1}
              >
                <Typography variant="caption" color="grey.600" fontWeight={800}>
                  HISTORY LOGS
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  color="error"
                  startIcon={<Trash2 size={12} />}
                  onClick={() => setHistory([])}
                  sx={{ fontSize: "10px" }}
                >
                  Clear
                </Button>
              </Box>
              <List>
                {history.map((item, i) => (
                  <ListItem
                    key={i}
                    sx={{
                      flexDirection: "column",
                      alignItems: "flex-end",
                      py: 1.5,
                      borderBottom: "1px solid #222",
                      "&:hover": { bgcolor: "#1a1a1a" },
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setDisplay(item.result);
                      setShouldReset(true);
                      setActiveTab(0);
                    }}
                  >
                    <Typography variant="caption" color="grey.500">
                      {item.expression} =
                    </Typography>
                    <Typography
                      variant="h6"
                      color="primary.main"
                      fontWeight={900}
                    >
                      {item.result}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
