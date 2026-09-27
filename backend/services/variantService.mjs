import * as VariantRepo from "../repositories/variantRepository.mjs";

export function getBatchVariants(batchId) {
  if (!batchId) throw new Error("Batch ID is required");
  return VariantRepo.getVariantsByBatchId(batchId);
}

export function getProductVariants(productId, search = "") {
  if (!productId) throw new Error("Product ID is required");
  return VariantRepo.getVariantsByProductId(productId, search);
}

export function getAllVariants({ search = "", page = 1, limit = 50 } = {}) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Number(limit) || 50);
  const offset = (p - 1) * l;
  return VariantRepo.getAllVariants(search, l, offset);
}

export function getVariantById(id) {
  if (!id) throw new Error("Variant ID is required");
  const variant = VariantRepo.getVariantById(id);
  if (!variant) throw new Error("Variant not found");
  return variant;
}

export function updateVariant(id, data) {
  if (!id) throw new Error("Variant ID is required");
  return VariantRepo.updateVariant(id, data);
}

function extractSizeColor(v) {
  let size = "";
  let color = "";
  const d1Type = String(v.dim1_type || "").toLowerCase();
  const d2Type = String(v.dim2_type || "").toLowerCase();

  if (d1Type === "size") size = v.dim1_value || "";
  else if (d1Type === "color") color = v.dim1_value || "";

  if (d2Type === "size") size = v.dim2_value || "";
  else if (d2Type === "color") color = v.dim2_value || "";

  if (!size && !color) {
    color = v.dim1_value || "";
    size = v.dim2_value || "";
  }
  return { size, color };
}

export function generateVariantPrintPayload({
  variantIds = [],
  variantItems = null,
  copies = 1,
  useStockQuantity = true,
} = {}) {
  let ids = variantIds;
  const copiesMap = {};

  if (variantItems && Array.isArray(variantItems) && variantItems.length > 0) {
    ids = variantItems.map((item) => item.id);
    for (const item of variantItems) {
      copiesMap[item.id] = Number(item.copies) || 1;
    }
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new Error("No variant IDs provided for label printing");
  }

  const variants = VariantRepo.getVariantsByIds(ids);
  const qtyMultiplier = Number(copies) || 1;
  const labels = [];

  for (const v of variants) {
    const { size, color } = extractSizeColor(v);
    const displayCode = v.article_no || v.batch_number || "";

    const labelTitle = v.product_name || "Product";

    let totalCopies = 1;
    if (copiesMap[v.id] !== undefined) {
      totalCopies = copiesMap[v.id];
    } else if (useStockQuantity) {
      const stockQty = v.quantity > 0 ? v.quantity : 1;
      totalCopies = stockQty * qtyMultiplier;
    } else {
      totalCopies = qtyMultiplier;
    }

    labels.push({
      variant_id: v.id,
      product_id: v.product_id,
      batch_id: v.batch_id,
      barcode: v.barcode || String(v.id),
      label: labelTitle,
      product_name: v.product_name,
      article_no: v.article_no || "",
      batch_number: v.batch_number || "",
      display_code: displayCode,
      size: size,
      color: color,
      dim1_value: v.dim1_value || "",
      dim2_value: v.dim2_value || "",
      price: v.mop || v.mrp || 0,
      mrp: v.mrp || 0,
      mop: v.mop || 0,
      stock_quantity: v.quantity || 0,
      copies: totalCopies,
    });
  }

  return labels;
}
