"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box } from "@mui/material";

import { getCustomers } from "../lib/api/customerService";
import type { CustomerType } from "../lib/types/customerTypes";
import SalesOrderHeader from "../components/sales-orders/SalesOrderHeader";
import SalesOrderItemSection from "../components/sales-orders/SalesOrderItemSection";
import SalesOrderSummary from "../components/sales-orders/SalesOrderSummary";
import { getSalesOrderById } from "../lib/api/salesOrderService";
import type {
  SalesOrderPayload,
  SalesOrderItem,
} from "../lib/api/salesOrderService";
import theme from "../../theme";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext"; // ✅ Import Auth Context

// Reusing SalesPos structure for 1:1 parity
const defaultOrder: SalesOrderPayload = {
  status: "pending",
  customer_id: 0,
  total_amount: 0,
  items: [],
  created_by: "", // ✅ Will be populated dynamically
  reference_no: "",
};

export default function SalesOrderPage() {
  const { id, action } = useParams(); // /sales-orders/new or /sales-orders/:id/edit
  const navigate = useNavigate();
  const { user } = useAuth(); // ✅ Get current user

  const [order, setOrder] = useState<SalesOrderPayload>(defaultOrder);
  const [mode, setMode] = useState<"new" | "view" | "edit">("new");
  const [_loading, setLoading] = useState(false);

  // Customer Search Logic
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CustomerType[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Customer Form State (Lifted from Header)
  const [customerId, setCustomerId] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Initialize
  useEffect(() => {
    if (id && (action === "edit" || action === "view")) {
      setMode(action as any);
      setLoading(true);
      getSalesOrderById(Number(id))
        .then((res) => {
          if (res.data) {
            setOrder(res.data);
            // Hydrate Customer Fields
            setCustomerId(res.data.customer_id || 0);
            setCustomerName(res.data.customer_name || "");
            setCustomerPhone(res.data.customer_phone || "");
          }
        })
        .catch(() => toast.error("Failed to load order"))
        .finally(() => setLoading(false));
    } else {
      setMode("new");
      // ✅ Set created_by to logged in user's name
      setOrder({
        ...defaultOrder,
        created_by: user?.name || "Web User",
      });
    }
  }, [id, action, user?.name]); // Added user?.name dependency to update if auth loads late

  // Initial Customer Load (So dropdown isn't empty)
  useEffect(() => {
    setLoadingCustomers(true);
    getCustomers({ limit: 20 })
      .then((res) => {
        setOptions(res.records || []);
      })
      .finally(() => setLoadingCustomers(false));
  }, []);

  // Customer Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 0) {
        setLoadingCustomers(true);
        try {
          const res = await getCustomers({ query: query, limit: 10 });
          setOptions(res.records || []);
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingCustomers(false);
        }
      } else if (query === "") {
        // Optional: Reset to default list when cleared
        getCustomers({ limit: 20 }).then((res) =>
          setOptions(res.customers || [])
        );
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Handlers
  const handleFieldChange = (field: keyof SalesOrderPayload, value: any) => {
    setOrder((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectCustomer = (customer: CustomerType | null) => {
    if (customer) {
      setCustomerId(customer.id!);
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone);
      setOrder((prev) => ({ ...prev, customer_id: customer.id! }));
    } else {
      setCustomerId(0);
      setCustomerName("");
      setCustomerPhone("");
      setOrder((prev) => ({ ...prev, customer_id: null }));
    }
  };

  const handleItemsChange = (items: SalesOrderItem[]) => {
    const total = items.reduce((acc, item) => acc + item.price, 0);
    setOrder((prev) => ({ ...prev, items, total_amount: total }));
  };

  const resetForm = () => {
    // ✅ Reset with current user name
    setOrder({
      ...defaultOrder,
      created_by: user?.name || "Web User",
    });
    setCustomerId(0);
    setCustomerName("");
    setCustomerPhone("");
    navigate("/sales-order");
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px)",
        bgcolor: theme.palette.background.default,
      }}
    >
      {/* 1. Header */}
      <Box sx={{ p: 2, pb: 1, flexShrink: 0, zIndex: 10 }}>
        <SalesOrderHeader
          order={order}
          options={options}
          loading={loadingCustomers}
          mode={mode}
          // Props matching SalesPosHeader logic
          customerId={customerId}
          customerName={customerName}
          customerPhone={customerPhone}
          setCustomerName={(val) => {
            setCustomerName(val);
            setQuery(val);
          }}
          setCustomerPhone={setCustomerPhone}
          setCustomerId={setCustomerId}
          setQuery={setQuery}
          handleSelectCustomer={handleSelectCustomer}
          onFieldChange={handleFieldChange}
        />
      </Box>

      {/* 2. Items */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", px: 2, pb: 2 }}>
        <SalesOrderItemSection
          items={order.items}
          onItemsChange={handleItemsChange}
          mode={mode}
        />
      </Box>

      {/* 3. Summary */}
      <Box
        sx={{
          flexShrink: 0,
          bgcolor: "white",
          borderTop: `1px solid ${theme.palette.divider}`,
          zIndex: 10,
        }}
      >
        <SalesOrderSummary
          order={{
            ...order,
            customer_name: customerName,
            customer_phone: customerPhone,
          }}
          onOrderChange={setOrder}
          onSuccess={resetForm}
          mode={mode}
        />
      </Box>
    </Box>
  );
}
