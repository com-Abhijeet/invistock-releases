"use client";

import { useState, useEffect } from "react";
import { Box, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";

import type {
  NonGstSaleItem,
  NonGstSalePayload,
} from "../lib/types/nonGstSalesTypes";

import NGSalesPosHeader from "../components/sales/NGSalesPosHeader";
import NGSaleItemSection from "../components/sales/NGSalesItemSection";
import NGSaleSummarySection from "../components/sales/NGSalesSummarySection";
import theme from "../../theme";

// ✅ Default Payload
const defaultSalePayload: NonGstSalePayload = {
  reference_no: "Auto",
  payment_mode: "cash",
  note: "",
  paid_amount: 0,
  total_amount: 0,
  status: "paid",
  items: [],
  customer_name: "",
  customer_phone: "",
  discount: "0",
};

export default function NGSalesPos() {
  const navigate = useNavigate();

  const [sale, setSale] = useState<NonGstSalePayload>(defaultSalePayload);

  // Independent State for the simplified UI fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        navigate("/billing");
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [navigate]);

  const resetForm = () => {
    setSale(defaultSalePayload);
    setCustomerName("");
    setCustomerPhone("");
  };

  const handleItemsChange = (updatedItems: NonGstSaleItem[]) => {
    setSale((prev) => ({
      ...prev,
      items: updatedItems,
      total_amount: updatedItems.reduce((acc, item) => acc + item.price, 0),
    }));
  };

  const handleFieldChange = (field: keyof NonGstSalePayload, value: any) => {
    setSale((prevSale) => ({
      ...prevSale,
      [field]: value,
    }));
  };

  return (
    <Box
      sx={{
        height: "85vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden", // Prevent body scroll
      }}
    >
      {/* 1. Fixed Header Section */}
      <Box sx={{ flexShrink: 0, p: 1, pb: 0 }}>
        <NGSalesPosHeader
          customerName={customerName}
          selectedPhone={customerPhone}
          setCustomerName={setCustomerName}
          setSelectedPhone={setCustomerPhone}
        />
      </Box>

      {/* 2. Scrollable Items Section */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto", // Only this section scrolls
          p: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            flexGrow: 1,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <NGSaleItemSection
            items={sale.items}
            onItemsChange={handleItemsChange}
          />
        </Paper>
      </Box>

      {/* 3. Fixed Footer/Summary Section */}
      <Box
        sx={{
          flexShrink: 0,
          backgroundColor: "#fff",
          borderTop: `1px solid ${theme.palette.divider}`,
          boxShadow: "0px -2px 10px rgba(0,0,0,0.05)",
          zIndex: 10,
        }}
      >
        <NGSaleSummarySection
          sale={sale}
          onSaleChange={handleFieldChange}
          customer={{
            name: customerName,
            phone: customerPhone,
          }}
          resetForm={resetForm}
        />
      </Box>
    </Box>
  );
}
