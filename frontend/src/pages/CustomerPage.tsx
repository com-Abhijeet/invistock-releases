"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Chip,
  IconButton,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import DataTable from "../components/DataTable";
import { fetchCustomerById as getCustomerById } from "../lib/api/customerService";
import { getEntityTransactions } from "../lib/api/transactionService";
import type { CustomerType } from "../lib/types/customerTypes";

import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Eye,
  Edit,
  FilePenLine,
  CircleDollarSign,
  Landmark,
  MapPin,
  Phone,
  Printer,
  FileText,
} from "lucide-react";
import theme from "../../theme";
import type { DashboardFilter } from "../lib/types/inventoryDashboardTypes";
import CustomerAccountSummary from "../components/customers/CustomerAccountsSummary";
import DashboardHeader from "../components/DashboardHeader";
import UpdateSaleStatusModal from "../components/sales/UpdateSaleStatusModal";
import { fetchCustomerSales, updateSaleStatus } from "../lib/api/salesService";
import KbdButton from "../components/ui/Button";

const getISODate = (date = new Date()) => date.toISOString().split("T")[0];
const getInitialFilters = (): DashboardFilter => ({
  from: "",
  to: "",
  filter: "month",
});

export default function CustomerPage() {
  const params = useParams();
  const customerId = Number(params.id);
  const navigate = useNavigate();

  const [activeFilters, setActiveFilters] =
    useState<DashboardFilter>(getInitialFilters);
  const [searchQuery, setSearchQuery] = useState("");
  const [customer, setCustomer] = useState<CustomerType | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);
  const [activeTab, setActiveTab] = useState<"sales" | "transactions">("sales");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(
    getISODate(new Date(new Date().setMonth(new Date().getMonth() - 1))),
  );
  const [endDate, setEndDate] = useState(getISODate());

  const handleOpenPrintModal = () => {
    setStartDate(
      getISODate(new Date(new Date().setMonth(new Date().getMonth() - 1))),
    );
    setEndDate(getISODate());
    setModalOpen(true);
  };
  const handleClosePrintModal = () => setModalOpen(false);

  const handlePrintLedger = () => {
    if (!startDate || !endDate)
      return toast.error("Please select a valid date range.");
    handleClosePrintModal();
    toast.loading("Generating ledger...");
    window.electron.ipcRenderer
      .invoke("print-customer-ledger", {
        customerId,
        filters: { startDate, endDate },
      })
      .then((res: any) => {
        toast.dismiss();
        if (res.success) toast.success("Ledger sent to printer.");
        else toast.error(res.error || "Failed to generate ledger.");
      })
      .catch((err: any) => {
        toast.dismiss();
        toast.error(`Print failed: ${err.message}`);
      });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const customerData = await getCustomerById(customerId);
      setCustomer(customerData);
      if (activeTab === "sales") {
        const salesData = await fetchCustomerSales(customerId, {
          page: page + 1,
          limit: rowsPerPage,
          filter: activeFilters.filter || "month",
          startDate: activeFilters.from,
          endDate: activeFilters.to,
          query: searchQuery,
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
            filter: activeFilters.filter || "month",
            startDate: activeFilters.from,
            endDate: activeFilters.to,
            query: activeFilters.query,
          },
        );
        setTableData(transactionsData.records);
        setTotalRecords(transactionsData.totalRecords);
      }
    } catch (error) {
      toast.error("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }, [customerId, page, rowsPerPage, activeTab, activeFilters, searchQuery]);

  useEffect(() => {
    if (customerId) loadData();
  }, [loadData, customerId]);

  const handleUpdateStatus = async (saleId: number, newStatus: string) => {
    try {
      await updateSaleStatus(saleId, newStatus);
      toast.success("Sale status updated!");
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast.error("Failed to update status.");
    }
  };

  const getStatusChip = (s: string) => {
    const n = s?.toLowerCase();
    let c: "success" | "warning" | "error" = "warning";
    if (n === "paid") c = "success";
    else if (["refunded", "cancelled", "returned"].includes(n)) c = "error";
    return (
      <Chip
        label={s}
        size="small"
        color={c}
        sx={{ textTransform: "capitalize" }}
      />
    );
  };

  const actions = [
    {
      label: "View Sale",
      icon: <Eye size={18} />,
      onClick: (row: any) => navigate(`/billing/view/${row.id}`),
    },
    {
      label: "Update Status",
      icon: <Edit size={18} />,
      onClick: (row: any) => {
        setSelectedSaleId(row.id);
        setIsModalOpen(true);
      },
    },
  ];

  return (
    <Box p={2} pt={3} sx={{ minHeight: "100vh" }}>
      <DashboardHeader
        title="Customer Account"
        showSearch={true}
        onSearch={setSearchQuery}
        showDateFilters={true}
        onRefresh={loadData}
        onFilterChange={setActiveFilters}
        actions={
          <Stack direction="row" spacing={2}>
            <KbdButton
              variant="secondary"
              label="View Statement"
              underlineChar="v"
              shortcut="ctrl+v"
              startIcon={<FileText size={18} />}
              onClick={() => navigate(`/customers/ledger/${customerId}`)}
            />
            <KbdButton
              variant="primary"
              label="Print Ledger"
              underlineChar="p"
              shortcut="ctrl+p"
              startIcon={<Printer size={18} />}
              onClick={handleOpenPrintModal}
            />
          </Stack>
        }
      />

      {customer && (
        <Card
          sx={{
            mb: 3,
            borderRadius: 2,
            backgroundColor: theme.palette.primary.contrastText,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "none",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" mb={2}>
              <Typography variant="h5" fontWeight={600}>
                {customer.name}
              </Typography>
              <IconButton
                onClick={() => navigate(`/customers/edit/${customer.id}`)}
                size="small"
              >
                <FilePenLine size={20} />
              </IconButton>
            </Stack>
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5}>
                    <MapPin size={18} color="#666" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Address
                      </Typography>
                      <Typography fontWeight={500}>
                        {[customer.address, customer.city, customer.state]
                          .filter(Boolean)
                          .join(", ")}{" "}
                        {customer.pincode}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1.5}>
                    <Phone size={18} color="#666" />
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
              <Grid item xs={12} md={5}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5}>
                    <Landmark size={18} color="#666" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        GSTIN
                      </Typography>
                      <Typography fontWeight={500}>
                        {customer.gst_no || "—"}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1.5}>
                    <CircleDollarSign size={18} color="#666" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Limit
                      </Typography>
                      <Typography fontWeight={500}>
                        ₹{customer.credit_limit?.toLocaleString() || 0}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <CustomerAccountSummary
              customerId={customerId}
              filters={activeFilters}
            />
          </CardContent>
        </Card>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-around",
          mb: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button
          onClick={() => setActiveTab("sales")}
          sx={{
            py: 1,
            px: 2,
            color: activeTab === "sales" ? "primary.main" : "text.secondary",
            fontWeight: activeTab === "sales" ? 600 : 400,
            borderBottom:
              activeTab === "sales"
                ? `2px solid ${theme.palette.primary.main}`
                : "2px solid transparent",
            marginBottom: "-1px",
          }}
        >
          Sales History
        </Button>
        <Button
          onClick={() => setActiveTab("transactions")}
          sx={{
            py: 1,
            px: 2,
            color:
              activeTab === "transactions" ? "primary.main" : "text.secondary",
            fontWeight: activeTab === "transactions" ? 600 : 400,
            borderBottom:
              activeTab === "transactions"
                ? `2px solid ${theme.palette.primary.main}`
                : "2px solid transparent",
            marginBottom: "-1px",
          }}
        >
          Transaction History
        </Button>
      </Box>

      <DataTable
        rows={tableData}
        columns={
          activeTab === "sales"
            ? [
                { key: "reference_no", label: "Invoice No" },
                {
                  key: "created_at",
                  label: "Date",
                  format: (v: string) =>
                    new Date(v).toLocaleDateString("en-IN"),
                },
                {
                  key: "total_amount",
                  label: "Total",
                  format: (v: number) => `₹${v?.toLocaleString()}`,
                },
                {
                  key: "paid_amount",
                  label: "Paid",
                  format: (v: number) => `₹${v?.toLocaleString()}`,
                },
                {
                  key: "status",
                  label: "Status",
                  format: (v: string) => getStatusChip(v),
                },
              ]
            : [
                { key: "reference_no", label: "Ref No." },
                { key: "type", label: "Type" },
                {
                  key: "amount",
                  label: "Amount",
                  format: (v: number) => `₹${v?.toLocaleString()}`,
                },
                {
                  key: "status",
                  label: "Status",
                  format: (v: string) => getStatusChip(v),
                },
              ]
        }
        actions={actions}
        loading={loading}
        total={totalRecords}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
      />

      <UpdateSaleStatusModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        saleId={selectedSaleId}
        onSave={handleUpdateStatus}
      />
      <Dialog open={modalOpen} onClose={handleClosePrintModal}>
        <DialogTitle>Print Customer Ledger</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Select range for statement:</Typography>
          <Stack spacing={2} pt={2}>
            <TextField
              label="Start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <KbdButton
            variant="ghost"
            label="Cancel"
            onClick={handleClosePrintModal}
          />
          <KbdButton label="Print" onClick={handlePrintLedger} />
        </DialogActions>
      </Dialog>
    </Box>
  );
}
