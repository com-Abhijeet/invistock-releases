"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Box,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
} from "@mui/material";
import { Search, RefreshCcw } from "lucide-react";
import SupplierFormModal from "../components/suppliers/SupplierFormModal";
import SuppliersTable from "../components/suppliers/SuppliersTable";
import { getSuppliers } from "../lib/api/supplierService";
import { SupplierType } from "../lib/types/supplierTypes";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierType | null>(
    null
  );

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    const data = await getSuppliers();
    setSuppliers(data);
  };

  const handleRefresh = async () => {
    // ✅ Removed clearSuppliersCache call, just refetch
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
        // pt: "30px",
      }}
      minHeight={"100vh"}
    >
      {/* Search + Add Supplier Row */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        {/* Search Input */}
        <Box display="flex" alignItems="center" gap={2}>
          <TextField
            size="small"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          <Tooltip title="Refresh Supplier List">
            <IconButton onClick={handleRefresh}>
              <RefreshCcw size={18} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Add Button */}
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleOpenModal()}
        >
          Add Supplier
        </Button>
      </Box>

      {/* Supplier Table */}
      <SuppliersTable
        suppliers={suppliers.filter((s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase())
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
