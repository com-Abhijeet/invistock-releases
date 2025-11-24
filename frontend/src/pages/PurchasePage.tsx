"use client";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { Box } from "@mui/material";

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
  const [purchase, setPurchase] = useState<PurchasePayload | null>(null);
  const [success, setSuccess] = useState(false);
  const [__loading, setLoading] = useState(false);
  const isView = action === "view";
  const isEdit = action === "edit";

  // Fetch purchase if in edit or view mode
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

  // Reset on success (only in create mode)
  useEffect(() => {
    if (success && !action) {
      setPurchase(generateInitialPurchase());
    }
  }, [success, action]);

  // Recalculate total on items change
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
      p={2}
      pt={3}
      sx={{
        backgroundColor: "#fff",

        // pt: "30px",
      }}
      minHeight={"100vh"}
    >
      <Box
        sx={{
          background: "#ffffff",
          border: "1px solid #ddd",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box p={2}>
          <PurchaseHeaderSection
            purchase={purchase}
            onPurchaseChange={(p) => !isView && setPurchase(p)}
            readOnly={isView}
          />
        </Box>

        {/* Divider */}
        <Box sx={{ borderTop: "1px solid #ddd" }} />

        {/* Items */}
        <Box p={2}>
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

        {/* Divider */}
        <Box sx={{ borderTop: "1px solid #ddd" }} />

        {/* Summary */}
        <Box p={2}>
          <PurchaseSummarySection
            purchase={purchase}
            onPurchaseChange={(p) => !isView && setPurchase(p)}
            setSuccess={setSuccess}
            readOnly={isView}
            isEdit={isEdit}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default PurchasePage;
