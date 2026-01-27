import { useState, useEffect } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Chip,
  Fab,
  Tooltip,
} from "@mui/material";
import {
  Save as SaveIcon,
  FolderOpen as FolderIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  History as HistoryIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import Grid from "@mui/material/GridLegacy";

import { getCustomers } from "../lib/api/customerService";
import type { CustomerType } from "../lib/types/customerTypes";
import SaleItemSection from "../components/sales/SaleItemSection";
import type { SaleItemPayload, SalePayload } from "../lib/types/salesTypes";
import SaleSummarySection from "../components/sales/SaleSummarySection";
import { useParams, useNavigate } from "react-router-dom";
import { getSaleById } from "../lib/api/salesService";
import { getSalesOrderById } from "../lib/api/salesOrderService";
import SalesPosHeaderSection from "../components/sales/SalesPosHeaderSection";
import ProductOverviewModal from "../components/products/ProductOverviewModal";
import theme from "../../theme";
import toast from "react-hot-toast";
import { api } from "../lib/api/api"; // Added for employee fetch

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
  employee_id: null, // Default
};

// --- DRAFT TYPES ---
interface CustomerDetails {
  id: number;
  name: string;
  phone: string;
  gst: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

interface SavedDraft {
  id: string;
  timestamp: number;
  customerDetails: CustomerDetails;
  salePayload: SalePayload;
}

// --- SHORTCUTS DATA (Sales Specific) ---
const SALES_SHORTCUTS = [
  {
    category: "Header Actions",
    shortcuts: [
      { keys: ["Ctrl", "B"], description: "Find Customer" },
      { keys: ["Ctrl", "D"], description: "Toggle Address Details" },
      { keys: ["Alt", "E"], description: "Select Salesperson" },
    ],
  },
  {
    category: "Item Actions",
    shortcuts: [
      { keys: ["Ctrl", "A"], description: "Add New Item Row" },
      { keys: ["Ctrl", "Del"], description: "Remove Active Row" },
      { keys: ["Alt", "P"], description: "Product Overview / Details" },
    ],
  },
  {
    category: "Summary / Saving",
    shortcuts: [
      { keys: ["Ctrl", "S"], description: "Complete & Save Sale" },
      { keys: ["Ctrl", "U"], description: "Full Payment (Paid in Full)" },
      { keys: ["Esc"], description: "Cancel Sale" },
    ],
  },
];

export default function SalesPos() {
  const { action, id } = useParams<{ action?: string; id?: string }>();
  const navigate = useNavigate();

  // State for the main sale payload
  const [sale, setSale] = useState<SalePayload>(defaultSalePayload);

  // State for UI mode and data loading
  const [mode, setMode] = useState<"new" | "view">("new");
  const [_loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Track if this sale is fulfilling a sales order
  const [_salesOrderId, setSalesOrderId] = useState<number | null>(null);

  // state for product overview modal
  const [overviewModalOpen, setOverviewModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
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

  // --- EMPLOYEE STATE ---
  const [employees, setEmployees] = useState<any[]>([]);

  // --- DRAFT STATE ---
  const [draftsModalOpen, setDraftsModalOpen] = useState(false);
  const [drafts, setDrafts] = useState<SavedDraft[]>([]);

  // --- SHORTCUT HELP MODAL STATE ---
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

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
    setSalesOrderId(null); // Reset order linking
    if (id) navigate("/billing");
  };

  useEffect(() => {
    // 1. Fetch Employees
    const fetchEmployees = async () => {
      try {
        const res = await api.get("/api/employees?activeOnly=true");
        if (res.data.success) {
          setEmployees(res.data.data);
        }
      } catch (e) {
        console.error("Failed to fetch employees", e);
      }
    };
    fetchEmployees();

    const init = async () => {
      // HANDLE VIEW MODE
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
      }
      // HANDLE CONVERT MODE (From Sales Order)
      else if (id && action === "convert") {
        setMode("new");
        setLoading(true);
        try {
          const res = await getSalesOrderById(Number(id));
          if (res && res.data) {
            const order = res.data;

            // Map Customer
            setCustomerId(order.customer_id || 0);
            setCustomerName(order.customer_name || "");
            setCustomerPhone(order.customer_phone || "");
            setCustomerGstNo(order.customer_gstin || "");
            setAddress(order.customer_address || "");

            // Track Origin Order ID
            setSalesOrderId(Number(id));

            // Map Items (Ensure types match SaleItemPayload)
            const mappedItems = (order.items || []).map(
              (item: any, idx: number) => ({
                ...item,
                sr_no: (idx + 1).toString(),
                id: undefined,
              }),
            );

            setSale({
              ...defaultSalePayload,
              customer_id: order.customer_id || 0,
              items: mappedItems,
              total_amount: order.total_amount || 0,
              note:
                order.note ||
                `Converted from Sales Order #${order.reference_no}`,
            });

            toast.success(`Loaded details from Order #${order.reference_no}`);
          } else {
            toast.error("Sales Order not found");
            navigate("/billing");
          }
        } catch (error) {
          console.error("Failed to load sales order", error);
          toast.error("Failed to load sales order");
        } finally {
          setLoading(false);
        }
      }
      // HANDLE NEW MODE
      else {
        setMode("new");
        if (sale.id) {
          resetForm();
        }
      }
    };
    init();

    // Load drafts from local storage on mount
    loadDraftsFromStorage();
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

  // --- DRAFT LOGIC ---

  const loadDraftsFromStorage = () => {
    try {
      const stored = localStorage.getItem("sales_pos_drafts");
      if (stored) {
        setDrafts(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load drafts", e);
    }
  };

  const saveDraft = () => {
    if (!sale.items.length && !customerName) {
      toast.error(
        "Cannot save an empty draft. Add items or select a customer.",
      );
      return;
    }

    const newDraft: SavedDraft = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      customerDetails: {
        id: customerId,
        name: customerName,
        phone: customerPhone,
        gst: customerGstNo,
        address,
        city,
        state,
        pincode,
      },
      salePayload: sale,
    };

    const updatedDrafts = [newDraft, ...drafts];
    setDrafts(updatedDrafts);
    localStorage.setItem("sales_pos_drafts", JSON.stringify(updatedDrafts));
    toast.success("Draft saved to local memory");
  };

  const deleteDraft = (draftId: string) => {
    const updatedDrafts = drafts.filter((d) => d.id !== draftId);
    setDrafts(updatedDrafts);
    localStorage.setItem("sales_pos_drafts", JSON.stringify(updatedDrafts));
    toast.success("Draft deleted");
  };

  const loadDraft = (draft: SavedDraft) => {
    // Restore Customer Details
    setCustomerId(draft.customerDetails.id);
    setCustomerName(draft.customerDetails.name);
    setCustomerPhone(draft.customerDetails.phone);
    setCustomerGstNo(draft.customerDetails.gst);
    setAddress(draft.customerDetails.address);
    setCity(draft.customerDetails.city);
    setState(draft.customerDetails.state);
    setPincode(draft.customerDetails.pincode);

    // Restore Sale Payload
    setSale(draft.salePayload);

    // UI Feedback
    setDraftsModalOpen(false);
    toast.success(
      `Draft for ${draft.customerDetails.name || "Unknown Customer"} loaded`,
    );
  };

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
      {/* --- HEADER (Fixed) --- */}
      <Box sx={{ p: 2, pb: 1, flexShrink: 0, zIndex: 10 }}>
        <SalesPosHeaderSection
          sale={sale}
          options={options}
          employees={employees} // ✅ Passed employees to header
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
          // Remove employees prop from here as it's now in the header
        />
      </Box>

      <ProductOverviewModal
        open={overviewModalOpen}
        onClose={() => setOverviewModalOpen(false)}
        productId={selectedProductId || ""}
      />

      {/* --- DRAFTING UI CONTROLS & SHORTCUT HELP --- */}
      <Box
        sx={{
          position: "absolute",
          bottom: 100,
          right: 24,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          zIndex: 20,
        }}
      >
        <Tooltip title="Keyboard Shortcuts" placement="left">
          <Fab
            size="small"
            onClick={() => setShortcutHelpOpen(true)}
            sx={{ bgcolor: "#fff" }}
          >
            <Typography variant="h6" fontWeight="bold">
              ?
            </Typography>
          </Fab>
        </Tooltip>

        {mode === "new" && (
          <>
            <Tooltip title="View Saved Drafts" placement="left">
              <Fab
                color="primary"
                size="medium"
                onClick={() => setDraftsModalOpen(true)}
              >
                <FolderIcon />
              </Fab>
            </Tooltip>

            <Tooltip title="Save Current Draft" placement="left">
              <Fab color="secondary" size="medium" onClick={saveDraft}>
                <SaveIcon />
              </Fab>
            </Tooltip>
          </>
        )}
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
            Sales Shortcuts
          </Typography>
          <IconButton onClick={() => setShortcutHelpOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {SALES_SHORTCUTS.map((group) => (
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

      {/* --- DRAFTS MODAL --- */}
      <Dialog
        open={draftsModalOpen}
        onClose={() => setDraftsModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Saved Drafts
          <Chip
            label={`${drafts.length} drafts`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </DialogTitle>
        <DialogContent dividers>
          {drafts.length === 0 ? (
            <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
              <HistoryIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
              <Typography>No drafts saved in local memory.</Typography>
            </Box>
          ) : (
            <List>
              {drafts.map((draft) => (
                <ListItem
                  key={draft.id}
                  sx={{
                    border: "1px solid #eee",
                    borderRadius: 2,
                    mb: 1,
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="subtitle1" fontWeight="bold">
                          {draft.customerDetails.name || "Unknown Customer"}
                        </Typography>
                        {draft.customerDetails.phone && (
                          <Typography variant="caption" color="text.secondary">
                            ({draft.customerDetails.phone})
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography
                          variant="body2"
                          component="span"
                          display="block"
                        >
                          {draft.salePayload.items.length} Items • Total: ₹
                          {draft.salePayload.total_amount}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Saved: {new Date(draft.timestamp).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Restore this draft">
                      <IconButton
                        edge="end"
                        color="primary"
                        onClick={() => loadDraft(draft)}
                        sx={{ mr: 1 }}
                      >
                        <RestoreIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete draft">
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => deleteDraft(draft.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDraftsModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
