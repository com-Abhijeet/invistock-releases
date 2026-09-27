import * as VariantService from "../services/variantService.mjs";

export function getBatchVariants(req, res) {
  try {
    const { batchId } = req.params;
    const variants = VariantService.getBatchVariants(batchId);
    res.json({ success: true, data: variants });
  } catch (error) {
    console.error("getBatchVariants Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export function getProductVariants(req, res) {
  try {
    const { productId } = req.params;
    const { search } = req.query;
    const variants = VariantService.getProductVariants(productId, search || "");
    res.json({ success: true, data: variants });
  } catch (error) {
    console.error("getProductVariants Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export function getAllVariants(req, res) {
  try {
    const { search, page, limit } = req.query;
    const result = VariantService.getAllVariants({ search, page, limit });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("getAllVariants Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export function getVariantById(req, res) {
  try {
    const { id } = req.params;
    const variant = VariantService.getVariantById(id);
    res.json({ success: true, data: variant });
  } catch (error) {
    console.error("getVariantById Error:", error);
    res.status(404).json({ success: false, message: error.message });
  }
}

export function updateVariant(req, res) {
  try {
    const { id } = req.params;
    const updated = VariantService.updateVariant(id, req.body);
    res.json({ success: true, data: updated, message: "Variant updated successfully" });
  } catch (error) {
    console.error("updateVariant Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export function printVariantLabels(req, res) {
  try {
    const { variantIds, variantItems, copies, useStockQuantity } = req.body;
    const labels = VariantService.generateVariantPrintPayload({
      variantIds,
      variantItems,
      copies,
      useStockQuantity: useStockQuantity !== undefined ? useStockQuantity : true,
    });
    res.json({ success: true, labels });
  } catch (error) {
    console.error("printVariantLabels Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}
