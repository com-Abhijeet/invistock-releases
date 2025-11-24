"use client";

import { useState, useEffect } from "react";
import { Box, Divider } from "@mui/material";
import { useNavigate } from "react-router-dom";

// ✅ Import all NON-GST types and services
import type {
  NonGstSaleItem,
  NonGstSalePayload,
} from "../lib/types/nonGstSalesTypes";
import type { CustomerType } from "../lib/types/customerTypes";
import { getCustomers } from "../lib/api/customerService";

// ✅ Import the new, hard-coded NON-GST components (which we will create next)
import NGSalesPosHeader from "../components/sales/NGSalesPosHeader";
import NGSaleItemSection from "../components/sales/NGSalesItemSection";
import NGSaleSummarySection from "../components/sales/NGSalesSummarySection";
import ProductOverviewModal from "../components/products/ProductOverviewModal";

// ✅ Define the default payload using the new NON-GST type
const defaultSalePayload: NonGstSalePayload = {
  reference_no: "Auto Generated On Submit",
  payment_mode: "cash",
  note: "",
  paid_amount: 0,
  total_amount: 0,
  status: "paid",
  items: [],
  customer_id: null,
  discount: "0",
};

export default function NGSalesPos() {
  const navigate = useNavigate();

  // State for the main sale payload
  const [sale, setSale] = useState<NonGstSalePayload>(defaultSalePayload);
  const [loading, setLoading] = useState(false); // For customer search

  // State for product overview modal
  const [overviewModalOpen, setOverviewModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );

  // State for customer search and selection
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CustomerType[]>([]);
  const [_customerId, setCustomerId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  /**
   * ✅ Shortcut to toggle back to the main GST app
   */
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        navigate("/billing"); // Go back to the main POS
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [navigate]);

  /**
   * RESETS ALL FORM DATA
   */
  const resetForm = () => {
    setSale(defaultSalePayload);
    setQuery("");
    setOptions([]);
    setCustomerId(null);
    setCustomerName("");
    setCustomerPhone("");
    setAddress("");
    setCity("");
    setState("");
    setPincode("");
  };

  /**
   * Handles changes in items array
   */
  const handleItemsChange = (updatedItems: NonGstSaleItem[]) => {
    setSale((prev) => ({
      ...prev,
      items: updatedItems,
      total_amount: updatedItems.reduce((acc, item) => acc + item.price, 0),
    }));
  };

  /**
   * Search customers based on phone number or name
   */
  useEffect(() => {
    const timeout = setTimeout(async () => {
      const searchQuery = query.trim();
      if (searchQuery.length >= 3) {
        setLoading(true);
        try {
          const customersResponse = await getCustomers({
            query: searchQuery,
            all: true,
          });
          setOptions(customersResponse.records);
        } finally {
          setLoading(false);
        }
      } else {
        setOptions([]);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  /**
   * Handles Customer Select
   */
  const handleSelect = (customer: CustomerType | null) => {
    if (!customer) {
      resetForm();
      return;
    }
    setCustomerId(customer.id!);
    setCustomerName(customer.name || "");
    setCustomerPhone(customer.phone || "");
    setAddress(customer.address || "");
    setCity(customer.city || "");
    setState(customer.state || "");
    setPincode(customer.pincode || "");
    setSale((prev) => ({ ...prev, customer_id: customer.id! }));
  };

  const handleFieldChange = (field: keyof NonGstSalePayload, value: any) => {
    setSale((prevSale) => ({
      ...prevSale,
      [field]: value,
    }));
  };

  const handleOpenOverview = (productId: string) => {
    setSelectedProductId(productId);
    setOverviewModalOpen(true);
  };

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        backgroundColor: "#F4F6F8",

        minHeight: "100vh",
      }}
    >
      {/* ✅ Render the NEW Non-GST Header */}
      <NGSalesPosHeader
        options={options}
        loading={loading}
        customerName={customerName}
        selectedPhone={customerPhone}
        address={address}
        city={city}
        state={state}
        pincode={pincode}
        setCustomerName={setCustomerName}
        setQuery={setQuery}
        handleSelect={handleSelect}
        setSelectedPhone={setCustomerPhone}
        setAddress={setAddress}
        setCity={setCity}
        setState={setState}
        setPincode={setPincode}
      />

      {/* ✅ Render the NEW Non-GST Item Section */}
      <NGSaleItemSection
        items={sale.items}
        onItemsChange={handleItemsChange}
        onOpenOverview={handleOpenOverview}
      />

      <Divider sx={{ my: 2 }} />

      {/* ✅ Render the NEW Non-GST Summary Section */}
      <NGSaleSummarySection
        sale={sale}
        onSaleChange={handleFieldChange} // Pass the simple field changer
        customer={{
          name: customerName,
          phone: customerPhone,
          address,
          city,
          state,
          pincode,
        }}
        resetForm={resetForm}
      />

      <ProductOverviewModal
        open={overviewModalOpen}
        onClose={() => setOverviewModalOpen(false)}
        productId={selectedProductId || ""}
      />
    </Box>
  );
}
