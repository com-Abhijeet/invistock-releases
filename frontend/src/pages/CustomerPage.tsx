"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Chip,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import DataTable from "../components/DataTable";
import { fetchCustomerById as getCustomerById } from "../lib/api/customerService";
import { getEntityTransactions } from "../lib/api/transactionService";
import type { CustomerType } from "../lib/types/customerTypes";
import type { SalesTable as SalesTableType } from "../lib/types/salesStatsTypes";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Eye,
  Edit,
  FilePenLine,
  Calendar,
  CircleDollarSign,
  Landmark,
  MapPin,
  Phone,
  Printer,
} from "lucide-react";
import theme from "../../theme";
import type { DashboardFilter } from "../lib/types/inventoryDashboardTypes";
import CustomerAccountSummary from "../components/customers/CustomerAccountsSummary";
import DashboardHeader from "../components/DashboardHeader";
import UpdateSaleStatusModal from "../components/sales/UpdateSaleStatusModal";
import { fetchCustomerSales, updateSaleStatus } from "../lib/api/salesService";

const getISODate = (date = new Date()) => {
  return date.toISOString().split("T")[0];
};

// ✅ Helper to get the initial state for the DashboardHeader
const getInitialFilters = (): DashboardFilter => {
  return {
    from: "",
    to: "",
    filter: "month", // Default to 'All Time'
  };
};

export default function CustomerPage() {
  const params = useParams();
  const customerId = Number(params.id);
  const navigate = useNavigate();

  // ✅ Centralized filter state
  const [activeFilters, setActiveFilters] =
    useState<DashboardFilter>(getInitialFilters);
  const [searchQuery, setSearchQuery] = useState("");

  const [customer, setCustomer] = useState<CustomerType | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [activeTab, setActiveTab] = useState<"sales" | "transactions">("sales");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);

  // ✅ State for the print modal
  const [modalOpen, setModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(
    getISODate(new Date(new Date().setMonth(new Date().getMonth() - 1)))
  ); // Default: 1 month ago
  const [endDate, setEndDate] = useState(getISODate()); // Default: Today

  // --- Print Ledger Handlers ---

  const handleOpenPrintModal = () => {
    // Reset dates to default range when opening
    setStartDate(
      getISODate(new Date(new Date().setMonth(new Date().getMonth() - 1)))
    );
    setEndDate(getISODate());
    setModalOpen(true);
  };

  const handleClosePrintModal = () => {
    setModalOpen(false);
  };

  // This is the "Yes" action from the modal
  const handlePrintLedger = () => {
    if (!startDate || !endDate) {
      return toast.error("Please select a valid start and end date.");
    }

    // Close the modal first
    handleClosePrintModal();

    toast.loading("Generating ledger...");

    window.electron.ipcRenderer
      .invoke("print-customer-ledger", {
        customerId: customerId,
        filters: {
          startDate: startDate,
          endDate: endDate,
        },
      })
      .then((result: { success: any; error: any }) => {
        toast.dismiss();
        if (result.success) {
          toast.success("Ledger sent to printer.");
        } else {
          toast.error(result.error || "Failed to generate ledger.");
        }
      })
      .catch((err: { message: any }) => {
        toast.dismiss();
        toast.error(`Print failed: ${err.message}`);
      });
  };

  const getStatusChip = (status: string) => {
    const normalized = status?.toLowerCase();
    let color: "success" | "warning" | "error" = "warning";

    if (normalized === "paid") color = "success";
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

  // ✅ loadData is wrapped in useCallback and uses the new filters
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const customerData = await getCustomerById(customerId);
      setCustomer(customerData);

      if (activeTab === "sales") {
        const salesData = await fetchCustomerSales(customerId, {
          page: page + 1,
          limit: rowsPerPage,
          all: false,
          filter: activeFilters.filter || "month",
          startDate: activeFilters.from,
          endDate: activeFilters.to,
          query: activeFilters.query,
        });
        setTableData(salesData.sales);
        setTotalRecords(salesData.totalCount);
      } else {
        const transactionsData = await getEntityTransactions(
          customerId,
          "customer",
          {
            page: page + 1,
            limit: rowsPerPage,
            all: false,
            filter: activeFilters.filter || "month",
            startDate: activeFilters.from,
            endDate: activeFilters.to,
            query: activeFilters.query,
          }
        );
        setTableData(transactionsData.records);
        setTotalRecords(transactionsData.totalRecords);
      }
    } catch (error) {
      toast.error("Failed to fetch data.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [customerId, page, rowsPerPage, activeTab, activeFilters, searchQuery]);

  useEffect(() => {
    if (!customerId) return;
    const handler = setTimeout(() => {
      loadData();
    }, 300); // Debounce fetching
    return () => clearTimeout(handler);
  }, [loadData]);

  const handleUpdateStatus = async (saleId: number, newStatus: string) => {
    try {
      await updateSaleStatus(saleId, newStatus);
      toast.success("Sale status updated successfully!");
      setIsModalOpen(false);
      setSelectedSaleId(null);
      loadData(); // Reload data to show the updated status
    } catch (error) {
      toast.error("Failed to update status.");
      console.error("Failed to update status:", error);
    }
  };

  // Define columns based on the active tab
  const salesColumns = [
    { key: "reference_no", label: "Invoice No" },
    {
      key: "created_at",
      label: "Date",
      format: (val: string) =>
        new Date(val)?.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    },
    { key: "items_summary", label: "Items" },
    {
      key: "total_amount",
      label: "Total",
      format: (val: number) => `₹${val?.toLocaleString("en-IN")}`,
    },
    {
      key: "paid_amount",
      label: "Paid",
      format: (val: number) => `₹${val?.toLocaleString("en-IN")}`,
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
      format: (val: string) => new Date(val).toLocaleDateString("en-IN"),
    },
    {
      key: "amount",
      label: "Amount",
      format: (val: number) => `₹${val?.toLocaleString()}`,
    },
    {
      key: "status",
      label: "Status",
      format: (val: string) => getStatusChip(val),
    },
  ];

  const actions = [
    {
      label: "View Sale",
      icon: <Eye size={18} />,
      onClick: (row: SalesTableType) => {
        navigate(`/billing/view/${row.id}`);
      },
    },
    {
      label: "Update Status",
      icon: <Edit size={18} />,
      onClick: (row: SalesTableType) => {
        setSelectedSaleId(row.id);
        setIsModalOpen(true);
      },
    },
  ];

  const tabButtonStyle = (isActive: boolean) => ({
    py: 1,
    px: 2,
    borderRadius: 0,
    color: isActive ? "primary.main" : "text.secondary",
    fontWeight: isActive ? 600 : 400,
    // Creates a colored underline for the active tab
    borderBottom: isActive
      ? `2px solid ${theme.palette.primary.main}`
      : "2px solid transparent",
    // This makes the active tab's underline sit perfectly on the container's border
    marginBottom: "-1px",
  });

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        // backgroundColor: "#F4F6F8",

        minHeight: "100vh",
      }}
    >
      <DashboardHeader
        title={"Customer Account"}
        showSearch={false}
        showDateFilters={true}
        onSearch={setSearchQuery}
        onRefresh={loadData}
        onFilterChange={setActiveFilters}
        actions={
          <Button
            variant="contained"
            onClick={handleOpenPrintModal} // ✅ Call this to open the modal
            startIcon={<Printer size={18} />}
            sx={{
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              boxShadow: "none",
              "&:hover": {
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              },
            }}
          >
            Print Ledger
          </Button>
        }
      />
      <Card
        sx={{
          mb: 3,
          borderRadius: 2,
          variant: "outlined",
          backgroundColor: theme.palette.primary.contrastText,
          borderColor: theme.palette.divider,
          boxShadow: "none",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : (
            customer && (
              <>
                {/* --- HEADER: Customer Name & Edit Button --- */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  mb={2}
                >
                  <Typography variant="h5" fontWeight={600}>
                    {customer.name}
                  </Typography>
                  <Tooltip title="Edit Customer">
                    <IconButton
                      onClick={() => navigate(`/customers/edit/${customer.id}`)}
                      size="small"
                    >
                      <FilePenLine size={20} />
                    </IconButton>
                  </Tooltip>
                </Stack>

                {/* --- DETAILS GRID --- */}
                <Grid container spacing={3}>
                  {/* Left Column: Contact Info */}
                  <Grid item xs={12} md={7}>
                    <Stack spacing={2}>
                      {/* Address */}
                      <Stack direction="row" spacing={1.5}>
                        <MapPin
                          size={18}
                          color="#666"
                          style={{ marginTop: "3px" }}
                        />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Address
                          </Typography>
                          <Typography fontWeight={500}>
                            {[customer.address, customer.city, customer.state]
                              .filter(Boolean)
                              .join(", ")}
                            {customer.pincode ? ` - ${customer.pincode}` : ""}
                          </Typography>
                        </Box>
                      </Stack>
                      {/* Phone */}
                      <Stack direction="row" spacing={1.5}>
                        <Phone
                          size={18}
                          color="#666"
                          style={{ marginTop: "3px" }}
                        />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Phone
                          </Typography>
                          <Typography fontWeight={500}>
                            {customer.phone || "—"}
                          </Typography>
                        </Box>
                      </Stack>
                    </Stack>
                  </Grid>

                  {/* Right Column: Financial & Meta Info */}
                  <Grid item xs={12} md={5}>
                    <Stack spacing={2}>
                      {/* GST Number */}
                      <Stack direction="row" spacing={1.5}>
                        <Landmark
                          size={18}
                          color="#666"
                          style={{ marginTop: "3px" }}
                        />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            GST Number
                          </Typography>
                          <Typography fontWeight={500}>
                            {customer.gst_no || "—"}
                          </Typography>
                        </Box>
                      </Stack>
                      {/* Credit Limit */}
                      <Stack direction="row" spacing={1.5}>
                        <CircleDollarSign
                          size={18}
                          color="#666"
                          style={{ marginTop: "3px" }}
                        />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Credit Limit
                          </Typography>
                          <Typography fontWeight={500}>
                            {`₹${
                              customer.credit_limit?.toLocaleString("en-IN") ||
                              0
                            }`}
                          </Typography>
                        </Box>
                      </Stack>
                      {/* Added On */}
                      <Stack direction="row" spacing={1.5}>
                        <Calendar
                          size={18}
                          color="#666"
                          style={{ marginTop: "3px" }}
                        />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Added On
                          </Typography>
                          <Typography fontWeight={500}>
                            {customer.created_at
                              ? new Date(
                                  customer.created_at
                                ).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </Typography>
                        </Box>
                      </Stack>
                    </Stack>
                  </Grid>
                </Grid>
              </>
            )
          )}

          <Divider sx={{ my: 2 }} />

          <CustomerAccountSummary
            customerId={customerId}
            filters={activeFilters}
          />
        </CardContent>{" "}
      </Card>

      {/* Sales/Transactions Tab Switcher */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-around", // Pushes the two buttons apart
          mb: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button
          onClick={() => setActiveTab("sales")}
          sx={tabButtonStyle(activeTab === "sales")}
        >
          Sales History
        </Button>

        <Button
          onClick={() => setActiveTab("transactions")}
          sx={tabButtonStyle(activeTab === "transactions")}
        >
          Transaction History
        </Button>
      </Box>

      <DataTable
        rows={tableData}
        columns={activeTab === "sales" ? salesColumns : transactionsColumns}
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

      <UpdateSaleStatusModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        saleId={selectedSaleId}
        onSave={handleUpdateStatus}
      />
      {/* --- ✅ The new Date Range Modal --- */}
      <Dialog open={modalOpen} onClose={handleClosePrintModal}>
        <DialogTitle>Print Customer Ledger</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Please select the date range for the account statement.
          </Typography>
          <Stack spacing={2} sx={{ pt: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClosePrintModal} color="inherit">
            Cancel
          </Button>
          <Button onClick={handlePrintLedger} variant="contained">
            Print
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
