
"use client";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  useTheme,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Chip,
  Button,
} from "@mui/material";
import { Close as CloseIcon, FolderOpen as FolderIcon, Save as SaveIcon, Keyboard as KeyboardIcon } from "@mui/icons-material";
import toast from "react-hot-toast";
import Grid from "@mui/material/GridLegacy";

import PurchaseHeaderSection from "../components/purchase/PurchaseHeaderSection";
import PurchaseItemSection from "../components/purchase/PurchaseItemSection";
import PurchaseSummarySection from "../components/purchase/PurchaseSummarySection";
import { getPurchaseById } from "../lib/api/purchaseService";
import type { PurchaseItem, PurchasePayload } from "../lib/types/purchaseTypes";


interface SavedPurchaseDraft {
  id: string;
  timestamp: number;
  purchasePayload: PurchasePayload;
}

const generateInitialPurchase = (): PurchasePayload => ({
  reference_no: "",
  date: new Date().toISOString().slice(0, 10),
  supplier_id: 0,
  note: "",
  items: [],
  total_amount: 0,
  discount: 0,
  paid_amount: 0,
  payment_mode: "cash",
  status: "pending",
});

// --- SHORTCUTS DATA (Purchase Specific) ---
const PURCHASE_SHORTCUTS = [
  {
    category: "Header Actions",
    shortcuts: [
      { keys: ["Ctrl", "R"], description: "Focus Bill Ref No" },
      { keys: ["Ctrl", "B"], description: "Select Supplier" },
    ],
  },
  {
    category: "Item Actions",
    shortcuts: [
      { keys: ["Ctrl", "A"], description: "Add New Item Row" },
      { keys: ["Ctrl", "Del"], description: "Remove Active Row" },
    ],
  },
  {
    category: "Summary / Saving",
    shortcuts: [
      { keys: ["Ctrl", "S"], description: "Save Purchase" },
      { keys: ["Ctrl", "U"], description: "Full Payment (Paid in Full)" },
      { keys: ["Esc"], description: "Cancel Purchase" },
    ],
  },
];

const PurchasePage = () => {
  const { action, id } = useParams();
  const theme = useTheme();
  const [purchase, setPurchase] = useState<PurchasePayload | null>(null);
  const [success, setSuccess] = useState(false);
  const [__loading, setLoading] = useState(false);
  const isView = action === "view";
  const isEdit = action === "edit";

  // Shortcut Modal State
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  // Drafts State
  const [draftsModalOpen, setDraftsModalOpen] = useState(false);
  const [drafts, setDrafts] = useState<SavedPurchaseDraft[]>([]);

  const loadDraftsFromStorage = () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("purchase_drafts");
      if (stored) setDrafts(JSON.parse(stored));
    }
  };

  useEffect(() => {
    loadDraftsFromStorage();
  }, []);

  const saveDraft = () => {
    if (!purchase || purchase.items.length === 0) {
      toast.error("Cannot save an empty draft.");
      return;
    }
    const newDraft: SavedPurchaseDraft = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      purchasePayload: purchase,
    };
    const updatedDrafts = [newDraft, ...drafts];
    setDrafts(updatedDrafts);
    localStorage.setItem("purchase_drafts", JSON.stringify(updatedDrafts));
    toast.success("Draft saved");
  };

  const deleteDraft = (draftId: string) => {
    const updatedDrafts = drafts.filter((d) => d.id !== draftId);
    setDrafts(updatedDrafts);
    localStorage.setItem("purchase_drafts", JSON.stringify(updatedDrafts));
    toast.success("Draft deleted");
  };

  const loadDraft = (draft: SavedPurchaseDraft) => {
    setPurchase(draft.purchasePayload);
    setDraftsModalOpen(false);
    toast.success("Draft loaded");
  };

  useEffect(() => {
    const isDirty = purchase && purchase.items.length > 0;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isView && !isEdit) {
        const message = "You have unsaved items. Save a draft before leaving?";
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [purchase, isView, isEdit]);


  useEffect(() => {
    if ((isEdit || isView) && id) {
      const fetchPurchase = async () => {
        setLoading(true);
        try {
          const data = await getPurchaseById(id);
          if (data) setPurchase(data.data);
        } catch (err) {
          console.error("Failed to fetch purchase:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchPurchase();
    } else {
      setPurchase(generateInitialPurchase());
    }
  }, [action, id]);

  useEffect(() => {
    if (success && !action) {
      setPurchase(generateInitialPurchase());
    }
  }, [success, action]);

  useEffect(() => {
    if (!purchase) return;
    const total = purchase.items.reduce((acc, item) => acc + item.price, 0);
    setPurchase((prev) =>
      prev ? { ...prev, total_amount: parseFloat(total.toFixed(2)) } : null,
    );
  }, [purchase?.items]);

  if (!purchase) return null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px)",
        backgroundColor: theme.palette.background.default,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Compact Top Action Bar */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          m: 0,
          p: 0,
          bgcolor: theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
          zIndex: 10,
        }}
      >
        {!isView && !isEdit && (
          <>
            <Button
              variant="text"
              color="primary"
              onClick={saveDraft}
              startIcon={<SaveIcon sx={{ fontSize: "0.9rem !important" }} />}
              sx={{
                fontSize: "0.65rem",
                textTransform: "none",
                py: 0.5,
                px: 1.5,
                minWidth: "auto",
                borderRadius: 0,
                borderRight: `1px solid ${theme.palette.divider}`,
              }}
            >
              Save Draft
            </Button>
            <Button
              variant="text"
              color="primary"
              onClick={() => setDraftsModalOpen(true)}
              startIcon={<FolderIcon sx={{ fontSize: "0.9rem !important" }} />}
              sx={{
                fontSize: "0.65rem",
                textTransform: "none",
                py: 0.5,
                px: 1.5,
                minWidth: "auto",
                borderRadius: 0,
                borderRight: `1px solid ${theme.palette.divider}`,
              }}
            >
              View Drafts
            </Button>
          </>
        )}
        <Button
          variant="text"
          color="info"
          onClick={() => setShortcutHelpOpen(true)}
          startIcon={<KeyboardIcon sx={{ fontSize: "0.9rem !important" }} />}
          sx={{
            fontSize: "0.65rem",
            textTransform: "none",
            py: 0.5,
            px: 1.5,
            minWidth: "auto",
            borderRadius: 0,
          }}
        >
          Shortcuts
        </Button>
      </Box>

      {/* Header (Fixed) */}
      <Box sx={{ p: 2, pt: 1, pb: 1, flexShrink: 0, zIndex: 10 }}>
        <PurchaseHeaderSection
          purchase={purchase}
          onPurchaseChange={(p) => !isView && setPurchase(p)}
          readOnly={isView}
        />
      </Box>

      {/* Items (Scrollable) */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          px: 2,
          pb: 2,
          "&::-webkit-scrollbar": { width: "6px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#ddd",
            borderRadius: "4px",
          },
        }}
      >
        <PurchaseItemSection
          items={purchase.items}
          onItemsChange={
            isView
              ? () => {}
              : (items: PurchaseItem[]) =>
                  setPurchase((prev) => (prev ? { ...prev, items } : prev))
          }
          readOnly={isView}
        />
      </Box>

      {/* Summary (Fixed Bottom) */}
      <Box
        sx={{
          flexShrink: 0,
          bgcolor: 'background.paper',
          borderTop: `1px solid ${theme.palette.divider}`,
          zIndex: 10,
        }}
      >
        <PurchaseSummarySection
          draftsModalOpen={draftsModalOpen}
          setDraftsModalOpen={setDraftsModalOpen}
          saveDraft={saveDraft}
          purchase={purchase}
          onPurchaseChange={(p) => !isView && setPurchase(p)}
          setSuccess={setSuccess}
          mode={isView ? "view" : isEdit ? "edit" : "new"}
          resetForm={generateInitialPurchase}
        />
      </Box>

      {/* --- KEYBOARD SHORTCUTS MODAL --- */}
      <Dialog
        open={shortcutHelpOpen}
        onClose={() => setShortcutHelpOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Purchase Shortcuts
          </Typography>
          <IconButton onClick={() => setShortcutHelpOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {PURCHASE_SHORTCUTS.map((group) => (
              <Grid item xs={12} key={group.category}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  fontWeight="bold"
                  gutterBottom
                  sx={{
                    textTransform: "uppercase",
                    fontSize: "0.75rem",
                    letterSpacing: 1,
                  }}
                >
                  {group.category}
                </Typography>
                <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0 }}>
                  {group.shortcuts.map((shortcut) => (
                    <Box
                      component="li"
                      key={shortcut.description}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1.5,
                      }}
                    >
                      <Typography variant="body2">
                        {shortcut.description}
                      </Typography>
                      <Box display="flex" gap={0.5}>
                        {shortcut.keys.map((key) => (
                          <Chip
                            key={key}
                            label={key}
                            size="small"
                            sx={{
                              borderRadius: 1,
                              fontWeight: "bold",
                              fontFamily: "monospace",
                              height: 24,
                              minWidth: 24,
                              bgcolor: "action.selected",
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PurchasePage;
