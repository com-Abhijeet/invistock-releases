"use client";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
  LinearProgress,
  Divider,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  Plus,
  Trash2,
  CheckCircle2,
  SplitSquareHorizontal,
  Wand2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createTransaction } from "../../lib/api/transactionService";
import toast from "react-hot-toast";
import AutoSuggestInput, { AutoSuggestOption } from "../common/AutoSuggestInput";

const PAYMENT_OPTIONS: AutoSuggestOption[] = [
  { id: "cash", name: "Cash", code: "c" },
  { id: "upi", name: "UPI", code: "u" },
  { id: "card", name: "Card", code: "ca" },
  { id: "credit", name: "Credit", code: "cr" },
  { id: "cheque", name: "Cheque", code: "ch" },
  { id: "bank_transfer", name: "Bank Transfer", code: "b" },
];

interface TransactionRow {
  id: number;
  amount: string;
  payment_mode: string;
  note: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  saleId: number;
  customerId: number;
  totalAmount: number;
  referenceNo: string;
}

let rowIdCounter = 0;
const newRow = (amount = "", mode = "cash"): TransactionRow => ({
  id: ++rowIdCounter,
  amount,
  payment_mode: mode,
  note: "",
});

export default function PostSaleTransactionModal({
  open,
  onClose,
  saleId,
  customerId,
  totalAmount,
  referenceNo,
}: Props) {
  const theme = useTheme();
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fieldRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  const focusField = (rowId: number, field: "mode" | "amount" | "note") => {
    let el = fieldRefs.current[`${rowId}-${field}`];
    if (!el) {
      if (field === "amount") {
        el = document.querySelector<HTMLElement>(
          `[role="dialog"] input[placeholder="0.00"]`,
        );
      } else if (field === "mode") {
        el = document.querySelector<HTMLElement>(
          `[role="dialog"] #row-${rowId}-mode`,
        );
      }
    }
    if (el) {
      el.focus({ preventScroll: true });
      if (el instanceof HTMLInputElement) {
        el.select();
      }
      return true;
    }
    return false;
  };

  // Reset rows and auto-focus amount whenever modal opens
  useEffect(() => {
    if (open) {
      rowIdCounter = 0;
      const initialRow = newRow(
        totalAmount > 0 ? totalAmount.toFixed(2) : "",
        "cash",
      );
      setRows([initialRow]);

      // Assert OS-level focus to main window via Electron
      (window as any).electron?.focusMainWindow?.();
      window.focus();

      // Continuously ensure focus stays on the amount input despite print window transitions or OS blur
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const electron = (window as any).electron;
        if (!document.hasFocus()) {
          electron?.focusMainWindow?.();
          window.focus();
        }

        const targetInput =
          (fieldRefs.current[`${initialRow.id}-amount`] as HTMLInputElement) ||
          document.querySelector<HTMLInputElement>(
            '[role="dialog"] input[placeholder="0.00"]',
          );

        if (targetInput) {
          targetInput.focus({ preventScroll: true });
          targetInput.select();
          // Only stop once the window has REAL OS focus AND the input is actively focused
          if (document.hasFocus() && document.activeElement === targetInput && attempts >= 10) {
            clearInterval(interval);
          }
        }

        if (attempts >= 30) {
          clearInterval(interval);
        }
      }, 80);

      return () => clearInterval(interval);
    }
  }, [open, totalAmount]);

  const totalAllocated = rows.reduce(
    (sum, r) => sum + (parseFloat(r.amount) || 0),
    0,
  );
  const remaining =
    Math.round((totalAmount - totalAllocated + Number.EPSILON) * 100) / 100;
  const isOverpaid = remaining < -0.01;
  const isFullyAllocated = Math.abs(remaining) <= 0.01;

  const handleRowChange = (
    id: number,
    field: keyof TransactionRow,
    value: string,
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const handleAmountChange = (id: number, val: string) => {
    // Sanitize numeric input (allow numbers and single decimal point)
    const sanitized = val.replace(/[^0-9.]/g, "");
    const parts = sanitized.split(".");
    const formatted =
      parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : sanitized;
    handleRowChange(id, "amount", formatted);
  };

  const handleAddRow = () => {
    const leftover = remaining > 0.01 ? remaining.toFixed(2) : "";
    const lastRow = rows[rows.length - 1];
    const nextMode = lastRow?.payment_mode === "cash" ? "upi" : "cash";
    const addedRow = newRow(leftover, nextMode);
    setRows((prev) => [...prev, addedRow]);
    setTimeout(() => {
      focusField(addedRow.id, "amount");
    }, 60);
  };

  const handleRemoveRow = (id: number) => {
    if (rows.length <= 1) return;
    const idx = rows.findIndex((r) => r.id === id);
    const newRows = rows.filter((r) => r.id !== id);
    setRows(newRows);
    const targetRow = newRows[Math.max(0, idx - 1)];
    if (targetRow) {
      setTimeout(() => {
        focusField(targetRow.id, "amount");
      }, 60);
    }
  };

  const handleSplitEvenly = () => {
    if (rows.length === 0) return;
    const split = (totalAmount / rows.length).toFixed(2);
    const splitNum = parseFloat(split);
    // Prevent rounding pennies from leaving leftovers: assign diff to last row
    const firstRowsTotal = splitNum * (rows.length - 1);
    const lastRowAmt = (totalAmount - firstRowsTotal).toFixed(2);

    setRows((prev) =>
      prev.map((r, i) => ({
        ...r,
        amount: i === prev.length - 1 ? lastRowAmt : split,
      })),
    );
    toast.success(`Split evenly across ${rows.length} rows`);
  };

  const handleAutoBalance = () => {
    if (rows.length === 0) return;
    const otherRowsAllocated = rows
      .slice(0, -1)
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    const needed = Math.max(
      0,
      Math.round((totalAmount - otherRowsAllocated + Number.EPSILON) * 100) / 100,
    );
    setRows((prev) =>
      prev.map((r, i) =>
        i === prev.length - 1 ? { ...r, amount: needed.toFixed(2) } : r,
      ),
    );
    toast.success(`Balanced last row to ₹${needed.toFixed(2)}`);
  };

  const handleSubmit = async () => {
    if (isOverpaid) {
      toast.error("Total allocated exceeds the sale amount.");
      return;
    }
    if (rows.some((r) => !parseFloat(r.amount) || parseFloat(r.amount) <= 0)) {
      toast.error("All rows must have a valid positive amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.all(
        rows.map((r) =>
          createTransaction({
            type: "payment_in",
            bill_id: saleId,
            bill_type: "sale",
            entity_id: customerId,
            entity_type: "customer",
            transaction_date: new Date().toISOString().slice(0, 10),
            amount: parseFloat(r.amount),
            payment_mode: r.payment_mode,
            status: "issued" as const,
            note: r.note || `Payment for Sale #${referenceNo}`,
          }),
        ),
      );

      toast.success("Payments recorded successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payments.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard navigation on Amount field
  const handleAmountKeyDown = (e: React.KeyboardEvent, row: TransactionRow) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      e.stopPropagation();
      void handleSubmit();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();

      const currentAmt = parseFloat(row.amount) || 0;
      const otherRowsAllocated = rows
        .filter((r) => r.id !== row.id)
        .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
      const currentRemaining =
        Math.round(
          (totalAmount - otherRowsAllocated - currentAmt + Number.EPSILON) *
            100,
        ) / 100;

      const currentRowIdx = rows.findIndex((r) => r.id === row.id);

      if (currentRowIdx < rows.length - 1) {
        // Next row already exists: move to it (and prefill if empty)
        const nextRow = rows[currentRowIdx + 1];
        if (
          (!parseFloat(nextRow.amount) || parseFloat(nextRow.amount) <= 0) &&
          currentRemaining > 0
        ) {
          handleRowChange(nextRow.id, "amount", currentRemaining.toFixed(2));
        }
        focusField(nextRow.id, "amount");
      } else if (currentRemaining > 0.01) {
        // Last row & remaining amount exists: auto-calculate remaining and prefill in new row!
        const nextMode = row.payment_mode === "cash" ? "upi" : "cash";
        const addedRow = newRow(currentRemaining.toFixed(2), nextMode);
        setRows((prev) => [...prev, addedRow]);
        setTimeout(() => {
          focusField(addedRow.id, "amount");
        }, 60);
      } else if (Math.abs(currentRemaining) <= 0.01) {
        // Fully allocated: Enter saves!
        void handleSubmit();
      } else {
        focusField(row.id, "note");
      }
      return;
    }

    if (e.key === "ArrowUp") {
      const currentRowIdx = rows.findIndex((r) => r.id === row.id);
      if (currentRowIdx > 0) {
        e.preventDefault();
        focusField(rows[currentRowIdx - 1].id, "amount");
      }
      return;
    }

    if (e.key === "ArrowDown") {
      const currentRowIdx = rows.findIndex((r) => r.id === row.id);
      if (currentRowIdx < rows.length - 1) {
        e.preventDefault();
        focusField(rows[currentRowIdx + 1].id, "amount");
      }
      return;
    }
  };

  // Keyboard navigation on Note field
  const handleNoteKeyDown = (e: React.KeyboardEvent, row: TransactionRow) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      e.stopPropagation();
      void handleSubmit();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();

      const currentRowIdx = rows.findIndex((r) => r.id === row.id);
      if (currentRowIdx < rows.length - 1) {
        focusField(rows[currentRowIdx + 1].id, "mode");
      } else if (remaining > 0.01) {
        handleAddRow();
      } else if (Math.abs(remaining) <= 0.01) {
        void handleSubmit();
      }
      return;
    }

    if (e.key === "ArrowUp") {
      const currentRowIdx = rows.findIndex((r) => r.id === row.id);
      if (currentRowIdx > 0) {
        e.preventDefault();
        focusField(rows[currentRowIdx - 1].id, "note");
      }
      return;
    }

    if (e.key === "ArrowDown") {
      const currentRowIdx = rows.findIndex((r) => r.id === row.id);
      if (currentRowIdx < rows.length - 1) {
        e.preventDefault();
        focusField(rows[currentRowIdx + 1].id, "note");
      }
      return;
    }
  };

  // Dialog-level keyboard shortcuts
  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    // If dialog is focused but user pressed a key and activeElement isn't an input, redirect focus to amount input
    const activeEl = document.activeElement;
    const isInputActive =
      activeEl &&
      (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");

    if (!isInputActive && !e.ctrlKey && !e.altKey && !e.metaKey && e.key !== "Escape") {
      const targetInput =
        (fieldRefs.current[`${rows[0]?.id || 1}-amount`] as HTMLInputElement) ||
        document.querySelector<HTMLInputElement>(
          '[role="dialog"] input[placeholder="0.00"]',
        );
      if (targetInput) {
        targetInput.focus({ preventScroll: true });
      }
    }

    // Ctrl + S: Save payment
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      e.stopPropagation();
      void handleSubmit();
      return;
    }

    // Ctrl + A: Add row
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
      e.preventDefault();
      e.stopPropagation();
      handleAddRow();
      return;
    }

    // Alt + B: Auto-balance
    if (e.altKey && e.key.toLowerCase() === "b") {
      e.preventDefault();
      e.stopPropagation();
      handleAutoBalance();
      return;
    }

    // Ctrl + Backspace / Delete: Remove row
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === "Backspace" || e.key === "Delete")
    ) {
      if (rows.length > 1) {
        e.preventDefault();
        e.stopPropagation();
        const activeEl = document.activeElement;
        const matchedRow = rows.find(
          (r) =>
            fieldRefs.current[`${r.id}-amount`] === activeEl ||
            fieldRefs.current[`${r.id}-note`] === activeEl ||
            fieldRefs.current[`${r.id}-mode`] === activeEl,
        );
        if (matchedRow) {
          handleRemoveRow(matchedRow.id);
        } else {
          handleRemoveRow(rows[rows.length - 1].id);
        }
      }
      return;
    }
  };

  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;
  const remainingRef = useRef(remaining);
  remainingRef.current = remaining;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  // --- TOP-LEVEL FOCUS & SHORTCUT ENFORCER ---
  // When an external print preview window pops up, the main window loses OS focus.
  // This enforcer guarantees that the instant user interacts with or returns to the window,
  // focus is forcefully re-locked onto this modal's amount input and keys work immediately.
  useEffect(() => {
    if (!open) return;

    const focusTargetInput = () => {
      // 1. Force OS-level focus to main window via Electron
      const electron = (window as any).electron;
      if (electron?.focusMainWindow) {
        electron.focusMainWindow();
      } else if (electron?.ipcRenderer?.send) {
        electron.ipcRenderer.send("focus-main-window");
      }
      window.focus();

      // 2. Select amount input
      const targetInput =
        (fieldRefs.current[`${rowsRef.current[0]?.id || 1}-amount`] as HTMLInputElement) ||
        document.querySelector<HTMLInputElement>(
          '[role="dialog"] input[placeholder="0.00"], [role="dialog"] input',
        );
      if (targetInput) {
        targetInput.focus({ preventScroll: true });
        targetInput.select();
      }
    };

    // 1. Refocus immediately when main window regains focus from print/preview window
    const handleWindowFocus = () => {
      setTimeout(focusTargetInput, 20);
      setTimeout(focusTargetInput, 120);
      setTimeout(focusTargetInput, 300);
    };

    // 2. Refocus when document becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(focusTargetInput, 20);
      }
    };

    // 3. Pointerdown / mousemove anywhere on screen: snaps focus straight to input
    const handlePointerDown = (e: MouseEvent | PointerEvent) => {
      const target = e.target as HTMLElement;
      if (
        target?.closest(
          "button, input, textarea, select, [role='button'], [role='menuitem']",
        )
      ) {
        return;
      }
      setTimeout(focusTargetInput, 10);
    };

    const handleMouseMove = () => {
      if (!document.hasFocus()) {
        focusTargetInput();
      }
    };

    // 4. Focusin guardian: if focus somehow wanders outside the dialog, pull it right back
    const handleFocusIn = (e: FocusEvent) => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return;
      const target = e.target as HTMLElement;
      if (!dialog.contains(target)) {
        setTimeout(focusTargetInput, 10);
      }
    };

    // 5. Periodic focus guardian while modal is open
    const periodicEnforcer = setInterval(() => {
      if (!document.hasFocus()) {
        focusTargetInput();
      }
    }, 250);

    // 6. Global Window Keydown (Capture Phase): even if window focus was blurred or on document.body, immediately catch Enter / Ctrl+S / Digits
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Enter anywhere on screen while this modal is active
      if (e.key === "Enter") {
        const activeEl = document.activeElement;
        const isCancelBtn =
          activeEl && activeEl.getAttribute("data-nav-skip") === "true";
        if (isCancelBtn) return;

        // If amount is fully allocated, submit immediately!
        if (Math.abs(remainingRef.current) <= 0.01) {
          e.preventDefault();
          e.stopPropagation();
          void handleSubmitRef.current();
          return;
        }

        // If not on an input, focus amount input
        const targetInput = document.querySelector<HTMLInputElement>(
          '[role="dialog"] input[placeholder="0.00"]',
        );
        if (targetInput && activeEl !== targetInput) {
          e.preventDefault();
          e.stopPropagation();
          targetInput.focus({ preventScroll: true });
          targetInput.select();
        }
        return;
      }

      // Ctrl + S: Save payment
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        void handleSubmitRef.current();
        return;
      }

      // Escape: Close modal
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // Digits (0-9 or .) redirect to amount input if not already typing in an input
      if (
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        e.key.length === 1 &&
        /[0-9.]/.test(e.key)
      ) {
        const activeEl = document.activeElement;
        const isInput =
          activeEl &&
          (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
        if (!isInput) {
          const targetInput = document.querySelector<HTMLInputElement>(
            '[role="dialog"] input[placeholder="0.00"]',
          );
          if (targetInput) {
            targetInput.focus({ preventScroll: true });
          }
        }
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseenter", handleMouseMove, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("focusin", handleFocusIn);
    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true });

    return () => {
      clearInterval(periodicEnforcer);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseenter", handleMouseMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("keydown", handleGlobalKeyDown, {
        capture: true,
      });
    };
  }, [open, onClose]);

  const progressPct = Math.min(100, (totalAllocated / totalAmount) * 100);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableAutoFocus={false}
      autoFocus={true}
      disableRestoreFocus={true}
      PaperProps={{
        sx: {
          borderRadius: "14px",
          overflow: "hidden",
        },
      }}
      TransitionProps={{
        onEntered: () => {
          const targetInput =
            (fieldRefs.current[`${rows[0]?.id || 1}-amount`] as HTMLInputElement) ||
            document.querySelector<HTMLInputElement>(
              '[role="dialog"] input[placeholder="0.00"]',
            );
          if (targetInput) {
            targetInput.focus({ preventScroll: true });
            targetInput.select();
          }
        },
      }}
      onKeyDown={handleDialogKeyDown}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          bgcolor: theme.palette.secondary.main,
          color: "white",
          pb: 1.5,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <SplitSquareHorizontal size={22} />
          <Box flex={1}>
            <Typography fontWeight={900} fontSize="1rem" lineHeight={1.2}>
              Record Split Payments
            </Typography>
            <Typography fontSize="0.75rem" sx={{ opacity: 0.85 }} mt={0.3}>
              Invoice #{referenceNo} &middot; Total &#8377;
              {totalAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
          </Box>
          <Chip
            label={
              isFullyAllocated
                ? "Fully Allocated"
                : remaining > 0
                  ? `\u20b9${remaining.toFixed(2)} remaining`
                  : `\u20b9${Math.abs(remaining).toFixed(2)} over`
            }
            size="small"
            sx={{
              fontWeight: 800,
              fontSize: "0.7rem",
              bgcolor: isOverpaid
                ? theme.palette.error.main
                : isFullyAllocated
                  ? theme.palette.success.main
                  : alpha("#fff", 0.25),
              color: "white",
            }}
          />
        </Stack>

        {/* Progress bar */}
        <Box sx={{ mt: 1.5, borderRadius: 4, overflow: "hidden" }}>
          <LinearProgress
            variant="determinate"
            value={progressPct}
            sx={{
              height: 5,
              bgcolor: alpha("#fff", 0.2),
              "& .MuiLinearProgress-bar": {
                bgcolor: isOverpaid
                  ? theme.palette.error.light
                  : isFullyAllocated
                    ? theme.palette.success.light
                    : "#fff",
              },
            }}
          />
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {isSubmitting && <LinearProgress color="secondary" />}

        {/* Column headers */}
        <Box
          sx={{
            px: 2,
            py: 1,
            bgcolor: alpha(theme.palette.action.hover, 0.04),
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography
              sx={{
                flex: "0 0 130px",
                fontSize: "0.65rem",
                fontWeight: 800,
                textTransform: "uppercase",
                color: "text.disabled",
                letterSpacing: "0.5px",
              }}
            >
              Payment Mode
            </Typography>
            <Typography
              sx={{
                flex: 1.2,
                fontSize: "0.65rem",
                fontWeight: 800,
                textTransform: "uppercase",
                color: "text.disabled",
                letterSpacing: "0.5px",
              }}
            >
              Amount (&#8377;)
            </Typography>
            <Typography
              sx={{
                flex: 1.8,
                fontSize: "0.65rem",
                fontWeight: 800,
                textTransform: "uppercase",
                color: "text.disabled",
                letterSpacing: "0.5px",
              }}
            >
              Note (optional)
            </Typography>
            <Box sx={{ width: 32 }} />
          </Stack>
        </Box>

        {/* Rows */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Stack spacing={1.2}>
            {rows.map((row) => (
              <Stack
                key={row.id}
                direction="row"
                spacing={1.5}
                alignItems="center"
              >
                {/* Mode: AutoSuggest selector */}
                <Box sx={{ flex: "0 0 130px" }}>
                  <AutoSuggestInput
                    id={`row-${row.id}-mode`}
                    value={row.payment_mode}
                    options={PAYMENT_OPTIONS}
                    placeholder="Mode"
                    allowCreate={false}
                    inputRef={(el) => {
                      fieldRefs.current[`${row.id}-mode`] = el;
                    }}
                    onChange={(val) => {
                      handleRowChange(
                        row.id,
                        "payment_mode",
                        (val as string) || "cash",
                      );
                    }}
                    onNext={() => {
                      focusField(row.id, "amount");
                    }}
                    onPrev={() => {
                      const idx = rows.findIndex((r) => r.id === row.id);
                      if (idx > 0) {
                        focusField(rows[idx - 1].id, "note");
                      }
                    }}
                  />
                </Box>

                {/* Amount */}
                <TextField
                  autoFocus={row.id === rows[0]?.id}
                  size="small"
                  placeholder="0.00"
                  value={row.amount}
                  inputRef={(el) => {
                    fieldRefs.current[`${row.id}-amount`] = el;
                  }}
                  onFocus={(e) => {
                    e.target.select();
                  }}
                  onChange={(e) => handleAmountChange(row.id, e.target.value)}
                  onKeyDown={(e) => handleAmountKeyDown(e, row)}
                  error={!!row.amount && parseFloat(row.amount) <= 0}
                  sx={{
                    flex: 1.2,
                    "& input": {
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      py: 0.8,
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <Typography
                        fontSize="0.85rem"
                        fontWeight={700}
                        color="text.secondary"
                        mr={0.5}
                      >
                        &#8377;
                      </Typography>
                    ),
                  }}
                />

                {/* Note */}
                <TextField
                  size="small"
                  placeholder="e.g. UPI ref, cheque no..."
                  value={row.note}
                  inputRef={(el) => {
                    fieldRefs.current[`${row.id}-note`] = el;
                  }}
                  onChange={(e) =>
                    handleRowChange(row.id, "note", e.target.value)
                  }
                  onKeyDown={(e) => handleNoteKeyDown(e, row)}
                  sx={{
                    flex: 1.8,
                    "& input": { fontSize: "0.85rem", py: 0.8 },
                  }}
                />

                {/* Remove */}
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleRemoveRow(row.id)}
                  disabled={rows.length === 1}
                  sx={{
                    opacity: rows.length === 1 ? 0.3 : 1,
                    "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.1) },
                  }}
                >
                  <Trash2 size={16} />
                </IconButton>
              </Stack>
            ))}
          </Stack>

          {/* Totals & Action Controls */}
          <Divider sx={{ my: 1.5 }} />
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                startIcon={<Plus size={14} />}
                onClick={handleAddRow}
                variant="outlined"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  borderColor: "divider",
                }}
              >
                Add Row
              </Button>

              {rows.length > 1 && (
                <Button
                  size="small"
                  onClick={handleSplitEvenly}
                  variant="outlined"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    borderColor: "divider",
                  }}
                >
                  Split Evenly
                </Button>
              )}

              {Math.abs(remaining) > 0.01 && (
                <Tooltip title="Auto-balance difference into the last row (Alt+B)">
                  <Button
                    size="small"
                    startIcon={<Wand2 size={14} />}
                    onClick={handleAutoBalance}
                    variant="text"
                    color="secondary"
                    sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                  >
                    Auto Balance
                  </Button>
                </Tooltip>
              )}
            </Stack>

            <Stack alignItems="flex-end" spacing={0.2}>
              <Typography
                fontSize="0.65rem"
                color="text.disabled"
                fontWeight={800}
                letterSpacing="0.5px"
              >
                ALLOCATED / TOTAL
              </Typography>
              <Typography
                fontSize="0.95rem"
                fontWeight={900}
                color={
                  isOverpaid
                    ? "error.main"
                    : isFullyAllocated
                      ? "success.main"
                      : "text.primary"
                }
              >
                &#8377;{totalAllocated.toFixed(2)} / &#8377;
                {totalAmount.toFixed(2)}
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </DialogContent>

      {/* Footer with keyboard shortcuts helper */}
      <DialogActions
        sx={{
          px: 2,
          py: 1.25,
          borderTop: `1px solid ${theme.palette.divider}`,
          justifyContent: "space-between",
          bgcolor: alpha(theme.palette.action.hover, 0.02),
        }}
      >
        {/* Shortcuts Helper */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "flex", alignItems: "center" }}
        >
          <Box
            component="kbd"
            sx={{
              px: 0.6,
              py: 0.2,
              bgcolor: "background.paper",
              borderRadius: 0.5,
              border: 1,
              borderColor: "divider",
              fontWeight: 700,
              mr: 0.5,
            }}
          >
            Enter
          </Box>
          Next / Add Row &middot;
          <Box
            component="kbd"
            sx={{
              px: 0.6,
              py: 0.2,
              bgcolor: "background.paper",
              borderRadius: 0.5,
              border: 1,
              borderColor: "divider",
              fontWeight: 700,
              mx: 0.5,
            }}
          >
            Alt+B
          </Box>
          Auto-Balance &middot;
          <Box
            component="kbd"
            sx={{
              px: 0.6,
              py: 0.2,
              bgcolor: "background.paper",
              borderRadius: 0.5,
              border: 1,
              borderColor: "divider",
              fontWeight: 700,
              mx: 0.5,
            }}
          >
            Esc
          </Box>
          Close
        </Typography>

        <Stack direction="row" spacing={1}>
          <Button data-nav-skip="true" onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button
            data-save="true"
            variant="contained"
            color="secondary"
            disabled={isSubmitting || isOverpaid || rows.length === 0}
            startIcon={<CheckCircle2 size={16} />}
            onClick={handleSubmit}
            sx={{ fontWeight: 800, minWidth: 160 }}
          >
            {isSubmitting
              ? "Saving..."
              : isFullyAllocated
                ? "Record Payments"
                : `Record ₹${totalAllocated.toFixed(2)}`}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
