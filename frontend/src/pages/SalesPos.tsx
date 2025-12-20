import { useState, useEffect } from "react";
import { Box } from "@mui/material";
import { getCustomers } from "../lib/api/customerService";
import type { CustomerType } from "../lib/types/customerTypes";
import SaleItemSection from "../components/sales/SaleItemSection";
import type { SaleItemPayload, SalePayload } from "../lib/types/salesTypes";
import SaleSummarySection from "../components/sales/SaleSummarySection";
import { useParams, useNavigate } from "react-router-dom";
import { getSaleById } from "../lib/api/salesService";
import SalesPosHeaderSection from "../components/sales/SalesPosHeaderSection";
import ProductOverviewModal from "../components/products/ProductOverviewModal";
import theme from "../../theme";
import toast from "react-hot-toast";

// Define the default payload to avoid duplication
const defaultSalePayload: SalePayload = {
  reference_no: "Auto Generated On Submit",
  payment_mode: "cash",
  note: "",
  paid_amount: 0,
  total_amount: 0,
  status: "pending",
  items: [],
  customer_id: 0,
  is_ecommerce_sale: false,
  is_quote: false,
  is_reverse_charge: false,
};

export default function SalesPos() {
  const { action, id } = useParams<{ action?: string; id?: string }>();
  const navigate = useNavigate();

  // State for the main sale payload
  const [sale, setSale] = useState<SalePayload>(defaultSalePayload);

  // State for UI mode and data loading
  const [mode, setMode] = useState<"new" | "view">(
    action === "view" ? "view" : "new"
  );
  const [_loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  //state for product overview modal
  const [overviewModalOpen, setOverviewModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );

  // State for customer search and selection
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CustomerType[]>([]);
  const [customerId, setCustomerId] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGstNo, setCustomerGstNo] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  /**
   * RESETS ALL FORM DATA
   */
  const resetForm = () => {
    setSale(defaultSalePayload);
    setQuery("");
    setOptions([]);
    setCustomerId(0);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerGstNo("");
    setAddress("");
    setCity("");
    setState("");
    setPincode("");
    setMode("new");
    if (id) navigate("/billing");
  };

  useEffect(() => {
    const init = async () => {
      if (id && action === "view") {
        setMode("view");
        setLoading(true);
        try {
          const res = await getSaleById(Number(id));
          if (res && res.data) {
            setSale(res.data);
            setCustomerId(res.data.customer_id || 0);
            setCustomerName(res.data.customer_name || "");
            setCustomerPhone(res.data.customer_phone || "");
            setCustomerGstNo(res.data.customer_gstin || "");
          } else {
            toast.error("Sale not found");
            navigate("/billing");
          }
        } catch (error) {
          console.error("Failed to load sale", error);
          toast.error("Failed to load sale details");
        } finally {
          setLoading(false);
        }
      } else {
        setMode("new");
        if (sale.id) {
          resetForm();
        }
      }
    };
    init();
  }, [id, action]);

  const handleItemsChange = (updatedItems: SaleItemPayload[]) => {
    setSale((prev) => ({
      ...prev,
      items: updatedItems,
      total_amount: updatedItems.reduce((acc, item) => acc + item.price, 0),
    }));
  };

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const searchQuery = query.trim();
      if (searchQuery.length >= 3) {
        try {
          const customersResponse = await getCustomers({
            query: searchQuery,
            all: true,
          });
          setOptions(customersResponse.records);
        } catch (e) {
          console.error(e);
        }
      } else {
        setOptions([]);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (customer: CustomerType | null) => {
    if (!customer) {
      setCustomerId(0);
      setCustomerName("");
      setCustomerPhone("");
      return;
    }
    const id = customer.id!;
    setCustomerId(id);
    setCustomerName(customer.name || "");
    setCustomerPhone(customer.phone || "");
    setCustomerGstNo(customer.gst_no || "");
    setAddress(customer.address || "");
    setCity(customer.city || "");
    setState(customer.state || "");
    setPincode(customer.pincode || "");
    setSale((prev) => ({ ...prev, customer_id: id }));
  };

  useEffect(() => {
    if (success) {
      resetForm();
      setSuccess(false);
    }
  }, [success]);

  const handleFieldChange = (field: keyof SalePayload, value: any) => {
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
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px)", // Adjust based on your Topbar height
        backgroundColor: theme.palette.background.default,
        overflow: "hidden",
      }}
    >
      {/* --- HEADER (Fixed) --- */}
      <Box sx={{ p: 2, pb: 1, flexShrink: 0, zIndex: 10 }}>
        <SalesPosHeaderSection
          sale={sale}
          options={options}
          loading={false}
          handleFieldChange={handleFieldChange}
          mode={mode}
          customerId={customerId}
          customerName={customerName}
          selectedPhone={customerPhone}
          customerGstNo={customerGstNo}
          address={address}
          city={city}
          state={state}
          pincode={pincode}
          setCustomerName={setCustomerName}
          setQuery={setQuery}
          setCustomerId={setCustomerId}
          handleSelect={handleSelect}
          setSelectedPhone={setCustomerPhone}
          setCustomerGstNo={setCustomerGstNo}
          setAddress={setAddress}
          setCity={setCity}
          setState={setState}
          setPincode={setPincode}
        />
      </Box>

      {/* --- ITEMS (Scrollable) --- */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          px: 2,
          pb: 2,
          // Custom scrollbar for cleaner look
          "&::-webkit-scrollbar": { width: "6px" },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#ddd",
            borderRadius: "4px",
          },
        }}
      >
        <SaleItemSection
          items={sale.items}
          onItemsChange={handleItemsChange}
          mode={mode}
          onOpenOverview={handleOpenOverview}
        />
      </Box>

      {/* --- SUMMARY (Fixed Bottom) --- */}
      <Box
        sx={{
          flexShrink: 0,
          backgroundColor: "#fff",
          borderTop: `1px solid ${theme.palette.divider}`,
          zIndex: 10,
        }}
      >
        <SaleSummarySection
          sale={sale}
          onSaleChange={setSale}
          setSuccess={setSuccess}
          customer={{
            name: customerName,
            phone: customerPhone,
            address: address,
            city: city,
            state: state,
            pincode: pincode,
            gst_no: customerGstNo,
          }}
          resetForm={resetForm}
          mode={mode}
        />
      </Box>

      <ProductOverviewModal
        open={overviewModalOpen}
        onClose={() => setOverviewModalOpen(false)}
        productId={selectedProductId || ""}
      />
    </Box>
  );
}
