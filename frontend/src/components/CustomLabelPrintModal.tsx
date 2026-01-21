"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from "@mui/material";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import type { Product } from "../lib/types/product";
import { Tag } from "lucide-react";

// Safety check for Electron context
// @ts-ignore
const ipcRenderer = window?.electron?.ipcRenderer;

type Props = {
  open: boolean;
  onClose: () => void;
  product: Product | null;
};

// Replicating the list from labelTemplate.js for the UI
const AVAILABLE_TEMPLATES = [
  {
    group: "General / Retail",
    options: [
      { id: "gen_standard", label: "Standard Split (Balanced)" },
      { id: "gen_minimal", label: "Modern Minimal (Clean)" },
      { id: "gen_qr", label: "QR Code Focused" },
      { id: "gen_asset", label: "Asset Tag (Property Of)" },
      { id: "gen_sale", label: "Discount / Sale Tag" },
    ],
  },
  {
    group: "Garment / Apparel",
    options: [
      { id: "gar_size_circle", label: "Size Circle (Standard)" },
      { id: "gar_boutique", label: "Boutique Elegant" },
      { id: "gar_grid", label: "Grid Specs (Detailed)" },
      { id: "gar_slim", label: "Vertical Slim Tag" },
      { id: "gar_kids", label: "Kids / Fun Style" },
    ],
  },
  {
    group: "Medicine / Pharma",
    options: [
      { id: "med_dose", label: "Dosage Checkbox (M/A/N)" },
      { id: "med_expiry", label: "Expiry Focused" },
      { id: "med_strip", label: "Compact Strip Label" },
      { id: "med_rack", label: "Rack / Bin Locator" },
      { id: "med_generic", label: "Generic Pharma Tag" },
    ],
  },
  {
    group: "Electronics",
    options: [
      { id: "ele_spec", label: "Spec Sheet (Detailed)" },
      { id: "ele_dark", label: "High Tech Dark" },
      { id: "ele_warranty", label: "Warranty Void Seal" },
      { id: "ele_mobile", label: "Mobile Accessory (Small)" },
      { id: "ele_serial", label: "Serial Number Focus" },
      { id: "ele_box", label: "Box Label (Large)" },
      { id: "ele_comp", label: "Component Tiny Tag" },
      { id: "ele_service", label: "Service / Repair Tag" },
      { id: "ele_cable", label: "Cable Wrap Tag" },
      { id: "ele_gaming", label: "Gaming / RGB Style" },
    ],
  },
  {
    group: "Hardware",
    options: [
      { id: "hw_bold", label: "Industrial Bold" },
      { id: "hw_bin", label: "Shelf Bin Tag" },
      { id: "hw_weight", label: "Weight Focused" },
    ],
  },
  {
    group: "Jewelry",
    options: [
      { id: "jew_standard", label: "Standard Jewelry Tag" },
      { id: "jew_dumbell", label: "Dumbell / Ring Tag" },
    ],
  },
];

export default function CustomLabelPrintModal({
  open,
  onClose,
  product,
}: Props) {
  const shop = JSON.parse(localStorage.getItem("shop") || "{}");

  const [copies, setCopies] = useState(1);
  const [printing, setPrinting] = useState(false);

  // Custom Fields
  const [customBarcode, setCustomBarcode] = useState("");
  const [customPriceCode, setCustomPriceCode] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("gen_standard");

  useEffect(() => {
    if (open && product) {
      setCustomBarcode(product.barcode || product.product_code || "");
      setCustomPriceCode(""); // Always start empty or fetch from somewhere if needed
      setSelectedTemplate(shop.label_template_id || "gen_standard");
      setCopies(1);
    }
  }, [open, product, shop.label_template_id]);

  if (!product) return null;

  const handlePrint = () => {
    if (!ipcRenderer) {
      toast.error("Printing only available in Desktop App");
      return;
    }

    setPrinting(true);
    const toastId = toast.loading("Sending to printer...");

    const payload = {
      product: product,
      shop: shop,
      copies: copies,
      customBarcode: customBarcode,
      customPriceCode: customPriceCode,
      templateId: selectedTemplate,
    };

    ipcRenderer.send("print-custom-label", payload);

    // Simple timeout to reset state, as IPC is fire-and-forget here
    setTimeout(() => {
      toast.dismiss(toastId);
      toast.success("Print command sent");
      setPrinting(false);
      onClose();
    }, 1500);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Tag size={20} />
        Custom Label Print
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="Product Name"
            value={product.name}
            disabled
            variant="filled"
            size="small"
            fullWidth
          />

          <TextField
            label="Barcode / Product Code"
            value={customBarcode}
            onChange={(e) => setCustomBarcode(e.target.value)}
            fullWidth
            helperText="Defaults to product barcode. You can edit this."
          />

          <TextField
            label="Custom Price Code"
            value={customPriceCode}
            onChange={(e) => setCustomPriceCode(e.target.value)}
            fullWidth
            placeholder="e.g. AB-99"
            helperText="Will appear if template supports custom codes"
          />

          <FormControl fullWidth>
            <InputLabel>Select Template</InputLabel>
            <Select
              value={selectedTemplate}
              label="Select Template"
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              {AVAILABLE_TEMPLATES.map((group) => [
                <MenuItem
                  key={group.group}
                  disabled
                  sx={{
                    fontWeight: "bold",
                    opacity: 1,
                    color: "text.primary",
                    fontSize: "0.85rem",
                  }}
                >
                  {group.group}
                </MenuItem>,
                ...group.options.map((opt) => (
                  <MenuItem key={opt.id} value={opt.id} sx={{ pl: 4 }}>
                    {opt.label}
                  </MenuItem>
                )),
              ])}
            </Select>
          </FormControl>

          <TextField
            type="number"
            label="Copies"
            value={copies}
            onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
            inputProps={{ min: 1 }}
            fullWidth
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={printing}>
          Cancel
        </Button>
        <Button onClick={handlePrint} variant="contained" disabled={printing}>
          {printing ? "Printing..." : "Print"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
