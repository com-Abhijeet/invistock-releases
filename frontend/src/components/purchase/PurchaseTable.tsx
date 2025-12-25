"use client";

import { Box } from "@mui/material";
import { Edit, Delete, Eye, Tag } from "lucide-react"; // ✅ Import Tag icon
import { useEffect, useState } from "react";
import { getAllPurchases } from "../../lib/api/purchaseService";
import DataTable from "../DataTable";
import { useNavigate } from "react-router-dom";
import type { DashboardFilter } from "../../lib/types/inventoryDashboardTypes";
import BulkLabelPrintModal from "../BulkLabelPrintModal"; // ✅ Import the modal

interface PurchaseTableProps {
  filters: DashboardFilter & { query?: string; status?: string };
}

export default function PurchaseTable({ filters }: PurchaseTableProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [total, setTotal] = useState(0);

  // ✅ State for the bulk print modal
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(
    null
  );

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);

  // Destructure filters from props
  const { from, to, query: search, status = "all" } = filters;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getAllPurchases({
        page: page + 1,
        limit,
        search: search || "",
        status: status === "all" ? undefined : status,
        start_date: from || undefined,
        end_date: to || undefined,
      });
      setPurchases(res.data.data);
      setTotal(res.data.totalPages);
    } catch (error) {
      console.error("Failed to fetch purchases", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, status, from, to]);

  // ... (columns definition unchanged) ...
  const columns = [
    { key: "internal_ref_no", label: "Internal Inv No" },
    { key: "reference_no", label: "Reference No" },
    { key: "date", label: "Date" },
    { key: "supplier_name", label: "Supplier" },
    {
      key: "original_total",
      label: "Total",
      format: (val: number) => `₹${val?.toLocaleString("en-IN")}`,
    },
    {
      key: "original_paid",
      label: "Paid",
      format: (val: number) => `₹${val?.toLocaleString("en-IN")}`,
    },
    {
      key: "total_adjustments",
      label: "Adjustments",
      format: (val: number) => `₹${val?.toLocaleString("en-IN")}`,
    },
    { key: "status", label: "Status" },
  ];

  const actions = [
    {
      icon: <Eye size={16} />,
      label: "View",
      onClick: (row: any) => {
        navigate(`/purchase/view/${row.id}`);
      },
    },
    {
      icon: <Edit size={16} />,
      label: "Edit",
      onClick: (row: any) => {
        navigate(`/purchase/edit/${row.id}`);
      },
    },
    // ✅ ADDED: Print Labels Action
    {
      icon: <Tag size={16} />,
      label: "Print Labels",
      onClick: (row: any) => {
        setSelectedPurchaseId(row.id);
        setPrintModalOpen(true);
      },
    },
    {
      icon: <Delete size={16} />,
      label: "Delete",
      onClick: (row: any) => {
        console.log("Delete", row);
        // TODO: Implement delete logic
      },
    },
  ];

  return (
    <Box>
      <DataTable
        rows={purchases}
        columns={columns}
        actions={actions}
        loading={loading}
        total={total}
        page={page}
        rowsPerPage={limit}
        onPageChange={setPage}
        onRowsPerPageChange={(val) => {
          setLimit(val);
          setPage(0);
        }}
      />

      {/* ✅ Render the Bulk Label Print Modal */}
      <BulkLabelPrintModal
        open={printModalOpen}
        onClose={() => {
          setPrintModalOpen(false);
          setSelectedPurchaseId(null);
        }}
        purchaseId={selectedPurchaseId}
      />
    </Box>
  );
}
