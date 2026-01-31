import { useEffect, useState } from "react";
import { Box, Stack } from "@mui/material";
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
import KbdButton from "../components/ui/Button";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerType | null>(
    null,
  );
  const [importModalOpen, setImportModalOpen] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const h = setTimeout(() => fetchCustomers(), 500);
    return () => clearTimeout(h);
  }, [page, rowsPerPage, searchTerm]);

  const handleOpenModal = (c?: CustomerType) => {
    setSelectedCustomer(c ?? null);
    setModalOpen(true);
  };
  const handleCloseModal = () => {
    setSelectedCustomer(null);
    setModalOpen(false);
  };
  const handleOnSuccess = async () => {
    await fetchCustomers();
    handleCloseModal();
    toast.success("Customer saved!");
  };

  const handleDelete = async (c: CustomerType) => {
    if (window.confirm("Are you sure?")) {
      try {
        await deleteCustomer(c.id!);
        toast.success("Customer deleted!");
        await fetchCustomers();
      } catch (error) {
        toast.error("Failed to delete.");
      }
    }
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "city", label: "City" },
    { key: "gst_no", label: "GSTIN" },
    {
      key: "created_at",
      label: "Added On",
      format: (v: string) =>
        v ? new Date(v).toLocaleDateString("en-IN") : "-",
    },
  ];

  const actions = [
    {
      label: "View Details",
      icon: <Eye size={18} />,
      onClick: (row: any) => navigate(`/customer/${row.id}`),
    },
    {
      label: "Edit",
      icon: <Edit size={18} />,
      onClick: (row: any) => handleOpenModal(row),
    },
    {
      label: "Delete",
      icon: <Trash2 size={18} />,
      onClick: (row: any) => handleDelete(row),
    },
  ];

  return (
    <Box p={2} pt={3} sx={{ backgroundColor: "#fff", minHeight: "100vh" }}>
      <DashboardHeader
        title="Customers"
        showSearch={true}
        onSearch={setSearchTerm}
        onRefresh={fetchCustomers}
        showDateFilters={false}
        actions={
          <Stack direction="row" spacing={1.5}>
            <KbdButton
              variant="secondary"
              label="Import"
              underlineChar="i"
              shortcut="ctrl+i"
              startIcon={<Upload size={18} />}
              onClick={() => setImportModalOpen(true)}
            />
            <KbdButton
              variant="primary"
              label="Add Customer"
              underlineChar="a"
              shortcut="ctrl+a"
              startIcon={<Plus size={18} />}
              onClick={() => handleOpenModal()}
              sx={{ px: 3 }}
            />
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
        onRowsPerPageChange={setRowsPerPage}
      />
      <CustomerModal
        open={modalOpen}
        onClose={handleCloseModal}
        customer={selectedCustomer}
        onSuccess={handleOnSuccess}
      />
      <CustomerImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
    </Box>
  );
}
