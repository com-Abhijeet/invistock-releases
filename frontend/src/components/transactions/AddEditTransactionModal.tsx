"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Autocomplete,
  CircularProgress,
  Card,
  CardContent,
  Stack,
  Divider,
  Alert,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  createTransaction,
  updateTransaction,
} from "../../lib/api/transactionService";
import { getCustomers } from "../../lib/api/customerService";
import { getSuppliers } from "../../lib/api/supplierService";
import {
  fetchCustomerSales as fetchSalesByCustomer,
  getSaleById,
} from "../../lib/api/salesService";
import {
  getPurchasesBySupplierId as fetchPurchasesBySupplier,
  getPurchaseById,
} from "../../lib/api/purchaseService";
import type {
  Transaction,
  TransactionStatus,
  TransactionType,
  BillType,
} from "../../lib/types/transactionTypes";
import type { CustomerType } from "../../lib/types/customerTypes";
import type { SupplierType } from "../../lib/types/supplierTypes";
import { Search, Wallet } from "lucide-react";
import toast from "react-hot-toast";

interface AddEditTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<Transaction> | null;
}

// Helper Types for Bill Preview
interface BillSummary {
  id: number;
  reference_no: string;
  total_amount: number;
  paid_amount?: number; // Legacy/Simple
  payment_summary?: {
    // Rigid Structure
    total_paid: number;
    balance: number;
    status: string;
  };
}

const transactionTypes: TransactionType[] = [
  "payment_in",
  "payment_out",
  "credit_note",
  "debit_note",
];
const billTypes: BillType[] = ["sale", "purchase"];
const paymentModes = ["cash", "card", "upi", "credit"];
const statuses = ["paid", "pending", "cancelled", "refunded", "issued"];

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const defaultForm: Partial<Transaction> = {
  type: "payment_in",
  bill_type: "sale",
  entity_type: "customer",
  status: "paid",
  amount: 0,
  transaction_date: formatDate(new Date()),
};

export default function AddEditTransactionModal({
  open,
  onClose,
  onSuccess,
  initialData = defaultForm,
}: AddEditTransactionModalProps) {
  const [form, setForm] = useState<Partial<Transaction>>(initialData || {});
  const [loading, setLoading] = useState(false);

  const [entityOptions, setEntityOptions] = useState<
    (CustomerType | SupplierType)[]
  >([]);
  const [billOptions, setBillOptions] = useState<Transaction[]>([]);
  const [entityLoading, setEntityLoading] = useState(false);
  const [billLoading, setBillLoading] = useState(false);
  const [entityQuery, setEntityQuery] = useState("");

  // New State for Bill Preview
  const [selectedBillDetails, setSelectedBillDetails] =
    useState<BillSummary | null>(null);
  const [fetchingBillDetails, setFetchingBillDetails] = useState(false);

  const isEditMode = !!initialData?.id;

  // Sync initial data
  useEffect(() => {
    if (!open) return;
    setForm(initialData || defaultForm);
    setSelectedBillDetails(null); // Reset preview on open
  }, [open, initialData]);

  // REMOVED: Auto-switch entity type based on bill type useEffect
  // This is now handled explicitly in handleBillTypeChange to prevent loops and unwanted resets on mount.

  // Fetch Entities (Customers/Suppliers)
  useEffect(() => {
    const fetchEntities = async () => {
      setEntityLoading(true);
      try {
        const params = { q: entityQuery, all: true };
        let res;
        if (form.entity_type === "customer") {
          res = await getCustomers(params);
          setEntityOptions(res?.records || []);
        } else if (form.entity_type === "supplier") {
          res = await getSuppliers();
          setEntityOptions(res || []);
        }
      } catch (e) {
        toast.error("Failed to fetch entities");
      } finally {
        setEntityLoading(false);
      }
    };
    const debounceTimeout = setTimeout(fetchEntities, 500);
    return () => clearTimeout(debounceTimeout);
  }, [form.entity_type, entityQuery, form.bill_type]);

  // Fetch List of Bills for Dropdown
  useEffect(() => {
    const fetchBillsList = async () => {
      if (!form.entity_id) {
        setBillOptions([]);
        return;
      }
      setBillLoading(true);
      try {
        let res;
        if (form.entity_type === "customer") {
          res = await fetchSalesByCustomer(form.entity_id, {
            page: 1,
            limit: 100,
            all: true,
            filter: "month", // Show recent bills by default
          });
          setBillOptions(res?.sales || []);
        } else if (form.entity_type === "supplier") {
          res = await fetchPurchasesBySupplier(form.entity_id, {
            filter: "month",
            page: 1,
            limit: 100,
            all: true,
          });
          setBillOptions(res.records || []);
        }
      } catch (e) {
        toast.error("Failed to fetch related bills list");
      } finally {
        setBillLoading(false);
      }
    };

    if (!isEditMode || initialData?.entity_id !== form.entity_id) {
      fetchBillsList();
    }
  }, [form.entity_id, form.entity_type]);

  // 💡 NEW: Fetch Specific Bill Details for Preview & Validation
  useEffect(() => {
    const fetchDetailedBill = async () => {
      if (!form.bill_id) {
        setSelectedBillDetails(null);
        return;
      }

      setFetchingBillDetails(true);
      try {
        let response: any;
        if (form.bill_type === "sale") {
          // You must ensure getSaleById is available and imported
          response = await getSaleById(form.bill_id);
        } else if (form.bill_type === "purchase") {
          response = await getPurchaseById(String(form.bill_id));
        }

        // 💡 Fix: Handle unwrapping if the response is { data: ... }
        const billData = response?.data || response;

        if (billData) {
          setSelectedBillDetails(billData);
          // Auto-fill amount if it's 0 or new entry (optional UX enhancement)
          if (!isEditMode && (!form.amount || form.amount === 0)) {
            const pending =
              billData.payment_summary?.balance ??
              billData.total_amount - (billData.paid_amount || 0);
            if (pending > 0) {
              handleChange("amount", pending);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch bill details", error);
        toast.error("Could not fetch bill details.");
      } finally {
        setFetchingBillDetails(false);
      }
    };

    fetchDetailedBill();
  }, [form.bill_id, form.bill_type]);

  const handleChange = (field: keyof Transaction, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // 💡 NEW: Explicit handler for Bill Type change to safely reset data
  const handleBillTypeChange = (newBillType: BillType) => {
    const newEntityType = newBillType === "sale" ? "customer" : "supplier";

    // Determine default transaction type if not editing
    let newTransactionType = form.type;
    if (!isEditMode) {
      newTransactionType =
        newBillType === "sale" ? "payment_in" : "payment_out";
    }

    setForm((prev) => ({
      ...prev,
      bill_type: newBillType,
      entity_type: newEntityType,
      type: newTransactionType,
      // Reset dependent fields to prevent data mismatch
      entity_id: undefined,
      bill_id: undefined,
      amount: 0,
      // Optional: clear gst_amount if switching logic requires it, but keeping simple
    }));

    // Clear derived UI states
    setSelectedBillDetails(null);
    setBillOptions([]);
    setEntityOptions([]);
    setEntityQuery("");
  };

  const handleEntitySelect = (entity: CustomerType | SupplierType | null) => {
    if (entity) {
      handleChange("entity_id", entity.id);
    } else {
      handleChange("entity_id", null);
      handleChange("bill_id", null);
    }
  };

  const handleBillSelect = (bill: Transaction | null) => {
    if (bill) {
      handleChange("bill_id", bill.id);
    } else {
      handleChange("bill_id", null);
    }
  };

  const handleSubmit = async () => {
    // Basic Frontend Validation
    if (
      !form.type ||
      !form.entity_id ||
      !form.amount ||
      !form.bill_id ||
      (form.type === "credit_note" && form.gst_amount == null) ||
      (form.type === "debit_note" && form.gst_amount == null)
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      if (isEditMode) {
        if (!initialData?.id) throw new Error("Transaction ID is missing.");
        await updateTransaction(initialData.id, form);
        toast.success("Transaction updated successfully!");
      } else {
        await createTransaction(form);
        toast.success("Transaction created successfully!");
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error(e);
      // 💡 Display the specific error message from the rigid backend logic
      toast.error(e.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedEntity =
    entityOptions.find((e) => e.id === form.entity_id) || null;
  const selectedBillOption =
    billOptions.find((b) => b.id === form.bill_id) || null;

  const isGSTRequired =
    form.type === "credit_note" || form.type === "debit_note";

  // Calculate Balance for Preview
  const previewBalance = selectedBillDetails?.payment_summary?.balance ?? 0;
  const isOverpaying =
    (form.amount || 0) > previewBalance &&
    (form.type === "payment_in" || form.type === "payment_out") &&
    !isEditMode; // Only warn on new entries to avoid locking existing data

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditMode ? "Edit Transaction" : "Add New Transaction"}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ p: 1 }}>
          {/* 1. Top Row: Bill Type & Transaction Type */}
          <Stack direction="row" spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Bill Type</InputLabel>
              <Select
                value={form.bill_type || ""}
                label="Bill Type"
                onChange={(e) =>
                  handleBillTypeChange(e.target.value as BillType)
                }
              >
                {billTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Transaction Type</InputLabel>
              <Select
                value={form.type || ""}
                label="Transaction Type"
                onChange={(e) =>
                  handleChange("type", e.target.value as TransactionType)
                }
              >
                {transactionTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.replace("_", " ").toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* 2. Entity Selection */}
          <Autocomplete
            options={entityOptions}
            loading={entityLoading}
            getOptionLabel={(option) =>
              typeof option === "string" ? option : option.name || "Unknown"
            }
            inputValue={entityQuery}
            value={selectedEntity}
            onInputChange={(_, val) => setEntityQuery(val)}
            onChange={(_, val) => handleEntitySelect(val as any)}
            renderInput={(params) => (
              <TextField
                {...params}
                label={
                  form.entity_type === "customer" ? "Customer" : "Supplier"
                }
                size="small"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <Box sx={{ mr: 1, display: "flex", alignItems: "center" }}>
                      <Search size={18} />
                    </Box>
                  ),
                  endAdornment: (
                    <>
                      {entityLoading && <CircularProgress size={20} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          {/* 3. Related Bill Selection */}
          <Autocomplete
            options={billOptions}
            loading={billLoading}
            getOptionLabel={(option) =>
              option.reference_no || `ID: ${option.id}`
            }
            value={selectedBillOption}
            onChange={(_, val) => handleBillSelect(val as any)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Bill to Link"
                size="small"
                helperText="Search by Reference No"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {billLoading && <CircularProgress size={20} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          {/* 💡 4. NEW: Bill Payment Preview Card */}
          {fetchingBillDetails ? (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            selectedBillDetails && (
              <Card variant="outlined" sx={{ bgcolor: "action.hover" }}>
                <CardContent
                  sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <Wallet size={16} />
                    <Typography variant="subtitle2" fontWeight={600}>
                      Bill Payment Status
                    </Typography>
                  </Stack>
                  <Divider sx={{ mb: 1.5 }} />
                  <Stack direction="row" justifyContent="space-between">
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total Bill
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        ₹
                        {selectedBillDetails.total_amount?.toLocaleString(
                          "en-IN"
                        ) ?? 0}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Already Paid
                      </Typography>
                      <Typography
                        variant="body2"
                        color="success.main"
                        fontWeight={700}
                      >
                        ₹
                        {selectedBillDetails.payment_summary?.total_paid?.toLocaleString(
                          "en-IN"
                        ) ?? 0}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="caption" color="text.secondary">
                        Pending Balance
                      </Typography>
                      <Typography
                        variant="body1"
                        color="error.main"
                        fontWeight={800}
                      >
                        ₹
                        {selectedBillDetails.payment_summary?.balance?.toLocaleString(
                          "en-IN"
                        ) ?? 0}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )
          )}

          {/* 5. Amount Input with Validation */}
          <TextField
            fullWidth
            label="Transaction Amount"
            type="number"
            size="small"
            required
            value={form.amount || ""}
            onChange={(e) => handleChange("amount", Number(e.target.value))}
            error={isOverpaying}
            helperText={
              isOverpaying
                ? `Warning: Amount exceeds pending balance of ₹${previewBalance}`
                : ""
            }
            sx={{
              "& input": { fontSize: "1.1rem", fontWeight: 600 },
            }}
          />

          {/* 6. Date & Mode */}
          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              label="Date"
              type="date"
              size="small"
              value={form.transaction_date || ""}
              onChange={(e) => handleChange("transaction_date", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            {(form.type === "payment_in" || form.type === "payment_out") && (
              <FormControl fullWidth size="small">
                <InputLabel>Mode</InputLabel>
                <Select
                  value={form.payment_mode || "cash"}
                  label="Mode"
                  onChange={(e) =>
                    handleChange("payment_mode", e.target.value as string)
                  }
                >
                  {paymentModes.map((mode) => (
                    <MenuItem key={mode} value={mode}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>

          {/* 7. GST Amount (Conditional) */}
          {isGSTRequired && (
            <TextField
              fullWidth
              label="Tax Amount (if applicable)"
              type="number"
              size="small"
              value={form.gst_amount || ""}
              onChange={(e) =>
                handleChange("gst_amount", Number(e.target.value))
              }
            />
          )}

          {/* 8. Notes */}
          <TextField
            fullWidth
            label="Notes / Remarks"
            multiline
            rows={2}
            size="small"
            value={form.note || ""}
            onChange={(e) => handleChange("note", e.target.value)}
          />

          {/* 9. Status */}
          <FormControl fullWidth size="small">
            <InputLabel>Transaction Status</InputLabel>
            <Select
              value={form.status || "pending"}
              label="Transaction Status"
              onChange={(e) =>
                handleChange("status", e.target.value as TransactionStatus)
              }
            >
              {statuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Global Error Alert */}
        {isOverpaying && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            You are attempting to pay more than the outstanding bill balance.
            The system may reject this transaction.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color={isOverpaying ? "warning" : "primary"}
          disabled={loading}
          sx={{ minWidth: 120 }}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : isEditMode ? (
            "Update"
          ) : (
            "Save"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
