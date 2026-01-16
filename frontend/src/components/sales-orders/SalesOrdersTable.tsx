"use client";

import { useEffect, useState } from "react";
import { Chip } from "@mui/material";
import { Edit, Eye, Trash2, FileText, CheckCircle } from "lucide-react";
import DataTable from "../../components/DataTable";
import { useNavigate } from "react-router-dom";
import {
  getAllSalesOrders,
  deleteSalesOrder,
} from "../../lib/api/salesOrderService";
import type { SalesOrderPayload } from "../../lib/api/salesOrderService";
import toast from "react-hot-toast";

interface Props {
  searchQuery?: string;
  statusFilter?: string;
}

export default function SalesOrdersTable({ searchQuery, statusFilter }: Props) {
  const [orders, setOrders] = useState<SalesOrderPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getAllSalesOrders({
        page: page + 1,
        limit: rowsPerPage,
        search: searchQuery,
        status: statusFilter,
      });

      if (res && res.data) {
        setOrders(res.data);
        setTotalRecords(res.total || res.data.length);
      } else {
        setOrders([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, searchQuery, statusFilter]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    try {
      await deleteSalesOrder(id);
      toast.success("Order deleted");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete order");
    }
  };

  const getStatusChip = (status: string) => {
    const normalized = status?.toLowerCase();
    let color: any = "default";

    switch (normalized) {
      case "pending":
        color = "warning";
        break;
      case "completed":
        color = "success";
        break;
      case "cancelled":
        color = "error";
        break;
      default:
        color = "default";
    }

    return (
      <Chip
        label={status}
        size="small"
        color={color}
        sx={{ textTransform: "capitalize", fontWeight: 600 }}
      />
    );
  };

  const columns = [
    {
      key: "reference_no",
      label: "Ref No",
      format: (val: string) => (
        <span style={{ fontWeight: 600 }}>{val || "—"}</span>
      ),
    },
    {
      key: "created_at",
      label: "Date",
      format: (val: string) =>
        val ? new Date(val).toLocaleDateString("en-IN") : "-",
    },
    { key: "customer_name", label: "Customer" },
    {
      key: "total_amount",
      label: "Total Amount",
      format: (val: number) => `₹${val.toLocaleString("en-IN")}`,
    },
    {
      key: "status",
      label: "Status",
      format: (val: string) => getStatusChip(val),
    },
    {
      key: "created_by",
      label: "Agent",
      format: (val: string) => val || "—",
    },
  ];

  const actions = [
    {
      label: "View Invoice",
      icon: <CheckCircle size={18} color="#2e7d32" />,
      // Navigate to View Invoice (Billing View)
      onClick: (row: any) =>
        navigate(`/billing/view/${row.fulfilled_invoice_id}`),
      // Only show if Completed AND has a linked invoice
      hidden: (row: any) =>
        row.status !== "completed" || !row.fulfilled_invoice_id,
      disabled: (row: any) => row.status !== "completed",
    },
    {
      label: "View Order",
      icon: <Eye size={18} />,
      onClick: (row: any) => navigate(`/view-sales-order/${row.id}`),
    },
    {
      label: "Edit Order",
      icon: <Edit size={18} />,
      onClick: (row: any) => navigate(`/sales-order/edit/${row.id}`),
      // Hide if completed or cancelled
      hidden: (row: any) =>
        row.status === "completed" || row.status === "cancelled",
      disabled: (row: any) =>
        row.status === "completed" || row.status === "cancelled",
    },
    {
      label: "Convert to Sale",
      icon: <FileText size={18} />,
      // Hide if already completed
      hidden: (row: any) =>
        row.status === "completed" || row.status === "cancelled",
      disabled: (row: any) =>
        row.status === "completed" || row.status === "cancelled",
      onClick: (row: any) => navigate(`/billing/convert/${row.id}`),
    },
    {
      label: "Delete",
      icon: <Trash2 size={18} />,
      onClick: (row: any) => handleDelete(row.id),
      // Prevent deleting completed orders if backend enforces it
      disabled: (row: any) => row.status === "completed",
    },
  ];

  return (
    <DataTable
      rows={orders}
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
  );
}
