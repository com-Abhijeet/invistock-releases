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
  CircularProgress,
  Card,
  CardContent,
  Stack,
  Divider,
  Alert,
} from "@mui/material";
import { useEffect, useState, useMemo } from "react";
import KeyboardNavForm from "../common/KeyboardNavForm";
import AutoSuggestInput, { AutoSuggestOption } from "../common/AutoSuggestInput";
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
  AlertCircle,
  RotateCcw,
  Printer,
} from "lucide-react";
import CheckPrintModal from "../ui/CheckPrintModal";
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
  const [form, setForm] = useState<Partial<Transaction>>({
    ...defaultForm,
    ...(initialData || {}),
    payment_mode: initialData?.payment_mode || "cash",
  });
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
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [lastSavedTransaction, setLastSavedTransaction] = useState<any>(null);

  const isEditMode = !!initialData?.id;

  // Sync initial data and reset transient state on modal open
  useEffect(() => {
    if (!open) return;
    setForm({
      ...defaultForm,
      ...(initialData || {}),
      payment_mode: initialData?.payment_mode || "cash",
    });
    setSelectedBillDetails(null);
    setLastSavedTransaction(null);
    setIsCheckModalOpen(false);
    setLoading(false);
    setEntityQuery("");
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
        let res: any;
        if (form.entity_type === "customer") {
          res = await getCustomers({ query: entityQuery, limit: 10, all: false });
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
    const debounceTimeout = setTimeout(fetchEntities, 150);
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
    console.log("Setting - ", field, "to : ", value);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBillTypeChange = (newBillType: BillType) => {
    if (newBillType === form.bill_type) return;

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
      if (entity.id === form.entity_id) return;
      handleChange("entity_id", entity.id);
    } else {
      if (form.entity_id === null) return;
      handleChange("entity_id", null);
      handleChange("bill_id", null);
    }
  };

  const handleBillSelect = (bill: any | null) => {
    if (bill) {
      if (bill.id === form.bill_id) return;
      handleChange("bill_id", bill.id);
    } else {
      if (form.bill_id === null) return;
      handleChange("bill_id", null);
    }
  };

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

    const {
      entity_name,
      entity_phone,
      entity_address,
      bill_ref_no,
      created_at,
      updated_at,
      ...cleanForm
    } = form as any;

    const submitPayload = {
      ...cleanForm,
      payment_mode: form.payment_mode || "cash",
    };

    setLoading(true);
    try {
      if (isEditMode) {
        if (!initialData?.id) throw new Error("Transaction ID is missing.");
        await updateTransaction(initialData.id, submitPayload);
        toast.success("Transaction updated successfully!");
        onSuccess();
        onClose();
      } else {
        const res = await createTransaction(submitPayload);
        setLastSavedTransaction(res);
        toast.success("Transaction recorded successfully!");
        // We don't close immediately if it's a payment out, giving user a chance to print check
        if (form.type === "payment_out") {
          // Stay open
          onSuccess();
        } else {
          onSuccess();
          onClose();
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const currentOptions = getTransactionOptions(form.bill_type || "sale");

  const billTypeOptions: AutoSuggestOption[] = useMemo(
    () => [
      { id: "sale", name: "Sale" },
      { id: "purchase", name: "Purchase" },
    ],
    [],
  );

  const actionOptions: AutoSuggestOption[] = useMemo(() => {
    return currentOptions.map((opt) => ({
      id: opt.value,
      name: opt.label,
    }));
  }, [currentOptions]);

  const entitySuggestOptions: AutoSuggestOption[] = useMemo(() => {
    return entityOptions.map((e: any) => ({
      id: e.id,
      name: e.name || "Unknown",
      code: e.phone || (e.tax_number ? `GST: ${e.tax_number}` : undefined),
    }));
  }, [entityOptions]);

  const billSuggestOptions: AutoSuggestOption[] = useMemo(() => {
    return billOptions.map((b: any) => ({
      id: b.id,
      name: b.reference_no
        ? `${b.reference_no} (₹${b.total_amount ?? 0})`
        : `Bill #${b.id} (₹${b.total_amount ?? 0})`,
      code: b.reference_no || String(b.id),
    }));
  }, [billOptions]);

  const paymentModeOptions: AutoSuggestOption[] = useMemo(
    () => [
      { id: "cash", name: "Cash" },
      { id: "card", name: "Card" },
      { id: "upi", name: "UPI" },
      { id: "credit", name: "Credit" },
    ],
    [],
  );

  const statusOptions: AutoSuggestOption[] = useMemo(
    () => [
      { id: "paid", name: "Paid" },
      { id: "pending", name: "Pending" },
      { id: "cancelled", name: "Cancelled" },
      { id: "refunded", name: "Refunded" },
      { id: "issued", name: "Issued" },
    ],
    [],
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <KeyboardNavForm
        onSave={handleSubmit}
        autoFocusFirst
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <DialogTitle>
          {isEditMode ? "Edit Transaction" : "Record Payment / Transaction"}
        </DialogTitle>
        <DialogContent dividers sx={{ overflowY: "auto" }}>
          <Stack spacing={2.5} sx={{ p: 1 }}>
            <Stack direction="row" spacing={2}>
              <Box sx={{ flex: 1 }}>
                <AutoSuggestInput
                  id="transaction-bill-type"
                  label="Bill Context"
                  value={form.bill_type || "sale"}
                  options={billTypeOptions}
                  placeholder="Select Bill Context"
                  disabled={disableTypeSelection}
                  allowCreate={false}
                  onChange={(val) => {
                    if (val) handleBillTypeChange(val as BillType);
                  }}
                />
              </Box>

              <Box sx={{ flex: 1 }}>
                <AutoSuggestInput
                  id="transaction-action-type"
                  label="Transaction Action"
                  value={form.type || ""}
                  options={actionOptions}
                  placeholder="Select Action"
                  disabled={disableTypeSelection}
                  allowCreate={false}
                  onChange={(val) => {
                    if (val) handleChange("type", val as TransactionType);
                  }}
                />
              </Box>
            </Stack>

            <AutoSuggestInput
              id="transaction-entity-select"
              label={form.entity_type === "customer" ? "Customer" : "Supplier"}
              value={form.entity_id || null}
              options={entitySuggestOptions}
              placeholder={`Search ${form.entity_type === "customer" ? "customer" : "supplier"}...`}
              disabled={disableTypeSelection && !!form.entity_id}
              allowCreate={false}
              onSearch={(query) => setEntityQuery(query)}
              InputProps={{
                startAdornment: (
                  <Box sx={{ mr: 1, display: "flex", color: "action.active" }}>
                    <Search size={18} />
                  </Box>
                ),
                endAdornment: entityLoading ? (
                  <CircularProgress size={18} />
                ) : undefined,
              }}
              onChange={(val) => {
                if (!val) {
                  handleEntitySelect(null);
                  return;
                }
                const selected = entityOptions.find(
                  (e) =>
                    e.id === val ||
                    e.name.toLowerCase() === String(val).toLowerCase(),
                );
                handleEntitySelect(selected || null);
              }}
            />

            <AutoSuggestInput
              id="transaction-linked-bill"
              label="Select Linked Bill"
              value={form.bill_id || null}
              options={billSuggestOptions}
              placeholder={
                form.entity_id
                  ? "Select or search bill..."
                  : "Select entity first"
              }
              disabled={
                (disableTypeSelection && !!form.bill_id) || !form.entity_id
              }
              allowCreate={false}
              InputProps={{
                endAdornment: billLoading ? (
                  <CircularProgress size={18} />
                ) : undefined,
              }}
              onChange={(val) => {
                if (!val) {
                  handleBillSelect(null);
                  return;
                }
                const selected = billOptions.find(
                  (b) =>
                    b.id === val ||
                    (b.reference_no && b.reference_no === val),
                );
                handleBillSelect(selected || null);
              }}
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
                        <Wallet size={16} color="primary" />
                      )}
                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        color={isRefund ? "error.main" : "primary.main"}
                      >
                        {isRefund ? "Refund Reference" : "Payment Reference"}
                      </Typography>
                    </Stack>

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Bill Amount
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          ₹
                          {(
                            selectedBillDetails.total_amount || 0
                          ).toLocaleString("en-IN")}
                        </Typography>
                      </Box>

                      <Divider orientation="vertical" flexItem />

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Net Paid
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={isRefund ? "info.main" : "text.primary"}
                        >
                          ₹{totalPaidSoFar.toLocaleString("en-IN")}
                        </Typography>
                      </Box>

                      <Divider orientation="vertical" flexItem />

                      <Box textAlign="right">
                        <Typography variant="caption" color="text.secondary">
                          Outstanding Balance
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color={
                            previewBalance > 0 ? "error.main" : "success.main"
                          }
                        >
                          ₹{Math.max(0, previewBalance).toLocaleString("en-IN")}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              )
            )}

            <TextField
              id="transaction-amount"
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
              <Box sx={{ flex: 1 }}>
                <TextField
                  id="transaction-date"
                  fullWidth
                  label="Date"
                  type="date"
                  size="small"
                  value={form.transaction_date || ""}
                  onChange={(e) => handleChange("transaction_date", e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  disabled={isFullyPaid}
                />
              </Box>

              {(form.type === "payment_in" || form.type === "payment_out") && (
                <Box sx={{ flex: 1 }}>
                  <AutoSuggestInput
                    id="transaction-payment-mode"
                    label="Payment Mode"
                    value={form.payment_mode || "cash"}
                    options={paymentModeOptions}
                    placeholder="Select Payment Mode"
                    disabled={isFullyPaid}
                    allowCreate={false}
                    onChange={(val) => {
                      if (val) handleChange("payment_mode", String(val));
                    }}
                  />
                </Box>
              )}
            </Stack>

            {isGSTRequired && (
              <TextField
                id="transaction-gst-amount"
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
              id="transaction-notes"
              fullWidth
              label="Notes / Remarks"
              multiline
              rows={2}
              size="small"
              value={form.note || ""}
              onChange={(e) => handleChange("note", e.target.value)}
              disabled={isFullyPaid}
            />

            <AutoSuggestInput
              id="transaction-status"
              label="Status"
              value={form.status || "pending"}
              options={statusOptions}
              placeholder="Select Status"
              disabled={isFullyPaid}
              allowCreate={false}
              onChange={(val) => {
                if (val) handleChange("status", val as TransactionStatus);
              }}
            />
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
          {lastSavedTransaction && form.type === "payment_out" && (
            <Button
              startIcon={<Printer size={18} />}
              onClick={() => setIsCheckModalOpen(true)}
              color="success"
              variant="outlined"
              sx={{ mr: "auto" }}
            >
              Print Cheque
            </Button>
          )}
          <Button
            data-nav-skip="true"
            onClick={() => {
              setLastSavedTransaction(null);
              onClose();
            }}
            color="inherit"
            disabled={loading}
          >
            {lastSavedTransaction ? "Close" : "Cancel"}
          </Button>
          {!lastSavedTransaction && (
            <Button
              id="transaction-submit-btn"
              data-save="true"
              type="button"
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
          )}
        </DialogActions>
      </KeyboardNavForm>

      <CheckPrintModal
        open={isCheckModalOpen}
        onClose={() => setIsCheckModalOpen(false)}
        initialData={{
          payee:
            (entityOptions.find((e) => e.id === form.entity_id) as any)?.name ||
            "",
          amount: form.amount || 0,
          date: form.transaction_date,
        }}
      />
    </Dialog>
  );
}
