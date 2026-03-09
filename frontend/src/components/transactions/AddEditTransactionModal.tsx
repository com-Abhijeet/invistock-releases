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
import {
  getCustomers,
  fetchCustomerById as getCustomerById,
} from "../../lib/api/customerService";
import { getSuppliers, getSupplierById } from "../../lib/api/supplierService";
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
import {
  Search,
  Wallet,
  CheckCircle,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";

interface AddEditTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<Transaction> | null;
  disableTypeSelection?: boolean;
}

interface BillSummary {
  id: number;
  reference_no: string;
  total_amount: number;
  paid_amount?: number;
  payment_summary?: {
    total_paid: number;
    balance: number;
    status: string;
  };
}

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
  payment_mode: "cash",
};

// Helper for dynamic transaction options based on bill type
const getTransactionOptions = (billType: string) => {
  if (billType === "sale") {
    return [
      { value: "payment_in", label: "Receive Payment (Cash In)" },
      { value: "payment_out", label: "Issue Cash Refund (Cash Out)" },
      { value: "credit_note", label: "Process Return (Credit Note)" },
    ];
  }
  return [
    { value: "payment_out", label: "Send Payment (Cash Out)" },
    { value: "payment_in", label: "Receive Cash Refund (Cash In)" },
    { value: "debit_note", label: "Process Return (Debit Note)" },
  ];
};

export default function AddEditTransactionModal({
  open,
  onClose,
  onSuccess,
  initialData = defaultForm,
  disableTypeSelection = false,
}: AddEditTransactionModalProps) {
  const [form, setForm] = useState<Partial<Transaction>>(initialData || {});
  const [loading, setLoading] = useState(false);

  const [entityOptions, setEntityOptions] = useState<
    (CustomerType | SupplierType)[]
  >([]);
  const [billOptions, setBillOptions] = useState<any[]>([]);
  const [entityLoading, setEntityLoading] = useState(false);
  const [billLoading, setBillLoading] = useState(false);
  const [entityQuery, setEntityQuery] = useState("");

  const [selectedBillDetails, setSelectedBillDetails] =
    useState<BillSummary | null>(null);
  const [fetchingBillDetails, setFetchingBillDetails] = useState(false);

  const isEditMode = !!initialData?.id;

  // Sync initial data
  useEffect(() => {
    if (!open) return;
    setForm(initialData || defaultForm);
    setSelectedBillDetails(null);
  }, [open, initialData]);

  // Fetch Specific Entity on Mount
  useEffect(() => {
    const fetchInitialEntity = async () => {
      if (form.entity_id && form.entity_type) {
        if (entityOptions.some((e) => e.id === form.entity_id)) return;

        try {
          let data;
          if (form.entity_type === "customer") {
            const res = await getCustomerById(form.entity_id);
            data = res.data || res;
          } else {
            const res = await getSupplierById(form.entity_id);
            data = res || res;
          }

          if (data) {
            setEntityOptions((prev) => {
              if (prev.some((e) => e.id === data.id)) return prev;
              return [data, ...prev];
            });
          }
        } catch (error) {
          console.error("Failed to load initial entity details:", error);
        }
      }
    };

    if (open) fetchInitialEntity();
  }, [form.entity_id, form.entity_type, open]);

  // Fetch Entities List
  useEffect(() => {
    const fetchEntities = async () => {
      setEntityLoading(true);
      try {
        const params = { q: entityQuery, all: true };
        let res: any;
        if (form.entity_type === "customer") {
          res = await getCustomers(params);
          setEntityOptions((prev) => {
            const newRecords = res?.records || [];
            return [
              ...prev,
              ...newRecords.filter(
                (n: any) => !prev.some((p) => p.id === n.id),
              ),
            ];
          });
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
  }, [form.entity_type, entityQuery]);

  // Fetch Bills List
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
            filter: "custom",
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

    if (form.entity_id) {
      fetchBillsList();
    }
  }, [form.entity_id, form.entity_type]);

  // Fetch Bill Details
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
          response = await getSaleById(form.bill_id);
        } else if (form.bill_type === "purchase") {
          response = await getPurchaseById(String(form.bill_id));
        }

        const billData = response?.data || response;

        if (billData) {
          setSelectedBillDetails(billData);

          setBillOptions((prev) => {
            if (prev.some((b) => b.id === billData.id)) return prev;
            return [billData, ...prev];
          });

          if (!isEditMode) {
            const currentFormAmount = form.amount || 0;
            const pending =
              billData.payment_summary?.balance ??
              billData.total_amount - (billData.paid_amount || 0);

            // Auto-fill amount only if it's a standard payment (not a refund)
            const isStandardPayment =
              (form.type === "payment_in" && form.bill_type === "sale") ||
              (form.type === "payment_out" && form.bill_type === "purchase");

            if (currentFormAmount === 0 && pending > 0 && isStandardPayment) {
              handleChange("amount", pending);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch bill details", error);
      } finally {
        setFetchingBillDetails(false);
      }
    };

    fetchDetailedBill();
  }, [form.bill_id, form.bill_type, form.type]); // Re-run if type changes to re-evaluate auto-fill

  const handleChange = (field: keyof Transaction, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBillTypeChange = (newBillType: BillType) => {
    const newEntityType = newBillType === "sale" ? "customer" : "supplier";
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
      entity_id: undefined,
      bill_id: undefined,
      amount: 0,
      payment_mode: "cash",
    }));

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

  const handleBillSelect = (bill: any | null) => {
    if (bill) {
      handleChange("bill_id", bill.id);
    } else {
      handleChange("bill_id", null);
    }
  };

  const selectedEntity =
    entityOptions.find((e) => e.id === form.entity_id) || null;
  const selectedBillOption =
    billOptions.find((b) => b.id === form.bill_id) || null;
  const isGSTRequired =
    form.type === "credit_note" || form.type === "debit_note";

  // --- RECONCILIATION LOGIC FOR PREVIEWS ---
  const previewBalance =
    selectedBillDetails?.payment_summary?.balance ??
    (selectedBillDetails?.total_amount || 0) -
      (selectedBillDetails?.paid_amount || 0);

  const totalPaidSoFar =
    selectedBillDetails?.payment_summary?.total_paid ??
    (selectedBillDetails?.paid_amount || 0);

  // Is this a standard debt payment or a cash refund?
  const isStandardPayment =
    (form.type === "payment_in" && form.bill_type === "sale") ||
    (form.type === "payment_out" && form.bill_type === "purchase");

  const isRefund =
    (form.type === "payment_out" && form.bill_type === "sale") ||
    (form.type === "payment_in" && form.bill_type === "purchase");

  // Validations
  const isFullyPaid = Boolean(
    selectedBillDetails &&
    isStandardPayment &&
    previewBalance <= 0.1 &&
    !isEditMode,
  );

  const isOverpaying = Boolean(
    selectedBillDetails &&
    isStandardPayment &&
    (form.amount || 0) > previewBalance &&
    !isEditMode &&
    !isFullyPaid,
  );

  const isOverRefund = Boolean(
    selectedBillDetails &&
    isRefund &&
    (form.amount || 0) > totalPaidSoFar &&
    !isEditMode,
  );

  const handleSubmit = async () => {
    if (!form.type || !form.entity_id || !form.bill_id) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!form.amount && !isFullyPaid) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (isGSTRequired && form.gst_amount == null) {
      toast.error("Please enter the tax/GST amount for this note.");
      return;
    }

    if (isFullyPaid) {
      toast.error(
        "This bill is already fully paid. No further payments can be recorded.",
      );
      return;
    }
    if (isOverpaying) {
      toast.error(
        `Amount exceeds the pending balance (₹${previewBalance.toLocaleString("en-IN")}).`,
      );
      return;
    }
    if (isOverRefund) {
      toast.error(
        `Refund exceeds the net paid amount (₹${totalPaidSoFar.toLocaleString("en-IN")}). You cannot refund money you haven't received.`,
      );
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
        toast.success("Transaction recorded successfully!");
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const currentOptions = getTransactionOptions(form.bill_type || "sale");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditMode ? "Edit Transaction" : "Record Payment / Transaction"}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ p: 1 }}>
          <Stack direction="row" spacing={2}>
            <FormControl fullWidth size="small" disabled={disableTypeSelection}>
              <InputLabel>Bill Context</InputLabel>
              <Select
                value={form.bill_type || ""}
                label="Bill Context"
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

            <FormControl fullWidth size="small" disabled={disableTypeSelection}>
              <InputLabel>Transaction Action</InputLabel>
              <Select
                value={form.type || ""}
                label="Transaction Action"
                onChange={(e) =>
                  handleChange("type", e.target.value as TransactionType)
                }
              >
                {currentOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

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
            disabled={disableTypeSelection && !!form.entity_id}
            isOptionEqualToValue={(option, value) => option.id === value.id}
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
                    <Box sx={{ mr: 1, display: "flex" }}>
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

          <Autocomplete
            options={billOptions}
            loading={billLoading}
            getOptionLabel={(option) =>
              option.reference_no || `ID: ${option.id}`
            }
            value={selectedBillOption}
            onChange={(_, val) => handleBillSelect(val as any)}
            disabled={disableTypeSelection && !!form.bill_id}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Linked Bill"
                size="small"
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

          {fetchingBillDetails ? (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            selectedBillDetails && (
              <Card
                variant="outlined"
                sx={{
                  bgcolor: isRefund ? "error.50" : "action.hover",
                  borderColor: isRefund ? "error.main" : "divider",
                }}
              >
                <CardContent
                  sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    {isRefund ? (
                      <RotateCcw size={16} color="error" />
                    ) : (
                      <Wallet size={16} />
                    )}
                    <Typography
                      variant="subtitle2"
                      fontWeight={700}
                      color={isRefund ? "error.main" : "text.primary"}
                    >
                      {isRefund
                        ? "Refund Eligibility Status"
                        : "Bill Payment Status"}
                    </Typography>
                  </Stack>
                  <Divider sx={{ mb: 1.5 }} />

                  {isRefund ? (
                    // Refund Context Display
                    <Stack direction="row" justifyContent="space-between">
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Net Billed
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                          ₹
                          {selectedBillDetails.total_amount?.toLocaleString(
                            "en-IN",
                          ) ?? 0}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography variant="caption" color="text.secondary">
                          Net Paid by Entity (Max Refund)
                        </Typography>
                        <Typography
                          variant="body1"
                          color="success.main"
                          fontWeight={800}
                        >
                          ₹{totalPaidSoFar.toLocaleString("en-IN")}
                        </Typography>
                      </Box>
                    </Stack>
                  ) : (
                    // Standard Payment Context Display
                    <Stack direction="row" justifyContent="space-between">
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Net Billed
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                          ₹
                          {selectedBillDetails.total_amount?.toLocaleString(
                            "en-IN",
                          ) ?? 0}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Net Paid
                        </Typography>
                        <Typography
                          variant="body2"
                          color="success.main"
                          fontWeight={700}
                        >
                          ₹{totalPaidSoFar.toLocaleString("en-IN")}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography variant="caption" color="text.secondary">
                          Pending Balance
                        </Typography>
                        <Typography
                          variant="body1"
                          color={
                            previewBalance <= 0 ? "success.main" : "error.main"
                          }
                          fontWeight={800}
                        >
                          ₹
                          {previewBalance <= 0
                            ? "0.00 (PAID)"
                            : previewBalance.toLocaleString("en-IN")}
                        </Typography>
                      </Box>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            )
          )}

          {isFullyPaid && (
            <Alert icon={<CheckCircle fontSize="inherit" />} severity="success">
              This bill is already fully paid. No further payment action is
              needed.
            </Alert>
          )}

          <TextField
            fullWidth
            label="Transaction Amount"
            type="number"
            size="small"
            required
            value={form.amount || ""}
            onChange={(e) => handleChange("amount", Number(e.target.value))}
            error={isOverpaying || isOverRefund}
            helperText={
              isOverpaying
                ? `Error: Amount exceeds pending balance of ₹${previewBalance.toLocaleString("en-IN")}`
                : isOverRefund
                  ? `Error: Cannot refund more than the Net Paid amount of ₹${totalPaidSoFar.toLocaleString("en-IN")}`
                  : ""
            }
            disabled={isFullyPaid}
            sx={{
              "& input": {
                fontSize: "1.1rem",
                fontWeight: 600,
                color: isRefund ? "error.main" : "inherit",
              },
            }}
          />

          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              label="Date"
              type="date"
              size="small"
              value={form.transaction_date || ""}
              onChange={(e) => handleChange("transaction_date", e.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={isFullyPaid}
            />

            {(form.type === "payment_in" || form.type === "payment_out") && (
              <FormControl fullWidth size="small">
                <InputLabel>Payment Mode</InputLabel>
                <Select
                  value={form.payment_mode || "cash"}
                  label="Payment Mode"
                  disabled={isFullyPaid}
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

          {isGSTRequired && (
            <TextField
              fullWidth
              label="Tax/GST Component (₹)"
              type="number"
              size="small"
              value={form.gst_amount || ""}
              onChange={(e) =>
                handleChange("gst_amount", Number(e.target.value))
              }
            />
          )}

          <TextField
            fullWidth
            label="Notes / Remarks"
            multiline
            rows={2}
            size="small"
            value={form.note || ""}
            onChange={(e) => handleChange("note", e.target.value)}
            disabled={isFullyPaid}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={form.status || "pending"}
              label="Status"
              disabled={isFullyPaid}
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

        {(isOverpaying || isOverRefund) && (
          <Alert
            icon={<AlertCircle fontSize="inherit" />}
            severity="error"
            sx={{ mt: 2 }}
          >
            {isOverRefund
              ? "You cannot issue a refund larger than the cash you've received."
              : "You cannot pay more than the outstanding balance."}
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
          disabled={loading || isFullyPaid || isOverpaying || isOverRefund}
          color={isOverpaying || isOverRefund ? "error" : "primary"}
          sx={{ minWidth: 120 }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
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
