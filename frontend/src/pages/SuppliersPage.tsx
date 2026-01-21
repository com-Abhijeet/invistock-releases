"use client";

import { useEffect, useState } from "react";
import { Button, Box } from "@mui/material";
import { Plus } from "lucide-react";
import SupplierFormModal from "../components/suppliers/SupplierFormModal";
import SuppliersTable from "../components/suppliers/SuppliersTable";
import { getSuppliers } from "../lib/api/supplierService";
import { SupplierType } from "../lib/types/supplierTypes";
import DashboardHeader from "../components/DashboardHeader";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierType | null>(
    null,
  );

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    const data = await getSuppliers();
    setSuppliers(data);
  };

  const handleRefresh = async () => {
    await fetchSuppliers();
  };

  const handleOpenModal = (supplier?: SupplierType) => {
    setSelectedSupplier(supplier ?? null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedSupplier(null);
    setModalOpen(false);
  };

  return (
    <Box
      p={2}
      pt={3}
      sx={{
        backgroundColor: "#fff",
      }}
      minHeight={"100vh"}
    >
      <DashboardHeader
        title="Suppliers"
        showSearch={true}
        onSearch={setSearchTerm}
        onRefresh={handleRefresh}
        showDateFilters={false}
        initialFilter="today"
        actions={
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={18} />}
            onClick={() => handleOpenModal()}
            sx={{
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            Add Supplier
          </Button>
        }
      />

      {/* Supplier Table */}
      <SuppliersTable
        suppliers={suppliers.filter((s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()),
        )}
        onEdit={handleOpenModal}
        refresh={handleRefresh}
      />

      {/* Modal */}
      <SupplierFormModal
        open={modalOpen}
        onClose={handleCloseModal}
        supplier={selectedSupplier}
        refresh={handleRefresh}
      />
    </Box>
  );
}
