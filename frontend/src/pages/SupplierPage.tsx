/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Chip,
  CircularProgress,
  Button,
  IconButton,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import DataTable from "../components/DataTable";
import { getSupplierById } from "../lib/api/supplierService";
import { getEntityTransactions } from "../lib/api/transactionService";
import type { SupplierType } from "../lib/types/supplierTypes";
import type { Transaction } from "../lib/types/transactionTypes";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Eye,
  Edit,
  FilePenLine,
  Building2,
  Landmark,
  User,
} from "lucide-react"; // ✅ Import new icon
import theme from "../../theme";

import { getPurchasesBySupplierId } from "../lib/api/purchaseService";
import SupplierAccountSummary from "../components/suppliers/SupplierAccountsSummary";
import DashboardHeader from "../components/DashboardHeader";
import type { DashboardFilter } from "../lib/types/inventoryDashboardTypes";
import SupplierFormModal from "../components/suppliers/SupplierFormModal";
import { InfoItem } from "../components/InfoItem";

const getInitialFilters = (): DashboardFilter => {
  return {
    from: "",
    to: "",
    filter: "month", // Default to 'All Time'
  };
};

export default function SupplierPage() {
  const params = useParams();
  const supplierId = Number(params.id);
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState<SupplierType | null>(null);
  const [loading, setLoading] = useState(true);

  // Data for the table
  const [tableData, setTableData] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [activeTab, setActiveTab] = useState<"purchases" | "transactions">(
    "purchases"
  );

  // Modal State
  const [_isUpdatePurchaseStatusOpen, setIsUpdatePurchaseStatusOpen] =
    useState(false);
  const [isSupplierEditModalOpen, setIsSupplierEditModalOpen] = useState(false);
  const [_selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(
    null
  );

  const [activeFilters, setActiveFilters] =
    useState<DashboardFilter>(getInitialFilters);

  // Helper to format numbers as Indian Rupees (INR)
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusChip = (status: string) => {
    const normalized = status?.toLowerCase();
    let color: "success" | "warning" | "error" | "default" = "default";

    if (normalized === "paid") color = "success";
    if (normalized === "pending" || normalized === "partial") color = "warning";
    if (
      normalized === "refunded" ||
      normalized === "cancelled" ||
      normalized === "returned"
    )
      color = "error";

    return (
      <Chip
        label={status}
        size="small"
        color={color}
        sx={{ textTransform: "capitalize" }}
      />
    );
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const supplierData = await getSupplierById(supplierId);
      setSupplier(supplierData);
      // console.log(supplierData);

      if (activeTab === "purchases") {
        const purchasesData = await getPurchasesBySupplierId(supplierId, {
          page: page + 1,
          limit: rowsPerPage,
          startDate: activeFilters.from,
          endDate: activeFilters.to,
          filter: activeFilters.filter || "month",
          query: "",
        });
        setTableData(purchasesData.records);
        setTotalRecords(purchasesData.totalRecords);
      } else {
        const transactionsData = await getEntityTransactions(
          supplierId,
          "supplier",
          {
            page: page + 1,
            limit: rowsPerPage,
            startDate: activeFilters.from,
            endDate: activeFilters.to,
            filter: activeFilters.filter || "month",
          }
        );
        setTableData(transactionsData.records);
        setTotalRecords(transactionsData.totalRecords);
      }
    } catch (error) {
      toast.error("Failed to fetch supplier data.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!supplierId) return;
    loadData();
  }, [supplierId, page, rowsPerPage, activeTab, activeFilters]);

  // Define columns based on the active tab
  const purchasesColumns = [
    { key: "reference_no", label: "Bill No." },
    {
      key: "date",
      label: "Date",
      format: (val: string) => {
        if (!val) return "N/A";
        return new Date(`${val}T00:00:00`).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      },
    },
    {
      key: "original_total_amount",
      label: "Bill Amount",
      format: (val: number) => formatCurrency(val),
    },
    {
      key: "total_paid_amount",
      label: "Amount Paid",
      format: (val: number) => formatCurrency(val),
    },
    {
      key: "outstanding_amount",
      label: "Outstanding",
      format: (val: number) => formatCurrency(val),
    },
    {
      key: "status",
      label: "Status",
      format: (val: string) => getStatusChip(val),
    },
  ];

  const transactionsColumns = [
    { key: "reference_no", label: "Ref No." },
    { key: "type", label: "Type" },
    {
      key: "transaction_date",
      label: "Date",
      format: (val: string) => {
        if (!val) return "N/A";
        return new Date(`${val}T00:00:00`).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      },
    },
    {
      key: "amount",
      label: "Amount",
      format: (val: number) => formatCurrency(val),
    },
    {
      key: "status",
      label: "Status",
      format: (val: string) => getStatusChip(val),
    },
  ];

  const actions = [
    {
      label: "View Purchase",
      icon: <Eye size={18} />,
      onClick: (row: Transaction) => {
        navigate(`/purchase/view/${row.id}`);
      },
    },
    {
      label: "Update Status",
      icon: <Edit size={18} />,
      onClick: (row: Transaction) => {
        setSelectedPurchaseId(row.id);
        setIsUpdatePurchaseStatusOpen(true);
      },
    },
  ];

  const handleRefresh = () => {};

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        backgroundColor: theme.palette.background.default,
      }}
      minHeight={"100vh"}
    >
      <DashboardHeader
        title={"Supplier Account"}
        onRefresh={handleRefresh}
        onFilterChange={setActiveFilters}
        showSearch={false}
      />
      <Card
        sx={{
          boxShadow: "none",
          backgroundColor: "inherit",
          mb: 2,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {supplier && (
            <Box>
              {/* --- HEADER --- */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 1,
                }}
              >
                <Box>
                  <Typography
                    variant="h5"
                    fontWeight={600} // Slightly lighter weight
                    color="text.primary" // More subtle color
                  >
                    {supplier.name}
                  </Typography>
                  <Chip
                    label={supplier.supplier_type}
                    size="small"
                    variant="outlined" // Outlined chip matches the card style
                    color="secondary"
                    sx={{ textTransform: "capitalize", mt: 1 }}
                  />
                </Box>
                <Tooltip title="Edit Supplier">
                  <IconButton
                    onClick={() => setIsSupplierEditModalOpen(true)}
                    size="small"
                  >
                    <FilePenLine size={20} />
                  </IconButton>
                </Tooltip>
              </Box>

              <Divider sx={{ my: 2.5 }} />

              {/* --- SECTIONS --- */}
              <Grid container spacing={{ xs: 3, md: 4 }}>
                {/* Contact Information Section */}
                <Grid item xs={12} md={4}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <User size={16} color={theme.palette.text.secondary} />
                    <Typography
                      variant="body1"
                      fontWeight={600}
                      ml={1}
                      color="text.secondary"
                    >
                      Contact
                    </Typography>
                  </Box>
                  <InfoItem
                    label="Contact Person"
                    value={supplier.contact_person}
                  />
                  <InfoItem label="Phone" value={supplier.phone} />
                  <InfoItem label="Email" value={supplier.email} />
                </Grid>

                {/* Business Details Section */}
                <Grid item xs={12} md={4}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Building2 size={16} color={theme.palette.text.secondary} />
                    <Typography
                      variant="body1"
                      fontWeight={600}
                      ml={1}
                      color="text.secondary"
                    >
                      Business
                    </Typography>
                  </Box>
                  <InfoItem label="Address" value={supplier.address} />
                  <InfoItem label="GST Number" value={supplier.gst_number} />
                </Grid>

                {/* Payment Details Section */}
                <Grid item xs={12} md={4}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Landmark size={16} color={theme.palette.text.secondary} />
                    <Typography
                      variant="body1"
                      fontWeight={600}
                      ml={1}
                      color="text.secondary"
                    >
                      Payment
                    </Typography>
                  </Box>
                  <InfoItem
                    label="Bank Account No."
                    value={supplier.bank_account}
                  />
                  <InfoItem label="IFSC Code" value={supplier.ifsc_code} />
                  <InfoItem label="UPI ID" value={supplier.upi_id} />
                </Grid>
              </Grid>
            </Box>
          )}

          <Divider sx={{ mt: 3, mb: 2 }} />

          {/* --- ACCOUNT SUMMARY --- */}
          {loading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              my={4}
            >
              <CircularProgress />
            </Box>
          ) : (
            <SupplierAccountSummary
              supplierId={supplierId}
              filters={activeFilters}
            />
          )}
        </CardContent>
      </Card>
      {/* Purchases/Transactions Tab Switcher */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-around",
          mb: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button
          onClick={() => setActiveTab("purchases")}
          sx={{
            py: 1,
            borderRadius: 0,
            borderBottom:
              activeTab === "purchases"
                ? `2px solid ${theme.palette.primary.main}`
                : "none",
            color:
              activeTab === "purchases"
                ? theme.palette.primary.main
                : theme.palette.text.secondary,
            fontWeight: activeTab === "purchases" ? 600 : 400,
          }}
        >
          Purchase History
        </Button>
        <Button
          onClick={() => setActiveTab("transactions")}
          sx={{
            py: 1,
            borderRadius: 0,
            borderBottom:
              activeTab === "transactions"
                ? `2px solid ${theme.palette.primary.main}`
                : "none",
            color:
              activeTab === "transactions"
                ? theme.palette.primary.main
                : theme.palette.text.secondary,
            fontWeight: activeTab === "transactions" ? 600 : 400,
          }}
        >
          Transaction History
        </Button>
      </Box>

      <DataTable
        rows={tableData}
        columns={
          activeTab === "purchases" ? purchasesColumns : transactionsColumns
        }
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

      {isSupplierEditModalOpen && (
        <SupplierFormModal
          open={isSupplierEditModalOpen}
          onClose={() => setIsSupplierEditModalOpen(false)}
          supplier={supplier}
          refresh={function (): void {
            throw new Error("Function not implemented.");
          }}
        />
      )}
    </Box>
  );
}
