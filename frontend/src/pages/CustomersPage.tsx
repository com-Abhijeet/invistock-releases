import { useEffect, useState } from "react";
import { Box, Button, Stack } from "@mui/material";
import { Edit, Eye, Plus, Trash2, Upload } from "lucide-react";
import {
  getCustomers as getPaginatedCustomers,
  deleteCustomer,
} from "../lib/api/customerService";
import type { CustomerType } from "../lib/types/customerTypes";
import DataTable from "../components/DataTable";
import CustomerModal from "../components/customers/CustomerFormModal";
import DashboardHeader from "../components/DashboardHeader";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import CustomerImportModal from "../components/customers/CustomerImportModal";
import theme from "../../theme";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerType | null>(
    null
  );
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const navigate = useNavigate();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await getPaginatedCustomers({
        page: page + 1,
        limit: rowsPerPage,
        query: searchTerm,
      });
      setCustomers(data.records);
      setTotalRecords(data.totalRecords);
    } catch (error) {
      toast.error("Failed to fetch customers.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchCustomers();
    }, 500);
    return () => clearTimeout(handler);
  }, [page, rowsPerPage, searchTerm]);

  const handleOpenModal = (customer?: CustomerType) => {
    setSelectedCustomer(customer ?? null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedCustomer(null);
    setModalOpen(false);
  };

  const handleOnSuccess = async () => {
    await fetchCustomers();
    handleCloseModal();
    toast.success("Customer saved successfully!");
  };

  const handleEdit = (customer: CustomerType) => {
    handleOpenModal(customer);
  };

  const handleDelete = async (customer: CustomerType) => {
    if (
      window.confirm(
        "Are you sure you want to delete this customer? This action cannot be undone."
      )
    ) {
      try {
        await deleteCustomer(customer.id!);
        toast.success("Customer deleted successfully!");
        await fetchCustomers();
      } catch (error) {
        toast.error("Failed to delete customer.");
        console.error(error);
      }
    }
  };

  // ✅ The columns constant is updated here
  const columns = [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "city", label: "City" }, // ✅ ADDED
    { key: "state", label: "State" }, // ✅ ADDED
    { key: "gst_no", label: "GSTIN" },
    // { key: "address", label: "Address" }, // ❌ REMOVED
    {
      key: "created_at",
      label: "Added On",
      format: (val: string) =>
        val ? new Date(val).toLocaleDateString("en-IN") : "-",
    },
  ];

  const actions = [
    {
      label: "View Details",
      icon: <Eye size={18} />,
      onClick: (row: CustomerType) => navigate(`/customer/${row.id}`), // Corrected path
    },
    {
      label: "Edit Customer",
      icon: <Edit size={18} />,
      onClick: (row: CustomerType) => handleEdit(row),
    },
    {
      label: "Delete Customer",
      icon: <Trash2 size={18} />,
      onClick: (row: CustomerType) => handleDelete(row),
    },
  ];

  // ✅ 3. Add handlers for the import modal
  const handleOpenImportModal = () => {
    setImportModalOpen(true);
  };

  const handleCloseImportModal = (refresh?: boolean) => {
    setImportModalOpen(false);
    // If the import was successful, refresh the customer list
    if (refresh) {
      fetchCustomers();
    }
  };

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        backgroundColor: "#fff",

        minHeight: "100vh",
      }}
    >
      <DashboardHeader
        title="Customers"
        showSearch={true}
        onSearch={setSearchTerm}
        onRefresh={fetchCustomers}
        showDateFilters={false}
        actions={
          <Stack direction="row" spacing={1.5}>
            {/* ✅ Import Button (Soft styling) */}
            <Button
              variant="outlined"
              onClick={handleOpenImportModal}
              startIcon={<Upload size={18} />}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 600,
                borderColor: theme.palette.divider,
                color: theme.palette.text.secondary,
                "&:hover": {
                  borderColor: theme.palette.text.primary,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              Import
            </Button>

            {/* ✅ Add Button (Primary Action) */}
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleOpenModal()}
              startIcon={<Plus size={18} />}
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
              Add Customer
            </Button>
          </Stack>
        }
      />

      <DataTable
        rows={customers}
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

      <CustomerModal
        open={modalOpen}
        onClose={handleCloseModal}
        customer={selectedCustomer}
        onSuccess={handleOnSuccess}
      />

      <CustomerImportModal
        open={importModalOpen}
        onClose={handleCloseImportModal}
      />
    </Box>
  );
}
