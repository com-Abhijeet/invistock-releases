/**
 * prnLabelEngine.js
 * TSPL/ZPL .prn Raw Barcode Label Template & Multi-Up Parser Engine.
 */

/**
 * Encode cost price using a cipher mapping (e.g. MONEYTALKS -> M=1, O=2, N=3, E=4, Y=5, T=6, A=7, L=8, K=9, S=0)
 */
function encodeCostCipher(costPrice, cipherKey = "MONEYTALKS") {
  if (!costPrice) return "";
  const key = (cipherKey || "MONEYTALKS").toUpperCase();
  const digits = String(costPrice).replace(/[^0-9]/g, "");

  return digits
    .split("")
    .map((d) => {
      const num = parseInt(d, 10);
      if (num === 0) return key[9] || "0";
      return key[num - 1] || d;
    })
    .join("");
}

/**
 * Replace placeholders in a PRN block for a single label item.
 */
function replaceLabelPlaceholders(templateStr, item, shop, cipherKey) {
  const product = item.product || {};
  const batch = item.batch || {};
  const serial = item.serial || {};
  const variant = item.variant || {};

  const name =
    product.product_name ||
    product.name ||
    item.product_name ||
    item.name ||
    "Product";
  const code = product.product_code || product.code || "";
  const barcode =
    item.barcode || variant.barcode || batch.barcode || product.barcode || "";
  const mrp = Number(
    variant.mrp || batch.mrp || product.mrp || item.mrp || 0,
  ).toFixed(2);
  const price = Number(
    variant.mop ||
      variant.mrp ||
      batch.mop ||
      product.selling_price ||
      product.price ||
      item.price ||
      mrp,
  ).toFixed(2);
  const cost = Number(
    variant.cost_price || batch.purchase_rate || product.cost_price || 0,
  );
  const cipher = encodeCostCipher(cost, cipherKey);
  const batchNo = item.batch_number || batch.batch_number || "";
  const expDate = batch.expiry_date || item.expiry_date || "";
  const articleNo = item.article_no || product.article_no || "";
  const size =
    item.size ||
    item.dim1_value ||
    variant.dim1_value ||
    product.dim1_value ||
    product.size ||
    "";
  const color =
    item.color ||
    item.dim2_value ||
    variant.dim2_value ||
    product.dim2_value ||
    "";
  const displayCode = item.display_code || articleNo || batchNo || "";
  const sku = item.sku || variant.sku || "";
  const variantTitle = [size, color].filter(Boolean).join(" / ");
  const shopName = shop.shop_name || shop.name || "";

  return templateStr
    .replace(/\{\{(SHOP_NAME|shop_name)\}\}/g, shopName)
    .replace(/\{\{(NAME|ITEM_NAME|product_name)\}\}/g, name)
    .replace(/\{\{(PRODUCT_CODE|product_code)\}\}/g, code)
    .replace(/\{\{(BARCODE|barcode)\}\}/g, barcode)
    .replace(/\{\{(MRP|mrp)\}\}/g, mrp)
    .replace(/\{\{(PRICE|SELLING_PRICE|MOP|mop)\}\}/g, price)
    .replace(/\{\{(BATCH_NO|BATCH_NUMBER|batch_number)\}\}/g, batchNo)
    .replace(/\{\{(EXPIRY_DATE|expiry_date)\}\}/g, expDate)
    .replace(/\{\{(SIZE|dim1_value|size)\}\}/g, size)
    .replace(/\{\{(COLOR|dim2_value|color)\}\}/g, color)
    .replace(/\{\{(ARTICLE_NO|article_no)\}\}/g, articleNo)
    .replace(/\{\{(DISPLAY_CODE|display_code)\}\}/g, displayCode)
    .replace(/\{\{(SKU|sku)\}\}/g, sku)
    .replace(/\{\{(VARIANT_TITLE|variant_title)\}\}/g, variantTitle)
    .replace(/\{\{(SERIAL_NO|serial_no)\}\}/g, serial.serial_number || "")
    .replace(/\{\{(SECRET_COST_CIPHER|secret_cost_cipher)\}\}/g, cipher);
}

/**
 * Generate PRN output for 1-Up, 2-Up, or 3-Up label rolls.
 * @param {string} prnTemplate Content of the .prn template file
 * @param {Array} items List of label items to print
 * @param {Object} shop Shop settings
 * @param {Object} options Options: { multiUp: 1 | 2 | 3, cipherKey: string }
 */
function renderPRNLabels(prnTemplate, items, shop = {}, options = {}) {
  let multiUp = Number(options.multiUp || 1);
  if (prnTemplate && prnTemplate.includes("COL_3_")) {
    multiUp = 3;
  } else if (prnTemplate && prnTemplate.includes("COL_2_")) {
    multiUp = 2;
  }

  const cipherKey = options.cipherKey || "MONEYTALKS";

  if (!prnTemplate || !Array.isArray(items) || items.length === 0) {
    return "";
  }

  // Expand items based on printable quantity
  const expandedItems = [];
  items.forEach((it) => {
    const printQty = Number(it.print_qty || it.qty || 1);
    for (let i = 0; i < printQty; i++) {
      expandedItems.push(it);
    }
  });

  // 1-UP ROLL MODE
  if (multiUp <= 1) {
    return expandedItems
      .map((item) =>
        replaceLabelPlaceholders(prnTemplate, item, shop, cipherKey),
      )
      .join("\n");
  }

  // 2-UP or 3-UP MULTI-ROLL MODE
  const outputBlocks = [];

  for (let i = 0; i < expandedItems.length; i += multiUp) {
    let block = prnTemplate;

    for (let col = 1; col <= multiUp; col++) {
      const currentItem = expandedItems[i + (col - 1)] || {};
      const prefix = `COL_${col}_`;

      const product = currentItem.product || {};
      const batch = currentItem.batch || {};
      const serial = currentItem.serial || {};
      const variant = currentItem.variant || {};

      const name =
        product.product_name ||
        product.name ||
        currentItem.product_name ||
        currentItem.name ||
        "";
      const code = product.product_code || product.code || "";
      const barcode =
        currentItem.barcode ||
        variant.barcode ||
        batch.barcode ||
        product.barcode ||
        "";
      const mrp = name
        ? Number(
            variant.mrp || batch.mrp || product.mrp || currentItem.mrp || 0,
          ).toFixed(2)
        : "";
      const price = name
        ? Number(
            variant.mop ||
              variant.mrp ||
              batch.mop ||
              product.selling_price ||
              product.price ||
              currentItem.price ||
              mrp,
          ).toFixed(2)
        : "";
      const cost = Number(
        variant.cost_price || batch.purchase_rate || product.cost_price || 0,
      );
      const cipher = name ? encodeCostCipher(cost, cipherKey) : "";
      const batchNo = currentItem.batch_number || batch.batch_number || "";
      const expDate = batch.expiry_date || currentItem.expiry_date || "";
      const articleNo = currentItem.article_no || product.article_no || "";
      const size =
        currentItem.size ||
        currentItem.dim1_value ||
        variant.dim1_value ||
        product.size ||
        "";
      const color =
        currentItem.color || currentItem.dim2_value || variant.dim2_value || "";
      const displayCode =
        currentItem.display_code || articleNo || batchNo || "";
      const sku = currentItem.sku || variant.sku || "";
      const variantTitle = [size, color].filter(Boolean).join(" / ");
      const shopName = shop.shop_name || shop.name || "";

      block = block
        .replace(
          new RegExp(`\\{\\{${prefix}(SHOP_NAME|shop_name)\\}\\}`, "g"),
          shopName,
        )
        .replace(
          new RegExp(`\\{\\{${prefix}(NAME|ITEM_NAME|product_name)\\}\\}`, "g"),
          name,
        )
        .replace(
          new RegExp(`\\{\\{${prefix}(PRODUCT_CODE|product_code)\\}\\}`, "g"),
          code,
        )
        .replace(
          new RegExp(`\\{\\{${prefix}(BARCODE|barcode)\\}\\}`, "g"),
          barcode,
        )
        .replace(new RegExp(`\\{\\{${prefix}(MRP|mrp)\\}\\}`, "g"), mrp)
        .replace(
          new RegExp(`\\{\\{${prefix}(PRICE|SELLING_PRICE|MOP|mop)\\}\\}`, "g"),
          price,
        )
        .replace(
          new RegExp(
            `\\{\\{${prefix}(BATCH_NO|BATCH_NUMBER|batch_number)\\}\\}`,
            "g",
          ),
          batchNo,
        )
        .replace(
          new RegExp(`\\{\\{${prefix}(EXPIRY_DATE|expiry_date)\\}\\}`, "g"),
          expDate,
        )
        .replace(
          new RegExp(`\\{\\{${prefix}(SIZE|dim1_value|size)\\}\\}`, "g"),
          size,
        )
        .replace(
          new RegExp(`\\{\\{${prefix}(COLOR|dim2_value|color)\\}\\}`, "g"),
          color,
        )
        .replace(
          new RegExp(`\\{\\{${prefix}(ARTICLE_NO|article_no)\\}\\}`, "g"),
          articleNo,
        )
        .replace(
          new RegExp(`\\{\\{${prefix}(DISPLAY_CODE|display_code)\\}\\}`, "g"),
          displayCode,
        )
        .replace(new RegExp(`\\{\\{${prefix}(SKU|sku)\\}\\}`, "g"), sku)
        .replace(
          new RegExp(`\\{\\{${prefix}(VARIANT_TITLE|variant_title)\\}\\}`, "g"),
          variantTitle,
        )
        .replace(
          new RegExp(
            `\\{\\{${prefix}(SECRET_COST_CIPHER|secret_cost_cipher)\\}\\}`,
            "g",
          ),
          cipher,
        );
    }

    outputBlocks.push(block);
  }

  return outputBlocks.join("\n");
}

module.exports = {
  renderPRNLabels,
  encodeCostCipher,
};
