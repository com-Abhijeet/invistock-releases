/**
 * labelTemplate.js
 * Main registry for all product label templates.
 * Aggregates specialized templates from the /labelTemplates directory.
 */

// ✅ USE REQUIRE INSTEAD OF IMPORT
const generalTemplates = require("./labelTemplates/general.js");
const garmentTemplates = require("./labelTemplates/garment.js");
const medicineTemplates = require("./labelTemplates/medicine.js");
const electronicsTemplates = require("./labelTemplates/electronics.js");
const hardwareTemplates = require("./labelTemplates/hardware.js");
const jewelryTemplates = require("./labelTemplates/jewelry.js");

// Aggregate all templates
// Note: Since the sub-files export the object as 'default', we access it directly or via .default depending on how they are exported.
// Assuming sub-files use `module.exports = { ... }` or `module.exports = ...`
const templates = {
  ...generalTemplates,
  ...garmentTemplates,
  ...medicineTemplates,
  ...electronicsTemplates,
  ...hardwareTemplates,
  ...jewelryTemplates,
};

// --- Definitions for UI Selection ---
// This list can be used by the frontend to populate the dropdown
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

// --- Main Export ---
const createLabelHTML = (
  item,
  shop,
  barcode,
  width,
  templateId = "gen_standard"
) => {
  const generator = templates[templateId] || templates["gen_standard"];
  // Ensure width is treated as number
  const html = generator(item, shop, barcode, Number(width));
  return { style: "", content: html };
};

// --- Helper for Preview (Frontend/IPC) ---
const getLabelTemplate = (templateId, data, barcodeBase64) => {
  const width = data.shop.label_printer_width_mm || 50;
  const generator = templates[templateId] || templates["gen_standard"];
  return generator(data.item, data.shop, barcodeBase64, Number(width));
};

// ✅ USE MODULE.EXPORTS INSTEAD OF EXPORT
module.exports = { createLabelHTML, getLabelTemplate, AVAILABLE_TEMPLATES };
