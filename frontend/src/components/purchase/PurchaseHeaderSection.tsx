"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  Box,
  TextField,
  Typography,
  Stack,
  useTheme,
  Button,
  Collapse,
  alpha,
} from "@mui/material";
import {
  User,
  Hash,
  Calendar,
  ChevronUp,
  FileText,
} from "lucide-react";
import { getSuppliers as getAllSuppliers } from "../../lib/api/supplierService";
import type { PurchasePayload } from "../../lib/types/purchaseTypes";
import type { SupplierType as Supplier } from "../../lib/types/supplierTypes";
import AutoSuggestInput, { AutoSuggestOption } from "../common/AutoSuggestInput";

interface Props {
  purchase: PurchasePayload;
  onPurchaseChange: (data: PurchasePayload) => void;
  readOnly?: boolean;
}

export default function PurchaseHeaderSection({
  purchase,
  onPurchaseChange,
  readOnly = false,
}: Props) {
  const theme = useTheme();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showMore, setShowMore] = useState(false);

  const billNoRef = useRef<HTMLInputElement>(null);
  const supplierRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const supplierSearchTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getAllSuppliers({ limit: 50 })
      .then((data) => setSuppliers(data || []))
      .catch((err) => console.error("Error loading suppliers:", err));

    return () => {
      if (supplierSearchTimerRef.current) {
        clearTimeout(supplierSearchTimerRef.current);
      }
    };
  }, []);

  const handleSupplierSearch = (query: string) => {
    if (supplierSearchTimerRef.current) {
      clearTimeout(supplierSearchTimerRef.current);
    }

    supplierSearchTimerRef.current = setTimeout(() => {
      getAllSuppliers({ query: query.trim(), limit: 50 })
        .then((data) => {
          if (data && data.length > 0) {
            setSuppliers((prev) => {
              const map = new Map<number, Supplier>();
              prev.forEach((s) => {
                if (s.id) map.set(s.id, s);
              });
              data.forEach((s) => {
                if (s.id) map.set(s.id, s);
              });
              return Array.from(map.values());
            });
          }
        })
        .catch((err) => console.error("Supplier search error:", err));
    }, 150);
  };

  const supplierOptions: AutoSuggestOption[] = useMemo(() => {
    return suppliers.map((s) => ({
      ...s,
      id: s.id,
      name: s.name,
      code: s.phone || s.gst_number || "",
    }));
  }, [suppliers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return;
      if ((e.ctrlKey || e.metaKey) && (e.code === "KeyR" || e.key.toLowerCase() === "r")) {
        e.preventDefault();
        billNoRef.current?.focus();
        billNoRef.current?.select();
      }
      if ((e.ctrlKey || e.metaKey) && (e.code === "KeyB" || e.key.toLowerCase() === "b")) {
        e.preventDefault();
        supplierRef.current?.focus();
        supplierRef.current?.select();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setShowMore((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [readOnly]);

  const handleChange = (field: keyof PurchasePayload, value: any) => {
    if (!readOnly) {
      onPurchaseChange({ ...purchase, [field]: value });
    }
  };

  const containerSx = {
    display: "flex",
    alignItems: "center",
    gap: 1,
    px: 1,
    py: 0.5,
    borderRadius: "8px",
    bgcolor: alpha(theme.palette.action.hover, 0.03),
    border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:focus-within": {
      bgcolor: "background.paper",
      borderColor: theme.palette.primary.main,
      boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
    },
  };

  const labelSx = {
    fontSize: "0.65rem",
    fontWeight: 800,
    color: "text.disabled",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    whiteSpace: "nowrap",
  };

  const inputSx = {
    "& .MuiInputBase-root": {
      fontSize: "0.875rem",
      fontWeight: 600,
      padding: 0,
    },
    "& .MuiInput-underline:before, & .MuiInput-underline:after": {
      display: "none",
    },
  };

  const isSupplierMissing = purchase.supplier_id === 0 && !readOnly;
  const isBillNoMissing = !purchase.reference_no && !readOnly;

  return (
    <Box
      sx={{
        bgcolor: theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.divider}`,
        border: `1px solid #ccc`,
      }}
    >
      <Stack spacing={0}>
        {/* Main Toolbar Container */}
        <Box
          sx={{
            p: 1.5,
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            alignItems: "center",
          }}
        >
          {/* Supplier Selection Command Bar - Required */}
          <Box
            sx={{
              ...containerSx,
              flexGrow: 2,
              minWidth: 250,
              borderColor: isSupplierMissing
                ? alpha(theme.palette.error.main, 0.4)
                : alpha(theme.palette.divider, 0.8),
            }}
          >
            <User
              size={14}
              color={
                isSupplierMissing
                  ? theme.palette.error.main
                  : theme.palette.primary.main
              }
            />
            <Typography
              sx={{
                ...labelSx,
                color: isSupplierMissing ? "error.main" : "text.disabled",
              }}
            >
              SUPPLIER *
            </Typography>
            <AutoSuggestInput
              id="purchase-supplier-input"
              value={purchase.supplier_id || null}
              options={supplierOptions}
              placeholder="Search or Type Supplier... (Ctrl+B)"
              disabled={readOnly}
              allowCreate={true}
              variant="standard"
              sx={{ flexGrow: 1, ...inputSx }}
              onSearch={handleSupplierSearch}
              inputRef={(el) => {
                (supplierRef as any).current = el;
              }}
              onChange={(val) => {
                if (typeof val === "number") {
                  handleChange("supplier_id", val);
                } else if (typeof val === "string") {
                  const matched = suppliers.find(
                    (s) => s.name.toLowerCase() === val.toLowerCase(),
                  );
                  handleChange("supplier_id", matched ? matched.id : val);
                } else {
                  handleChange("supplier_id", 0);
                }
              }}
              onNext={() => {
                billNoRef.current?.focus();
                billNoRef.current?.select();
              }}
            />
          </Box>

          {/* Ref No / Bill No - Required */}
          <Box
            sx={{
              ...containerSx,
              flexGrow: 0.8,
              minWidth: 150,
              width: 200,
              borderColor: isBillNoMissing
                ? alpha(theme.palette.error.main, 0.4)
                : alpha(theme.palette.divider, 0.8),
            }}
          >
            <Hash
              size={14}
              color={
                isBillNoMissing
                  ? theme.palette.error.main
                  : theme.palette.text.disabled
              }
            />
            <Typography
              sx={{
                ...labelSx,
                color: isBillNoMissing ? "error.main" : "text.disabled",
              }}
            >
              REF/BILL NO *
            </Typography>
            <TextField
              fullWidth
              inputRef={billNoRef}
              variant="standard"
              disabled={readOnly}
              value={purchase.reference_no}
              onChange={(e) => handleChange("reference_no", e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  dateRef.current?.focus();
                } else if (e.key === "Backspace" && !purchase.reference_no) {
                  e.preventDefault();
                  supplierRef.current?.focus();
                  supplierRef.current?.select();
                } else if (e.key === "Enter" && e.shiftKey) {
                  e.preventDefault();
                  supplierRef.current?.focus();
                  supplierRef.current?.select();
                }
              }}
              placeholder="Required * (Ctrl+R)"
              inputProps={{ maxLength: 16 }}
              InputProps={{ disableUnderline: true }}
              sx={inputSx}
            />
          </Box>

          {/* Date Picker */}
          <Box sx={{ ...containerSx, minWidth: 150, width: 150 }}>
            <Calendar size={14} color={theme.palette.text.disabled} />
            <Typography sx={labelSx}>DATE *</Typography>
            <TextField
              type="date"
              fullWidth
              inputRef={dateRef}
              variant="standard"
              disabled={readOnly}
              value={purchase.date}
              onChange={(e) => handleChange("date", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const addItemBtn = document.querySelector<HTMLButtonElement>(
                    'button[data-action="add-item"]',
                  );
                  if (addItemBtn) {
                    addItemBtn.focus();
                  }
                } else if (e.key === "Enter" && e.shiftKey) {
                  e.preventDefault();
                  billNoRef.current?.focus();
                  billNoRef.current?.select();
                }
              }}
              InputProps={{ disableUnderline: true }}
              sx={inputSx}
            />
          </Box>

          {/* Details Toggle Button */}
          <Button
            size="small"
            tabIndex={-1}
            data-nav-skip="true"
            onClick={() => setShowMore(!showMore)}
            endIcon={
              <ChevronUp
                size={16}
                style={{
                  transform: showMore ? "rotate(0deg)" : "rotate(180deg)",
                  transition: "transform 0.2s",
                }}
              />
            }
            sx={{
              minWidth: 120,
              fontWeight: 700,
              textTransform: "none",
              color: "text.secondary",
              bgcolor: alpha(theme.palette.action.hover, 0.05),
              borderRadius: "8px",
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              "&:hover": {
                bgcolor: alpha(theme.palette.action.hover, 0.1),
              },
            }}
          >
            {showMore ? "Hide Details" : "Show Details"}
          </Button>
        </Box>

        {/* Collapsed Extra Information Row */}
        <Collapse in={showMore} timeout="auto" unmountOnExit>
          <Box
            sx={{
              p: 1.5,
              pt: 0,
              display: "flex",
              flexWrap: "wrap",
              gap: 1.5,
              borderTop: `1px dashed ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.background.default, 0.5),
            }}
          >
            {/* Note Section */}
            <Box sx={{ ...containerSx, flexGrow: 1, minWidth: 200 }}>
              <FileText size={14} color={theme.palette.text.disabled} />
              <Typography sx={labelSx}>NOTES</Typography>
              <TextField
                fullWidth
                variant="standard"
                disabled={readOnly}
                value={purchase.note || ""}
                onChange={(e) => handleChange("note", e.target.value)}
                placeholder="Internal memo or additional info"
                sx={inputSx}
              />
            </Box>
          </Box>
        </Collapse>
      </Stack>
    </Box>
  );
}
