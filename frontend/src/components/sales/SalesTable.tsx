"use client";
import { useEffect, useState } from "react";
import { Chip } from "@mui/material";
import { Printer, Eye, Users, Truck, Undo2 } from "lucide-react";
import type {
  SalesFilter,
  SalesTable as SalesTableType,
} from "../../lib/types/salesStatsTypes";
import { fetchSalesTable } from "../../lib/api/salesStatsService";
import DataTable from "../../components/DataTable";
import { useNavigate } from "react-router-dom";
import { getSaleById } from "../../lib/api/salesService";
import { handlePrint } from "../../lib/handleInvoicePrint";
// ✅ Import the new Return Modal
import SalesReturnModal from "../sales/SalesReturnModal";
import toast from "react-hot-toast";
import { SalePayload } from "../../lib/types/salesTypes";

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

  // ✅ State for the return modal
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
        .catch((err) => toast.error(`Label print failed: ${err.message}`));
    }, 1000);
  };

  const handleCustomerNavigation = async (saleId: number) => {
    const res = await getSaleById(saleId);
    navigate(`/customer/${res.data.customer_id}`);
  };

  // ✅ Handler for opening the return modal
  const handleReturnClick = async (saleId: number) => {
    try {
      const res = await getSaleById(saleId);
      setSelectedSaleForReturn(res.data);
      setIsReturnModalOpen(true);
    } catch (error) {
      toast.error("Failed to load sale details for return.");
    }
  };

  const handleReturnSuccess = () => {
    loadData(); // Refresh the table to show updated status
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
        break; // Distinct color for returns
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
    // ✅ REPLACED: "Update Status" with "Return / Credit Note"
    {
      label: "Process Return / Credit Note",
      icon: <Undo2 size={18} />, // Using a 'Undo' or 'Rotate-CCW' icon
      onClick: (row: SalesTableType) => handleReturnClick(row.id),
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

      {/* ✅ Render the SalesReturnModal */}
      {selectedSaleForReturn && (
        <SalesReturnModal
          open={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          onSuccess={handleReturnSuccess}
          sale={selectedSaleForReturn}
        />
      )}
    </>
  );
};

export default SalesTable;
