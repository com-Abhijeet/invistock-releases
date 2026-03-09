"use client";
import { useEffect, useState } from "react";
import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Stack,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  alpha,
  useTheme,
} from "@mui/material";
import {
  Printer,
  Eye,
  Users,
  Truck,
  Undo2,
  MessageCircle,
  Wallet,
  Pencil,
  Banknote,
} from "lucide-react";
import type {
  SalesFilter,
  SalesTable as SalesTableType,
} from "../../lib/types/salesStatsTypes";
import { fetchSalesTable } from "../../lib/api/salesStatsService";
import DataTable from "../../components/DataTable";
import { useNavigate } from "react-router-dom";
import { getSaleById } from "../../lib/api/salesService";
import { getShopData } from "../../lib/api/shopService";
import { handlePrint } from "../../lib/handleInvoicePrint";
import { getBusinessProfile } from "../../lib/api/businessService";
import { api } from "../../lib/api/api";
import toast from "react-hot-toast";

// Import the Return Modal and Types
import SalesReturnModal from "../sales/SalesReturnModal";
import type { SalePayload } from "../../lib/types/salesTypes";

// ✅ Import transaction service to securely fetch bill transactions
import { getRelatedTransactions } from "../../lib/api/transactionService";

interface SalesTableProps {
  filters: SalesFilter;
  onMarkPayment?: (sale: SalesTableType) => void;
}

const SalesTable = ({ filters, onMarkPayment }: SalesTableProps) => {
  const theme = useTheme();
  const [sales, setSales] = useState<SalesTableType[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);
  const navigate = useNavigate();

  // State for the Return / Credit Note modal
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedSaleForReturn, setSelectedSaleForReturn] =
    useState<SalePayload | null>(null);

  // State for the Settlement Modal
  const [settleModal, setSettleModal] = useState<{
    open: boolean;
    loading: boolean;
    sale: any | null;
    pendingRefund: number;
    paymentMode: string;
  }>({
    open: false,
    loading: false,
    sale: null,
    pendingRefund: 0,
    paymentMode: "cash",
  });

  const loadData = async () => {
    setLoading(true);
    const data = await fetchSalesTable({
      ...filters,
      page: page + 1,
      limit: rowsPerPage,
    });

    if (data) {
      setSales(data.records || []);
      setTotalRecords(data.totalRecords || 0);
    } else {
      setSales([]);
      setTotalRecords(0);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, rowsPerPage]);

  const handleSalePrint = async (id: number) => {
    const res = await getSaleById(id);
    handlePrint(res.data);
  };

  const handleShippingLablePrint = async (id: number) => {
    const res = await getSaleById(id);
    setTimeout(() => {
      window.electron.ipcRenderer
        .invoke("print-shipping-label", res.data)
        .catch((err: { message: any }) =>
          toast.error(`Label print failed: ${err.message}`),
        );
    }, 1000);
  };

  const handleCustomerNavigation = async (saleId: number) => {
    const res = await getSaleById(saleId);
    navigate(`/customer/${res.data.customer_id}`);
  };

  const handleProcessReturn = async (saleId: number) => {
    const toastId = toast.loading("Loading sale details...");
    try {
      const res = await getSaleById(saleId);
      if (res.data) {
        setSelectedSaleForReturn(res.data);
        setIsReturnModalOpen(true);
      }
      toast.dismiss(toastId);
    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error("Failed to load sale details.");
    }
  };

  // --- SETTLEMENT ACTION LOGIC (Using strict Transaction Service check) ---
  const handleOpenSettle = async (row: SalesTableType) => {
    setSettleModal((p) => ({
      ...p,
      open: true,
      loading: true,
      sale: row,
      pendingRefund: 0,
    }));

    try {
      // 1. Fetch exact transactions from backend service
      const txs = await getRelatedTransactions(row.id, "sale");
      console.log(txs);

      // 2. Fetch sale details to get the exact entity IDs and Gross amount
      const saleDetailsRes = await getSaleById(row.id);
      const saleDetails = saleDetailsRes.data;

      // 3. Rigorous CA calculation for pending refund directly from transaction records
      const cn = txs
        .filter(
          (t: any) =>
            t.type === "credit_note" &&
            t.status !== "deleted" &&
            t.status !== "cancelled",
        )
        .reduce((s: number, t: any) => s + t.amount, 0);
      const dn = txs
        .filter(
          (t: any) =>
            t.type === "debit_note" &&
            t.status !== "deleted" &&
            t.status !== "cancelled",
        )
        .reduce((s: number, t: any) => s + t.amount, 0);
      const pIn = txs
        .filter(
          (t: any) =>
            t.type === "payment_in" &&
            t.status !== "deleted" &&
            t.status !== "cancelled",
        )
        .reduce((s: number, t: any) => s + t.amount, 0);
      const pOut = txs
        .filter(
          (t: any) =>
            t.type === "payment_out" &&
            t.status !== "deleted" &&
            t.status !== "cancelled",
        )
        .reduce((s: number, t: any) => s + t.amount, 0);

      const netBilled = (saleDetails.total_amount || 0) + dn - cn;
      const netPaid = pIn - pOut;

      // Calculate true outstanding balance
      const balance = netBilled - netPaid;

      // We only owe a refund if the balance is strictly negative
      const pendingRefund = balance < -0.01 ? Math.abs(balance) : 0;

      setSettleModal((p) => ({
        ...p,
        loading: false,
        sale: saleDetails,
        pendingRefund: parseFloat(pendingRefund.toFixed(2)),
      }));
    } catch (e) {
      toast.error("Failed to load settlement details");
      setSettleModal((p) => ({ ...p, open: false, loading: false }));
    }
  };

  const handleAcceptSettlement = async () => {
    if (!settleModal.sale) return;
    try {
      setSettleModal((p) => ({ ...p, loading: true }));
      await api.post("/api/transactions", {
        type: "payment_out",
        bill_type: "sale",
        bill_id: settleModal.sale.id,
        entity_type: "customer",
        entity_id: settleModal.sale.customer_id,
        amount: settleModal.pendingRefund,
        payment_mode: settleModal.paymentMode,
        transaction_date: new Date().toISOString().split("T")[0],
        status: "paid",
        note: `Settled pending refund for Bill #${settleModal.sale.reference_no}`,
      });
      toast.success("Settlement payout recorded successfully!");
      setSettleModal((p) => ({ ...p, open: false }));
      loadData();
    } catch (e: any) {
      toast.error(
        e.response?.data?.message || "Failed to record settlement payout.",
      );
      setSettleModal((p) => ({ ...p, loading: false }));
    }
  };

  // --- WHATSAPP SHARE LOGIC ---
  const handleWhatsAppShare = async (saleId: number) => {
    const toastId = toast.loading("Preparing WhatsApp message...");
    try {
      const wsStatus = await window.electron.getWhatsAppStatus();
      if (wsStatus.status !== "ready") {
        toast.error("WhatsApp not connected. Please scan QR in Settings.", {
          id: toastId,
        });
        return;
      }

      const [saleRes, shop, business] = await Promise.all([
        getSaleById(saleId),
        getShopData(),
        getBusinessProfile().catch(() => null),
      ]);
      const sale = saleRes.data;

      if (!sale || !shop) throw new Error("Could not fetch data");

      const phoneToSend = sale.customer_phone;
      if (!phoneToSend) {
        toast.error("Customer has no phone number.", { id: toastId });
        return;
      }

      let webLink = "";
      try {
        const invoiceData = {
          business_id: business?.kosh_business_id || "",
          shopName: shop.shop_name,
          shopAddress: shop.address_line1 || "",
          gstin: shop.gstin || "",
          invoiceNo: sale.reference_no,
          date: sale.created_at || Date.now(),
          customerName: sale.customer_name || "Customer",
          customerPhone: phoneToSend,
          items: sale.items.map((item: any) => ({
            name: item.product_name,
            qty: item.quantity,
            rate: item.rate,
            amount: item.quantity * item.rate,
            gst_rate: item.gst_rate || 0,
          })),
          subTotal: sale.items.reduce(
            (sum: number, item: any) => sum + item.quantity * item.rate,
            0,
          ),
          taxAmount: sale.total_tax || 0,
          discount: sale.discount || 0,
          totalAmount: sale.total_amount,
        };

        const uploadRes =
          await window.electron.uploadInvoiceToDrive(invoiceData);
        if (uploadRes && uploadRes.success) {
          webLink = `https://getkosh.co.in/invoice/web-view/${uploadRes.fileId}`;
        }
      } catch (e) {
        console.warn("Cloud link generation failed in table share", e);
      }

      const nl = "\n";
      let message = "";

      if (webLink) {
        message =
          `*${shop.shop_name}*${nl}${nl}` +
          `Hello ${sale.customer_name || "Customer"},${nl}${nl}` +
          `Thank you for shopping with us! 🙏${nl}${nl}` +
          `🧾 *View your detailed digital bill here:*${nl}` +
          `${webLink}${nl}${nl}` +
          `_Please find the PDF copy attached below._${nl}${nl}` +
          `_Powered by Kosh Billing_`;
      } else {
        const itemsList = sale.items
          .map(
            (
              item: { product_name: any; quantity: number; rate: number },
              i: number,
            ) =>
              `${i + 1}. ${item.product_name} x ${item.quantity} = ₹${(
                item.rate * item.quantity
              ).toLocaleString("en-IN")}`,
          )
          .join(nl);

        message =
          `*${shop.shop_name}*${nl}` +
          `Invoice Summary${nl}` +
          `———————————————${nl}${nl}` +
          `Hello ${sale.customer_name || "Customer"},${nl}${nl}` +
          `🧾 *Bill No:* ${sale.reference_no}${nl}` +
          `📅 *Date:* ${new Date(sale.created_at || Date.now()).toLocaleDateString("en-IN")}${nl}${nl}` +
          `*Items Purchased:*${nl}` +
          `${itemsList}${nl}${nl}` +
          `———————————————${nl}` +
          `*Total Amount:* ₹${sale.total_amount.toLocaleString("en-IN")}${nl}` +
          `———————————————${nl}${nl}` +
          `Thank you for shopping with us 🙏${nl}` +
          `Please find your invoice PDF attached.`;
      }

      const textRes = await window.electron.sendWhatsAppMessage(
        phoneToSend,
        message,
      );

      if (textRes.success) {
        toast.success("Text message sent!", { id: toastId });
        toast.loading("Sending PDF Invoice...", { id: toastId });
        const pdfRes = await window.electron.sendWhatsAppInvoicePdf({
          sale: sale,
          shop: shop,
          customerPhone: phoneToSend,
        });

        if (pdfRes.success) {
          toast.success("Invoice sent successfully!", { id: toastId });
        } else {
          toast.error("Failed to send PDF.", { id: toastId });
        }
      } else {
        toast.error("WhatsApp Text Failed: " + textRes.error, { id: toastId });
      }
    } catch (error: any) {
      console.error(error);
      toast.error("WhatsApp Error: " + (error.message || "Unknown error"), {
        id: toastId,
      });
    }
  };

  const handleReturnSuccess = () => {
    loadData();
    setIsReturnModalOpen(false);
    setSelectedSaleForReturn(null);
  };

  const getStatusChip = (status: string) => {
    const normalized = status?.toLowerCase();
    let color: any = "default";

    switch (normalized) {
      case "pending":
        color = "warning";
        break;
      case "paid":
        color = "success";
        break;
      case "partial_payment":
        color = "info";
        break;
      case "refunded":
        color = "secondary";
        break;
      case "returned":
      case "partially_returned":
        color = "error";
        break;
      case "cancelled":
        color = "error";
        break;
      default:
        color = "default";
    }

    return (
      <Chip
        label={status.replace("_", " ")}
        size="small"
        color={color}
        sx={{ textTransform: "capitalize", fontWeight: 700 }}
      />
    );
  };

  const columns = [
    {
      key: "reference",
      label: "Bill No",
      format: (val: string) => val || "-N/A-",
    },
    {
      key: "created_at",
      label: "Date",
      format: (val: string) => new Date(val).toLocaleDateString("en-IN"),
    },
    { key: "customer", label: "Customer" },
    {
      key: "total",
      label: "Gross Amount",
      format: (val: number) => `₹${val.toLocaleString("en-IN")}`,
    },
    {
      key: "paid_amount",
      label: "Amount Paid",
      format: (val: number) => `₹${(val ?? 0).toLocaleString("en-IN")}`,
    },
    {
      key: "payment_mode",
      label: "Payment Mode",
      format: (val: string) => val || "-",
    },
    {
      key: "status",
      label: "Status",
      format: (val: string) => getStatusChip(val || "Paid"),
    },
  ];

  const actions = [
    {
      label: "View Customer",
      icon: <Users size={18} />,
      onClick: (row: SalesTableType) => handleCustomerNavigation(row.id),
    },
    {
      label: "View Sale",
      icon: <Eye size={18} />,
      onClick: (row: SalesTableType) => navigate(`/billing/view/${row.id}`),
    },
    {
      label: "Edit Sale",
      icon: <Pencil size={18} />,
      onClick: (row: SalesTableType) => navigate(`/billing/edit/${row.id}`),
    },
    ...(onMarkPayment
      ? [
          {
            label: "Mark Payment",
            icon: <Wallet size={18} color={theme.palette.success.main} />,
            onClick: (row: SalesTableType) => onMarkPayment(row),
          },
        ]
      : []),
    {
      label: "Print Invoice",
      icon: <Printer size={18} />,
      onClick: (row: SalesTableType) => handleSalePrint(row.id),
    },
    {
      label: "Print Shipping Label",
      icon: <Truck size={18} />,
      onClick: (row: SalesTableType) => handleShippingLablePrint(row.id),
    },
    {
      label: "Send on WhatsApp",
      icon: <MessageCircle size={18} color="#25D366" />,
      onClick: (row: SalesTableType) => handleWhatsAppShare(row.id),
    },
    {
      label: "Process Return / Credit Note",
      icon: <Undo2 size={18} />,
      onClick: (row: SalesTableType) => handleProcessReturn(row.id),
    },
    {
      label: "Settle Store Credit (Refund)",
      icon: <Banknote size={18} color={theme.palette.error.main} />,
      onClick: (row: SalesTableType) => handleOpenSettle(row),
    },
  ];

  return (
    <>
      <DataTable
        rows={sales}
        columns={columns}
        actions={actions}
        loading={loading}
        total={totalRecords}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(val) => {
          setRowsPerPage(val);
          setPage(0);
        }}
      />

      {selectedSaleForReturn && (
        <SalesReturnModal
          open={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          sale={selectedSaleForReturn}
          onSuccess={handleReturnSuccess}
        />
      )}

      {/* --- SETTLEMENT MODAL --- */}
      <Dialog
        open={settleModal.open}
        onClose={() => setSettleModal((p) => ({ ...p, open: false }))}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Settle Refund</DialogTitle>
        <DialogContent dividers>
          {settleModal.loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : settleModal.pendingRefund > 0 ? (
            <Stack spacing={3} py={1}>
              <Typography variant="body2" color="text.secondary">
                This sale has a pending refund (Store Credit) due to a previous
                return or overpayment.
              </Typography>

              <Box
                bgcolor={alpha(theme.palette.error.main, 0.05)}
                p={2}
                borderRadius={2}
                border="1px dashed"
                borderColor="error.main"
                textAlign="center"
              >
                <Typography
                  variant="caption"
                  color="error.main"
                  fontWeight={800}
                  display="block"
                  gutterBottom
                >
                  PENDING REFUND AMOUNT
                </Typography>
                <Typography variant="h3" color="error.main" fontWeight={900}>
                  ₹
                  {settleModal.pendingRefund.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </Typography>
              </Box>

              <Typography variant="body2" fontWeight={600}>
                By accepting, you will instantly record a{" "}
                <b>Cash Payout (Refund)</b> to clear this balance from the
                customer's ledger.
              </Typography>

              <FormControl size="small" fullWidth>
                <InputLabel>Refund Payment Mode</InputLabel>
                <Select
                  value={settleModal.paymentMode}
                  label="Refund Payment Mode"
                  onChange={(e) =>
                    setSettleModal((p) => ({
                      ...p,
                      paymentMode: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="cash" sx={{ fontWeight: 600 }}>
                    CASH
                  </MenuItem>
                  <MenuItem value="upi" sx={{ fontWeight: 600 }}>
                    UPI
                  </MenuItem>
                  <MenuItem value="card" sx={{ fontWeight: 600 }}>
                    CARD
                  </MenuItem>
                  <MenuItem value="bank_transfer" sx={{ fontWeight: 600 }}>
                    BANK TRANSFER
                  </MenuItem>
                </Select>
              </FormControl>
            </Stack>
          ) : (
            <Alert severity="info" sx={{ mt: 1 }}>
              There is no pending refund or store credit for this bill. The
              balance is fully settled.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setSettleModal((p) => ({ ...p, open: false }))}
            color="inherit"
            disabled={settleModal.loading}
            sx={{ fontWeight: 700 }}
          >
            Cancel
          </Button>
          {settleModal.pendingRefund > 0 && !settleModal.loading && (
            <Button
              onClick={handleAcceptSettlement}
              variant="contained"
              color="error"
              disableElevation
              sx={{ fontWeight: 800 }}
            >
              Record Payout
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SalesTable;
