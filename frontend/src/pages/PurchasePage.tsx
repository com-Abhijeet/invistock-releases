"use client";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, useTheme } from "@mui/material";

import PurchaseHeaderSection from "../components/purchase/PurchaseHeaderSection";
import PurchaseItemSection from "../components/purchase/PurchaseItemSection";
import PurchaseSummarySection from "../components/purchase/PurchaseSummarySection";
import { getPurchaseById } from "../lib/api/purchaseService";
import type { PurchaseItem, PurchasePayload } from "../lib/types/purchaseTypes";

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

const PurchasePage = () => {
  const { action, id } = useParams();
  const theme = useTheme();
  const [purchase, setPurchase] = useState<PurchasePayload | null>(null);
  const [success, setSuccess] = useState(false);
  const [__loading, setLoading] = useState(false);
  const isView = action === "view";
  const isEdit = action === "edit";

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
      prev ? { ...prev, total_amount: parseFloat(total.toFixed(2)) } : null
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
      }}
    >
      {/* Header (Fixed) */}
      <Box sx={{ p: 2, pb: 1, flexShrink: 0, zIndex: 10 }}>
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
          backgroundColor: "#fff",
          borderTop: `1px solid ${theme.palette.divider}`,
          zIndex: 10,
        }}
      >
        <PurchaseSummarySection
          purchase={purchase}
          onPurchaseChange={(p) => !isView && setPurchase(p)}
          setSuccess={setSuccess}
          readOnly={isView}
          isEdit={isEdit}
        />
      </Box>
    </Box>
  );
};

export default PurchasePage;
