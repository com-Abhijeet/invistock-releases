"use client";
import { useEffect, useState } from "react";
import { Chip } from "@mui/material";
import { Printer, Eye, Users, Truck, Undo2, MessageCircle } from "lucide-react"; // ✅ Added MessageCircle
import type {
  SalesFilter,
  SalesTable as SalesTableType,
} from "../../lib/types/salesStatsTypes";
import { fetchSalesTable } from "../../lib/api/salesStatsService";
import DataTable from "../../components/DataTable";
import { useNavigate } from "react-router-dom";
import { getSaleById } from "../../lib/api/salesService";
import { getShopData } from "../../lib/api/shopService"; // ✅ Import getShopData
import { handlePrint } from "../../lib/handleInvoicePrint";
import toast from "react-hot-toast";

// ✅ Import the Return Modal and Types
import SalesReturnModal from "../sales/SalesReturnModal";
import type { SalePayload } from "../../lib/types/salesTypes";

interface SalesTableProps {
  filters: SalesFilter;
}

const SalesTable = ({ filters }: SalesTableProps) => {
  const [sales, setSales] = useState<SalesTableType[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const navigate = useNavigate();

  // ✅ State for the Return / Credit Note modal
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedSaleForReturn, setSelectedSaleForReturn] =
    useState<SalePayload | null>(null);

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
          toast.error(`Label print failed: ${err.message}`)
        );
    }, 1000);
  };

  const handleCustomerNavigation = async (saleId: number) => {
    const res = await getSaleById(saleId);
    navigate(`/customer/${res.data.customer_id}`);
  };

  // ✅ Handler to fetch full details and open Return Modal
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

  // ✅ NEW: Handler for WhatsApp Sharing
  const handleWhatsAppShare = async (saleId: number) => {
    const toastId = toast.loading("Preparing WhatsApp message...");
    try {
      // 1. Check connection status first
      const wsStatus = await window.electron.getWhatsAppStatus();
      if (wsStatus.status !== "ready") {
        toast.error("WhatsApp not connected. Please scan QR in Settings.", {
          id: toastId,
        });
        return;
      }

      // 2. Fetch Sale & Shop Data
      const [saleRes, shop] = await Promise.all([
        getSaleById(saleId),
        getShopData(),
      ]);
      const sale = saleRes.data;

      if (!sale || !shop) throw new Error("Could not fetch data");

      const phoneToSend = sale.customer_phone;
      if (!phoneToSend) {
        toast.error("Customer has no phone number.", { id: toastId });
        return;
      }

      // 3. Construct Message
      const nl = "\n";
      const itemsList = sale.items
        .map(
          (
            item: { product_name: any; quantity: number; rate: number },
            i: number
          ) =>
            `${i + 1}. ${item.product_name} x ${item.quantity} = ₹${(
              item.rate * item.quantity
            ).toLocaleString("en-IN")}`
        )
        .join(nl);

      const message =
        `*Invoice from ${shop.shop_name}*${nl}${nl}` +
        `Hello ${sale.customer_name || "Customer"},${nl}` +
        `Bill No: ${sale.reference_no}${nl}${nl}` +
        `*Items:*${nl}${itemsList}${nl}` +
        `------------------------------${nl}` +
        `*Total: ₹${sale.total_amount.toLocaleString("en-IN")}*${nl}` +
        `------------------------------${nl}` +
        `Thank you!`;

      // 4. Send Text
      const textRes = await window.electron.sendWhatsAppMessage(
        phoneToSend,
        message
      );

      if (textRes.success) {
        toast.success("Text message sent!", { id: toastId });

        // 5. Send PDF
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
    loadData(); // Refresh table to show updated status
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
        color = "error";
        break;
      case "cancelled":
        color = "error";
        break;
      case "draft":
        color = "default";
        break;
      default:
        color = "default";
    }

    return (
      <Chip
        label={status.replace("_", " ")}
        size="small"
        color={color}
        sx={{ textTransform: "capitalize" }}
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
      label: "Total Amount",
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
      icon: <MessageCircle size={18} color="#25D366" />, // WhatsApp green
      onClick: (row: SalesTableType) => handleWhatsAppShare(row.id),
    },
    {
      label: "Process Return / Credit Note",
      icon: <Undo2 size={18} />,
      onClick: (row: SalesTableType) => handleProcessReturn(row.id),
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
    </>
  );
};

export default SalesTable;
