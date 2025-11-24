import { useState, useEffect } from "react";
import { Box, Divider } from "@mui/material";
import { getCustomers } from "../lib/api/customerService";
import type { CustomerType } from "../lib/types/customerTypes";
import SaleItemSection from "../components/sales/SaleItemSection";
import type { SaleItemPayload, SalePayload } from "../lib/types/salesTypes";
import SaleSummarySection from "../components/sales/SaleSummarySection";
import { useParams } from "react-router-dom";
import { getSaleById } from "../lib/api/salesService";
import SalesPosHeaderSection from "../components/sales/SalesPosHeaderSection";
import ProductOverviewModal from "../components/products/ProductOverviewModal";
import theme from "../../theme";

// Define the default payload to avoid duplication
const defaultSalePayload: SalePayload = {
  reference_no: "",
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

  // State for the main sale payload
  const [sale, setSale] = useState<SalePayload>(defaultSalePayload);

  // State for UI mode and data loading
  const [mode, setMode] = useState<"new" | "view">("new");
  const [loading, setLoading] = useState(false);
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
  const resetForm = async () => {
    const newRef = "Auto Generated On Submit";
    setSale({
      ...defaultSalePayload,
      reference_no: newRef,
    });

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
  };

  /*
   * SET Action Mode Based On Params
   * View OR EDIT
   */
  useEffect(() => {
    if (action === "view") setMode("view");
    else setMode("new");
  }, [action]);

  /*
   * Fetches Sale based on Mode
   * If Mode === View Fetch sale and fill in data
   */
  useEffect(() => {
    const loadSale = async () => {
      if (mode === "view" && id) {
        const saleData = await getSaleById(Number(id));

        if (saleData) {
          setSale(saleData.data);
          setCustomerName(saleData.data.customer_name || "");
          setCustomerPhone(saleData.data.customer_phone || "");
          setCustomerGstNo(saleData.data.customer_gstin || "");
          setCustomerId(saleData.data.customer_id || 0);
        }
      }
    };
    loadSale();
  }, [mode, id]);

  /*
   * Clear Sale If Mode Changes to new
   * Helps clear states when navigating from View to Create or New Mode
   */
  useEffect(() => {
    const clearSale = async () => {
      if (mode === "new") {
        setSale(defaultSalePayload);
        resetForm();
      }
    };
    clearSale();
  }, [mode]);

  /*
   *GENERATE REFERENCE NUMBER BASED ON BACKEND DATA
   *REFERENCE = OLD REF + 1
   */
  useEffect(() => {
    const setInitialReference = async () => {
      if (mode === "new") {
        const ref = "Auto Generated On Submit";
        setSale((prevSale) => ({
          ...prevSale,
          reference_no: ref,
        }));
      }
    };
    setInitialReference();
  }, [mode]);

  /*
   *Handles changes in items array
   */
  const handleItemsChange = (updatedItems: SaleItemPayload[]) => {
    setSale((prev) => ({
      ...prev,
      items: updatedItems,
      total_amount: updatedItems.reduce((acc, item) => acc + item.price, 0),
    }));
  };

  /*
   *search customers based on phone number or name
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

  /*
   * Handles Customer Select
   */
  const handleSelect = (customer: CustomerType | null) => {
    if (!customer) {
      resetForm();
      return;
    }

    const id = customer.id!;

    // Set basic details
    setCustomerId(id);
    setCustomerName(customer.name || "");
    setCustomerPhone(customer.phone || "");
    setCustomerGstNo(customer.gst_no || "");

    // Set the new address fields
    setAddress(customer.address || "");
    setCity(customer.city || "");
    setState(customer.state || "");
    setPincode(customer.pincode || "");

    // Update the main sale object with the customer's ID
    setSale((prev) => ({
      ...prev,
      customer_id: id,
    }));
  };

  /*
   * Reset Sales Data After Success
   */
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
      p={2}
      pt={3}
      sx={{
        backgroundColor: theme.palette.background.default,
      }}
      minHeight={"100vh"}
    >
      {/* --------------------------- HEADER SECTION --------------------------- */}
      <SalesPosHeaderSection
        sale={sale}
        options={options}
        loading={loading}
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

      {/* Sale Items */}
      <SaleItemSection
        items={sale.items}
        onItemsChange={handleItemsChange}
        mode={mode}
        onOpenOverview={handleOpenOverview}
      />

      <Divider sx={{ my: 2 }} />

      {/* Summary Section */}
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

      <ProductOverviewModal
        open={overviewModalOpen}
        onClose={() => setOverviewModalOpen(false)}
        productId={selectedProductId || ""}
      />
    </Box>
  );
}
