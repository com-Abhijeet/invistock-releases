// src/components/transactions/AddEditTransactionModal.tsx
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
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  createTransaction,
  updateTransaction,
} from "../../lib/api/transactionService";
import { getCustomers } from "../../lib/api/customerService";
import { getSuppliers } from "../../lib/api/supplierService";
import { fetchCustomerSales as fetchSalesByCustomer } from "../../lib/api/salesService";
import { getPurchasesBySupplierId as fetchPurchasesBySupplier } from "../../lib/api/purchaseService";
import type {
  Transaction,
  TransactionStatus,
  TransactionType,
  BillType,
} from "../../lib/types/transactionTypes";
import type { CustomerType } from "../../lib/types/customerTypes";
import type { SupplierType } from "../../lib/types/supplierTypes";
import { Search } from "lucide-react";
import toast from "react-hot-toast";

interface AddEditTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<Transaction> | null;
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

  const isEditMode = !!initialData?.id;

  useEffect(() => {
    if (!open) return;
    setForm(initialData || defaultForm);
  }, [open, initialData]);

  useEffect(() => {
    if (form.bill_type === "sale") {
      handleChange("entity_type", "customer");
    } else if (form.bill_type === "purchase") {
      handleChange("entity_type", "supplier");
    }
  }, [form.bill_type]);

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

  useEffect(() => {
    const fetchBills = async () => {
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
            filter: "month",
          });
          setBillOptions(res?.sales || []);
        } else if (form.entity_type === "supplier") {
          res = await fetchPurchasesBySupplier(form.entity_id, {
            filter: "month",
            page: 1,
            limit: 100,
            all: true,
          });
          setBillOptions(res || []);
        }
      } catch (e) {
        toast.error("Failed to fetch related bills");
      } finally {
        setBillLoading(false);
      }
    };
    if (!isEditMode || initialData?.entity_id !== form.entity_id) {
      fetchBills();
    }
  }, [form.entity_id, form.entity_type]);

  const handleChange = (field: keyof Transaction, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEntitySelect = (entity: CustomerType | SupplierType | null) => {
    if (entity) {
      handleChange("entity_id", entity.id);
    } else {
      handleChange("entity_id", null);
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
    // 💡 Added check for gst_amount for specific transaction types
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
    } catch (e) {
      console.error(e);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedEntity =
    entityOptions.find((e) => e.id === form.entity_id) || null;
  const selectedBill = billOptions.find((b) => b.id === form.bill_id) || null;

  // 💡 Condition to show GST field
  const isGSTRequired =
    form.type === "credit_note" || form.type === "debit_note";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditMode ? "Edit Transaction" : "Add New Transaction"}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
          {/* Bill Type (Sale or Purchase) */}
          <FormControl fullWidth>
            <InputLabel>Bill Type</InputLabel>
            <Select
              value={form.bill_type || ""}
              label="Bill Type"
              onChange={(e) =>
                handleChange("bill_type", e.target.value as BillType)
              }
            >
              {billTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Transaction Date */}
          <TextField
            fullWidth
            label="Transaction Date"
            type="date"
            value={form.transaction_date || ""}
            onChange={(e) => handleChange("transaction_date", e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          {/* Type of Transaction */}
          <FormControl fullWidth>
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
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Entity Type - Autopopulated */}
          <Box>
            <Typography variant="caption" color="text.secondary">
              Entity Type (Based on Bill Type)
            </Typography>
            <TextField
              value={
                (form.entity_type || "").charAt(0).toUpperCase() +
                (form.entity_type || "").slice(1)
              }
              fullWidth
              disabled
            />
          </Box>

          {/* Entity Autocomplete */}
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

          {/* Related Bill */}
          <Autocomplete
            options={billOptions}
            loading={billLoading}
            getOptionLabel={(option) =>
              option.reference_no || `ID: ${option.id}`
            }
            value={selectedBill}
            onChange={(_, val) => handleBillSelect(val as any)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Related Bill"
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

          {/* Amount */}
          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={form.amount || ""}
            onChange={(e) => handleChange("amount", Number(e.target.value))}
          />

          {/* Payment Mode */}
          {(form.type === "payment_in" || form.type === "payment_out") && (
            <FormControl fullWidth>
              <InputLabel>Payment Mode</InputLabel>
              <Select
                value={form.payment_mode || "cash"}
                label="Payment Mode"
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

          {/* GST Amount for Credit/Debit Notes */}
          {isGSTRequired && (
            <TextField
              fullWidth
              label="GST Amount"
              type="number"
              value={form.gst_amount || ""}
              onChange={(e) =>
                handleChange("gst_amount", Number(e.target.value))
              }
            />
          )}

          {/* Status */}
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={form.status || "pending"}
              label="Status"
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading}
        >
          {isEditMode ? "Update" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
